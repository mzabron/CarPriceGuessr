const express = require('express');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const { setupRoomSocketHandlers } = require('./controllers/roomController');
const { createServer } = require('node:http')
const { Server } = require('socket.io');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const swaggerDocument = yaml.load('./docs/swagger.yaml');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: 'http://localhost:3000',
}));

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/users', userRoutes);

app.use('/rooms', roomRoutes);

setupRoomSocketHandlers(io);

app.get('/', (req, res) => {
  res.send("hello");
})

server.listen(8080, () => {
  console.log('Server listening on port 8080');
  console.log('Swagger documentation available at http://localhost:8080/api-docs');
})