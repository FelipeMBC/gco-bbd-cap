  
  ///////////////////////
  ////functionIndex//////
  ///////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getIdIndex() {
    try {
      const sql = `
          SELECT "ID_INDEX".NEXTVAL AS ID FROM DUMMY`;

      const result = await cds.run(sql);

      if (result.length > 0) {
        return result[0].ID;

      }
    } catch (e) {
      return null
    }
  };

  async function updateMetadata(idDoc, tipoDocumento) {
    let sql1, sql2;

    try {
      sql1 = `
        UPDATE DB_METADATA
        SET ID_DOCUMENTO = ?
        WHERE ID_TIPO_DOCUMENTO = ?`

      const result1 = await cds.run(sql1, [idDoc, tipoDocumento]);

      sql2 = `
        UPDATE DB_METADATA_VALUE
        SET ID_DOCUMENTO = ?
        WHERE ID_TIPO_DOCUMENTO = ?`

      const result2 = await cds.run(sql2, [idDoc, tipoDocumento])

      return (Number(result1) > 0 || Number(result2) > 0) ? "OK" : "OK";

    } catch (e) {
      return { error: e.message, accion: "updateMetadata", query: sql1 + ql2 }
    }

  }; /*Funcion no se ocupa, esta documentada en InsertIndex en llamarlo en el XSJS*/

  this.on('insertIndex', async (req) => {
    let sql;
    try {

      const { json } = req.data;

      const ID_INDEX = await getIdIndex();
      const ID_TIPO_DOCUMENTO = json[0].ID_TIPO_DOCUMENTO;
      const ID_DOCUMENTO = json[0].ID_DOCUMENTO;
      const ID_APP = (json[0].ID_APP === 0 ? null : json[0].ID_APP);
      const ID_PROCESO = (json[0].ID_PROCESO === 0 ? null : json[0].ID_PROCESO);
      const ID_NODO = (json[0].ID_NODO === -1 ? null : json[0].ID_NODO);
      const APP_ORIGEN = json[0].APP_ORIGEN;
      

      if (ID_INDEX == null) return "FALLO";

      sql = `INSERT INTO DB_INDEX VALUES (?,?,?,?,?,?,?)`;

      await cds.run(sql, [ID_INDEX, ID_TIPO_DOCUMENTO, ID_DOCUMENTO, ID_APP, ID_PROCESO, ID_NODO, APP_ORIGEN]);

      // await updateMetadata(ID_DOCUMENTO, ID_TIPO_DOCUMENTO);

      return "OK";
    } catch (e) {
      return { error: e.message, accion: "insertIndex", query: sql};
    }
  });

});
  