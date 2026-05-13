  ////////////////////////////////
  ///////UPDATENOMBREDOCUMENTO////
  ////////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function updateNombreCarpeta(json) {
    const idCat = json[0].ID_CATEGORIA;
    const nombre = json[0].TITULO;
    const desc = json[0].DESCRIPCION;
    const usuario = json[0].USUARIO;
    const responsable = json[0].RESPONSABLE;
    const correo = json[0].CORREO;
    const nombreDinamico = `${nombre}_Dinamico`;

    try {
      await cds.run(
        `UPDATE DB_CATEGORIA
       SET TITULO = ?, DESCRIPCION = ?, USERNAME = ?, NOMBRE = ?, MAIL = ?
       WHERE ID_CATEGORIA = ?`,
        [nombre, desc, usuario, responsable, correo, idCat]

      );
      console.log("UPDATE 1 OK")

      await cds.run(
        `UPDATE DB_CATEGORIA
       SET TITULO = ?, DESCRIPCION = ?, USERNAME = ?, NOMBRE = ?, MAIL = ?
       WHERE ID_CATEGORIA_ESPEJO = ? AND ORIGEN = 'Estático'`,
        [nombre, desc, usuario, responsable, correo, idCat]
      );
      console.log("UPDATE 2 OK")

      await cds.run(
        `UPDATE DB_CATEGORIA
       SET TITULO = ?, DESCRIPCION = ?, USERNAME = ?, NOMBRE = ?, MAIL = ?
       WHERE ID_CATEGORIA_ESPEJO = ? AND ORIGEN = 'Dinámico'`,
        [nombreDinamico, desc, usuario, responsable, correo, idCat]
      );
      console.log("UPDATE 3 OK")

      return "OK";
    } catch (e) {
      return { error: e.message, respuesta: "FALLO" };
    }
  };

  async function updateNombreDocumento(json) {
    const nombreOriginal = json[0].nombreOriginal;
    const nombre = json[0].nombre;
    const urlImagenDec = json[0].urlImagen;
    const urlIconoDec = json[0].urlIcono;
    console.log(nombreOriginal, nombre, urlImagenDec, urlIconoDec)

    try {
      const sql = `
      UPDATE DB_CATEGORIA
      SET TITULO= ?, URL_IMAGEN = ?, URL_ICONO = ?
      WHERE TITULO = ?
    `;
      await cds.run(sql, [nombre, urlImagenDec, urlIconoDec, nombreOriginal]);
      return "OK";
    } catch (e) {
      return { error: e.message };
    }
  };

  this.on('updateCarpeta', async (req) => {
    const { json } = req.data.input;
    const rsp = await updateNombreCarpeta(json);
    return rsp;
  });

  this.on('updateNombreData', async (req) => {
    const { json } = req.data.input;
    const rsp = await updateNombreDocumento(json);
    return rsp;
  });

});