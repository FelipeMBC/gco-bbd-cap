 
////////////////////////
////deleteUserPortal////
////////////////////////

const cds = require("@sap/cds");
  
module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function deletePortal(idPortal) {
    try {
      const sql = `
          DELETE FROM DB_USUARIO_PORTAL
          WHERE ID_PORTAL = ?`
      await cds.run(sql, [idPortal])

      return "OK"
    } catch (e) {
      return { error: e.message, accion: "deletePortal" }
    }
  };

  this.on('delete', async (req) => {
    const { idPortal } = req.data.input;
    const respuesta = await deletePortal(idPortal)

    return respuesta;
  });

});