
  ////////////////////////
  ///////UPDATEDOCUMENT///
  ////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getNombreDocumento(idCat) {

    let outPut = []

    try {
      const sql = `SELECT * FROM DB_VALIDACION
                    WHERE ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [idCat]);

      for (const gn of result) {
        let record = {};
        record.TIPO_DATO = gn.TIPO_DATO;
        record.TABLA_SAP = gn.TABLA_SAP;
        record.CAMPO_TABLA_SAP = gn.CAMPO_TABLA_SAP;
        record.FORMATO_FECHA = gn.FORMATO_FECHA;

        outPut.push(record)
      }
    } catch (e) {
      return "FALLO"
    }
    return outPut;
  };

  this.on('getNodo', async (req) => {
    const { idCat } = req.data;
    const rsp = await getNombreDocumento(idCat)

    return rsp;
  });

});