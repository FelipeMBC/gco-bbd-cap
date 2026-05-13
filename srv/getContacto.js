  
  
  /////////////////////////
  ///////GETCONTACTO///////
  /////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getContacto(empresa) {
    let sql;
    let outPut = [];

    try {
      sql = `
        SELECT * FROM
        DB_PROVEEDORES_ALMACENAMIENTO 
        WHERE NOMBRE = ?`;

      const result = await cds.run(sql, [empresa]);

      for (const gcon of result) {
        let record = {}
        record.NOMBRE = gcon.NOMBRE;
        record.CORREO = gcon.CORREO;
        record.CONTACTO = gcon.CONTACTO;
        record.RESPONSABLE = gcon.RESPONSABLE;
        // record.ALMACENAMIENTO = gcon.ALMACENAMIENTO;

        outPut.push(record);
      }

    } catch (e) {
      return { error: e.message, accion: "getContacto", query: sql }
    }
    return outPut;
  };

  this.on('getData3', async (req) => {
    const { empresa } = req.data.input;
    const visualizadores = await getContacto(empresa);

    return visualizadores;
  });

  });