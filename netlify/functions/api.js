// netlify/functions/api.js
// Wraps routes.js in its own minimal Express app (no static middleware --
// Netlify's CDN serves public/ directly) and exposes it as a Lambda-style
// handler via serverless-http. The netlify.toml redirect sends /api/* here
// with a rewrite (status 200) -- but Netlify delivers the Lambda event with
// the *original* browser-facing path (e.g. "/api/daily-preview"), not the
// redirect's rewritten "to" target, despite that being the commonly assumed
// behavior for this pattern. Confirmed directly against prod: hitting
// /api/daily-preview (via the redirect) 404'd while hitting
// /.netlify/functions/api/daily-preview (the raw function URL) worked --
// the old basePath option was stripping a prefix that was never actually
// present on the path Netlify sent through the redirect.
// Mounting at both prefixes covers the real traffic path (/api/*) and the
// raw function URL (useful for direct debugging), without needing to bet
// on which convention is in play.

const express = require('express');
const serverless = require('serverless-http');
require('dotenv').config();

const apiRouter = require('../../routes');

const functionApp = express();
functionApp.use(express.json());
functionApp.use('/api', apiRouter);
functionApp.use('/.netlify/functions/api', apiRouter);

module.exports.handler = serverless(functionApp);
