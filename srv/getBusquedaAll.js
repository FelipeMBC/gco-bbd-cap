
////////////////////////
////getBusquedaAll//////
////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  function orderFecha(fecha) {
    const newFecha = fecha.split("-")[2] + "-" + fecha.split("-")[1] + "-" + fecha.split("-")[0];
    return newFecha;
  };

  async function getVisiblePreguntasFrecuentes(nodo) {
    let sql;
    let sValue;

    try {
      sql = `
      SELECT COUNT(*)
      FROM
      DB_PREGUNTA
      WHERE ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [nodo])
      sValue = result.length > 0 ? true : false;
    } catch (e) {
      return sql;
    }
    return sValue;
  };

  async function getNodoVinculado(idNodo) {
    let sql;
    let sValue = [];

    try {
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO 
      FROM DB_VINCULACION
      WHERE ID_NODO_VINCULA = ?
    `;

      const result = await cds.run(sql, [idNodo]);

      for (const gn of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = gn.ID_TIPO_DOCUMENTO;
        sValue.push(record);
      }

    } catch (e) {
      return `${e.message}, ${sql}`;
    }
    return sValue;
  };

  async function getTipoByTextoV(idNodo, texto, sValue) {
    let sql;
    let outPutUrl = [];

    try {
      sql = `
      SELECT DISTINCT
        TD.NOMBRE        AS TD_NOMBRE,
        DOC.NOMBRE       AS DOC_NOMBRE,
        DOC.UFH_CARGA    AS UFH_CARGA,
        DETALLE.URL      AS URL,
        DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
        DOC.DESCRIPCION  AS DESCRIPCION,
        DETALLE.TITULO   AS DETALLE_TITULO
      FROM DB_TIPO_DOCUMENTO TD
      JOIN DB_DOCUMENTO DOC
        ON DOC.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
      JOIN DB_DETALLE DETALLE
        ON DETALLE.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
      WHERE DOC.ID_DOCUMENTO IN (
        SELECT ID_DOCUMENTO
        FROM DB_DOCUMENTO
        WHERE UPPER(NOMBRE) LIKE ?
      )
      AND TD.ID_TIPO_DOCUMENTO = ?
    `;

      sValue.push(sql);

      const result = await cds.run(sql, [`%${texto}%`, idNodo]);

      for (const gtbytext of result) {
        const recordURL = {
          TITULO: gtbytext.DETALLE_TITULO,
          URL: gtbytext.URL,
        };
        outPutUrl.push(recordURL);

        let record = {};
        record.TITULO = gtbytext.DOC_NOMBRE;
        record.UFH_CARGA = orderFecha(gtbytext.UFH_CARGA);
        record.URL = outPutUrl;
        record.ID_DOCUMENTO = gtbytext.ID_DOCUMENTO;
        record.DESCRIPCION = gtbytext.DESCRIPCION;
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes(nodo);

        sValue.push(record);
      }
    } catch (e) {
      return sql;
    }
    return sValue;
  };

  async function getTipoByTexto(texto, nodo) {
    let sql;
    let sValue = [];
    const outPutUrl = [];

    try {
      sql = `
      SELECT DISTINCT
        TD.NOMBRE        AS TD_NOMBRE,
        DOC.NOMBRE       AS DOC_NOMBRE,
        DOC.UFH_CARGA    AS UFH_CARGA,
        DETALLE.URL      AS URL,
        DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
        DOC.DESCRIPCION  AS DESCRIPCION,
        DETALLE.TITULO   AS DETALLE_TITULO
      FROM DB_TIPO_DOCUMENTO TD
      JOIN DB_DOCUMENTO DOC
        ON DOC.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
      JOIN DB_DETALLE DETALLE
        ON DETALLE.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
      WHERE DOC.ID_DOCUMENTO IN (
        SELECT ID_DOCUMENTO
        FROM DB_DOCUMENTO
        WHERE UPPER(NOMBRE) LIKE ?
      )
      AND TD.ID_NODO = ?
    `;

      const result = await cds.run(sql, [`%${texto}%`, nodo]);

      for (const gtip of result) {
        const recordURL = {
          TITULO: gtip.DETALLE_TITULO,
          URL: gtip.URL,
        };
        outPutUrl.push(recordURL);

        let record = {};
        record.TITULO = gtip.DOC_NOMBRE;
        record.UFH_CARGA = orderFecha(gtip.UFH_CARGA);
        record.URL = outPutUrl;
        record.ID_DOCUMENTO = gtip.ID_DOCUMENTO;
        record.DESCRIPCION = gtip.DESCRIPCION;
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes(nodo);

        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoByTexto", query: sql }
    }

    const nodoV = await getNodoVinculado(nodo);
    const cant = nodoV.length;

    for (let j = 0; j < cant; j++) {
      sValue = await getTipoByTextoV(nodoV[j].ID_TIPO_DOCUMENTO, sValue);
    }

    return sValue;
  };

  this.on('get', async (req) => {
    const { texto, nodo } = req.data;
    let tipos = [];

    tipos = await getTipoByTexto(texto, nodo);
    return tipos;
  });

});