const google = require('googleapis');
const async = require('async');
const nameParser = require('humanparser');
const { promisify } = require('es6-promisify');
const mysql = require('mysql');
const readline = require('readline-sync');

const authentication = require('./authentication');
const pool = require('./database');

const sheets = google.sheets('v4');
const spreadsheetId = '1rEl1zccIysP2q80g2g6XvKCcC7mu3--L9MUL4u1Xvtg';
const sheetId = 1781934386;
const getSheet = promisify(sheets.spreadsheets.get);
const updateSheet = promisify(sheets.spreadsheets.batchUpdate);


main();


async function main() {
  try {
    let clientID = readline.question('>>>> Please input the ID of the client that you wish to add to the spreadsheet: ');
    console.log('>>>> authenticating');
    let auth = await authentication.authenticate();
    let rows = await getRows(auth);
    let client = await getClientFromDB(clientID);
    rows = await updateRowRequest(rows, client);
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
    spreadsheetId: spreadsheetId, // test ID
    // spreadsheetId: '1lbSgA6WaBXEzeoIcffADGfOTOMAM1tsW9CizfckXz8w', // real ID
    ranges: 'Master Billing Sheet!A5:B',
    includeGridData: true
  }

  try {
    const response = await getSheet(params);
    let rows = response.sheets[0].data[0].rowData;

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
    spreadsheetId: spreadsheetId,
    resource: {
      requests: [{
        updateCells: {
          start: {
            sheetId: sheetId,
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

async function getClientFromDB(clientID) {
  console.log('>>>> retrieving client from DB . . .');
  try {
    var results = await pool.query(`SELECT * FROM client WHERE clientId = ${clientID}`);
    client = {
      name: results[0].firstName + ' ' + results[0].lastName,
      id: results[0].clientId
    };
    pool.end();
    console.log('>>>> retrieved client from DB');
    return client;
  } catch(err) {
    pool.end();
    throw new Error(err)
  }




}

async function updateRowRequest(rows, client) {
  let matched = false;
  for (var j = 0; j < rows.length; j++) {
    const cells = rows[j].values;
    if (cells) {
      const cell = cells[1];
      if ((cell) && (cells[0].userEnteredValue)) {
        let sheetsName = nameParser.parseName(cells[0].userEnteredValue.stringValue);
        sheetsName = (sheetsName.firstName + ' ' + sheetsName.lastName).toLowerCase();
        let dbName = nameParser.parseName(client.name);
        dbName = (dbName.firstName + ' ' + dbName.lastName).toLowerCase();
        if (sheetsName === dbName) {
          cell.userEnteredValue = { numberValue: client.id };
          matched = true;
        }
      }
    }
  }
  if (!matched) {
    throw new Error('Client not matched: ', client);
  }

  return rows;
}
