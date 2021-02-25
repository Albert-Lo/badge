const express = require('express');
const AWS = require('aws-sdk')
AWS.config.logger = console;

const app = express();

const BAD_CLIMATES = ['fail', 'failed', 'failing', 'failure', 'no'];
const GOOD_CLIMATES = ['ok', 'succeed', 'succeeded', 'pass', 'passed', 'passing', 'success'];

const CLIMATE_COLORS = ['red', 'orange', 'yellow', 'yellowgreen', 'green', 'brightgreen'];

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3({
  params: {
    Bucket: process.env.BUCKET,
  },
});

app.get('/badge', async function (req, res) {
  let key;
  let range = [0, 100];
  const badge = {};
  if (req.query.key && req.query.label && req.query.message) {
    key = req.query.key;
    badge.label = req.query.label;
    badge.message = req.query.message;
    if (!req.query.color) {
      badge.color = 'lightgrey';

      if (req.query.climate === 'KEYWORD') {
        const normalized =  badge.message.toLowerCase();

        if (BAD_CLIMATES.includes(normalized)) {
          badge.color = 'red';
        }

        if (GOOD_CLIMATES.includes(normalized)) {
          badge.color = 'brightgreen';
        }

      } else if (req.query.climate === 'RANGE' && !isNaN(req.query.message.replace(/%$/, ''))) {

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

      } else if (req.query.climate === 'ZERO_OR_ERROR') {

        if (parseInt(req.query.message) === 0) {
          badge.color = 'brightgreen';
        } else {
          badge.color = 'red';
        }

      } else if (req.query.climate === 'ZERO_OR_WARNING') {

        if (parseInt(req.query.message) === 0) {
          badge.color = 'brightgreen';
        } else {
          badge.color = 'yellow';
        }

      }

    } else {
      badge.color = req.query.color;
    }

    try {
      await s3.putObject({
        Key: process.env.S3_PREFIX + key + '.json',
        Body: JSON.stringify(badge),
        ContentType: 'application/json',
      }).promise();
      res.send('OK');
    } catch (err) {
      console.error(err);
      res.status(500).send('Fail to save data on S3');
    }

  } else {
    res.status(400).send('Invalid');
  }
});


app.get('/badge/:key.svg', async function (req, res) {

  try {
    const data = await s3.getObject({
      Key: process.env.S3_PREFIX + req.params.key + '.json',
    }).promise();
    const badge = JSON.parse(data.Body.toString());
    res.redirect(`https://img.shields.io/badge/${badge.label}-${badge.message}-${badge.color}`);
  } catch (err) {
    console.error(err);
    res.status(404).send('Not found');
  }
});

app.listen(process.env.PORT || 8080);
console.log(`Listening at ${process.env.PORT || 8080}`)