// netlify/functions/api.js
// Wraps routes.js in its own minimal Express app (no static middleware --
// Netlify's CDN serves public/ directly) and exposes it as a Lambda-style
// handler via serverless-http. The netlify.toml redirect sends /api/* here;
// basePath strips Netlify's own /.netlify/functions/api prefix so the
// router sees plain paths like /daily-preview, matching routes.js.

const express = require('express');
const serverless = require('serverless-http');
require('dotenv').config();

const apiRouter = require('../../routes');

const functionApp = express();
functionApp.use(express.json());
functionApp.use('/', apiRouter);

module.exports.handler = serverless(functionApp, {
  basePath: '/.netlify/functions/api',
});
