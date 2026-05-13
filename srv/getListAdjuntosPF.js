  ////////////////////////////
  ///////GETLISTADJUNTOSPF////
  /////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getListaAdjuntos(idPregunta) {
    let sql;
    const outPut = [];

    try {
      sql = `
      SELECT TITULO_ADJUNTO, URL
      FROM DB_ADJUNTO_PREGUNTA
      WHERE ID_PREGUNTA = ?
    `;

      const result = await cds.run(sql, [idPregunta]);

      for (const rs of result) {
        let record = {};
        record.TITULO_ADJUNTO = rs.TITULO_ADJUNTO;
        record.URL = rs.URL;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getListaAdjuntos", query: sql }
    }

    return outPut;
  };

  this.on('get', async (req) => {
    const { idPregunta } = req.data;
    const respLista = await getListaAdjuntos(idPregunta);

    return respLista;
  });

});