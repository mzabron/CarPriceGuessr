const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const swaggerDocument = yaml.load('./docs/swagger.yaml');

app.use(express.json());

// Serve Swagger UI at /api-docs endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send("hello");
})

app.listen(8080, () => {
    console.log('Server listening on port 8080');
    console.log('Swagger documentation available at http://localhost:8080/api-docs');
})