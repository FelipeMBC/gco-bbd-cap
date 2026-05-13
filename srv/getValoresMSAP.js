  ////////////////////////////
  ///////GETVALORESMSAP///////
  ////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

 
  async function getPadre(idCategoria) {
    let sql;
    let record = "";

    try {
      sql = `SELECT ID_PADRE FROM DB_CATEGORIA 
               WHERE ID_CATEGORIA = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const gp of result) {
        record = Number(gp.ID_PADRE)
      }
    } catch (e) {
      return { error: e.message, accion: "getPadre", query: sql }
    }
    return record;
  };

  async function getIdDinamico(idCategoria) {
    let sql;
    let record = "";

    try {
      sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA 
               WHERE ORIGEN = 'Dinámico' AND APP = 'Contenido' AND ID_CATEGORIA_ESPEJO = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const rs of result) {
        record = rs.ID_CATEGORIA;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdDinamico1", query: sql }
    }
    return record;
  };

  async function getTitulo(idCategoria) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT TITULO, ORIGEN FROM DB_CATEGORIA 
               WHERE ID_CATEGORIA = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const rs of result) {
        let record = {};
        record.TITULO = rs.TITULO;
        record.IDCATEGORIA = await getIdDinamico(Number(idCategoria));
        record.ORIGEN = rs.ORIGEN;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTitulo", query: sql }
    }
    return outPut;
  };

  async function getRecursivaNodosDinamicos(outPut, nodoPadre) {
    const recursiva = async (outputResult, nPadre) => {

      if (!nPadre || nPadre === 0) {
        return outputResult;
      }

      let sql = `
      SELECT ID_CATEGORIA, TITULO, ORIGEN
      FROM DB_CATEGORIA
      WHERE ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [nPadre]);

      for (const rs of result) {

        let recordValores = {};
        recordValores.TITULO = rs.TITULO;
        recordValores.IDCATEGORIA = await getIdDinamico(Number(rs.ID_CATEGORIA));
        recordValores.ORIGEN = rs.ORIGEN;

        outputResult.push(recordValores);
      }

      const siguientePadre = await getPadre(nPadre);

      return await recursiva(outputResult, siguientePadre);
    };

    return await recursiva(outPut, nodoPadre)
  };

  this.on('get', async (req) => {

    const { idCategoria } = req.data;

    let outPut = [];
    let result = [];

    outPut = await getTitulo(idCategoria);

    const idNodoPadre = await getPadre(idCategoria);
    const outPutGenera = await getRecursivaNodosDinamicos(outPut, idNodoPadre);

    console.log("Recursiva completa:", outPutGenera);

    for (let i = 0; i < outPutGenera.length; i++) {
      if (outPutGenera[i].ORIGEN === "Dinámico") {
        result.push(outPutGenera[i]);
      }
    }

    return result;
  });

});
