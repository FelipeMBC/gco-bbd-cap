  ///////////////////
  ///////GETPADRE////
  ///////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getInfoCategoria4(idPadre) {
    let sql;
    let outPut = [];
    try {
      sql = `
      SELECT
        cat.*
      FROM DB_CATEGORIA AS cat
      WHERE cat.ID_PADRE = ?
      ORDER BY cat.ID_TIPO_VISUALIZADOR DESC, cat.ID_CATEGORIA ASC
    `;
      let result = await cds.run(sql, [idPadre]);

      for (const gcat of result) {
        const record = {};
        record.ID_CATEGORIA = Number(gcat.ID_CATEGORIA);
        record.ID_PADRE = Number(gcat.ID_PADRE);
        record.ID_TIPO = Number(gcat.ID_TIPO);
        record.TITULO = gcat.TITULO;
        record.ID_TIPO_VISUALIZADOR = gcat.ID_TIPO_VISUALIZADOR;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getInfoCategoria4", query: sql }
    }
    return outPut;
  };

  async function getCategoria(idDocumento, idTipoDocumento) {
    let sql;
    let record = "";
    try {
      sql = `
      SELECT DISTINCT NODO_HIJO
      FROM DB_DETALLE
      WHERE ID_CATEGORIA_HOJA = ? AND ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [idDocumento, idTipoDocumento]);

      for (const gcat of result) {
        record = Number(gcat.NODO_HIJO);
      }
    } catch (e) {
      return { error: e.message, accion: "getCategoria", query: sql }
    }
    return record;
  };

  this.on('deleteDetalle', async (req) => {
    const { idDocumento, idTipoDocumento } = req.data.input
    let sql;
    try {
      const idCategoria = await getCategoria(idDocumento, idTipoDocumento);

      sql = `
      DELETE FROM DB_DETALLE
      WHERE ID_CATEGORIA_HOJA = ? AND ID_TIPO_DOCUMENTO = ?
    `;
      await cds.run(sql, [idDocumento, idTipoDocumento]);

      return idCategoria; //Se elimino
    } catch (e) {
      return "FALLO";
    }
  });

  this.on('getData18', async (req) => {
    const { idPadre } = req.data.input;
    const visualizadores = await getInfoCategoria4(idPadre);
    return visualizadores;
  });

  async function getEspejo(idPadre) {
    let sql;
    let record = {
      PADRE: Number(idPadre) + 1,
      FLAG: false
    };

    try {
      sql = `SELECT ID_CATEGORIA, PATHSP FROM DB_CATEGORIA 
              WHERE ID_CATEGORIA_ESPEJO = ?`;

      const result = await cds.run(sql, [idPadre]);

      for (const ges of result) {
        record = {};
        record.PADRE = Number(ges.ID_CATEGORIA);
        record.FLAG = String(ges.PATHSP);
      }
    } catch (e) {
      return { error: e.message, accion: "getEspejo", query: sql }
    }
    return record;
  };

  this.on('getTD', async (req) => {
    const { idPadre } = req.data.input;
    let sql;
    let record = false;

    try {
      sql = `SELECT DISTINCT ID_CATEGORIA FROM DB_CATEGORIA 
              WHERE ID_CATEGORIA_ESPEJO = ?
              AND APP = 'Contenido'`;

      const result = await cds.run(sql, [idPadre]);

      for (const gtd of result) {
        record = gtd.ID_CATEGORIA;
      }
    } catch (e) {
      return { error: e.message, accion: "getTD", query: sql }
    }
    return record;
  });

  this.on('getDataEspejo', async (req) => {
    const { idPadre } = req.data.input;
    const visualizadores = await getEspejo(idPadre);

    return visualizadores;
  });

});