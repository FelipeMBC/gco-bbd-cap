  ////////////////////////////
  ///////GETINSTANCIAWORKFLOW//
  /////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getDatosWorkflow(idEstLib) {
    let sql;
    let record = {};
    try {
      sql = `
        SELECT USU.USERNAME AS SIGUIENTELIBERADOR,
        NIV.NOMBREAPROBADOR AS NOMBREUSUARIO
        FROM DB_NIVELES NIV
        JOIN DB_USUARIO USU
          ON USU.NOMBRE = NIV.NOMBREAPROBADOR
       WHERE NIV.ID_EST_LIB = ?
         AND NIV.NIVEL = 1
    `;
      const result = await cds.run(sql, [idEstLib]);
      for (const gdat of result) {
        record.SIGUIENTELIBERADOR = gdat.SIGUIENTELIBERADOR;
        record.NOMBREUSUARIO = gdat.NOMBREUSUARIO;
      }
    } catch (e) {
      return { error: e.message, accion: "getDatosWorkFlow", query: sql }
    }
    return record;
  };

  async function getIdEstLib(tipoDocumento) {
    let sql;
    const outPut = [];
    try {
      sql = `
      SELECT ID_EST_LIB
        FROM DB_ESTRATEGIA_LIBERACION
       WHERE ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [tipoDocumento]);
      let record = {};
      for (const gest of result) {
        record = await getDatosWorkflow(gest.ID_EST_LIB);
      }
      outPut.push(record);
    } catch (e) {
      return { error: e.message, accion: "getIdEstLib", query: sql }
    }
    return outPut;
  };

  async function updateSLib(idDocumento, siguienteLiberador) {
    try {
      const sql = `
      UPDATE DB_DOCUMENTO
         SET SIGUIENTELIBERADOR = ?
       WHERE ID_DOCUMENTO = ?
    `;
      await cds.run(sql, [siguienteLiberador, idDocumento]);
      return "SI";
    } catch (e) {
      return "NO";
    }
  };

  this.on('getData8', async (req) => {
    const { tipoDocumento } = req.data.input;
    const visualizadores = await getIdEstLib(tipoDocumento);
    return visualizadores;
  });

  this.on('getUpdateDate', async (req) => {
    const { tipoDocumento, idDocumento } = req.data.input;
    const visualizadores = await getIdEstLib(tipoDocumento);
    let sValue = "NO";

    if (visualizadores.length > 0) {
      const siguienteLiberador = visualizadores[0].SIGUIENTELIBERADOR;
      sValue = await updateSLib(idDocumento, siguienteLiberador);
    }
    return sValue;
  });

});
