  //////////////////////
  ///////GETWORKFLOW////
  //////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getEstado3(nodo) {
    let sql;
    let des;
    try {
      sql = `SELECT est.DESCRIPCION FROM DB_ESTADO est
                JOIN DB_ESTRATEGIA_LIBERACION lib on lib.ESTADO = est.ID_ESTADO
                WHERE lib.ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [nodo]);

      for (const rs of result) {
        des = rs.DESCRIPCION;
      }
    } catch (e) {
      return { error: e.message, accion: "getEstado", query: sql }
    }
    return des;
  };

  async function getEstLib6(idTD) {
    let sql;
    let des = false;

    try {
      sql = `SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION
               WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idTD]);

      if (result.length > 0) {
        const rs = result[0]
        des = rs.ID_EST_LIB;
      }
    } catch (e) {
      return { error: e.message, accion: "getEstLib6", query: sql }
    }
    return des;
  };

  async function getWorkFlow3(idTD, nodo) {
    let sql;
    let output = [];

    try {
      sql = `SELECT NIVEL, NOMBREAPROBADOR, us.ID_USUARIO AS ID_USUARIO FROM DB_NIVELES
               JOIN DB_USUARIO AS us 
               ON us.NOMBRE = NOMBREAPROBADOR WHERE ID_EST_LIB = ?`;
      const result = await cds.run(sql, [nodo]);

      for (const rs of result) {
        let record = {};
        record.NIVEL = rs.NIVEL;
        record.NOMBRE_USUARIO_APROBADOR = rs.NOMBREAPROBADOR;
        record.ESTADO = await getEstado3(idTD);
        console.log("esto llega en record estado:", record.ESTADO)
        record.ID_USUARIO = rs.ID_USUARIO;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getWorkFlow3", query: sql }
    }
    return output;
  };

  this.on('getData30', async (req) => {

    const { idTD } = req.data.input;
    const idTipoDocumento = await getEstLib6(idTD); //740
    const visualizadores = (idTipoDocumento === false) ? [] : await getWorkFlow3(idTD, idTipoDocumento);

    return visualizadores;
  });

});