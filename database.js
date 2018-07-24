const mysql = require('mysql')
const { promisify } = require('es6-promisify')

var pool = mysql.createPool({
  connectionLimit: 1,
  host: '127.0.0.1',
  user: 'anselcolby',
  password: 'Jdv2rEFVk5phwk59',
  database: 'dose_health_billing'
})

pool.query = promisify(pool.query) // Magic happens here.

module.exports = pool
