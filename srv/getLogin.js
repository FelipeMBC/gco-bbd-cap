  /////////////////////
  ///////GETLOGIN//////
  /////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  this.on('verificaPass', async (req) => {
    const { user, pass } = req.data.input;
    let sql;
    let mensaje;

    try {
      sql = `
        SELECT ID_USUARIO
        FROM DB_USUARIO
        WHERE PASSWORD = ? AND USERNAME = ?
      `;

      const result = await cds.run(sql, [pass, user]);

      if (result.length > 0) {
        mensaje = result[0].ID_USUARIO;
      } else {
        mensaje = "NO";
      }
    } catch (e) {
      return "NO";
    }

    return mensaje;
  });

  this.on('verificaPassAprobador', async (req) => {
    const { user, pass } = req.data.input;
    let sql;
    let mensaje;

    try {

      sql = `
        SELECT USERNAME
        FROM DB_USUARIO
        WHERE PASSWORD = ? AND USERNAME = ?
      `;
      const result = await cds.run(sql, [pass, user]);

      if (result.length > 0) {
        mensaje = String(result[0].USERNAME);
      } else {
        mensaje = "NO";
      }
    } catch (e) {
      return "NO";
    }

    return mensaje;
  });

  function getEncode(codigo) {
    return Buffer.from(String(codigo), 'utf8').toString('base64');
  };

  function getDecode(codigo) {
    return Buffer.from(String(codigo), 'base64').toString('utf8');
  };
  });