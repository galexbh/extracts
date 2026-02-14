const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: false,
});

pool.connect()
  .then(() => console.log('✅ Conectado correctamente a PostgreSQL'))
  .catch(err => console.error('❌ Error de conexión a PostgreSQL:', err));

module.exports = { pool };