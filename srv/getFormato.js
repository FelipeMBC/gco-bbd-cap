  
  /////////////////////////
  ///////GETFORMATO////////
  /////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getFormato() {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT * FROM DB_FORMATOS
               ORDER BY NOMBRE_FORMATO ASC`;

      const result = await cds.run(sql);

      for (const gfor of result) {
        let record = {};
        record.ID_FORMATOS = gfor.ID_FORMATOS;
        record.NOMBRE_FORMATO = gfor.NOMBRE_FORMATO;
        record.MYMETYPE = gfor.MYMETYPE;
        record.EXTENSION = gfor.EXTENSION;

        outPut.push(record);
      }

    } catch (e) {
      return { error: e.message, accion: "getFormato", query: sql }
    }
    return outPut;
  };

  this.on('get', async () => {
    const visualizadores = await getFormato();
    return visualizadores;
  });

//   async function getIdDinamico(idCat) {
//     let sql;
//     let record = "";

//     try {
//       sql = `SELECT ID_CATEGORIA
//                FROM DB_CATEGORIA
//                WHERE ORIGEN ='Dinámico' AND APP='Estructura' AND ID_CATEGORIA_ESPEJO = ?`;

//       const result = await cds.run(sql, [idCat]);

//       if (result.length > 0) {
//         record = result[0].ID_CATEGORIA;
//       }
//     } catch (e) {
//       return { error: e.message, accion: "getIdDinamico", query: sql }
//     }
//     return record;
//   };

  async function getPadre(nodo) {
    let sql;
    let record = "";

    try {
      sql = `SELECT ID_PADRE FROM DB_CATEGORIA
           WHERE ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [nodo]);

      if (result.length > 0) {
        record = Number(result[0].ID_PADRE);
      }
    } catch (e) {
      return { error: e.message, accion: "getPadre", query: sql }
    }
    return record;
  };

  async function getRecursivaNodosDinamicos(arrOutPut, nodoPadre) {
    const recursiva = async (outputResult, nPadre) => {
      let outPutGenera;
      let nodo;

      if (nPadre === 0) {
        outPutGenera = outputResult;
        return outPutGenera;
      } else {
        const sql = `
        SELECT ID_CATEGORIA, TITULO, ORIGEN
          FROM DB_CATEGORIA
         WHERE ID_CATEGORIA = ?
      `;
        const result = await cds.run(sql, [nPadre]);
        if (!result || result.length === 0) {
          outPutGenera = outputResult;
          return outPutGenera;
        }

        for (const gerecur of result) {
          nodo = gerecur.ID_CATEGORIA;

          let recordValores = {};
          recordValores.ID_CATEGORIA = gerecur.ID_CATEGORIA;
          recordValores.TITULO = gerecur.TITULO;
          recordValores.ORIGEN = gerecur.ORIGEN;

          outputResult.push(recordValores);
        }

        outPutGenera = outputResult;

        nPadre = await getPadre(nodo);

        return recursiva(outputResult, nPadre);
      }
    };
    return recursiva(arrOutPut, nodoPadre);
  };

  async function getTitulo(nodo) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT TITULO, ORIGEN FROM DB_CATEGORIA 
      WHERE ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [nodo]);

      for (const gt of result) {
        let record = {};
        record.TITULO = gt.TITULO;
        record.IDCATEGORIA = Number(nodo);
        record.ORIGEN = gt.ORIGEN;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTitulo", query: sql }
    }
    return outPut;
  };

  function validaNodo(titulo, json) {
    let flag = false;

    for (let i = 0; i < json.length; i++) {
      if (titulo === json[i].ATRIBUTO) {
        flag = true;
        break;
      }
    }

    return flag;
  };

  this.on('getNodoEstructura', async (req) => {
    const { nodo, json } = req.data.input;

    const outPut = await getTitulo(nodo);
    const idNodoPadre = await getPadre(nodo);
    const outPutGenera = await getRecursivaNodosDinamicos(outPut, idNodoPadre);

    let result = [];
    let j = 1;

    for (let i = outPutGenera.length - 1; i >= 0; i--) {
      if (outPutGenera[i].ORIGEN !== "Dinámico") {
        delete outPutGenera[i];

      } else if (outPutGenera[i]) {
        let record = {};
        record.ID_TIPOATRIBUTO = "string";
        let anexa;

        if (json.length > 0) {
          anexa = validaNodo(String(outPutGenera[i].TITULO).toUpperCase(), json);
        }

        record.NOMBRE_ATRIBUTO = outPutGenera[i].TITULO;
        record.ID_LVL = j;
        record.TIPO = "Estructura";
        record.ANEXA = anexa;

        if (!anexa) {
          result.push(record);
        }
        j++;
      }
    }
    return result;
  });
 
});