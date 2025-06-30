const User = require('../models/User');

// Rejestracja
exports.createUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password required' });
    }

    const existingUser = await User.findOne({ where: { name } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const newUser = await User.create({ name, password });

    res.status(201).json({ id: newUser.id, name: newUser.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logowanie
exports.loginUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password required' });
    }

    const user = await User.findOne({ where: { name } });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid login or password' });
    }

    res.status(200).json({ id: user.id, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
