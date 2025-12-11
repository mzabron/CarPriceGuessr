const { getApplicationAccessToken } = require('../controllers/token');
const { insertCars, getState, setState } = require('./db');

const EBAY_API_BASE_URL = 'https://api.ebay.com/buy/browse/v1';
const MARKETPLACE_ID = 'EBAY_US';
const CATEGORY_ID = '6001';
// We fetch at most 15 items per run to stay under eBay's
// concurrent/burst limits: 1 search call + up to 15 detail calls.
const SEARCH_LIMIT = 15; // summary items per run
const DETAIL_BATCH_SIZE = 15; // effectively unused with per-item fetch
const MAX_STORED_CARS = 3000;
const FETCH_INTERVAL_MS = 6 * 60 * 1000;
const OFFSET_STATE_KEY = 'ebay_offset';
const MAX_OFFSET = 10000; // cap before wrap-around

let jobTimer = null;
let jobInFlight = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed ${response.status}: ${body}`);
  }
  return response.json();
}

async function searchCars(accessToken, offset) {
  const params = new URLSearchParams({
    category_ids: CATEGORY_ID,
    filter: 'buyingOptions:{FIXED_PRICE}',
    limit: String(SEARCH_LIMIT),
    offset: String(offset || 0),
  });

  const url = `${EBAY_API_BASE_URL}/item_summary/search?${params.toString()}`;
  return fetchJson(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
      'Content-Type': 'application/json',
    },
  });
}

async function fetchBulkDetails(accessToken, itemIds) {
  // Fallback implementation: fetch each item's details individually.
  // This matches your original working pattern and avoids bulk
  // endpoint permission issues. With SEARCH_LIMIT = 15, this means
  // 1 search call + up to 15 item calls per cycle.
  if (!itemIds.length) return [];
  const results = [];
  for (const id of itemIds) {
    try {
      const item = await fetchJson(`${EBAY_API_BASE_URL}/item/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
          'Content-Type': 'application/json',
        },
      });
      if (item?.itemId) results.push(item);
      // Small delay to avoid hitting short burst/concurrency limits.
      await wait(50);
    } catch (err) {
      console.warn('[eBayWorker] Single-item detail fetch failed', {
        itemId: id,
        message: err.message,
      });
    }
  }
  return results;
}

function normalizeCar(summary, detail) {
  if (!detail) return null;
  const priceValue = Number(detail?.price?.value ?? summary?.price?.value ?? null) || null;
  const priceCurrency = detail?.price?.currency || summary?.price?.currency || null;
  const priceDisplay = priceValue && priceCurrency ? `${priceValue} ${priceCurrency}` : summary?.price ? `${summary.price.value} ${summary.price.currency}` : null;
  const images = [detail?.image, ...(detail?.additionalImages || [])].filter((img) => img && img.imageUrl);

  const findAspect = (name) => {
    const aspect = detail?.localizedAspects?.find((a) => a.name === name);
    return aspect ? aspect.value : null;
  };

  return {
    itemId: detail.itemId || summary?.itemId,
    title: detail.title || summary?.title,
    shortDescription: detail.shortDescription || summary?.shortDescription || null,
    priceValue,
    priceCurrency,
    priceDisplay,
    itemWebUrl: detail.itemWebUrl || summary?.itemWebUrl || (summary?.itemId ? `https://www.ebay.com/itm/${summary.itemId}` : null),
    condition: detail.condition || summary?.condition || null,
    conditionDescription: detail.conditionDescription || summary?.conditionDescription || null,
    itemLocation: {
      city: detail?.itemLocation?.city || summary?.itemLocation?.city || null,
      country: detail?.itemLocation?.country || summary?.itemLocation?.country || null,
    },
    thumbnailImages: images,
    year: findAspect('Year'),
    make: findAspect('Make'),
    model: findAspect('Model'),
    mileage: findAspect('Mileage'),
    forSaleBy: findAspect('For Sale By'),
    fuelType: findAspect('Fuel Type'),
    engine: findAspect('Engine'),
    carType: findAspect('Car Type'),
    bodyType: findAspect('Body Type'),
    horsePower: findAspect('Horse Power'),
    numberOfCylinders: findAspect('Number of Cylinders'),
    numberOfDoors: findAspect('Number of Doors'),
    aspects: detail?.localizedAspects || [],
  };
}

