const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'cars.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_FILE);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function runCallback(err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const init = async () => {
  await run('PRAGMA journal_mode = WAL;');
  await run(`
    CREATE TABLE IF NOT EXISTS cars (
      itemId TEXT PRIMARY KEY,
      title TEXT,
      shortDescription TEXT,
      priceValue REAL,
      priceCurrency TEXT,
      priceDisplay TEXT,
      itemWebUrl TEXT,
      condition TEXT,
      conditionDescription TEXT,
      itemLocationCity TEXT,
      itemLocationCountry TEXT,
      thumbnailImages TEXT,
      year TEXT,
      make TEXT,
      model TEXT,
      mileage TEXT,
      forSaleBy TEXT,
      fuelType TEXT,
      engine TEXT,
      carType TEXT,
      bodyType TEXT,
      horsePower TEXT,
      numberOfCylinders TEXT,
      numberOfDoors TEXT,
      aspectsJson TEXT,
      insertedAt INTEGER NOT NULL
    );
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_cars_insertedAt ON cars(insertedAt);');
  await run(`
    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
};

const ensureInit = init();

const mapRowToCar = (row) => {
  if (!row) return null;
  return {
    itemId: row.itemId,
    title: row.title,
    shortDescription: row.shortDescription,
    price: row.priceDisplay,
    itemWebUrl: row.itemWebUrl,
    condition: row.condition,
    conditionDescription: row.conditionDescription,
    itemLocation: {
      city: row.itemLocationCity,
      country: row.itemLocationCountry,
    },
    thumbnailImages: row.thumbnailImages ? JSON.parse(row.thumbnailImages) : [],
    year: row.year,
    make: row.make,
    model: row.model,
    mileage: row.mileage,
    forSaleBy: row.forSaleBy,
    fuelType: row.fuelType,
    engine: row.engine,
    carType: row.carType,
    bodyType: row.bodyType,
    horsePower: row.horsePower,
    numberOfCylinders: row.numberOfCylinders,
    numberOfDoors: row.numberOfDoors,
  };
};

const getRandomCars = async (limit = 10) => {
  await ensureInit;
  const rows = await all('SELECT * FROM cars ORDER BY RANDOM() LIMIT ?', [limit]);
  return rows.map(mapRowToCar);
};

const getCarsCount = async () => {
  await ensureInit;
  const row = await get('SELECT COUNT(*) as count FROM cars');
  return row?.count || 0;
};

const deleteOldestCars = async (count) => {
  await ensureInit;
  if (count <= 0) return 0;
  const result = await run(`
    DELETE FROM cars WHERE itemId IN (
      SELECT itemId FROM cars ORDER BY insertedAt ASC LIMIT ?
    )
  `, [count]);
  return result.changes || 0;
};

const insertCars = async (cars, cap = 2000) => {
  await ensureInit;
  if (!Array.isArray(cars) || !cars.length) return { inserted: 0, duplicates: 0, evicted: 0 };

  await run('BEGIN IMMEDIATE TRANSACTION');
  let inserted = 0;
  let duplicates = 0;
  let evicted = 0;

  try {
    let total = await getCarsCount();
    for (const car of cars) {
      const params = [
        car.itemId,
        car.title || null,
        car.shortDescription || null,
        car.priceValue ?? null,
        car.priceCurrency ?? null,
        car.priceDisplay ?? null,
        car.itemWebUrl || null,
        car.condition || null,
        car.conditionDescription || null,
        car.itemLocation?.city || null,
        car.itemLocation?.country || null,
        JSON.stringify(car.thumbnailImages || []),
        car.year || null,
        car.make || null,
        car.model || null,
        car.mileage || null,
        car.forSaleBy || null,
        car.fuelType || null,
        car.engine || null,
        car.carType || null,
        car.bodyType || null,
        car.horsePower || null,
        car.numberOfCylinders || null,
        car.numberOfDoors || null,
        JSON.stringify(car.aspects || []),
        Date.now(),
      ];

      const result = await run(`
        INSERT OR IGNORE INTO cars (
          itemId, title, shortDescription, priceValue, priceCurrency, priceDisplay,
          itemWebUrl, condition, conditionDescription, itemLocationCity, itemLocationCountry,
          thumbnailImages, year, make, model, mileage, forSaleBy, fuelType, engine, carType,
          bodyType, horsePower, numberOfCylinders, numberOfDoors, aspectsJson, insertedAt
        ) VALUES (${new Array(26).fill('?').join(', ')});
      `, params);

      if (result.changes === 0) {
        duplicates += 1;
        continue;
      }

      inserted += 1;
      total += 1;

      if (total > cap) {
        const deleted = await deleteOldestCars(total - cap);
        evicted += deleted;
        total -= deleted;
      }
    }

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }

  return { inserted, duplicates, evicted };
};

const getState = async (key, defaultValue = null) => {
  await ensureInit;
  const row = await get('SELECT value FROM system_state WHERE key = ?', [key]);
  return row ? row.value : defaultValue;
};

const setState = async (key, value) => {
  await ensureInit;
  await run(
    'INSERT INTO system_state(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, String(value)]
  );
};

module.exports = {
  db,
  getRandomCars,
  getCarsCount,
  insertCars,
  getState,
  setState,
};
