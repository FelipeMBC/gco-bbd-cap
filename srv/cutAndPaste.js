
////////////////////////
/////cutAndPaste//////// 
////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function updatePath(pathsp, idcat) {
    let sql;
    try {
      sql = `
           UPDATE DB_CATEGORIA
           SET PATHSP = ?
           WHERE ID_CATEGORIA = ?`;

      await cds.run(sql, [pathsp, idcat]);
      return 0;
    } catch (e) {
      return { error: e.message, accion: "updatePath", query: sql }
    }
  };

  async function getPathSP(paths, pathspFinal, titulo) {
    let sql;
    let pathspOriginal = paths;
    let outPut = [];

    try {
      pathspOriginal = pathspOriginal.replace("/_api/web/folders/add(", "");

      sql = `
      SELECT ID_CATEGORIA, PATHSP
      FROM DB_CATEGORIA
      WHERE PATHSP LIKE ?
      ORDER BY ID_CATEGORIA ASC
    `;
      const result = await cds.run(sql, [`%${paths}%`]);

      for (const gpath of result) {
        let record = {};
        record.ID_CATEGORIA = gpath.ID_CATEGORIA;

        const respuesta = String(gpath.PATHSP).search(titulo);
        const str2 = String(gpath.PATHSP).slice(respuesta, String(gpath.PATHSP).length);

        const sPathSPUpdate = `${pathspFinal}/${str2}`;
        await updatePath(sPathSPUpdate, gpath.ID_CATEGORIA);

        const carpeta = sPathSPUpdate.replace("\‘GASCO", "'GASCO");
        // await createFolder(carpeta); //!!

        record.PATHSP = gpath.PATHSP;
        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getPathSP", query: sql }
    }

    return pathspOriginal;
  };

  // async function updatePadre(nodopaste, nodoCut) {
  //   try {
  //     const sql = `
  //         UPDATE DB_CATEGORIA
  //         SET ID_PADRE = ?
  //         WHERE ID_CATEGORIA = ?`;

  //     await cds.run(sql, [nodopaste, nodoCut]);
  //     return "Exito 0";
  //   } catch (e) {
  //     return { error: e.message, accion: "updatePadre", query: sql, info: 1 }
  //   }
  // };

  // async function getParContenido(nodo) {
  //   let outPut = "";
  //   let sql;
  //   try {
  //     sql = `
  //          SELECT MIN (ID_CATEGORIA) AS VALOR_MINCAT
  //           FROM DB_CATEGORIA
  //          WHERE ID_CATEGORIA_ESPEJO = ?`
  //     const result = await cds.run(sql, [nodo]);

  //     if (result.length > 0) {
  //       return result[0].VALOR_MINCAT
  //     }
  //   } catch (e) {
  //     return { error: e.message, accion: "getParContenido", query: sql }
  //   }
  //   return outPut;
  // };

  this.on('paste', async (req) => {
    const { json } = req.data.input;
    let ouptResponse = [];

    // const nodoCut = json.nodoCut;
    // const nodoPaste = json.nodoPaste;
    const pathspCortar = json.pathspCortar;
    const pathspPegar = json.pathspPegar;
    const titulo = json.titulo;

    try {
      // const nodoCutContenido = await getParContenido(nodoCut);
      // const nodoPasteContenido = await getParContenido(nodoPaste);
      // const resp1 = await updatePadre(nodoCut, nodoPaste);
      // const resp2 = await updatePadre(nodoCut, nodoPaste);
      // const body = "";

      const arrPathsp = await getPathSP(pathspCortar, pathspPegar, titulo);

      // if (resp > 0) {

      // } else {

      // }

      ouptResponse.push(arrPathsp);

      return ouptResponse;

    } catch (e) {
      return { error: e.message, accion: "paste" };
    }
  });

});