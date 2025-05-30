let users = [
    {
        id: 1,
        name: "lpc-10"
    },
    {
        id: 2,
        name: "bober kurwa"
    }
];

exports.getUsers = (req, res) => {
    res.json(users)
};

exports.createUser = (req, res) => {
    const { name } = req.body;
    const newUser = {
        id: users.length + 1,
        name
    }
    users.push(newUser);
    res.status(201).json(newUser);
}

// createUser TODO:
// dodanie error handling
// sprawdzanie czy user istnieje
// czy input jest poprawny
// generowanie unikalnego id

exports.deleteUser = (req, res) => {
    const { id } = req.params;
    const userIndex = users.findIndex(user => user.id === parseInt(id));
    
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    users.splice(userIndex, 1);
    res.status(204).send();
}