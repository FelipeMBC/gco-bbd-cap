////////////////////////////
  ///////GETLISTAARCHIVOS/////
  /////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  function orderFecha1(fecha) {
    if (fecha.length > 1) {
      let newFecha = fecha.split("-")[2] + "-" + fecha.split("-")[1] + "-" + fecha.split("-")[0];
      return newFecha;
    } else {
      return fecha;
    }
  };

  async function getRol(rol, idTD, userId) {
    let sValue = false;
    console.log("GETROL RECIBE:", rol, idTD, userId)

    try {
      const sql = `
      SELECT ROLES.ID_ROLES
        FROM DB_ROLESXUSUARIOS RXU
        INNER JOIN DB_ROLES ROLES
          ON ROLES.ID_ROLES = RXU.ID_ROLES
        INNER JOIN DB_ROLESXACCIONES RXA
          ON ROLES.ID_ROLES = RXA.ID_ROLES
        INNER JOIN DB_ACCION ACC
          ON ACC.ID_ACCION = RXA.ID_ACCION
       WHERE RXU.ID_USUARIO = ?
         AND ROLES.ID_TIPO_DOCUMENTO = ?
         AND ACC.NOMBRE = ?
    `;
      const result = await cds.run(sql, [userId, idTD, rol]);
      console.log("Resultado de getROL:", result)
      for (const _ of result) {
        sValue = true;
      }
    } catch (e) {
      return false;
    }
    console.log("IMPORTANTE DE GETROL, SALE:", sValue)
    return sValue;
  };

  async function getEstLib1(nodo) {
    let des = -1;
    let sql;

    try {
      sql = `
      SELECT ID_EST_LIB
        FROM ESTRATEGIA_LIBERACION
      WHERE ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [nodo]);
      for (const gest of result) {
        des = gest.ID_EST_LIB;
      }
    } catch (e) {
      return { error: e.message, accion: "getEstLib1", query: sql }
    }
    return des;
  };

  async function getWF(td) {
    let record = false;
    let sql;

    try {
      sql = `
      SELECT COUNT(*) AS ID
        FROM DB_NIVELES NIV
        INNER join DB_ESTRATEGIA_LIBERACION EL
          ON EL.ID_EST_LIB = NIV.ID_EST_LIB
       WHERE EL.ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [td]);
      console.log("Resultado de GETWF:", result)
      if (Number(result[0].ID) > 0) {
        sValue = true;
      }

    } catch (e) {
      return { error: e.message, accion: "getWF", query: sql }
    }
    return record;
  };

  async function getVisiblePreguntasFrecuentes2(nodoId, idCat) {
    let sql;
    let sValue = false;

    try {
      sql = `
      SELECT COUNT(*) AS ID
        FROM PREGUNTA
       WHERE ID_CATEGORIA = ? OR ID_CATEGORIA = ?
    `;
      const result = await cds.run(sql, [nodoId, idCat]);

      if (Number(result[0].ID) > 0) {
        sValue = true;
      }
    } catch (e) {
      return { error: e.message, accion: "getVisiblePreguntasFrecuentes2", query: sql }
    }
    return sValue;
  };

  async function getVisiblePreguntasFrecuentes1(nodoId) {
    let sql;
    let sValue = false;

    try {
      sql = `
      SELECT COUNT(*) AS ID
        FROM DB_PREGUNTA
       WHERE ID_CATEGORIA = ?
    `;
      const result = await cds.run(sql, [nodoId]);

      if (Number(result[0].ID) > 0) {
        sValue = true;
      }
    } catch (e) {
      return { error: e.message, accion: "getVisiblePreguntasFrecuentes1", query: sql }
    }
    return sValue;
  };

  async function getFormat(categoria) {
    let sql;
    let sValue = [];

    try {
      sql = `
      SELECT FORMATO
        FROM DB_PROP_TIPO_DOC
       WHERE ID_CATEGORIA_NODO = ?
    `;
      const result = await cds.run(sql, [categoria]);
      console.log("Resultado de GETFORMAT: ", result)
      for (const gfor of result) {
        let record = {};
        record.FORMATO = gfor.FORMATO;
        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getFormat", query: sql }
    }
    return sValue;
  };

  async function getCat2(idCategoria) {
    let sql;
    let sValue = [];
    try {
      sql = `
      SELECT ID_PADRE
        FROM CATEGORIA
       WHERE ID_CATEGORIA = ?
    `;
      const result = await cds.run(sql, [idCategoria]);
      for (const gcat of result) {
        return gcat.ID_PADRE;
      }
    } catch (e) {
      return { error: e.message, accion: "getCat2", query: sql }
    }
    return sValue;
  };

  async function getCat(idCategoria) {
    let sql;
    let sValue = [];

    try {
      sql = `
      SELECT ID_CATEGORIA FROM DB_CATEGORIA WHERE ID_PADRE = ?`;
      const result = await cds.run(sql, [idCategoria]);
      for (const gca of result) {
        return gca.ID_CATEGORIA;
      }
    } catch (e) {
      return { error: e.message, accion: "getCat", query: sql }
    }
    return sValue;
  };

  async function getUrl(tipo_documento, id_categoria) {
    let sql;
    let sValue = [];

    try {
      sql = `
      SELECT VER.URL_DETALLE,
             DET.TITULO,
             DET.ID_DETALLE,
             VER.SIZE,
             MAX(VER.VERSION)
        FROM DB_DETALLE DET
        INNER JOIN DB_VERSIONAMIENTO VER
                ON VER.ID_DETALLE = DET.ID_DETALLE
       WHERE DET.ID_TIPO_DOCUMENTO = ?
         AND DET.NODO_HIJO = ?
       GROUP BY VER.URL_DETALLE, DET.TITULO, DET.ID_DETALLE, VER.SIZE`;

      const result = await cds.run(sql, [tipo_documento, id_categoria]);

      console.log("Resultado de GETURL:", result)

      for (const gurl of result) {
        let record = {};
        record.URL = gurl.URL_DETALLE;
        record.TITULO = gurl.TITULO;
        record.ID_DETALLE = gurl.ID_DETALLE;
        record.SIZE = (gurl.SIZE == null || gurl.SIZE === "") ? "—" : (Number(gurl.SIZE) * 1000) + " KB";
        record.VERSION = gurl.VERSION;
        sValue.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getUrl", query: sql }
    }
    return sValue;
  };

  async function getIdDocumento2(idTD, idCat) {
    let sql;
    let record;

    try {
      sql = `
      SELECT DOC.ID_DOCUMENTO
        FROM DB_DOCUMENTO DOC
        INNER JOIN DB_DETALLE DET
                ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
       WHERE DET.ID_TIPO_DOCUMENTO = ?
         AND DET.NODO_HIJO = ?
    `;
      const result = await cds.run(sql, [idTD, idCat]);
      console.log("Resultado de GETIDDOCUMENTO2: ", result)
      for (const gid of result) {
        record = gid.ID_DOCUMENTO;
      }

    } catch (e) {
      return { error: e.message, accion: "getIdDocumento2", query: sql }
    }
    return record;
  };

  async function getFechaCarga(idDocument) {
    let sql;
    let record;

    try {
      sql = `
      SELECT UFH_CREAR
        FROM DB_DOCUMENTO
       WHERE ID_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [idDocument]);
      console.log("Resultado de GETFECHACARGA: ", result)
      for (const gf of result) {
        record = orderFecha1(gf.UFH_CREAR);
      }
    } catch (e) {
      return { error: e.message, accion: "getFechaCarga", query: sql }
    }
    return record;
  };

  this.on('getDocumentName', async (req) => {
    const { CONTENIDO_EXTRA, ID_CATEGORIA, ID_PORTAL, ID_USUARIO, INICIO_PAGINA, FIN_PAGINA, VALUE } = req.data.input;

    const arrContenidoExtra = String(CONTENIDO_EXTRA);
    const idCategoria = Number(ID_CATEGORIA);
    const portalId = Number(ID_PORTAL);
    const userId = Number(ID_USUARIO);
    const rInicio = Number(INICIO_PAGINA);
    const rFin = Number(FIN_PAGINA);
    const sValue = VALUE;
    const limit = rFin - rInicio;

    const out = { TOTAL_REGISTROS: 0, DATA: [] };

    try {
      const tdVincula = await getTDVinculacion(idCategoria);

      for (let e = 0; e < tdVincula.length; e++) {
        let selectExtra = '';
        let groupExtra = '';
        let joinsExtra = '';
        for (let u = 0; u < arrContenidoExtra.length; u++) {

          const alias = `MDV${u}`;
          selectExtra += `, ${alias}.VALUE as VALUE${u}`;
          groupExtra += `, ${alias}.VALUE`;
          joinsExtra += `
            LEFT JOIN (
              SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
              FROM DB_METADATA_VALUE
              WHERE ATRIBUTO = '${arrContenidoExtra[u]}'
            ) AS ${alias}
              ON ${alias}.ID_TIPO_DOCUMENTO = ${tdVincula[e].TD}
             AND ${alias}.ID_DETALLE = DET.ID_DETALLE`;
        }

        const andOrCat = (tdVincula[e].TD === 761) ? 'AND' : 'OR';

        let sqlBase = `
          SELECT DISTINCT
            CAT.TITULO                           AS TITULO,
            CAT.DESCRIPCION                      AS DESCRIPCION,
            CAT.ID_CATEGORIA                     AS ID_CATEGORIA,
            TD.ID_TIPO_DOCUMENTO                 AS ID_TIPO_DOCUMENTO,
            CAT.ID_PADRE                         AS ID_PADRE,
            CAT.ID_TIPO_VISUALIZADOR             AS ID_TIPO_VISUALIZADOR,
            DOC.UFH_CREAR                        AS UFH_CREAR,
            PTD.FORMATO                          AS FORMATO,
            COUNT(DISTINCT DET.URL)              AS URL_COUNT,
            COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS WF_COUNT,
            COUNT(FAV.ID_FAVORITOS)              AS FAV_COUNT,
            COUNT(PR.ID_PREGUNTA)                AS PF_COUNT,
            COUNT(ROL3.IDTD3)                    AS ROL3_COUNT,
            COUNT(ROL4.IDTD4)                    AS ROL4_COUNT,
            DOC.ID_DOCUMENTO                     AS ID_DOCUMENTO,
            TD.NOMBRE                            AS NOMBRE_TIPO_DOCUMENTO
            ${selectExtra}
          FROM DB_TIPO_DOCUMENTO TD
          INNER JOIN DB_DETALLE   DET
            ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
          INNER JOIN DB_DOCUMENTO DOC
            ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
          INNER JOIN DB_CATEGORIA CAT
            ON DET.NODO_HIJO = CAT.ID_CATEGORIA
          LEFT JOIN DB_PROP_TIPO_DOC PTD
            ON PTD.ID_CATEGORIA_NODO = CAT.ID_CATEGORIA
          LEFT JOIN DB_VERSIONAMIENTO VER
            ON VER.ID_DETALLE = DET.ID_DETALLE
          LEFT JOIN DB_ESTRATEGIA_LIBERACION EL
            ON EL.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
          LEFT JOIN DB_FAVORITOS FAV
            ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA
           AND FAV.ID_USUARIO = ?
           AND FAV.ID_PORTAL  = ?
          ${joinsExtra}
          LEFT JOIN DB_PREGUNTA PR
            ON PR.ID_CATEGORIA = CAT.ID_CATEGORIA
           OR PR.ID_CATEGORIA = ?
          LEFT JOIN (
            SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
            FROM DB_ROLESXTD ROLXTD
            INNER JOIN DB_ROLES ROL
              ON ROL.ID_ROLES = ROLXTD.ID_ROLES
            INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
              ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
            INNER JOIN DB_ROLESXACCIONES ROLXACC
              ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
            WHERE ROLXUSU.ID_USUARIO = ?
              AND ROLXACC.ID_ACCION = 3
          ) AS ROL3
            ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
          LEFT JOIN (
            SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
            FROM DB_ROLESXTD ROLXTD
            INNER JOIN DB_ROLES ROL
              ON ROL.ID_ROLES = ROLXTD.ID_ROLES
            INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
              ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
            INNER JOIN DB_ROLESXACCIONES ROLXACC
              ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
            WHERE ROLXUSU.ID_USUARIO = ?
              AND ROLXACC.ID_ACCION = 4
          ) AS ROL4
            ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
          WHERE TD.ID_TIPO_DOCUMENTO = ?
            AND CAT.TITULO = ?
            ${andOrCat} CAT.ID_PADRE = ?
          GROUP BY
            CAT.TITULO, TD.NOMBRE, CAT.DESCRIPCION, CAT.ID_CATEGORIA,
            TD.ID_TIPO_DOCUMENTO, CAT.ID_PADRE, CAT.ID_TIPO_VISUALIZADOR,
            DOC.UFH_CREAR, PTD.FORMATO, DOC.ID_DOCUMENTO
            ${groupExtra}
          ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC, CAT.TITULO ASC
        `;

        const paramsBase = [
          userId,
          portalId,
          idCategoria,
          userId,
          userId,
          tdVincula[e].TD, //880
          sValue,
          idCategoria
        ];

        const rowsAll = await cds.run(sqlBase, paramsBase);
        out.TOTAL_REGISTROS += rowsAll.length;

        const sqlPaged = `${sqlBase} LIMIT ${limit} OFFSET ${rInicio}`;
        const rows = await cds.run(sqlPaged, paramsBase);

        for (const row of rows) {
          rec = {};
          rec.TITULO = row.TITULO;
          rec.DESCRIPCION = row.DESCRIPCION;
          rec.ID_CATEGORIA = row.ID_CATEGORIA;
          rec.ID_TIPO_DOCUMENTO = row.ID_TIPO_DOCUMENTO;
          rec.ID_PADRE = row.ID_PADRE;
          rec.ID_TIPO_VISUALIZADOR = row.ID_TIPO_VISUALIZADOR;
          rec.UFH_CARGA = orderFecha1(row.UFH_CREAR);
          rec.URL = row.URL_COUNT;
          rec.WF = Number(row.WF_COUNT) > 0;
          rec.FAVORITO = Number(row.FAV_COUNT) > 0;
          rec.ICONO = "sap-icon://document";
          rec.TIPO = "Documento";
          rec.VISIBLEPF = Number(row.PF_COUNT) > 0;
          rec.DESCARGA = Number(row.ROL4_COUNT) > 0;
          rec.ROLLECTURA = Number(row.ROL3_COUNT) > 0;
          rec.ID_DOCUMENTO = row.ID_DOCUMENTO;
          rec.NOMBRE_TIPO_DOCUMENTO = row.NOMBRE_TIPO_DOCUMENTO;

          for (let t = 0; t < arrContenidoExtra.length; t++) {
            const val = row[`VALUE${t}`];
            rec[arrContenidoExtra[t]] =
              val == null
                ? "—"
                : (arrContenidoExtra[t].toUpperCase().includes("FECHA")
                  ? orderFecha1(String(val))
                  : String(val));
          }

          if (rec.URL > 0 && rec.ROLLECTURA !== false) {
            out.DATA.push(rec);
          }
        }
      }
    } catch (e) {
      return { TOTAL_REGISTROS: 0, DATA: [], RAZON: [String(e && e.message ? e.message : e)] };
    }

    return out;
  });

  this.on('getListBusqueda', async (req) => {
    let sql;
    let outPut = [];
    const json = req.data.input;
    const cant = json.length;

    try {
      for (let j = 0; j < cant; j++) {
        const { ID_TIPO_DOCUMENTO, TIPO, VALUE1, VALUE2 } = json[j];


        let whereClause = ' WHERE DET.ID_TIPO_DOCUMENTO = ?';
        const params = [ID_TIPO_DOCUMENTO];

        if (TIPO === 'text') {
          whereClause += ' AND MTV.VALUE = ?';
          params.push(VALUE1);
        } else {
          whereClause += ' AND (MTV.VALUE BETWEEN ? AND ?)';
          params.push(VALUE1, VALUE2);
        }

        sql = `
          SELECT DISTINCT
            CAT.ID_PADRE          AS ID_PADRE,
            CAT.TITULO            AS TITULO,
            CAT.DESCRIPCION       AS DESCRIPCION,
            DOC.ID_DOCUMENTO      AS ID_DOCUMENTO,
            DOC.UFH_CARGA         AS UFH_CARGA,
            CAT.ID_CATEGORIA      AS ID_CATEGORIA,
            MTV.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
          FROM DB_CATEGORIA CAT
          INNER JOIN DB_DETALLE DET
            ON DET.NODO_HIJO = CAT.ID_CATEGORIA
          INNER JOIN DB_DOCUMENTO DOC
            ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
          INNER JOIN DB_METADATA_VALUE MTV
            ON DOC.ID_DOCUMENTO = MTV.ID_DOCUMENTO
          ${whereClause}
        `;

        const result = await cds.run(sql, params);

        for (const r of result) {
          let record = {};
          record.ID_CATEGORIA_PADRE = r.ID_PADRE;
          record.TITULO = r.TITULO;
          record.DESCRIPCION = r.DESCRIPCION;
          record.ID_DOCUMENTO = r.ID_DOCUMENTO;
          record.UFH_CARGA = await getFechaCarga(r.ID_DOCUMENTO);
          record.FORMATO = await getFormat(r.ID_CATEGORIA);
          record.VISIBLEPF = await getVisiblePreguntasFrecuentes1(r.ID_CATEGORIA);
          record.URL = await getURL(r.ID_CATEGORIA, r.ID_DOCUMENTO, r.ID_TIPO_DOCUMENTO);
          record.IDCATEGORIA = r.ID_CATEGORIA;
          record.ID_TIPO_DOCUMENTO = r.ID_TIPO_DOCUMENTO;
          outPut.push(record);
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getListBusqueda", query: sql }
    }

    return outPut;
  });

  this.on('getInfoVinculacion2', async (req) => {
    const {
      CONTENIDO_EXTRA,
      ID_CATEGORIA,
      ID_PORTAL,
      ID_USUARIO,
      INICIO_PAGINA,
      FIN_PAGINA,
      VALUE
    } = req.data;

    const arrContenidoExtra = JSON.parse(CONTENIDO_EXTRA || '[]');
    const idCategoria = Number(ID_CATEGORIA);
    const portalId = Number(ID_PORTAL);
    const userId = Number(ID_USUARIO);
    const rInicio = Number(INICIO_PAGINA);
    const rFin = Number(FIN_PAGINA);
    const diff = rFin - rInicio;
    const queryPag = ` LIMIT ${diff} OFFSET ${rInicio}`;
    const query10 = VALUE == null ? '' : ' AND CAT.TITULO = ?';

    const out = { TOTAL_REGISTROS: 0, DATA: [] };
    let sql;

    try {
      const tdVincula = await getTDVinculacion(idCategoria);

      for (let e = 0; e < tdVincula.length; e++) {
        let query3 = '';
        let query4 = '';
        let query5 = '';
        for (let u = 0; u < arrContenidoExtra.length; u++) {
          const alias = `MDV${u}`;
          query3 += `, ${alias}.VALUE as VALUE${u}`;
          query4 += `, ${alias}.VALUE`;
          query5 += `
            LEFT JOIN (
              SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
              FROM DB_METADATA_VALUE
              WHERE ATRIBUTO = '${arrContenidoExtra[u]}'
            ) AS ${alias}
              ON ${alias}.ID_TIPO_DOCUMENTO = ${tdVincula[e].TD}
             AND ${alias}.ID_DETALLE = DET.ID_DETALLE`;
        }

        const andOrCat = tdVincula[e].TD === 761 ? 'AND' : 'OR';

        sql = `
          SELECT DISTINCT
            CAT.TITULO                           AS TITULO,
            CAT.DESCRIPCION                      AS DESCRIPCION,
            CAT.ID_CATEGORIA                     AS ID_CATEGORIA,
            TD.ID_TIPO_DOCUMENTO                 AS ID_TIPO_DOCUMENTO,
            CAT.ID_PADRE                         AS ID_PADRE,
            CAT.ID_TIPO_VISUALIZADOR             AS ID_TIPO_VISUALIZADOR,
            DOC.UFH_CREAR                        AS UFH_CREAR,
            PTD.FORMATO                          AS FORMATO,
            COUNT(DISTINCT DET.URL)              AS URL_COUNT,
            COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS WF_COUNT,
            COUNT(FAV.ID_FAVORITOS)              AS FAV_COUNT,
            COUNT(PR.ID_PREGUNTA)                AS PF_COUNT,
            COUNT(ROL3.IDTD3)                    AS ROL3_COUNT,
            COUNT(ROL4.IDTD4)                    AS ROL4_COUNT,
            DOC.ID_DOCUMENTO                     AS ID_DOCUMENTO,
            TD.NOMBRE                            AS NOMBRE_TIPO_DOCUMENTO
            ${query3}
          FROM DB_TIPO_DOCUMENTO TD
          INNER JOIN DB_DETALLE   DET
            ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
          INNER JOIN DB_DOCUMENTO DOC
            ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
          INNER JOIN DB_CATEGORIA CAT
            ON DET.NODO_HIJO = CAT.ID_CATEGORIA
          LEFT JOIN DB_PROP_TIPO_DOC PTD
            ON PTD.ID_CATEGORIA_NODO = CAT.ID_CATEGORIA
          LEFT JOIN DB_VERSIONAMIENTO VER
            ON VER.ID_DETALLE = DET.ID_DETALLE
          LEFT JOIN DB_ESTRATEGIA_LIBERACION EL
            ON EL.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
          LEFT JOIN DB_FAVORITOS FAV
            ON  FAV.ID_CATEGORIA = CAT.ID_CATEGORIA
           AND FAV.ID_USUARIO = ?
           AND FAV.ID_PORTAL  = ?
          ${query5}
          LEFT JOIN DB_PREGUNTA PR
            ON PR.ID_CATEGORIA = CAT.ID_CATEGORIA
           OR PR.ID_CATEGORIA = ?
          LEFT JOIN (
            SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
            FROM DB_ROLESXTD ROLXTD
            INNER JOIN DB_ROLES ROL
              ON ROL.ID_ROLES = ROLXTD.ID_ROLES
            INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
              ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
            INNER JOIN DB_ROLESXACCIONES ROLXACC
              ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
            WHERE ROLXUSU.ID_USUARIO = ?
              AND ROLXACC.ID_ACCION = 3
          ) AS ROL3
            ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
          LEFT JOIN (
            SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
            FROM DB_ROLESXTD ROLXTD
            INNER JOIN DB_ROLES ROL
              ON ROL.ID_ROLES = ROLXTD.ID_ROLES
            INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
              ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
            INNER JOIN DB_ROLESXACCIONES ROLXACC
              ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
            WHERE ROLXUSU.ID_USUARIO = ?
              AND ROLXACC.ID_ACCION = 4
          ) AS ROL4
            ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
          WHERE TD.ID_TIPO_DOCUMENTO = ?
          ${VALUE == null ? '' : ' AND CAT.TITULO = ?'}
            ${andOrCat} CAT.ID_PADRE = ?
          GROUP BY
            CAT.TITULO, TD.NOMBRE, CAT.DESCRIPCION, CAT.ID_CATEGORIA,
            TD.ID_TIPO_DOCUMENTO, CAT.ID_PADRE, CAT.ID_TIPO_VISUALIZADOR,
            DOC.UFH_CREAR, PTD.FORMATO, DOC.ID_DOCUMENTO
            ${query4}
          ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC, CAT.TITULO ASC
        `;

        const baseParams = [
          userId,
          portalId,
          idCategoria,
          userId,
          userId,
          tdVincula[e].TD
        ];
        const paramsAll = VALUE == null
          ? [...baseParams, idCategoria]
          : [...baseParams, VALUE, idCategoria];

        const rowsAll = await cds.run(sql, paramsAll);
        out.TOTAL_REGISTROS += rowsAll.length;

        const sqlPaged = `${sql}${queryPag}`;
        const rows = await cds.run(sqlPaged, paramsAll);

        for (const row of rows) {
          let rec = {};
          rec.TITULO = row.TITULO;
          rec.DESCRIPCION = row.DESCRIPCION;
          rec.ID_CATEGORIA = row.ID_CATEGORIA;
          rec.ID_TIPO_DOCUMENTO = row.ID_TIPO_DOCUMENTO;
          rec.ID_PADRE = row.ID_PADRE;
          rec.ID_TIPO_VISUALIZADOR = row.ID_TIPO_VISUALIZADOR;
          rec.UFH_CARGA = orderFecha1(String(row.UFH_CREAR));
          rec.URL = Number(row.URL_COUNT);
          rec.WF = Number(row.WF_COUNT) > 0;
          rec.FAVORITO = Number(row.FAV_COUNT) > 0;
          rec.ICONO = "sap-icon://document";
          rec.TIPO = "Documento";
          rec.VISIBLEPF = Number(row.PF_COUNT) > 0;
          rec.DESCARGA = Number(row.ROL4_COUNT) > 0;
          rec.ROLLECTURA = Number(row.ROL3_COUNT) > 0;
          rec.ID_DOCUMENTO = row.ID_DOCUMENTO;
          rec.NOMBRE_TIPO_DOCUMENTO = row.NOMBRE_TIPO_DOCUMENTO;

          for (let t = 0; t < arrContenidoExtra.length; t++) {
            let v = row[`VALUE${t}`];
            rec[arrContenidoExtra[t]] =
              v == null
                ? "—"
                : (arrContenidoExtra[t].toUpperCase().includes("FECHA")
                  ? orderFecha1(String(v))
                  : String(v));
          }

          if (rec.URL > 0 && rec.ROLLECTURA !== false) {
            out.DATA.push(rec);
          }
        }
      }
    } catch (e) {
      return { TOTAL_REGISTROS: 0, DATA: [], RAZON: [String(e && e.message ? e.message : e)] };
    }

    return out;
  });

  async function getInfoCategoria1() {
    let outPut = {
      TOTAL_REGISTROS: 0,
      DATA: []
    };

    outPut = await getInfoVinculacion(outPut);
    return outPut;

  };

  async function getRolVisualiza(td, idUsuario, acc) {
    let sql;

    try {
      sql = `
      SELECT COUNT(*) AS ID
        FROM DB_ROLES ROL
        INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
                ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
        INNER JOIN DB_ROLESXACCIONES ROLXACC
                ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
       WHERE ROL.ID_TIPO_DOCUMENTO = ?
         AND ROLXUSU.ID_USUARIO    = ?
         AND ROLXACC.ID_ACCION     = ?
    `;
      const result = await cds.run(sql, [td, idUsuario, acc]);
      if (Number(result[0].ID) > 0) {
        return true;
      }
    } catch (e) {
      return false;
    }
  };

  async function getTDVinculacion(idCategoria) {
    let sql;
    const outPut = [];

    try {
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
        FROM DB_VINCULACION
       WHERE ID_NODO_VINCULA = ?
    `;
      const result = await cds.run(sql, [idCategoria]);
      for (const gtd1 of result) {
        let record = {};
        record.TD = gtd1.ID_TIPO_DOCUMENTO;

        outPut.push(record);
      }
      console.log(outPut)
      return outPut;
    } catch (e) {
      return { error: e.message, accion: "getTDVinculacion", query: sql }
    }
  };

  async function getTDVinculacion2(idCategoria, portal) {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
        FROM DB_VINCULACION
       WHERE ID_NODO_VINCULA = ? OR NODO_PORTAL = ?
    `;
      const result = await cds.run(sql, [idCategoria, portal]);
      for (const gtd2 of result) {
        let record = {};
        record.TD = gtd2.ID_TIPO_DOCUMENTO;

        outPut.push(record);
      }
      return outPut;
    } catch (e) {
      return { error: e.message, accion: "getTDVinculacion2", query: sql }
    }
  };

  function getIconoDocumento(tipo) {
    const prefijo = "sap-icon://";
    let icono;

    switch (tipo) {
      case "pdf":
        icono = prefijo + "pdf-attachment";
        break;
      case "imagen":
        icono = prefijo + "attachment-photo";
        break;
      case "video":
        icono = prefijo + "attachment-video";
        break;
      case "microsoft word":
        icono = prefijo + "doc-attachment";
        break;
      case "microsoft excel":
        icono = prefijo + "excel-attachment";
        break;
      case "microsoft powerpoint":
        icono = prefijo + "ppt-attachment";
        break;
      case "rar":
        icono = prefijo + "attachment-zip-file";
        break;
      case "todos":
        icono = prefijo + "course-program";
        break;
      case "ukn":
        icono = prefijo + "attachment-e-pub";
        break;
      default:
        icono = prefijo + "document";
    }

    return icono;
  };

  function iconoSegunTipoNodo(idTipo) {
    const prefijo = "sap-icon://";
    let icono;

    switch (idTipo) {
      case 4:
        icono = prefijo + "add-folder";
        break;
      case 7:
        icono = prefijo + "browse-folder";
        break;
      case 8:
        icono = prefijo + "work-history";
        break;
      default:
        icono = prefijo + "folder-full";
    }

    return icono;
  };

  async function getFavoritos(idCat, portalId, userId) {
    let sql;

    try {
      sql = `
      SELECT COUNT(*) AS ID
        FROM FAVORITOS
       WHERE ID_PORTAL = ?
         AND ID_USUARIO = ?
         AND ID_CATEGORIA = ?
    `;

      const result = await cds.run(sql, [portalId, userId, idCat]);

      if (Number(result[0].ID) > 0) {
        return true;
      }
    } catch (e) {
      return false;
    }
  };

  async function getIdTipoDocumento(idDocumento) {
    let sql;
    let record;

    try {
      sql = `SELECT ID_TIPO_DOCUMENTO
              FROM DOCUMENTO
              WHERE ID_DOCUMENTO = ?`
      const result = await cds.run(sql, [idDocumento]);

      for (const gtip of result) {
        record = Number(gtip.ID_TIPO_DOCUMENTO);
      }
    } catch (e) {
      return { error: e.message, accion: "getIdTipoDocumento", query: sql }
    }
    return record;
  };

  async function getInfoCategoriaGLP(idCategoria) {

    let sql;
    let outPut = [];

    try {

      sql = `SELECT DISTINCT
         CAT.TITULO,
         CAT.DESCRIPCION,
         CAT.ID_CATEGORIA,
         TD.ID_TIPO_DOCUMENTO 
        FROM DB_CATEGORIA CAT 
        JOIN DB_TIPO_DOCUMENTO TD ON TD.ID_NODO = CAT.ID_PADRE 
        WHERE CAT.ID_PADRE = ? 
        ORDER BY CAT.ID_CATEGORIA ASC LIMIT 10`;

      const result = await cds.run(sql, [idCategoria]);

      for (const gcat of result) {
        let record = {};
        record.ID_CATEGORIA_PADRE = await getCat(idCategoria);
        record.TITULO = gcat.TITULO;
        record.DESCRIPCION = gcat.DESCRIPCION;
        record.ID_DOCUMENTO = await getIdDocumento2(gcat.ID_TIPO_DOCUMENTO, idCategoria);
        record.UFH_CARGA = await getFechaCarga(record.ID_DOCUMENTO);
        record.FORMATO = await getFormat(idCategoria);
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes1(gcat.ID_CATEGORIA);
        record.URL = await getUrl(gcat.ID_TIPO_DOCUMENTO, gcat.ID_CATEGORIA);
        record.IDCATEGORIA = gcat.ID_CATEGORIA;
        record.ID_TIPO_DOCUMENTO = gcat.ID_TIPO_DOCUMENTO;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getInfoCategoriaGLP", query: sql }
    }
    // outPut = await getInfoVinculacion(outPut);
    return outPut;
  };

  async function getInfoCategoriaV(idCategoria) {

    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT DISTINCT
             CAT.TITULO,
             CAT.DESCRIPCION,
             CAT.ID_CATEGORIA,
             TD.ID_TIPO_DOCUMENTO
        FROM DB_CATEGORIA CAT
        JOIN DB_TIPO_DOCUMENTO TD
          ON TD.ID_NODO = CAT.ID_PADRE
       WHERE CAT.ID_PADRE = ?
       ORDER BY CAT.ID_CATEGORIA ASC LIMIT 10`;

      const result = await cds.run(sql, [idCategoria]);

      for (const gcat of result) {
        let record = {};
        record.ID_CATEGORIA_PADRE = await getCat(idCategoria);
        record.TITULO = gcat.TITULO;
        record.DESCRIPCION = gcat.DESCRIPCION;
        record.ID_DOCUMENTO = await getIdDocumento2(gcat.ID_TIPO_DOCUMENTO);
        record.UFH_CARGA = await getFechaCarga(record.ID_DOCUMENTO);
        record.FORMATO = await getFormat(idCategoria);
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes1(gcat.ID_CATEGORIA);
        record.URL = await getUrl(gcat.ID_TIPO_DOCUMENTO, gcat.ID_CATEGORIA);
        record.IDCATEGORIA = gcat.ID_CATEGORIA;
        record.ID_TIPO_DOCUMENTO = gcat.ID_TIPO_DOCUMENTO;
        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getInfoCategoriaV", query: sql };
    }

    const vinculacion = await _getInfoVinculacionInterno(idCategoria);

    outPut = outPut.concat(vinculacion);

    return outPut;
  };

  async function getURL(idCate, idDocumento, td) {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT URL, TITULO
        FROM DB_DETALLE
       WHERE ID_CATEGORIA_HOJA = ?
         AND NODO_HIJO         = ?
         AND ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [idDocumento, idCate, td]);

      for (const gurl of result) {
        let record = {};
        record.URL = gurl.URL;
        record.TITULO = gurl.TITULO;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getUrl", query: sql }
    }

    return outPut;
  };

  async function getPermisoPortal(idPortal, idTag) {
    let sql;
    let record = false;

    try {
      console.log(idPortal, idTag)
      sql = `
      SELECT COUNT(*) AS ID
      FROM DB_TAGXPORTAL
      WHERE ID_TAG = ? AND ID_CATEGORIA = ?
    `;

      const result = await cds.run(sql, [idTag, idPortal]);

      if (Number(result[0].ID) > 0) {
        record = true;
      }


    } catch (e) {
      return { error: e.message, accion: "getPermisoPortal", query: sql }
    }
    console.log("SII EXISTE", record)
    return record;
  };

  async function getTDTag(idTD, idTag) {
    let sql;
    let record = false;

    try {
      sql = `
      SELECT COUNT(*) AS ID
      FROM DB_TAGXTD
      WHERE ID_TAG = ? AND ID_TIPO_DOCUMENTO = ?
    `;
      console.log(idTD, idTag)
      const result = await cds.run(sql, [idTag, idTD]);

      if (Number(result[0].ID) > 0) {
        return true;
      }
    } catch (e) {
      return { error: e.message, accion: "getTDTag", query: sql }
    }
    console.log(record)
    return record;
  };

  this.on('getInfoVinculacion', async (req) => {
    const { idCategoria } = req.data.input;
    let sql;
    let arr = [];

    try {

      let tdVincula = await getTDVinculacion(idCategoria);

      console.log(tdVincula)
      for (let e = 0; e < tdVincula.length; e++) {
        sql = `SELECT DISTINCT
             CAT.TITULO,
              CAT.DESCRIPCION,
               CAT.ID_CATEGORIA,
                TD.ID_TIPO_DOCUMENTO,
                 CAT.ID_PADRE
            FROM DB_TIPO_DOCUMENTO TD 
            JOIN DB_CATEGORIA CAT ON TD.ID_NODO = CAT.ID_PADRE
            WHERE TD.ID_TIPO_DOCUMENTO = ?`;

        const result = await cds.run(sql, [tdVincula[e].TD]);

        for (const ginfo of result) {
          let record = {};
          record.ID_CATEGORIA_PADRE = await getCat(idCategoria);
          record.TITULO = ginfo.TITULO;
          record.DESCRIPCION = ginfo.DESCRIPCION;
          record.ID_DOCUMENTO = await getIdDocumento2(ginfo.ID_TIPO_DOCUMENTO, ginfo.ID_CATEGORIA);
          record.UFH_CARGA = await getFechaCarga(record.ID_DOCUMENTO);
          record.FORMATO = await getFormat(idCategoria);
          record.VISIBLEPF = await getVisiblePreguntasFrecuentes1(ginfo.ID_CATEGORIA);
          record.URL = await getUrl(ginfo.ID_TIPO_DOCUMENTO, ginfo.ID_CATEGORIA);
          console.log('getUrl ->', ginfo.ID_TIPO_DOCUMENTO, ginfo.ID_CATEGORIA, record.URL);
          record.IDCATEGORIA = ginfo.ID_CATEGORIA;
          record.ID_TIPO_DOCUMENTO = ginfo.ID_TIPO_DOCUMENTO;
          record.ID_PADRE = ginfo.ID_PADRE;


          if (record.URL.length !== 0) {
            arr.push(record);
          }
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getInfoVinculacion", query: sql }
    }
    return arr;
  });

  this.on('getVinculacion', async (req) => {
    const { idCategoria } = req.data.input;
    let sql;
    let record;


    try {

      sql = `
        SELECT DISTINCT ID_TIPO_DOCUMENTO
          FROM DB_VINCULACION
         WHERE ID_NODO_VINCULA = ?`;

      const result = await cds.run(sql, [idCategoria]);

      for (const gv of result) {
        record = gv.ID_TIPO_DOCUMENTO;
      }
    } catch (e) {
      return { error: e.message, accion: "getVinculacion", query: sql }
    }
    return record;
  });

  this.on('getListaTag', async (req) => {
    const { idPadre, idNodoPortal, idUser, idTag } = req.data.input;


    const outPut = [];
    let body;

    try {
      const ePermisoPortal = await getPermisoPortal(idNodoPortal, idTag);

      if (ePermisoPortal) {
        const idCategoria = idPadre;

        const td = await getTDVinculacion(idCategoria);
        for (let e = 0; e < td.length; e++) {
          const existeTDTag = await getTDTag(td[e].TD, idTag);
          console.log(td[e].TD, idTag)

          if (existeTDTag) {

            sql = `
              SELECT DISTINCT
                CAT.TITULO,
                CAT.DESCRIPCION,
                CAT.ID_CATEGORIA,
                TD.ID_TIPO_DOCUMENTO,
                CAT.ID_PADRE
              FROM DB_TIPO_DOCUMENTO TD
              JOIN DB_DETALLE   DET
                ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
              JOIN DB_CATEGORIA CAT
                ON DET.NODO_HIJO = CAT.ID_CATEGORIA
              WHERE TD.ID_TIPO_DOCUMENTO = ?
            `;

            const result = await cds.run(sql, [td[e].TD]);
            console.log(result)

            for (const glist of result) {
              let record = {};

              // record.ID_CATEGORIA_PADRE = getCat2();
              record.TITULO = glist.TITULO;
              record.DESCRIPCION = glist.DESCRIPCION;
              record.ID_DOCUMENTO = await getIdDocumento2(glist.ID_TIPO_DOCUMENTO, glist.ID_CATEGORIA);
              record.UFH_CARGA = await getFechaCarga(record.ID_DOCUMENTO);
              record.FORMATO = await getFormat(idCategoria);
              // record.VISIBLEPF  = getVisiblePreguntasFrecuentes2(rs.getInteger(3),idCat);
              record.URL = await getUrl(glist.ID_TIPO_DOCUMENTO, glist.ID_CATEGORIA);
              record.IDCATEGORIA = glist.ID_CATEGORIA;
              record.ID_TIPO_DOCUMENTO = glist.ID_TIPO_DOCUMENTO;
              record.ID_PADRE = glist.ID_PADRE;
              record.WF = await getWF(glist.ID_TIPO_DOCUMENTO);
              console.log("ACA RECIBO EL IDUSER QUE ES:", idUser)
              let userId = idUser;
              console.log("ENTONCES EL USERID QUEDA COMO:", userId)
              record.ROLLECTURA = await getRol('Visualizar', glist.ID_TIPO_DOCUMENTO, userId);

              if (record.URL.length !== 0 && record.ROLLECTURA !== false) {
                outPut.push(record);
              }
            }
          }
        }
      }

      body = outPut;
    } catch (e) {
      return { error: e.message, accion: "getListaTag" }
    }
    return body;
  });

  async function _getInfoVinculacionInterno(idCategoria) {
    let sql;
    let arr = [];

    try {
      let tdVincula = await getTDVinculacion(idCategoria);

      console.log(tdVincula)

      for (let e = 0; e < tdVincula.length; e++) {
        sql = `
        SELECT DISTINCT
               CAT.TITULO,
               CAT.DESCRIPCION,
               CAT.ID_CATEGORIA,
               TD.ID_TIPO_DOCUMENTO,
               CAT.ID_PADRE
          FROM DB_TIPO_DOCUMENTO TD 
          JOIN DB_CATEGORIA CAT ON TD.ID_NODO = CAT.ID_PADRE
         WHERE TD.ID_TIPO_DOCUMENTO = ?`;

        const result = await cds.run(sql, [tdVincula[e].TD]);

        for (const ginfo of result) {

          let record = {};
          record.ID_CATEGORIA_PADRE = await getCat(idCategoria);
          record.TITULO = ginfo.TITULO;
          record.DESCRIPCION = ginfo.DESCRIPCION;
          record.IDCATEGORIA = ginfo.ID_CATEGORIA;
          record.ID_TIPO_DOCUMENTO = ginfo.ID_TIPO_DOCUMENTO;
          record.ID_DOCUMENTO = await getIdDocumento2(ginfo.ID_TIPO_DOCUMENTO, ginfo.ID_CATEGORIA);
          record.UFH_CARGA = await getFechaCarga(record.ID_DOCUMENTO);
          record.FORMATO = await getFormat(idCategoria);
          record.VISIBLEPF = await getVisiblePreguntasFrecuentes1(ginfo.ID_CATEGORIA);
          record.URL = await getUrl(ginfo.ID_TIPO_DOCUMENTO, ginfo.ID_CATEGORIA);
          record.ID_PADRE = ginfo.ID_PADRE;

          if (record.URL.length !== 0) {
            arr.push(record);
          }
        }
      }
    } catch (e) {
      return { error: e.message, accion: "_getInfoVinculacionInterno", query: sql };
    }

    return arr;
  };

  this.on('getDataGLP', async (req) => {
    const { idCategoria } = req.data.input;
    const visualizadores = await getInfoCategoriaGLP(idCategoria);
    return visualizadores;
  });

  this.on('getData9', async (req) => {
    const { idCategoria } = req.data.input;
    const visualizadores = await getInfoCategoria1(idCategoria);
    return visualizadores;
  });

  this.on('getDataV', async (req) => {
    const { idCategoria } = req.data.input;
    const visualizadores = await getInfoCategoriaV(idCategoria);
    return visualizadores;
  });

});