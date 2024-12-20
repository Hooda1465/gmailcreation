const app = require('./index'); // Import the Express app
const serverless = require('serverless-http');

module.exports = serverless(app);
