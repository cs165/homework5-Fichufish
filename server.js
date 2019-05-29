const express = require('express');
const bodyParser = require('body-parser');
const googleSheets = require('gsa-sheets');

const key = require('./privateSettings.json');

// TODO(you): Change the value of this string to the spreadsheet id for your
// GSA spreadsheet. See HW5 spec for more information.
const SPREADSHEET_ID = '1Xj6e8WB9n1sifj9xeTuflF2fZP0Iw1IM3gHuhbWears';

const app = express();
const jsonParser = bodyParser.json();
const sheet = googleSheets(key.client_email, key.private_key, SPREADSHEET_ID);

app.use(express.static('public'));

function STRtoJSON(column, value, n) {
  let str = '{';
  for(let i=0; i<n-1; i++) {
    str += '"'+column[i]+'":"'+value[i]+'",';
  }
  str += '"'+column[n-1]+'":"'+value[n-1]+'"}';
  return JSON.parse(str);
}

function toJSON(rows) {
  const MAXROW = rows.length;
  const MAXCOL = rows[0].length;
  const items = [];

  for(let i=1; i<MAXROW; i++) {
    const item = STRtoJSON(rows[0], rows[i], MAXCOL);
    items.push(item);
  }
  return items;
}

async function onGet(req, res) {
  const result = await sheet.getRows();
  const rows = result.rows;
  // console.log(rows);

  const items = toJSON(rows);
  res.json(items);
}
app.get('/api', onGet);

async function onPost(req, res) {
  const messageBody = req.body;

  const lowerBody = Object.keys(messageBody).reduce(function(accumulator, currentValue) {
    accumulator[currentValue.toLowerCase()] = messageBody[currentValue];
    return accumulator;
  }, {});

  const result = await sheet.getRows();
  const columns = result.rows[0];
  const MAXCOL = columns.length;
  let row = [];
  for(let i=0; i<MAXCOL; i++) {
    if(lowerBody[columns[i]] !== undefined) {
      row.push(lowerBody[columns[i]]);
    }
  }
  if(row.length > 0) {
    await sheet.appendRow(row);
  }
  res.json( { response: 'success'} );
}
app.post('/api', jsonParser, onPost);

async function onPatch(req, res) {
  const column  = req.params.column.trim().toLowerCase();;
  const value  = req.params.value.trim();
  const messageBody = req.body;

  const lowerBody = Object.keys(messageBody).reduce(function(accumulator, currentValue) {
    accumulator[currentValue.toLowerCase()] = messageBody[currentValue];
    return accumulator;
  }, {});

  const result = await sheet.getRows();
  const items = toJSON(result.rows);
  const columns = result.rows[0];
  const MAXCOL = columns.length;

  const index = items.map(function(item) {
    return item[column];
  }).indexOf(value);

  if(index !== -1) {
    let row = [];
    for(let i=0; i<MAXCOL; i++) {
      if(lowerBody[columns[i]] !== undefined) {
        row.push(lowerBody[columns[i]]);
      }else if(items[index][columns[i]] !== undefined){
        row.push(items[index][columns[i]]);
      }
    }
    if(row.length > 0) {
      await sheet.setRow(index+1,row);
    }
  }
  res.json( { response: 'success'} );
}
app.patch('/api/:column/:value', jsonParser, onPatch);

async function onDelete(req, res) {
  const column  = req.params.column.trim().toLowerCase();
  const value  = req.params.value.trim();

  const result = await sheet.getRows();
  const items = toJSON(result.rows);
  const index = items.map(function(item) {
    return item[column];
  }).indexOf(value);

  if(index !== -1) {
    await sheet.deleteRow(index+1);
  }
  res.json( { response: 'success'} );
}
app.delete('/api/:column/:value',  onDelete);


// Please don't change this; this is needed to deploy on Heroku.
const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log(`Owo: Server listening on port ${port}!`);
});
