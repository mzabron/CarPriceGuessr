require('dotenv').config();
const express = require('express');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const gameRoutes = require('./routes/gameRoutes');
const { setupRoomSocketHandlers } = require('./controllers/roomController');
const { createServer } = require('node:http')
const { Server } = require('socket.io');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const swaggerDocument = yaml.load('./docs/swagger.yaml');
const connectDB = require('./db');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://tlarysz.lab.kis.agh.edu.pl',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: 'https://tlarysz.lab.kis.agh.edu.pl', // This is the client-facing URL
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/cars', gameRoutes);

setupRoomSocketHandlers(io);

app.get('/', (req, res) => {
  res.send("hello");
})

server.listen(60123, () => {
  console.log('Server listening on port 60123');
})

connectDB();
