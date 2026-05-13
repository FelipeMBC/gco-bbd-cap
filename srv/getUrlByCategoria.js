///////////////////////////
///////GETURLBYCATEGORIA////
////////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function getVisiblePreguntasFrecuentes6(idcat) {
    let sql;
    let sValue = false

    try {
      sql = `SELECT COUNT(*) FROM DB_PREGUNTA 
              WHERE ID_CATEGORIA = ?`;
      const result = await cds.run(sql, [idcat]);

      if (result.length > 0) {
        sValue = true;
      }
    } catch (e) {
      return { error: e.message, accion: "getVisiblePreguntasFrecuentes6", query: sql }
    }
    return sValue;
  };

  async function getIdCategoria(idCategoria) {
    let sql;
    let sValue;

    try {
      sql = `SELECT ID_PADRE FROM DB_CATEGORIA 
              WHERE ID_CATEGORIA = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const gcat of result) {
        sValue = await getVisiblePreguntasFrecuentes6(gcat.ID_PADRE);
      }
    } catch (e) {
      return { error: e.message, accion: "getIdCategoria3", query: sql }
    }
    return sValue;
  };

  async function getNodoPadre(idCategoria) {
    let sql;
    let sValue;

    try {
      sql = `SELECT ID_PADRE FROM DB_CATEGORIA 
              WHERE ID_CATEGORIA = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const npa of result) {
        sValue = npa.ID_PADRE;
      }
    } catch (e) {
      return { error: e.message, accion: "getNodoPadre", query: sql }
    }
    return sValue;
  };

  async function getInfoCategoria(idCategoria) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT DETALLE.URL, DETALLE.TYPE FROM DB_DETALLE AS detalle
               WHERE detalle.NODO_HIJO = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const rs of result) {
        let record = {};
        record.URL = rs.URL,
        record.FORMATO = rs.TYPE;
        record.VISIBLEPF = await getIdCategoria(idCategoria);
        record.NODO_PADRE = await getNodoPadre(idCategoria);

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getInfoCategoria6", query: sql }
    }
    return outPut;
  };

  this.on('get', async (req) => {
    const { idCategoria } = req.data;
    const visualizadores = await getInfoCategoria(idCategoria);
    return visualizadores;
  });

});