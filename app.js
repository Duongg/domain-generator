// app.js
// Express app shared by local dev (server.js) and any non-Netlify host.
// Netlify itself doesn't use this directly -- it serves public/ as static
// files and routes /api/* to netlify/functions/api.js, which mounts the
// same routes.js router on its own minimal app instance.

const express = require('express');
const path = require('path');
require('dotenv').config();

const apiRouter = require('./routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRouter);

module.exports = app;
