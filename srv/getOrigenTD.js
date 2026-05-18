 /////////////////////
  ///////GETORIGENTD////
  //////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getOrigen(tipoDocumento) {
    let sql;
    let record = false;

    try {
      sql = `
        SELECT ORIGEN
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO = ?
      `;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const r of result) {
        if (r.ORIGEN === 'Ingenieria GLP') {
          record = true;
        }
      }

    } catch (e) {
      return { error: e.message, accion: "getOrigen", query: sql }
    }
    return record;
  };

  this.on('get', async (req) => {
    const { tipoDocumento } = req.data;
    const visualizadores = await getOrigen(tipoDocumento);
    return visualizadores;
  });

});