const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');

app.use(express.json());

app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send("hello");
})

app.listen(8080, () => {
      console.log('server listening on port 8080')
})