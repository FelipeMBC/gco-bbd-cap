
  /////////////////////////////////
  ///////GETPREGUNTASFRECUENTES////
  /////////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getIdCategoria(idCategoria) {
    let sql;
    let sValue;
    try {
      sql = `
      SELECT ID_PADRE
      FROM DB_CATEGORIA
      WHERE ID_CATEGORIA = ?
    `;
      const result = await cds.run(sql, [idCategoria]);

      for (const r of result) {
        sValue = r.ID_PADRE;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdCategoria", query: sql }
    }
    return sValue;

  };

  async function getVisible(idPregunta) {
    let sql;
    let sValue = false;
    try {
      sql = `
      SELECT COUNT(*) AS CANT
      FROM DB_ADJUNTO_PREGUNTA
      WHERE ID_PREGUNTA = ?
    `;
      const result = await cds.run(sql, [idPregunta]);
      if (result.length > 0)
        sValue = true;


    } catch (e) {
      return { error: e.message, accion: "getVisible", query: sql }
    }
    return sValue;
  };

  async function getPF(idCat) {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT
        PREGUNTA.PREGUNTA,
        PREGUNTA.RESPUESTA,
        CATEGORIA.TITULO,
        PREGUNTA.ID_PREGUNTA
      FROM DB_PREGUNTA  AS PREGUNTA
      JOIN DB_CATEGORIA AS CATEGORIA
        ON PREGUNTA.ID_CATEGORIA = CATEGORIA.ID_CATEGORIA
      WHERE PREGUNTA.ID_CATEGORIA = ?
    `;
      const result = await cds.run(sql, [idCat]);

      for (const r of result) {
        let record = {
          PREGUNTA: r.PREGUNTA,
          RESPUESTA: r.RESPUESTA,
          TITULO: r.TITULO,
          ID_PREGUNTA: r.ID_PREGUNTA
        };
        record.VISIBLEADJUNTO = await getVisible(r.ID_PREGUNTA);
        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getPF", query: sql }
    }
    return outPut;
  };

  this.on('get', async (req) => {
    const { idCategoria } = req.data;
    let idCat = await getIdCategoria(idCategoria);
    const visualizadores = await getPF(idCat);

    return visualizadores;
  });

});