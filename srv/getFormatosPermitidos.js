  /////////////////////////////
  /////GETFORMATOPERMITIDOS////
  /////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getFormatosPermitidos(idTipoDocumento) {
    let sql;
    const outPut = [];
    try {
      sql = `
      SELECT formato.MYMETYPE, ptd.PESO, ptd.FORMATO, formato.EXTENSION
        FROM DB_FORMATOS formato 
        JOIN DB_PROP_TIPO_DOC ptd
          ON ptd.FORMATO = formato.NOMBRE_FORMATO
       where ptd.TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [idTipoDocumento]);
      for (const gform of result) {
        let record = {};
        record.MYMETYPE = gform.MYMETYPE;
        record.SIZE = Number(gform.PESO);
        record.TEXTO = gform.FORMATO;
        record.EXTENSION = gform.EXTENSION;
        outPut.push(record);

        record = {};
        record.MYMETYPE = gform.MYMETYPE;
        record.SIZE = Number(gform.PESO);
        record.TEXTO = String(gform.FORMATO).toUpperCase();
        record.EXTENSION = String(gform.EXTENSION).toUpperCase();
        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getFormatosPermitidos", query: sql }
    }
    return outPut;
  };

  this.on('getData6', async (req) => {
    const { idTipoDocumento } = req.data.input;
    const visualizadores = await getFormatosPermitidos(idTipoDocumento);
    return visualizadores;
  });

});