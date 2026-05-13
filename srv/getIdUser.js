//////////////////////
///////GETIDUSER//////
//////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

async function getInfoCategoria(idCategoria) {
  let sql;
  let id;

  try {
    sql = `
      SELECT ID_PADRE
        FROM DB_CATEGORIA
       WHERE ID_CATEGORIA = ?
       ORDER BY ID_PADRE ASC
    `;
    const result = await cds.run(sql, [idCategoria]);

    for (const ginf of result) {
      id = Number(ginf.ID_PADRE);
    }
  } catch (e) {
    return { error: e.message, accion: "getInfoCategoria", query: sql };
  }
  return id;
}

async function getNombrePortal(idCategoria) {
  let sql;
  let record;
  try {
    sql = `
      SELECT TITULO
        FROM DB_CATEGORIA
       WHERE ID_CATEGORIA = ?
    `;
    const result = await cds.run(sql, [idCategoria]);

    for (const gnom of result) {
      record = gnom.TITULO;
    }
  } catch (e) {
    return { error: e.message, accion: "getNombrePortal", query: sql };
  }
  return record;
}

async function getUrlBanner(idCategoria) {
  let sql;
  let record;

  try {
    sql = `
      SELECT URL_IMAGEN
        FROM DB_CATEGORIA
       WHERE ID_CATEGORIA = ?
    `;
    const result = await cds.run(sql, [idCategoria]);

    for (const gurl of result) {
      record = gurl.URL_IMAGEN;
    }
  } catch (e) {
    return { error: e.message, accion: "getUrlBanner", query: sql };
  }
  return record;
}

async function getVisualizador(nodo, idCategoria) {
  let sql;
  let output = [];

  try {
    sql = `
      SELECT CATEGORIA.ID_CATEGORIA,
             CATEGORIA.ID_PADRE,
             CATEGORIA.ID_TIPO,
             CATEGORIA.TITULO,
             CATEGORIA.ID_TIPO_VISUALIZADOR,
             CATEGORIA.URL_IMAGEN
        FROM DB_CATEGORIA AS CATEGORIA
       WHERE CATEGORIA.ID_PADRE = ?
       ORDER BY CATEGORIA.ID_CATEGORIA ASC LIMIT 5
    `;
    const result = await cds.run(sql, [nodo]);
    for (const gvis of result) {
      let record = {};
      record.ID_CATEGORIA = Number(gvis.ID_CATEGORIA);
      record.ID_PADRE = Number(gvis.ID_PADRE);
      record.ID_TIPO = Number(gvis.ID_TIPO);
      record.TITULO = gvis.TITULO;
      record.ID_TIPO_VISUALIZADOR = gvis.ID_TIPO_VISUALIZADOR;
      record.NOMBRE_PORTAL = await getNombrePortal(idCategoria);
      record.URL_BANNER = await getUrlBanner(nodo);

      output.push(record);
    }
  } catch (e) {
    return { error: e.message, accion: "getVisualizador", query: sql };
  }
  return output;
}

this.on("get", async (req) => {
  const { nodo, idCategoria } = req.data;
  const visualizadores = await getVisualizador(nodo, idCategoria);
  return visualizadores;
});

});
