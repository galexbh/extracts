const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  // 🔒 SSL condicional: activar con PGSSL=true en variables de entorno
  // Si BD y server están en la misma red, SSL no es necesario
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,

  // ── Estabilidad de conexión ──────────────────────────────
  // Mantener las conexiones TCP vivas (evita "Connection terminated unexpectedly")
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  // Cerrar conexiones inactivas del pool tras 10 min
  idleTimeoutMillis: 600000,

  // Fallar rápido si no hay conexion disponible en 5 seg
  connectionTimeoutMillis: 5000,

  // Tamaño máximo del pool
  max: 10,
});

pool.on('error', (err) => {
  console.error('❌ [Pool] Conexión PostgreSQL perdida inesperadamente:', err.message);
});

pool.connect()
  .then(client => {
    console.log('✅ Conectado correctamente a PostgreSQL');
    client.release();
  })
  .catch(err => console.error('❌ Error de conexión a PostgreSQL:', err));

module.exports = { pool };
