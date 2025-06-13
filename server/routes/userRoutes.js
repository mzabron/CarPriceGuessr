// const express = require('express');
// const router = express.Router();
// const { getUsers, createUser, deleteUser } = require('../controllers/userController');

// router.get('/', getUsers);

// router.post('/', createUser);

// router.delete('/:id', deleteUser);

// module.exports = router;

const express = require('express');
const router = express.Router();
const { createUser, loginUser } = require('../controllers/userController');

router.post('/', createUser);
router.post('/login', loginUser);

module.exports = router;
