// server.js
// Local dev entrypoint: run `npm run dev` and hit http://localhost:3000.
// Not used on Netlify -- see netlify/functions/api.js.

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Domain namer running at http://localhost:${PORT}`);
});
