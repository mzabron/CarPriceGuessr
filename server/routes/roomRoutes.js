const express = require('express');
const router = express.Router();
const { createRoom, getRooms, deleteRoom } = require('../controllers/roomController');

// GET /rooms - get all rooms
router.get('/', getRooms);

// POST /rooms - create a new room
router.post('/', createRoom);

// DELETE /rooms/:id - delete a room
router.delete('/:id', deleteRoom);

module.exports = router;