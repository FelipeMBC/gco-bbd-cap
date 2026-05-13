  //////////////////////////////////////////
  ///////GETPREGUNTASFRECUENTESMANTENEDOR////
  ///////////////////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");


  async function getIdCategoria1(idCategoria) {
    let sql;
    let sValue;

    try {
      sql = `SELECT ID_PADRE FROM DB_CATEGORIA
               WHERE ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [idCategoria]);

      for (const gcat of result) {
        sValue = gcat.ID_PADRE;
      }

      // if (result && result.length > 0) {
      //     sValue = result[result.length - 1].ID_PADRE;
      // }

    } catch (e) {
      return { error: e.message, accion: "getIdCategoria1", query: sql }
    }
    return sValue;
  };

  async function getVisible1(idPregunta) {
    let sql;
    let sValue;

    try {
      sql = `SELECT COUNT(*) FROM DB_ADJUNTO_PREGUNTA
              WHERE ID_PREGUNTA = ?`;
      const result = await cds.run(sql, [idPregunta]);

      if (result.length > 0) {
        sValue = true;
      } else {
        sValue = false;
      }
    } catch (e) {
      return { error: e.message, accion: "getVisible1", query: sql }
    }
    return sValue;
  };

  async function getPF1(idCat) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT PREGUNTA.PREGUNTA,
             PREGUNTA.RESPUESTA,
             CATEGORIA.TITULO,
             PREGUNTA.ID_PREGUNTA
               FROM DB_PREGUNTA PREGUNTA
               JOIN DB_CATEGORIA CATEGORIA
               ON PREGUNTA.ID_CATEGORIA = CATEGORIA.ID_CATEGORIA 
               WHERE PREGUNTA.ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [idCat]);

      for (const gpf of result) {
        let record = {};
        record.PREGUNTA = gpf.PREGUNTA;
        record.RESPUESTA = gpf.RESPUESTA;
        record.TITULO = gpf.TITULO;
        record.ID_PREGUNTA = gpf.ID_PREGUNTA;
        record.VISIBLEADJUNTO = await getVisible1(gpf.ID_PREGUNTA);

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getPF1", query: sql }
    }
    return outPut;
  };

  this.on('getData22', async (req) => {
    const { idCategoria } = req.data.input;
    let idCat = await getIdCategoria1(idCategoria);
    const visualizadores = await getPF1(idCat);

    return visualizadores;
  });

});