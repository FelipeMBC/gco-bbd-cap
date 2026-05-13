/////////////////////////////
///////GETMETADATAARCHIVOS///
/////////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function getMetadataArchivo(idDocumento) {
    let sql;
    let sValue = [];

    try {
      sql = `SELECT DISTINCT ATRIBUTO,
                                VALUE,
                            VALUEDATE,
                            VALUETIME,
                        TIPO_ATRIBUTO,
                               ORIGEN FROM DB_METADATA_VALUE WHERE ID_DOCUMENTO = ? ORDER BY ORIGEN ASC`;

      const result = await cds.run(sql, [idDocumento]);

      for (const rs of result) {
        let record = {};
        record.ATRIBUTO = rs.ATRIBUTO;

        if (rs.TIPO_ATRIBUTO === "DATE") {
          record.VALUE = rs.VALUEDATE;
        } else if (rs.TIPO_ATRIBUTO === "TIME") {
          record.VALUE = rs.VALUETIME.toString();
        } else {
          record.VALUE = rs.VALUE;
        }

        record.ORIGEN = rs.ORIGEN;
        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getMetadataArchivo", query: sql }
    }

    return sValue;
  }

  this.on('get', async (req) => {
    const { idDocumento } = req.data;
    const tipos = await getMetadataArchivo(idDocumento);

    return tipos;
  });

});