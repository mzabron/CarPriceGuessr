const express = require('express');
const router = express.Router();
const { getRooms, createRoom, deleteRoom } = require('../controllers/roomController');

router.get('/', getRooms);

router.post('/', createRoom);

router.delete('/:id', deleteRoom);

module.exports = router;