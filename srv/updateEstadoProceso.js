
  ////////////////////////////
  /////UPDATEESTADOPROCESO////
  ////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function updateEstadoProceso(estado, idPortal) {

    try {
      const sql = `UPDATE DB_PROCESOS 
                     SET ESTADO = ? 
                     WHERE ID_ADM_PORTAL = ?`;
      await cds.run(sql, [estado, idPortal]);

      return true;
    } catch (e) {
      return false;
    }
  };

  this.on('update', async (req) => {
    const { estado, idPortal } = req.data.input;
    const rsp = await updateEstadoProceso(estado, idPortal);
    return rsp
  });

});