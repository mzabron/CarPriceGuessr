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
    // origin: '*',
    origin: 'http://192.168.0.59',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  // origin: 'http://localhost:3000',
  origin: 'http://192.168.0.59',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/users', userRoutes);
app.use('/rooms', roomRoutes);
app.use('/cars', gameRoutes);

setupRoomSocketHandlers(io);

app.get('/', (req, res) => {
  res.send("hello");
})

server.listen(8080, () => {
  console.log('Server listening on port 8080');
  console.log('Swagger documentation available at http://localhost:8080/api-docs');
})

connectDB();
