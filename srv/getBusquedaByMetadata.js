
/////////////////////////
//getBusquedaByMetadata//
/////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  function orderFecha(fecha) {
    let newFecha = fecha.split("-")[2] + "-" + fecha.split("-")[1] + "-" + fecha.split("-")[0];
    return newFecha;
  };

  async function getIdDocumento(nombreArchivo) {
    let sql;
    let sValue = [];

    try {
      sql = `SELECT DOC.ID_DOCUMENTO,
                    DOC.ID_TIPO_DOCUMENTO
                  FROM DB_DOCUMENTO AS DOC
                  WHERE DOC.NOMBRE = ?`;

      const result = await cds.run(sql, [nombreArchivo]);
      for (const rs of result) {
        let record = {};
        record.ID_DOCUMENTO = rs.ID_DOCUMENTO;
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;;

        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: getIdDocumento, query: sql }
    }
    return sValue;
  };

  async function getModelTipoDocumento(idTipoDocumento) {
    let sql;
    let sValue = [];

    try{
      sql = `SELECT ID_TIPO_DOCUMENTO, NOMBRE FROM DB_TIPO_DOCUMENTO
                     WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idTipoDocumento]);
      for (const rs of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.NOMBRE = rs.NOMBRE;
        sValue.push(record);
      }
    }catch (e){
      return { error: e.message, accion: getModelTipoDocumento, query: sql }
    }
    return sValue;
  }

  async function getTipoMetadata(idDocumento, idTipoDocumento) {
    let sql;
    let sValue = [];
    
    try{
      sql = `SELECT DISTINCT TD.NOMBRE,
                             MET.ATRIBUTO,
                             MET.TIPO_ATRIBUTO
                  FROM DB_METADATA AS MET
                  JOIN DB_TIPO_DOCUMENTO AS TD
                    ON TD.ID_TIPO_DOCUMENTO = MET.ID_TIPO_DOCUMENTO
                  WHERE MET.ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [idTipoDocumento]);
      for (const rs of result) {
        let record = {};
        record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE;
        record.ATRIBUTO = rs.ATRIBUTO;
        record.TIPO_ATRIBUTO = rs.TIPO_ATRIBUTO;
        record.ID_TIPO_DOCUMENTO = idTipoDocumento;
        record.ID_DOCUMENTO = idDocumento;
        record.MODEL_TIPO_DOCUMENTO = await getModelTipoDocumento(idTipoDocumento);

        sValue.push(record);
      }
    }catch (e){
      return { error: e.message, accion: "getTipoMetadata", query: sql }
    }
    return sValue;
  };

  this.on("update", async (req) => {
    const { ND } = req.data;
    console.log("ND: ", ND);

    let resp, vis;

    resp = await getIdDocumento(ND);

    const idDocumento = resp[0].ID_DOCUMENTO;
    const idTipoDocumento = resp[0].ID_TIPO_DOCUMENTO;

    vis = await getTipoMetadata(idDocumento, idTipoDocumento);
    return vis;
  });

});
