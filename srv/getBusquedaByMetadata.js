  
  /////////////////////////
  //getBusquedaByMetadata//
  /////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getIdDocumento(nombreArchivo) {
    let sql;
    let sValue = [];

    try {

      sql = `
        SELECT DOC.ID_DOCUMENTO, DOC.ID_TIPO_DOCUMENTO 
        FROM DB_DOCUMENTO DOC 
        WHERE DOC.NOMBRE = ?`;

      const result = await cds.run(sql, [nombreArchivo]);

      for (const gtiddoc of result) {
        let record = {};
        record.ID_DOCUMENTO = gtiddoc.ID_DOCUMENTO;
        record.ID_TIPO_DOCUMENTO = gtiddoc.ID_TIPO_DOCUMENTO;

        sValue.push(record);
      }

    } catch (e) {
      return { error: e.message, accion: "getIdDocumento", query: sql }
    }
    return sValue;
  };

  async function getTipoMetadata(idDocumento, idTipoDocumento) {
    let sql;
    const sValue = [];

    try {
      sql = `
      SELECT DISTINCT
        TD.NOMBRE       AS NOMBRE_TIPO_DOCUMENTO,
        MET.ATRIBUTO    AS ATRIBUTO,
        MET.TIPO_ATRIBUTO AS TIPO_ATRIBUTO
      FROM DB_METADATA MET
       JOIN DB_TIPO_DOCUMENTO TD
       ON TD.ID_TIPO_DOCUMENTO = MET.ID_TIPO_DOCUMENTO 
      WHERE MET.ID_TIPO_DOCUMENTO = ?`;
      //   AND MET.ID_DOCUMENTO = ?

      const result = await cds.run(sql, [idTipoDocumento /*, idDocumento*/]);

      for (const gtmt of result) {
        let record = {};
        record.NOMBRE_TIPO_DOCUMENTO = gtmt.NOMBRE_TIPO_DOCUMENTO;
        record.ATRIBUTO = gtmt.ATRIBUTO;
        record.TIPO_ATRIBUTO = gtmt.TIPO_ATRIBUTO;
        record.ID_TIPO_DOCUMENTO = idTipoDocumento;
        record.ID_DOCUMENTO = idDocumento;
        //   record.MODEL_TIPO_DOCUMENTO  = await getModelTipoDocumento(idTipoDocumento);

        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoMetadata", query: sql }
    }

    return sValue;
  };

  this.on('update', async (req) => {
    //re-hacer
    let { idDocumento, idTipoDocumento, nombreArchivo } = req.data.input;

    if (!idDocumento || !idTipoDocumento) {
      const resp = await getIdDocumento(nombreArchivo);
      idDocumento = resp[0].ID_DOCUMENTO;
      idTipoDocumento = resp[0].ID_TIPO_DOCUMENTO;
    }

    const vis = await getTipoMetadata(idDocumento, idTipoDocumento);
    return vis;
  });

  });
