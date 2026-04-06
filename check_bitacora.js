const { pool } = require("./src/db");
(async () => {
  try {
    const result = await pool.query('SELECT * FROM seguridad.tbl_ms_bitacora ORDER BY fecha_evento DESC LIMIT 3');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error("Error DB:", err);
  } finally {
    process.exit(0);
  }
})();
