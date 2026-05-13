  ////////////////////////////////
  ///////GETLISTAARCHIVOSPORTALES//
  /////////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");


  async function getVisiblePreguntasFrecuentes3(idCategoria) {
    let sql;
    let sValue = false;

    try {
      sql = `
      SELECT COUNT(*) AS ID
      FROM DB_PREGUNTA
      WHERE ID_CATEGORIA = ?
    `;

      const result = await cds.run(sql, [idCategoria]);
      console.log("RESULTADOS DE GETVPR3:", result)

      if (result[0].ID > 0) {
        sValue = true;
      }
    } catch (e) {
      return { error: e.message, accion: "getVisiblePreguntasFrecuentes3", query: sql }
    }

    return sValue;
  };

  async function getFormat1(categoria) {
    let sql;
    let sValue = [];

    try {
      sql = `
      SELECT FORMATO
      FROM DB_PROP_TIPO_DOC
      WHERE ID_CATEGORIA_NODO = ?
    `;

      const result = await cds.run(sql, [categoria]);
      console.log("RESULTADO DE GETFORMAT1:", result)

      for (const gfor of result) {
        let record = {};
        record.Formato = gfor.FORMATO;

        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getFormat1", query: sql }
    }

    return sValue;
  };

  async function getUrl1(tipo_documento, id_categoria) {
    let sql;
    let sValue = [];

    try {
      sql = `
      SELECT URL, TITULO
      FROM DB_DETALLE
      WHERE NODO_HIJO = ? AND ID_TIPO_DOCUMENTO = ?
    `;

      const result = await cds.run(sql, [id_categoria, tipo_documento]);

      for (const gurl of result) {
        let record = {};
        record.URL = gurl.URL;
        record.TITULO = gurl.TITULO;

        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getUrl", query: sql }
    }
    console.log("RESULTADO DE GETURL1:", sValue)
    return sValue;
  };

  async function getIdTipoDocumento1(idDocumento) {
    let sql;
    let record;

    try {
      sql = `
      SELECT ID_TIPO_DOCUMENTO
      FROM DB_DOCUMENTO
      WHERE ID_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [idDocumento]);
      console.log("RESULTADO DE getIdTipoDocumento1:", result)

      for (const gid of result) {
        record = {};
        record = gid.ID_TIPO_DOCUMENTO;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdTipoDocumento1", query: sql }
    }

    return record;
  };

  // async function getInfoCategoria22(idCategoria) {
  //   let sql;
  //   const outPut = [];

  //   try {
  //     sql = `
  //     SELECT DISTINCT
  //       CAT.TITULO,
  //       CAT.DESCRIPCION,
  //       CAT.ID_CATEGORIA
  //     FROM CATEGORIA CAT
  //     WHERE CAT.ID_PADRE = ?
  //     ORDER BY CAT.ID_CATEGORIA ASC
  //   `;

  //     const result = await cds.run(sql, [idCategoria]);

  //     for (const ginf1 of result) {
  //       let record = {};
  //       record.TITULO = ginf1.TITULO;
  //       record.DESCRIPCION = ginf1.DESCRIPCION;
  //       record.UFH_CARGA = await getFechaCreacion(ginf1.ID_CATEGORIA);
  //       record.FORMATO = await getFormat1(idCategoria);
  //       record.VISIBLEPF = await getVisiblePreguntasFrecuentes3(idCategoria);

  //       const idDoc = await getIdDocumento2();
  //       record.ID_TIPO_DOCUMENTO = await getIdTipoDocumento(idDoc);
  //       record.IDCATEGORIA = ginf1.ID_CATEGORIA;
  //       record.ID_DOCUMENTO = idDoc;
  //       record.URL = await getUrl(record.ID_TIPO_DOCUMENTO, ginf1.ID_CATEGORIA);

  //       outPut.push(record);
  //     }
  //   } catch (e) {
  //     return { error: e.message, accion: "getInfoCategoria2", query: sql }
  //   }

  //   return outPut;
  // };

  async function getInfoCategoria2(idCategoria) {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT DISTINCT
        CAT.TITULO,
        CAT.DESCRIPCION,
        DOC.UFH_CARGA,
        CAT.ID_CATEGORIA,
        DOC.ID_DOCUMENTO
      FROM DB_CATEGORIA CAT
      JOIN DB_DOCUMENTO DOC
        ON DOC.NOMBRE = CAT.TITULO
      WHERE CAT.ID_PADRE = ?
      ORDER BY DOC.ID_DOCUMENTO ASC LIMIT 10
    `;

      const result = await cds.run(sql, [idCategoria]);


      for (const ginf2 of result) {
        let record = {};
        record.TITULO = ginf2.TITULO;
        record.DESCRIPCION = ginf2.DESCRIPCION;
        record.UFH_CARGA = ginf2.UFH_CARGA;
        record.FORMATO = await getFormat1(idCategoria);
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes3(idCategoria);
        record.ID_TIPO_DOCUMENTO = await getIdTipoDocumento1(ginf2.ID_DOCUMENTO);
        record.IDCATEGORIA = ginf2.ID_CATEGORIA;
        record.ID_DOCUMENTO = ginf2.ID_DOCUMENTO;
        record.URL = await getUrl1(record.ID_TIPO_DOCUMENTO, ginf2.ID_CATEGORIA);

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getInfoCategoria2", query: sql }
    }

    return outPut;
  };

  this.on('getData10', async (req) => {
    const { idCategoria } = req.data.input;
    const visualizadores = await getInfoCategoria2(idCategoria);

    return visualizadores;
  });

});