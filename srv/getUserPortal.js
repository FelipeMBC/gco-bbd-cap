///////////////////////
///////GETUSERPORTAL///
///////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function getUserNameUser(user) {
    let sql;
    let outPut = [];
    try {
      sql = `SELECT NOMBRE, USERNAME, CORREO FROM DB_USUARIO
               WHERE ID_USUARIO = ?`;
      const result = await cds.run(sql, [user]);

      for (const guser of result) {
        let record = {};
        record.NOMBRE = guser.NOMBRE;
        record.USERNAME = guser.USERNAME;
        record.CORREO = guser.CORREO;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getUserNameUser", query: sql }
    }
    return outPut;
  };

  this.on('getUserName', async (req) => {
    const { user } = req.data;
    const visualizadores = await getUserNameUser(user);
    return visualizadores;
  });

});
