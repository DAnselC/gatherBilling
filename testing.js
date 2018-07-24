const mysql = require('mysql');
const { promisify } = require('es6-promisify');
var pool = require('./database.js')

main();

async function main() {
  let clients = await getClients();
  console.log(clients);
}

async function getClients() {
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
}
