const express = require('express');
const JSONdb = require('simple-json-db');

const db = new JSONdb('./database.json');
const app = express();

const BAD_CLIMATES = ['fail', 'failed', 'failing', 'failure', 'no'];
const GOOD_CLIMATES = ['ok', 'succeed', 'succeeded', 'pass', 'passed', 'passing', 'success'];

const CLIMATE_COLORS = ['red', 'orange', 'yellow', 'yellowgreen', 'green', 'brightgreen'];

app.get('/new-badge', function (req, res) {
  let key;
  let range = [0, 100];
  const badge = {};
  if (req.query.key && req.query.label && req.query.message) {
    key = req.query.key;
    badge.label = req.query.label;
    badge.message = req.query.message;
    if (!req.query.color) {
      badge.color = 'lightgrey';

      if (req.query.climate) {
        if (isNaN(req.query.message.replace(/%$/, ''))) {
          const normalized =  badge.message.toLowerCase();

          if (BAD_CLIMATES.includes(normalized)) {
            badge.color = 'red';
          }

          if (GOOD_CLIMATES.includes(normalized)) {
            badge.color = 'brightgreen';
          }

        } else {
          const number = parseFloat(req.query.message);

          if (req.query.range && req.query.range.match(/-?[0-9]+(\.[0-9]+)?,-?[0-9]+(\.[0-9]+)/)) {
            range = req.query.range.split(',').map((num) => parseFloat(num));
          }

          let colors = CLIMATE_COLORS;
          if ((range[1] - range[0]) < 0) {
            colors = colors.reverse();
          }

          const position = Math.min(Math.max(number / Math.abs(range[1] - range[0]), 0), 1);
          const colorIndex = Math.round((colors.length - 1) * position);
          badge.color = colors[colorIndex];
        }

      }
    } else {
      badge.color = req.query.color;
    }

    db.set(key, badge);
    res.send('OK');

  } else {
    res.statusCode(500).send('Fail');
  }
});


app.get('/badge/:key.svg', function (req, res) {
  const badge = db.get(req.params.key);
  if (badge) {
    res.redirect(`https://img.shields.io/badge/${badge.label}-${badge.message}-${badge.color}`);
  } else {
    res.statusCode(404).send('Not found');
  }
});

app.listen(process.env.PORT || 8080);
console.log(`Listening at ${process.env.PORT || 8080}`)