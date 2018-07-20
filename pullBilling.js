// Pulls the clients that need to be billed (and the month(s) into a json object)

const google = require('googleapis');
const async = require('async');
const authentication = require("./authentication");
const nameParser = require('humanparser');
const { promisify } = require('es6-promisify');
const fs = require('fs');

/**
 * This function
 * @param auth
 * @return
 */
async function getData(auth) {
  var sheets = google.sheets('v4');
  const asyncGet = promisify(sheets.spreadsheets.get);
  const params = {
    auth: auth,
    // spreadsheetId: '1bSI0PgV7b3uz7nu3Kwiyda6jgDS1Sa2UeXq0B5ejoVk', // test ID
    spreadsheetId: '1lbSgA6WaBXEzeoIcffADGfOTOMAM1tsW9CizfckXz8w', // real ID
    ranges: 'Master Billing Sheet!A:BI',
    includeGridData: true
  }
  try {
    const res = await asyncGet(params);
    let rows = res.sheets[0].data[0].rowData
    return rows;
  } catch (e) {
    console.log('The API returned an error: ', e);
    return null;
  }
}

/**
 * This function
 * @param rows
 * @return
 */
function parseData(rows) {
  let firstName = '';
  let lastName = '';
  let setupDate = 'moment';
  let month = '';
  let amount = 0;
  let billingData = {'billing': []};

  for (var i = 4; i < rows.length; i++) {
    const cells = rows[i].values;
    for (var j = 7; j < cells.length; j++) {
      const cell = cells[j];
      if (!cell.effectiveFormat) continue;
      const color = cell.effectiveFormat.backgroundColor;
      const text = cell.userEnteredValue;
      if ( (cell !== {})
        && ((color.red === 1)
        && (!color.green && !color.blue))
        && (text)
      ) {
        let name = nameParser.parseName(cells[0].formattedValue);
        firstName = name.firstName;
        lastName = name.lastName;
        setupDate = cells[3].formattedValue;
        val = ((Math.ceil(((j - 6) / 3)) - 1) * 3) + 7;
        month = rows[0].values[val].formattedValue;
        amount = cell.userEnteredValue.numberValue;
        billingData = createElement(billingData, firstName, lastName, setupDate, month, amount);
      }
    }
  }

  return billingData;
}

/**
 * This function
 * @param firstName
 * @param lastName
 * @param setupDate
 * @param month
 * @param amount
 * @return
 */
function createElement(data, firstName, lastName, setupDate, month, amount) {
  data.billing.push({
    firstName,
    lastName,
    setupDate,
    billingData: [
      {
        month,
        amount
      }
    ]
  });
  return data;
}

/**
 *
 */
function sumBills(data) {
  billingDict = {};
  for (var i = 0; i < data.length; i++) {
    fullName = data[i].firstName + ' ' + data[i].lastName;
    if (billingDict[fullName]) {
      billingDict[fullName] += data[i].billingData[0].amount;
    } else {
      billingDict[fullName] = data[i].billingData[0].amount;
    }
  }
  return billingDict;
}

/**
 * This is the main handler of the progam
 * @return
 */
async function main() {
  let data

  try {
    let auth = await authentication.authenticate();
    let rows = await getData(auth);

    // the JSON object that contains all the info
    let billingData = await parseData(rows);
    // data = JSON.stringify(billingData);
    // fs.writeFileSync('billing', data);

    // might not be necessary but this consolidates clients and sums their dues
    let sum = sumBills(billingData.billing);

    // data = JSON.stringify(sum);
    // fs.writeFileSync('billing.json', data);
  } catch (e) {
    console.error(e);
  }
}

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> //
main();
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