async function runIngestionCycle() {
  if (jobInFlight) {
    console.warn('[eBayWorker] Previous cycle still running, skipping this interval.');
    return;
  }

  jobInFlight = true;
  const cycleStartedAt = new Date().toISOString();

  try {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      console.warn('[eBayWorker] CLIENT_ID/CLIENT_SECRET missing. Skipping cycle.');
      return;
    }

    const accessToken = await getApplicationAccessToken();
    if (!accessToken) {
      console.warn('[eBayWorker] Missing eBay access token, skipping cycle.');
      return;
    }

    // Read and normalize offset to a multiple of SEARCH_LIMIT and cap to MAX_OFFSET
    const storedOffset = Number(await getState(OFFSET_STATE_KEY, '0')) || 0;
    let currentOffset = Math.max(0, Math.floor(storedOffset / SEARCH_LIMIT) * SEARCH_LIMIT);
    if (currentOffset !== storedOffset) {
      await setState(OFFSET_STATE_KEY, currentOffset);
    }
    if (currentOffset >= MAX_OFFSET) {
      console.log(`[eBayWorker] Offset ${currentOffset} >= ${MAX_OFFSET}. Wrapping to 0.`);
      currentOffset = 0;
      await setState(OFFSET_STATE_KEY, 0);
    }

    let searchData;
    try {
      searchData = await searchCars(accessToken, currentOffset);
    } catch (error) {
      // On any response error, reset offset to 0 per request
      console.warn('[eBayWorker] Search failed, resetting offset to 0.', error.message || error);
      await setState(OFFSET_STATE_KEY, 0);
      return;
    }
    const summaries = searchData?.itemSummaries || [];

    if (!summaries.length) {
      console.log(`[eBayWorker] No results at offset ${currentOffset}. Resetting offset to 0.`);
      await setState(OFFSET_STATE_KEY, 0);
      return;
    }

    const batches = chunk(summaries, DETAIL_BATCH_SIZE);
    const detailsById = new Map();

    let detailBatchCalls = 0;
    for (const batch of batches) {
      const itemIds = batch.map((item) => item.itemId).filter(Boolean);
      if (!itemIds.length) continue;

      const detailItems = await fetchBulkDetails(accessToken, itemIds);
      detailBatchCalls++;
      detailItems.forEach((item) => {
        if (item?.itemId) {
          detailsById.set(item.itemId, item);
        }
      });

      // small delay to stay within concurrency limits
      await wait(100);
    }

    const merged = summaries
      .map((summary) => normalizeCar(summary, detailsById.get(summary.itemId)))
      .filter((car) => car && car.itemId && car.thumbnailImages?.length);

    const stats = await insertCars(merged, MAX_STORED_CARS);

    // Advance strictly by SEARCH_LIMIT (15) regardless of returned count
    let nextOffset = currentOffset + SEARCH_LIMIT;
    if (nextOffset >= MAX_OFFSET) {
      nextOffset = 0;
    }
    await setState(OFFSET_STATE_KEY, nextOffset);

    console.log('[eBayWorker] Cycle complete', {
      cycleStartedAt,
      offsetBefore: currentOffset,
      offsetAfter: nextOffset,
      summaries: summaries.length,
      stored: merged.length,
      inserted: stats.inserted,
      duplicates: stats.duplicates,
      evicted: stats.evicted,
      detailBatchCalls,
    });
  } catch (error) {
    const ts = new Date().toISOString();
    console.error(`[eBayWorker] ${ts} Cycle failed`, error);
  } finally {
    jobInFlight = false;
  }
}

function startScheduler() {
  if (jobTimer) return;
  console.log('[eBayWorker] Starting scheduled fetch every 6 minutes.');
  runIngestionCycle();
  jobTimer = setInterval(runIngestionCycle, FETCH_INTERVAL_MS);
}

module.exports = {
  startScheduler,
  runIngestionCycle,
};
