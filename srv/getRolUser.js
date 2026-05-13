 /////////////////////
  ///////GETROLUSER////
  /////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");


  async function getRol1(userId, idTD, rol) {
    let sql;
    let sValue = false;
    try {
      sql = `
      SELECT ROLES.ID_ROLES
      FROM DB_ROLESXUSUARIOS AS RXU
      INNER JOIN DB_ROLES        AS ROLES  
       ON ROLES.ID_ROLES = RXU.ID_ROLES
      INNER JOIN DB_ROLESXACCIONES AS RXA  
       ON ROLES.ID_ROLES = RXA.ID_ROLES
      INNER JOIN DB_ACCION         AS ACC  
       ON ACC.ID_ACCION = RXA.ID_ACCION
      WHERE RXU.ID_USUARIO = ? AND ROLES.ID_TIPO_DOCUMENTO = ? AND ACC.NOMBRE = ?
    `;
      const result = await cds.run(sql, [userId, idTD, rol]);
      for (const _ of result) {
        sValue = true;
      }
    } catch (e) {
      return sValue;
    }
    return sValue;
  };

  this.on('get', async (req) => {
    const { userId, idTD } = req.data;
    let record = {};

    record.ROLCARGA = await getRol1(userId, idTD, 'Crear');
    record.ROLAPROBAR = await getRol1(userId, idTD, 'Aprobar');
    record.ROLLECTURA = await getRol1(userId, idTD, 'Visualizar');
    record.ROLADMINISTRAR = await getRol1(userId, idTD, 'ADMINISTRAR');
    return record;
  });

});