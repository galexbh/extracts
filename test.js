const { pool } = require('./src/db.js');
const fs = require('fs');

(async () => {
  try {
    const res = await pool.query("SELECT id_usuario, tabla, accion, descripcion, fecha_evento FROM seguridad.tbl_ms_bitacora WHERE tabla = 'seguridad.tbl_personas' ORDER BY fecha_evento DESC LIMIT 5");
    fs.writeFileSync('personas_bit.json', JSON.stringify(res.rows, null, 2));
    console.log("Written");
  } catch(e) { console.error(e); }
  process.exit();
})();
