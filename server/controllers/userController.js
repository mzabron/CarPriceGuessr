const User = require('../models/User');

// Rejestracja nowego użytkownika
exports.createUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password required' });
    }

    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const newUser = new User({ name, password });
    await newUser.save();

    res.status(201).json({ id: newUser._id, name: newUser.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Logowanie użytkownika
exports.loginUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password required' });
    }

    const user = await User.findOne({ name });
    if (!user) {
      return res.status(401).json({ message: 'Invalid login or password' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid login or password' });
    }

    res.status(200).json({ id: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
