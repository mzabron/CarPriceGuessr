const User = require('../models/User');

// GET /api/users
exports.getUsers = async (req, res) => {
  const users = await User.find({}); 
  res.json(users);
};

// POST /api/users
exports.createUser = async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: 'Name and password are required' });
  }

  const existingUser = await User.findOne({ name });
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const newUser = new User({ name, password });
  await newUser.save();

  res.status(201).json({ id: newUser._id, name: newUser.name, password: newUser.password });
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const deletedUser = await User.findByIdAndDelete(id);

  if (!deletedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(204).send();
};
