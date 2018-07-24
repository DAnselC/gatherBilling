const google = require('googleapis');
const async = require('async');
const nameParser = require('humanparser');
const { promisify } = require('es6-promisify');
const mysql = require('mysql');

const authentication = require('./authentication');
const pool = require('./database');

const sheets = google.sheets('v4');
const getSheet = promisify(sheets.spreadsheets.get);
const updateSheet = promisify(sheets.spreadsheets.batchUpdate);


var updatedRows;


main();


async function main() {
  try {
    console.log('>>>> authenticating');
    let auth = await authentication.authenticate();
    let rows = await getRows(auth);
    let clients = await getClientsFromDB();
    rows = await updateRowRequest(rows, clients);
    let res = await batchUpdate(auth, rows);
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 */
async function getRows(auth) {
  console.log('>>>> valid authentication');
  console.log('>>>> retrieving row data . . .');
  const params = {
    auth: auth,
    spreadsheetId: '1e4Iw9LaefbGvOkR3kIEaP4obASj5o8Gtgu3UxMVj4xA', // test ID
    // spreadsheetId: '1lbSgA6WaBXEzeoIcffADGfOTOMAM1tsW9CizfckXz8w', // real ID
    ranges: 'Master Billing Sheet!A5:B',
    includeGridData: true
  }

  try {
    const response = await getSheet(params);
    let rows = response.sheets[0].data[0].rowData;
    updatedRows = rows;

    if (rows.length  > 0) {
      console.log('>>>> retrieved row data');
      return rows;
    } else {
      console.log('No data found');
    }

  } catch (e) {
    console.error('>>>> The API returned n error: ');
    console.log(e);
    return null;
  }
}

async function batchUpdate(auth, rows) {
  console.log('>>>> updating rows . . .');
  const request = {
    auth: auth,
    spreadsheetId: '1rEl1zccIysP2q80g2g6XvKCcC7mu3--L9MUL4u1Xvtg',
    resource: {
      requests: [{
        updateCells: {
          start: {
            sheetId: 1781934386,
            rowIndex: 4,
            columnIndex: 0
          },
          'fields': '*',
          rows: rows
        }
      }]
    }
  };

  try {
    let res = await updateSheet(request);
    console.log('>>>> updated the sheet');
  } catch (e) {
    console.log('>>>> The API returned an error: ', e);
  }
}

async function getClientsFromDB() {
  console.log('>>>> retrieving clients from DB . . .');
  let clients = [];

  try {
      var results = await pool.query('SELECT * FROM client')
  } catch(err) {
      throw new Error(err)
  }
  for (var i = 0; i < results.length; i++) {
    result = results[i];
    client = {
      name: result.firstName + ' ' + result.lastName,
      id: result.clientId
    }
    clients.push(client);
  }
  pool.end();
  return clients;

  console.log('>>>> retrieved clients from DB');
  return clients;
}

async function updateRowRequest(rows, clients) {
  for (var i = 0; i < clients.length; i++) {
    let client = clients[i];
    for (var j = 0; j < rows.length; j++) {
      const cells = rows[j].values;
      if (cells) {
        const cell = cells[1];
        if ((cell) && (cells[0].userEnteredValue) && (cells[0].userEnteredValue.stringValue === client.name)) {
          cell.userEnteredValue = { numberValue: client.id };
        }
      }
    }
  }
  return rows;
}
