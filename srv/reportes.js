////////////////////
///////REPORTES/////
////////////////////

const cds = require("@sap/cds");
const res = require("express/lib/response");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  function orderFecha(fecha) {
    const newFecha = fecha.split("-")[2] + "-" + fecha.split("-")[1] + "-" + fecha.split("-")[0];
    return newFecha;
  };

  function getIconoDocumento(tipo) {

    var prefijo = "sap-icon://";
    var icono;

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

  async function getActivo(iddetalle, version) {

    try {
      const sql = `SELECT ACTIVO FROM DB_VERSIONAMIENTO 
                     WHERE ID_DETALLE = ? AND VERSION = ?`;
      const result = await cds.run(sql, [iddetalle, version]);

      for (const ga of result) {
        if (ga.getActivo === 'X') {
          return true;
        } else {
          return false;
        }
      }
    } catch (e) {
      return false;
    }
  };

  async function getUrlDocumento(arrCategoria) {
    let record = {};
    let sValue = [];
    let sql;
    try {
      sql = `SELECT VER.URL_DETALLE,
                        DET.TITULO,
                        DET.ID_DETALLE,
                        VER.SIZE, 
                        MAX(VER.VERSION), 
                        DET.TYPE, 
                        FORM.MYMETYPE, 
                        DET.ID_TIPO_DOCUMENTO, 
                        MAX(VER2.VERSION) FROM DB_DETALLE AS DET
                     INNER JOIN DB_VERSIONAMIENTO AS VER 
                       ON VER.ID_DETALLE = DET.ID_DETALLE
                     LEFT JOIN DB_FORMATOS AS FORM 
                       ON FORM.NOMBRE_FORMATO = DET.TYPE
                     WHERE DET.NODO_HIJO = ?
                     GROUP BY VER.URL_DETALLE, DET.TITULO, DET.ID_DETALLE, VER.SIZE, DET.TYPE FORM.MYMETYPE, DET.ID_TIPO_DOCUMENTO`;
      const result = await cds.run(sql, [arrCategoria]);

      for (const rs of result) {
        record.URL = rs.URL_DETALLE;
        record.TITULO = rs.TITULO;
        record.ID_DETALLE = rs.ID_DETALLE;
        record.SIZE = (rs.SIZE === null || rs.SIZE === "")
          ? "—"
          : (Number(rs.SIZE) / 1000).toFixed(1) + " KB";
        record.VERSION = rs.VERSION;
        record.FORMATO = rs.TYPE;
        record.ICONO = getIconoDocumento(rs.TYPE);
        record.MYME_TYPE = (rs.MYMETYPE === null ? "octet/stream :" : rs.MYMETYPE);
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(rs.VERSION), rs.ID_DETALLE;
        if (record.ACTIVO) {
          sValue.push(record);
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getUrlDocumento1", query: sql }
    }
    return sValue;
  };

  async function getUrlArchivo(arrCategoria, version) {
    let record = {};
    try {
      const sql = `SELECT VER.URL_DETALLE,
                          DET.TITULO,
                          DET.ID_DETALLE,
                          VER.SIZE, 
                          MAX(VER.VERSION),
                          DET.TYPE, 
                          FORM.MYMETYPE,
                          DET.ID_TIPO_DOCUMENTO,
                          MAX(VER2.VERSION)
                          FROM DB_DETALLE AS DET
                     INNER JOIN DB_VERSIONAMIENTO AS VER 
                       ON VER.ID_DETALLE = DET.ID_DETALLE
                     LEFT JOIN DB_FORMATOS AS FORM 
                       ON FORM.NOMBRE_FORMATO = DET.TYPE 
                     INNER JOIN (SELECT ID_DETALLE, VERSION FROM DB_VERSIONAMIENTO) AS VER2 
                        ON VER2.ID_DETALLE = DET.ID_DETALLE AND VER2.VERSION = ?
                    WHERE DET.NODO_HIJO = ?
                    GROUP BY VER.URL_DETALLE, DET.TITULO, DET.ID_DETALLE, VER.SIZE, DET.TYPE, FORM.MYMETYPE, DET.ID_TIPO_DOCUMENTO`;
      const result = await cds.run(sql, [version, arrCategoria]);

      for (const rs of result) {
        record.URL = rs.URL_DETALLE;
        record.TITULO = rs.TITULO;
        record.ID_DETALLE = rs.ID_DETALLE;
        record.SIZE = (rs.SIZE === null || rs.SIZE === "")
          ? "—"
          : (Number(rs.SIZE) / 1000).toFixed(1) + " KB";
        record.VERSION = rs.VERSION;
        record.FORMATO = rs.TYPE;
        record.ICONO = await getIconoDocumento(rs.TYPE);
        record.MYME_TYPE = (rs.MYMETYPE === null ? "octet/stream :" : rs.MYMETYPE);
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(rs.VERSION), rs.ID_DETALLE;

        if (record.ACTIVO) {
          sValue.push(record);
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getUrlArchivo", query: sql }
    }
    return sValue;
  };

  async function getUrlArchivoPorVencer(arrCategoria) {
    let sql;
    let sValue = [];

    try {
      sql = `SELECT VER.URL_DETALLE AS URL_DETALLE,
                    DET.TITULO AS TITULO,
                    DET.ID_DETALLE AS ID_DETALLE,
                    VER.SIZE AS SIZE,
                    VER.VERSION AS VERSION,
                    DET.TYPE AS TYPE,
                    FORM.MYMETYPE AS MYMETYPE,
                    DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
                    FROM DB_DETALLE AS DET
              INNER JOIN DB_VERSIONAMIENTO AS VER
                ON VER.ID_DETALLE = DET.ID_DETALLE
              LEFT JOIN DB_FORMATOS AS FORM
                ON FORM.NOMBRE_FORMATO = DET.TYPE
              WHERE DET.NODO_HIJO = ?`;
      const result = await cds.run(sql, [arrCategoria]);

      for (const rs of result) {
        let record = {};
        record.URL = rs.URL_DETALLE;
        record.TITULO = rs.TITULO;
        record.ID_DETALLE = rs.ID_DETALLE;
        record.SIZE = (rs.VERSION === null || rs.VERSION === "") ? "-" : (rs.VERSION / 1000).toFixed(1) + " KB";
        record.VERSION = rs.VERSION;
        record.FORMATO = rs.TYPE;
        record.ICONO = getIconoDocumento(rs.TYPE);
        record.MYMETYPE = (rs.MYMETYPE === null) ? "octet/stream" : rs.MYMETYPE;
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(rs.VERSION, rs.ID_DETALLE);

        sValue.push(record);

      }
    } catch (e) {
      return { error: e.message, accion: "getUrlArchivoPorVencer", query: sql };
    }
    return sValue;
  };

  async function getUrlArchivoWF(arrCategoria, idDetalle, usuarioCarga, fechaInicio, fechaFin) {
    let sql;
    const sValue = [];

    try {
      let where = `DET.NODO_HIJO = ?`;
      const params = [arrCategoria];

      if (usuarioCarga && usuarioCarga !== '') {
        where += ` AND VER.USUARIO = ?`;
        params.push(usuarioCarga);
      }

      if (fechaInicio && fechaInicio !== '') {
        where += ` AND VER.FECHA_CARGA BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
      }

      sql = `
      SELECT
        VER.URL_DETALLE,
        DET.TITULO,
        DET.ID_DETALLE,
        VER.SIZE,
        VER.VERSION,
        DET.TYPE,
        FORM.MYMETYPE,
        DET.ID_TIPO_DOCUMENTO,
        VER.VERSION AS VERSION2,
        VER.USUARIO
      FROM DETALLE DET
      INNER JOIN VERSIONAMIENTO VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      LEFT JOIN FORMATOS FORM
        ON FORM.NOMBRE_FORMATO = DET.TYPE
      WHERE ${where}
      GROUP BY
        VER.URL_DETALLE, DET.TITULO, DET.ID_DETALLE, VER.SIZE,
        VER.VERSION, DET.TYPE, FORM.MYMETYPE, DET.ID_TIPO_DOCUMENTO, VER.USUARIO
    `;

      const result = await cds.run(sql, params);

      for (const ga of result) {
        const record = {};

        record.URL = ga.URL_DETALLE;
        record.TITULO = ga.TITULO;
        record.ID_DETALLE = ga.ID_DETALLE;
        record.SIZE = (ga.SIZE === null || r.SIZE === '')
          ? '—'
          : (Number(r.SIZE) / 1000).toFixed(1) + ' KB';

        record.VERSION = ga.VERSION;
        record.FORMATO = ga.TYPE;
        record.ICONO = await getIconoDocumento2(ga.TYPE);
        record.MYME_TYPE = (ga.MYMETYPE == null) ? 'octet/stream' : ga.MYMETYPE;
        record.ID_TIPO_DOCUMENTO = ga.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(ga.VERSION, ga.ID_DETALLE);

        record.USUARIO = r.USUARIO;

        if (record.ACTIVO) {
          sValue.push(record);
        }
      }

      return sValue;

    } catch (e) {
      return { error: e.message, accion: "getUrlArchivoWF", query: sql }
    }
  };

  async function getTiposDocumentoPortal(portal) {
    let sql;
    let t = [];
    let td = [];
    let ex = false;

    try {
      // 1) VINCULACION 250
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
      FROM DB_VINCULACION
      WHERE NODO_PORTAL = ?
    `;
      const result1 = await cds.run(sql, [portal]);
      for (const r of result1) {
        td.push(r.ID_TIPO_DOCUMENTO);
      }

      // 2) PORTALES
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
      FROM DB_PORTALES
      WHERE ID_PORTAL = ?
    `;
      const result2 = await cds.run(sql, [portal]);
      for (const r of result2) {
        t.push(r.ID_TIPO_DOCUMENTO);
      }

      // 3) NODOBUSQUEDA
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
            FROM DB_NODOBUSQUEDA
            WHERE ID_PORTAL = ?
    `;
      const result3 = await cds.run(sql, [portal]);
      for (const r of result3) {
        t.push(r.ID_TIPO_DOCUMENTO);
      }

      for (let x = 0; x < t.length; x++) {
        ex = false;
        for (let i = 0; i < td.length; i++) {
          if (t[x] === td[i]) {
            ex = true;
            break;
          }
        }
        if (!ex) {
          td.push(t[x]);
        }
      }

      let result = "";
      for (let i = 0; i < td.length; i++) {
        if (result.length > 0) result += ",";
        result += td[i];
      }
      return result;

    } catch (e) {
      return { error: e.message, accion: "getTiposDocumentoPortal" }
    }
  };

  async function getMaxNivel(nivel, idDocumento) {
    let sql;
    let record = "";

    try {
      sql = `SELECT MAX(NIVEL) AS TOTAL FROM DB_INSTANCIA_APROBACION WHERE ID_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idDocumento]);
      for (const rs of result) {
        record = rs.TOTAL;
      }

    } catch (e) {
      return { error: e.message, accion: "getMaxNivel", query: sql };
    }
    return record;
  };

  this.on('getPortalXUser', async (req) => {
    const { json } = req.data;
    const email = json.EMAIL;

    let sql;
    let outPut = [];

    try {
      sql = `SELECT DISTINCT CAT.TITULO,
                             CAT.ID_CATEGORIA,
              FROM DB_CATEGORIA AS CAT
                INNER JOIN DB_USUARIO_PORTAL AS UP
                  ON UP.ID_PORTAL = CAT.ID_CATEGORIA
                INNER JOIN DB_USUARIO AS USER
                  ON UP.ID_USUARIO = USER.ID_USUARIO
              WHERE USER.CORREO = ? 
              ORDER BY CAT.TITULO ASC`;

      const result = await cds.run(sql, [email]);
      for (const rs of result) {
        let record = {};
        record.NOMBRE_PORTAL = rs.TITULO;
        record.ID_PORTAL = rs.ID_CATEGORIA;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getPortalXUser", query: sql };
    }
    return outPut;
  });

  this.on("planillaArchivosProveedorDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;
    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;

    const sql = `
    select distinct
      de.TITULO,
      pa.NOMBRE as PROVEEDOR,
      ver.UFH_CREAR,
      de.URL,
      ca.ID_CATEGORIA,
      vers.USUARIO,
      ver.NOMBRE,
      vers.VERSION
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where (ALMACENAMIENTO = 'Digital' OR ALMACENAMIENTO = '')
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between ? and ?
    ) as ver
      on ver.ID_DOCUMENTO = de.ID_CATEGORIA_HOJA
    inner join (
      select TITULO, ID_PADRE, ID_CATEGORIA
      from DB_CATEGORIA
    ) as ca
      on ca.ID_CATEGORIA = de.NODO_HIJO
    inner join (
      select ID_DETALLE, VERSION, USUARIO
      from DB_VERSIONAMIENTO
    ) as vers
      on vers.ID_DETALLE = de.ID_DETALLE
     and vers.VERSION = 1
  `;

    try {
      const result = await cds.run(sql, [fi, ff]);
      const output = [];

      for (const rs of result) {
        const record = {};
        record.DOCUMENTO = rs.TITULO;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(rs.UFH_CREAR);
        record.NOMBRE_DOCUMENTO = rs.NOMBRE;
        record.FILES = await getUrlArchivo(rs.ID_CATEGORIA, rs.VERSION);

        output.push(record);
      }

      return output;
    } catch (e) {
      return { error: e.message, accion: "planillaArchivosProveedorDigital", query: sql };
    }
  });

  this.on("planillaArchivosPorVencerDigital", async (req) => {
    let data = req.data.input || req.data;

    let PORTAL = data.PORTAL;
    let USUARIO = data.USUARIO;
    let RESPONSABLE = data.RESPONSABLE;
    let FECHA_CARGA_INICIO = data.FECHA_CARGA_INICIO;
    let FECHA_CARGA_FIN = data.FECHA_CARGA_FIN;
    let FECHA_VENCIMIENTO_INICIO = data.FECHA_VENCIMIENTO_INICIO;
    let FECHA_VENCIMIENTO_FIN = data.FECHA_VENCIMIENTO_FIN;

    if (PORTAL === "x") {
      PORTAL = "%";
    }

    const tds = await getTiposDocumentoPortal(PORTAL);
    if (tds.length === 0) {
      return req.error(400, { Error: "El portal no tiene tipos de documentos asociados" });
    }

    let query;
    let result = [];

    try {
      query = `
      SELECT
        USU.USERNAME,
        PA.NOMBRE AS PROVEEDOR,
        DETVIS.FECHA_VENCIMIENTO,
        DET.TITULO,
        DET.ID_DETALLE,
        CAT.ID_CATEGORIA,
        DOC.UFH_CREAR
      FROM DETALLE DET
      INNER JOIN CATEGORIA CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      INNER JOIN (
        SELECT *
        FROM TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DOCUMENTO DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DETALLE_VISUALIZACION DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN (
        SELECT *
        FROM USUARIO
        WHERE ID_USUARIO LIKE ?
      ) USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN TIPO_ALMACENAMIENTO TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
      INNER JOIN (
        SELECT *
        FROM PROVEEDORES_ALMACENAMIENTO
        WHERE ID_PROVEEDORES_ALMACENAMIENTO LIKE ?
      ) PA
        ON DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE DETVIS.TIPO_ALMACENAMIENTO = 1
        AND DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
      ORDER BY DET.ID_DETALLE ASC
    `;

      const rows = await cds.run(query, [
        `${USUARIO}%`,
        `${RESPONSABLE}%`,
        FECHA_VENCIMIENTO_INICIO,
        FECHA_VENCIMIENTO_FIN
      ]);

      for (const row of rows) {
        let record = {};
        record.NOMBRE_DOCUMENTO = row.TITULO;
        record.USUARIO = row.USERNAME;
        record.RESPONSABLE = row.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(String(row.UFH_CREAR).split("T")[0]);
        record.FECHA_VENCIMIENTO = orderFecha(String(row.FECHA_VENCIMIENTO).split("T")[0]);
        record.NOMBRE_ARCHIVO = row.TITULO;
        record.FILES = await getUrlArchivoPorVencer(row.ID_CATEGORIA);

        result.push(record);
      }

      return result;
    } catch (e) {
      return req.error(500, e.message);
    }
  });

  this.on("planillaArchivosProveedorFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;
    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;

    const sql = `
    select
      de.TITULO,
      pa.NOMBRE as PROVEEDOR,
      ver.UFH_CREAR,
      de.URL,
      ca.ID_CATEGORIA,
      vers.USUARIO,
      ver.NOMBRE,
      vers.VERSION
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where (ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = '')
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between ? and ?
    ) as ver
      on ver.ID_DOCUMENTO = de.ID_CATEGORIA_HOJA
    inner join (
      select TITULO, ID_PADRE, ID_CATEGORIA
      from DB_CATEGORIA
    ) as ca
      on ca.ID_CATEGORIA = de.NODO_HIJO
    inner join (
      select ID_DETALLE, VERSION, USUARIO
      from DB_VERSIONAMIENTO
    ) as vers
      on vers.ID_DETALLE = de.ID_DETALLE
     and vers.VERSION = 1
  `;

    try {
      const result = await cds.run(sql, [fi, ff]);
      const output = [];

      for (const rs of result) {
        const record = {};
        record.DOCUMENTO = rs.TITULO;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(rs.UFH_CREAR);
        record.NOMBRE_DOCUMENTO = rs.NOMBRE;
        record.FILES = await getUrlArchivo(rs.ID_CATEGORIA, rs.VERSION);

        output.push(record);
      }

      return output;
    } catch (e) {
      return { error: e.message, accion: "planillaArchivosProveedorFisico", query: sql };
    }
  });

  this.on("planillaArchivosPorVencerFisico", async (req) => {
    const { json } = req.data;

    let PORTAL = json.PORTAL;
    let USUARIO = json.USUARIO;
    let RESPONSABLE = json.RESPONSABLE;
    let FECHA_CARGA_INICIO = json.FECHA_CARGA_INICIO;
    let FECHA_CARGA_FIN = json.FECHA_CARGA_FIN;
    let FECHA_VENCIMIENTO_INICIO = json.FECHA_VENCIMIENTO_INICIO;
    let FECHA_VENCIMIENTO_FIN = json.FECHA_VENCIMIENTO_FIN;

    if (PORTAL === "x") {
      PORTAL = "%";
    }

    const tds = await getTiposDocumentoPortal(PORTAL);
    if (tds.length === 0) {
      return req.error(400, { Error: "El portal no tiene tipos de documentos asociados" });
    }

    let query;
    let result = [];

    try {
      query = `
      SELECT
        USU.USERNAME,
        PA.NOMBRE AS PROVEEDOR,
        DETVIS.FECHA_VENCIMIENTO,
        DET.TITULO,
        DET.ID_DETALLE,
        CAT.ID_CATEGORIA,
        DOC.UFH_CREAR
      FROM DB_DETALLE AS DET
      INNER JOIN DB_CATEGORIA CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      INNER JOIN (
        SELECT *
        FROM TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO AS DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_DETALLE_VISUALIZACION AS DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN (
        SELECT *
        FROM DB_USUARIO
        WHERE ID_USUARIO LIKE ?
      ) USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO AS TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
      INNER JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ID_PROVEEDORES_ALMACENAMIENTO LIKE ?
      ) PA
        ON DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE DETVIS.TIPO_ALMACENAMIENTO = 2
        AND DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
      ORDER BY DET.ID_DETALLE ASC
    `;

      const rows = await cds.run(query, [
        `${USUARIO}%`,
        `${RESPONSABLE}%`,
        FECHA_VENCIMIENTO_INICIO,
        FECHA_VENCIMIENTO_FIN
      ]);

      for (const row of rows) {
        let record = {};
        record.NOMBRE_DOCUMENTO = row.TITULO;
        record.USUARIO = row.USERNAME;
        record.RESPONSABLE = row.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(String(row.UFH_CREAR).split("T")[0]);
        record.FECHA_VENCIMIENTO = orderFecha(String(row.FECHA_VENCIMIENTO).split("T")[0]);
        record.NOMBRE_ARCHIVO = row.TITULO;
        record.FILES = await getUrlArchivoPorVencer(row.ID_CATEGORIA);

        result.push(record);
      }

      return result;
    } catch (e) {
      return req.error(500, e.message);
    }
  });

  this.on("planillaDocumentosProveedorDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;
    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;

    const sql = `
    select distinct
      ver.NOMBRE,
      pa.NOMBRE as PROVEEDOR,
      ver.UFH_CREAR,
      ca.ID_CATEGORIA,
      vers.USUARIO
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where (ALMACENAMIENTO = 'Digital' OR ALMACENAMIENTO = '')
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between ? and ?
    ) as ver
      on ver.ID_DOCUMENTO = de.ID_CATEGORIA_HOJA
     and ver.ID_TIPO_DOCUMENTO in (${tds})
    inner join (
      select TITULO, ID_PADRE, ID_CATEGORIA
      from DB_CATEGORIA
    ) as ca
      on ca.ID_CATEGORIA = de.NODO_HIJO
    inner join (
      select ID_DETALLE, VERSION, USUARIO
      from DB_VERSIONAMIENTO
    ) as vers
      on vers.ID_DETALLE = de.ID_DETALLE
     and vers.VERSION = 1
  `;

    try {
      const result = await cds.run(sql, [fi, ff]);
      const output = [];

      for (const rs of result) {
        const record = {};
        record.DOCUMENTO = rs.NOMBRE === null ? caracter : rs.NOMBRE;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = rs.UFH_CREAR === null ? caracter : orderFecha(rs.UFH_CREAR);
        record.FILES = await getUrlDocumento(rs.ID_CATEGORIA);

        output.push(record);
      }

      return output;
    } catch (e) {
      return { error: e.message + sql, accion: "planillaDocumentosProveedorDigital", query: sql };
    }
  });

  this.on("planillaDocumentosPorVencerDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;
    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fecha_carga = json.FECHA_CARGA_INICIO;
    const fcf = json.FECHA_CARGA_FIN;
    const fecha_vencimiento = json.FECHA_VENCIMIENTO_INICIO;
    const fvf = json.FECHA_VENCIMIENTO_FIN;

    const sql = `
    SELECT DISTINCT
      DOC.NOMBRE,
      USU.USERNAME,
      PA.NOMBRE AS PROVEEDOR,
      DOC.UFH_CREAR,
      DETVIS.FECHA_VENCIMIENTO,
      CAT.ID_CATEGORIA
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_DOCUMENTO DOC
      ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN DB_CATEGORIA CAT
      ON CAT.ID_CATEGORIA = DET.NODO_HIJO
    INNER JOIN DB_DETALLE_VISUALIZACION DETVIS
      ON DETVIS.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN (
      SELECT *
      FROM DB_USUARIO
      WHERE ID_USUARIO LIKE ?
    ) USU
      ON DETVIS.ID_USUARIO = USU.ID_USUARIO
    INNER JOIN DB_TIPO_ALMACENAMIENTO TA
      ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    INNER JOIN (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ID_PROVEEDORES_ALMACENAMIENTO LIKE ?
    ) PA
      ON DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
    WHERE DETVIS.TIPO_ALMACENAMIENTO = 1
      AND DETVIS.FECHA_VENCIMIENTO BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
  `;

    try {
      const result = await cds.run(sql, [`${user}%`, `${res}%`, fecha_vencimiento, fvf]);
      const output = [];

      for (const rs of result) {
        const record = {};
        record.NOMBRE_DOCUMENTO = rs.NOMBRE;
        record.USUARIO = rs.USERNAME;
        record.RESPONSABLE = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(rs.UFH_CREAR);
        record.FECHA_VENCIMIENTO = orderFecha(rs.FECHA_VENCIMIENTO);
        record.FILES = await getUrlArchivoPorVencer(rs.ID_CATEGORIA);

        output.push(record);
      }

      return output;
    } catch (e) {
      return { error: e.message, accion: "planillaDocumentosPorVencerDigital", query: sql };
    }
  });

  this.on("planillaDocumentosProveedorFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;
    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;

    const sql = `
    select distinct
      ver.NOMBRE,
      pa.NOMBRE as PROVEEDOR,
      ver.UFH_CREAR,
      ca.ID_CATEGORIA,
      vers.USUARIO
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where (ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = '')
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between ? and ?
    ) as ver
      on ver.ID_DOCUMENTO = de.ID_CATEGORIA_HOJA
    inner join (
      select TITULO, ID_PADRE, ID_CATEGORIA
      from DB_CATEGORIA
    ) as ca
      on ca.ID_CATEGORIA = de.NODO_HIJO
    inner join (
      select ID_DETALLE, VERSION, USUARIO
      from DB_VERSIONAMIENTO
    ) as vers
      on vers.ID_DETALLE = de.ID_DETALLE
     and vers.VERSION = 1
  `;

    try {
      const result = await cds.run(sql, [fi, ff]);
      const output = [];

      for (const rs of result) {
        const record = {};
        record.DOCUMENTO = rs.NOMBRE;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(rs.UFH_CREAR);
        record.FILES = await getUrlDocumento(rs.ID_CATEGORIA);

        output.push(record);
      }

      return output;
    } catch (e) {
      return { error: e.message, accion: "planillaDocumentosProveedorFisico", query: sql };
    }
  });

  this.on("planillaDocumentosPorVencerFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;
    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fecha_carga = json.FECHA_CARGA_INICIO;
    const fcf = json.FECHA_CARGA_FIN;
    const fecha_vencimiento = json.FECHA_VENCIMIENTO_INICIO;
    const fvf = json.FECHA_VENCIMIENTO_FIN;

    const sql = `
    select distinct
      DOC.NOMBRE,
      USU.USERNAME,
      PA.NOMBRE as PROVEEDOR,
      DOC.UFH_CREAR,
      DETVIS.FECHA_VENCIMIENTO,
      CAT.ID_CATEGORIA
    from DB_DETALLE DET
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    inner join DB_DOCUMENTO DOC
      on DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    inner join DB_CATEGORIA CAT
      on CAT.ID_CATEGORIA = DET.NODO_HIJO
    inner join DB_DETALLE_VISUALIZACION DETVIS
      on DETVIS.ID_DETALLE = DET.ID_DETALLE
    inner join (
      select *
      from DB_USUARIO
      where ID_USUARIO like ?
    ) USU
      on DETVIS.ID_USUARIO = USU.ID_USUARIO
    inner join DB_TIPO_ALMACENAMIENTO TA
      on DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    inner join (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ID_PROVEEDORES_ALMACENAMIENTO like ?
    ) PA
      on DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
    where DETVIS.TIPO_ALMACENAMIENTO = 2
      and DETVIS.FECHA_VENCIMIENTO between TO_DATE(?, 'YYYY-MM-DD') and TO_DATE(?, 'YYYY-MM-DD')
  `;

    try {
      const result = await cds.run(sql, [`${user}%`, `${res}%`, fecha_vencimiento, fvf]);
      const output = [];

      for (const rs of result) {
        const record = {};
        record.NOMBRE_DOCUMENTO = rs.NOMBRE;
        record.USUARIO = rs.USERNAME;
        record.RESPONSABLE = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(rs.UFH_CREAR);
        record.FECHA_VENCIMIENTO = orderFecha(rs.FECHA_VENCIMIENTO);
        record.FILES = await getUrlArchivoPorVencer(rs.ID_CATEGORIA);

        output.push(record);
      }

      return output;
    } catch (e) {
      return { error: e.message + sql, accion: "planillaDocumentosPorVencerFisico", query: sql };
    }
  });

  this.on("planillaWorkflows", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;
    const usu = json.USUARIO;
    const fi = json.FECHA_INICIO;
    const ff = json.FECHA_FIN;
    const est = json.ESTADO_APROBACION;
    const fli = json.FECHA_LIBERACION_INICIO;
    const flf = json.FECHA_LIBERACION_FIN;
    const ln = json.LIBERADOR_NOMBRE;

    const sql = `
    SELECT DISTINCT
      CAT.TITULO AS Nombre_documento,
      IA.NIVEL,
      DET.ID_TIPO_DOCUMENTO,
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      IA.FECHA,
      CAT.ID_CATEGORIA,
      IA.ID_DOCUMENTO
    FROM DB_TAGXPORTAL TXP
    INNER JOIN DB_TAG TAG
      ON TAG.ID_TAG = TXP.ID_TAG
    INNER JOIN DB_TAGXTD TXTD
      ON TXTD.ID_TAG = TXP.ID_TAG
    INNER JOIN DB_DETALLE DET
      ON DET.ID_TIPO_DOCUMENTO = TXTD.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE LIBERADOR_NOMBRE LIKE ?
        AND ESTADO = ?
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) IA
      ON DET.ID_CATEGORIA_HOJA = IA.ID_DOCUMENTO
    INNER JOIN DB_CATEGORIA CAT
      ON CAT.ID_CATEGORIA = DET.NODO_HIJO
    WHERE TXP.ID_CATEGORIA LIKE ?
  `;

    try {
      const result = await cds.run(sql, [`${ln}%`, est, fli, flf, portal]);
      const results = [];

      for (const rs of result) {
        const nivel = rs.NIVEL;
        const maxNivel = await getMaxNivel(nivel, rs.ID_DOCUMENTO);

        if (nivel === maxNivel) {
          const record = {};
          record.NOMBRE_DOC = rs.NOMBRE_DOCUMENTO;
          record.LIBERADOR = rs.LIBERADOR;
          record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
          record.FECHA_LIBERACION = orderFecha(rs.FECHA);
          record.WORKFLOW = await getWorkflows(rs.ID_DOCUMENTO, rs.ID_TIPO_DOCUMENTO);
          record.FILES = await getUrlArchivoWF(rs.ID_CATEGORIA, rs.NIVEL, usu, fi, ff);

          results.push(record);
        }
      }

      return results;
    } catch (e) {
      return {
        query: sql,
        msg: e.message
      };
    }
  });

  this.on("planillaCriterios", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const json = req.data.input || req.data;
    const usu = json.USUARIO;
    const fi = json.FECHA_INICIO;
    const ff = json.FECHA_FIN;
    const res = json.RESPONSABLE;

    const sql = `
    SELECT DISTINCT
      TAG.NOMBRE_TAG,
      VER.USUARIO AS USUARIO_CARGA,
      CAT.TITULO AS NOMBRE_DOCUMENTO,
      DET.TITULO AS NOMBRE_ARCHIVO,
      VER.FECHA_CARGA,
      VER.VERSION,
      TID.NOMBRE,
      MDV.ATRIBUTO,
      MDV.VALUE,
      VER.URL_DETALLE,
      PAF.NOMBRE AS RES_FIS,
      PAD.NOMBRE AS RES_DIG,
      CAT.ID_CATEGORIA
    FROM DB_TAGXPORTAL TXP
    INNER JOIN DB_TAG TAG
      ON TAG.ID_TAG = TXP.ID_TAG
    INNER JOIN DB_TAGXTD TXTD
      ON TXTD.ID_TAG = TXP.ID_TAG
    INNER JOIN DB_DETALLE DET
      ON DET.ID_TIPO_DOCUMENTO = TXTD.ID_TIPO_DOCUMENTO
    INNER JOIN DB_TIPO_DOCUMENTO TID
      ON DET.ID_TIPO_DOCUMENTO = TID.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_VERSIONAMIENTO
      WHERE USUARIO LIKE ?
        AND FECHA_CARGA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) VER
      ON VER.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_CATEGORIA CAT
      ON CAT.ID_CATEGORIA = DET.NODO_HIJO
    INNER JOIN DB_METADATA_VALUE MDV
      ON MDV.ID_DETALLE = DET.ID_DETALLE
    LEFT JOIN DB_TIPO_DOCUMENTO_FISICO TDF
      ON TXTD.ID_TIPO_DOCUMENTO = TDF.ID_TIPO_DOCUMENTO
    LEFT JOIN DB_TIPO_DOCUMENTO_DIGITAL TDD
      ON TXTD.ID_TIPO_DOCUMENTO = TDD.ID_TIPO_DOCUMENTO
    LEFT JOIN (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE NOMBRE LIKE ?
    ) PAF
      ON TDF.EMPRESA_RESPONSABLE = PAF.ID_PROVEEDORES_ALMACENAMIENTO
    LEFT JOIN (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE NOMBRE LIKE ?
    ) PAD
      ON TDD.EMPRESA_RESPONSABLE = PAD.ID_PROVEEDORES_ALMACENAMIENTO
    WHERE TXP.ID_CATEGORIA LIKE ?
  `;

    try {
      const result = await cds.run(sql, [`${usu}%`, fi, ff, `${res}%`, `${res}%`, portal]);
      const output = [];

      for (const rs of result) {
        const record = {};
        const fecha = new Date(rs.FECHA_CARGA);
        const month = fecha.getMonth() + 1;

        record.NOMBRE_TAG = rs.NOMBRE_TAG;
        record.USUARIO_CARGA = rs.USUARIO_CARGA;
        record.ARCHIVO = rs.NOMBRE_ARCHIVO;
        record.FECHA_CARGA = `${fecha.getDate()}-${month}-${fecha.getFullYear()}`;
        record.VERSION = rs.VERSION;
        record.ID_TIPO_DOCUMENTO = rs.NOMBRE;
        record.METADATA_ATRIBUTO = rs.ATRIBUTO;
        record.METADATA_VALUE = rs.VALUE;

        if (rs.RES_FIS === null) {
          record.RESPONSABLE = rs.RES_DIG;
        } else {
          record.RESPONSABLE = rs.RES_FIS;
        }

        record.FILES = await getUrlArchivo(rs.ID_CATEGORIA, rs.VERSION);

        output.push(record);
      }

      return output;
    } catch (e) {
      return {
        query: sql,
        msg: e.message
      };
    }
  });

  this.on('planillaTags', async (req) => {
    const { json } = req.data;

    let sql;
    let results = [];

    const usu = json.USUARIO;
    const fi = json.FECHA_INICIO;
    const ff = json.FECHA_FIN;
    const tag = json.TAG;
    const res = json.RESPONSABLE;

    if (PORTAL === "x") {
      PORTAL = "%";
    }

    try {
      sql = `SELECT DISTINCT TAG.NOMBRE_TAG,
                             VER.USUARIO AS USUARIO_CARGA,
                             CAT.TITULO AS Nombre_documento,
                             DET.TITULO AS nombre_Archivo,
                             VER.FECHA_CARGA,
                             VER.VERSION,
                             tid.NOMBRE AS ID_TIPO_DOCUMENTO,
                             VER.URL_DETALLE,
                             paf.NOMBRE AS res_fis,
                             pad.NOMBRE AS res_dig,
                             CAT.ID_CATEGORIA
                    FROM DB_TAGXPORTAL AS TXP
                    INNER JOIN DB_TAG AS TAG
                      ON TAG.ID_TAG = TXP.ID_TAG
                    INNER JOIN DB_TAGXTD AS TXTD
                      ON TXTD.ID_TAG = TXP.ID_TAG
                    INNER JOIN DB_DETALLE AS DET
                      ON DET.ID_TIPO_DOCUMENTO = TXTD.ID_TIPO_DOCUMENTO
                    INNER JOIN DB_TIPO_DOCUMENTO AS tid
                      ON DET.ID_TIPO_DOCUMENTO = tid.ID_TIPO_DOCUMENTO
                    INNER JOIN (SELECT * FROM DB_VERSIONAMIENTO WHERE USUARIO LIKE '%${usu}%' AND FECHA_CARGA BETWEEN '${fi}' AND '${ff}') VER
                      ON VER.ID_DETALLE = DET.ID_DETALLE
                    INNER JOIN DB_CATEGORIA AS CAT
                      ON CAT.ID_CATEGORIA = DET.NODO_HIJO
                    LEFT JOIN DB_TIPO_DOCUMENTO_FISICO AS tdf
                      ON TXTD.ID_TIPO_DOCUMENTO = tdf.ID_TIPO_DOCUMENTO
                    LEFT JOIN DB_TIPO_DOCUMENTO_DIGITAL as tdd
                      ON TXTD.ID_TIPO_DOCUMENTO = tdd.ID_TIPO_DOCUMENTO
                    LEFT JOIN (SELECT * FROM DB_PROVEEDORES_ALMACENAMIENTO WHERE NOMBRE LIKE '%${res}%') paf 
                      ON tdf.EMPRESA_RESPONSABLE = paf.ID_PROVEEDORES_ALMACENAMIENTO
                    LEFT JOIN (SELECT * FROM DB_PROVEEDORES_ALMACENAMIENTO WHERE NOMBRE LIKE '%${res}%') pad
                      ON tdd.EMPRESA_RESPONSABLE = pad.ID_PROVEEDORES_ALMACENAMIENTO
                    WHERE TXP.ID_CATEGORIA LIKE '${portal}' AND TAG.NOMBRE_TAG LIKE '%${tag}%'`;

      const result = await cds.run(sql);
      for (const rs of result) {
        let r = {};
        r.NOMBRE_TAG = rs.NOMBRE_TAG;
        r.USUARIO_CARGA = rs.USUARIO_CARGA;
        r.ARCHIVO = rs.nombre_Archivo;
        const fecha = rs.getDate(5);
        const month = fecha.getMonth() + 1;
        r.FECHA_CARGA = fecha.getDate() + "-" + month + "-" + fecha.getFullYear();
        r.VERSION = rs.VERSION;
        r.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;

        if (rs.res_fis === null) {
          r.RESPONSABLE = rs.res_dig;
        } else {
          r.RESPONSABLE = rs.res_fis
        }
        r.FILES = getUrlArchivo(rs.ID_CATEGORIA, rs.VERSION)
        results.push(r);
      }

      return results;

    } catch (e) {
      return { error: e.message, accion: "planillaTags", query: sql };
    }
  });

  this.on('documentosPorVencerFisico', async (req) => {
    try {
      let { PORTAL } = req.data.input;
      if (PORTAL === 'x') PORTAL = '%';

      const tds = await getTiposDocumentoPortal(PORTAL);
      console.log("Esto trae el TDS:", tds)
      if (!tds || tds.length === 0) {
        return req.error(400, JSON.stringify({ Error: 'El portal no tiene tipos de documentos asociados' }));
      }

      const fi = moment().format('YYYY-MM-DD');
      const ff = moment().add(30, 'days').format('YYYY-MM-DD');

      const ma = moment().format('M');
      const ya = moment().format('YYYY');

      const m1 = moment().add(1, 'months').format('M');
      const y1 = moment().add(1, 'months').format('YYYY');

      const m2 = moment().add(2, 'months').format('M');
      const y2 = moment().add(2, 'months').format('YYYY');

      const fromJoins = `
      FROM DB_DETALLE DET
      INNER JOIN (SELECT * FROM DB_TIPO_DOCUMENTO WHERE ID_TIPO_DOCUMENTO IN (${tds})) TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_VERSIONAMIENTO VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_DETALLE_VISUALIZACION DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_USUARIO USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    `;


      let sql = `
      SELECT DISTINCT COUNT(DISTINCT DOC.ID_DOCUMENTO) AS C
      ${fromJoins}
      WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ? AND DETVIS.TIPO_ALMACENAMIENTO = 2
    `;
      let rows = await cds.run(sql, [fi, ff]);
      const ultimosTreinta = { CANTIDAD: rows?.[0]?.C ?? 0 };

      sql = `
      SELECT DISTINCT COUNT(DISTINCT DOC.ID_DOCUMENTO) AS C 
      ${fromJoins}
      WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ? AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ? AND DETVIS.TIPO_ALMACENAMIENTO = 2
    `;
      rows = await cds.run(sql, [ma, ya]);
      const mesActual = { CANTIDAD: rows?.[0]?.C ?? 0, MES: ma, YEAR: ya };

      // 3) Mes +1
      rows = await cds.run(sql, [m1, y1]);
      const mesAnterior = { CANTIDAD: rows?.[0]?.C ?? 0, MES: m1, YEAR: y1 };

      // 4) Mes +2
      rows = await cds.run(sql, [m2, y2]);
      const mesAnterior2 = { CANTIDAD: rows?.[0]?.C ?? 0, MES: m2, YEAR: y2 };

      const outPut = {
        ULTIMOS_TREINTA: ultimosTreinta,
        MES_ACTUAL: mesActual,
        MES_ANTERIOR: mesAnterior,
        MES_ANTERIOR_2: mesAnterior2
      };

      return outPut;
    } catch (e) {
      return { error: e.message, accion: "documentosPorVencerFisico" }
    }
  });

  this.on("documentosPorVencerDigital", async (req) => {
    var portal = req.http.req.query.PORTAL;
    if (portal === "x") {
      portal = "%";
    }

    var json = req.data.input || req.data;

    var ff = moment().add(30, "days");
    var fi = moment();
    fi = fi.format("YYYY");
    ff = ff.format("YYYY-MM-DD");

    var ma = moment().format("M");
    var ya = moment().format("YYYY");

    var m1 = moment().add(1, "months");
    m1 = m1.format("M");
    var y1 = moment().add(1, "months");
    y1 = y1.format("YYYY");

    var m2 = moment().add(2, "months");
    m2 = m2.format("M");
    var y2 = moment().add(2, "months");
    y2 = y2.format("YYYY");

    var tds = await getTiposDocumentoPortal(portal);
    if (tds.length === 0) {
      return req.error(400, {
        Error: "El portal no tiene tipos de documentos asociados"
      });
    }

    var query;
    var outPut = {};
    outPut.ULTIMOS_TREINTA = {};
    outPut.MES_ACTUAL = {};
    outPut.MES_ANTERIOR = {};
    outPut.MES_ANTERIOR_2 = {};

    try {
      query =
        "SELECT DISTINCT count(DET.ID_DETALLE) AS CANTIDAD FROM DETALLE DET";
      query += " INNER JOIN (select * from TIPO_DOCUMENTO where ID_TIPO_DOCUMENTO in (" + tds +
        ")) TD ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO";
      query += " INNER JOIN DOCUMENTO DOC ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA";
      query += " INNER JOIN VERSIONAMIENTO VER ON VER.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN DETALLE_VISUALIZACION DETVIS ON DETVIS.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN USUARIO USU ON DETVIS.ID_USUARIO = USU.ID_USUARIO";
      query += " INNER JOIN TIPO_ALMACENAMIENTO TA ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO";
      query += " WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ? AND DETVIS.TIPO_ALMACENAMIENTO = 1";

      var rs = await cds.run(query, [fi, ff]);
      for (const row of rs) {
        outPut.ULTIMOS_TREINTA.CANTIDAD = row.CANTIDAD;
      }

      query =
        "SELECT DISTINCT count(DET.ID_DETALLE) AS CANTIDAD FROM DETALLE DET";
      query += " INNER JOIN (select * from TIPO_DOCUMENTO where ID_TIPO_DOCUMENTO in (" + tds +
        ")) TD ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO";
      query += " INNER JOIN DOCUMENTO DOC ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA";
      query += " INNER JOIN VERSIONAMIENTO VER ON VER.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN DETALLE_VISUALIZACION DETVIS ON DETVIS.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN USUARIO USU ON DETVIS.ID_USUARIO = USU.ID_USUARIO";
      query += " INNER JOIN TIPO_ALMACENAMIENTO TA ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO";
      query += " WHERE month(DETVIS.FECHA_VENCIMIENTO) = ? AND year(DETVIS.FECHA_VENCIMIENTO) = ?";
      query += " AND DETVIS.TIPO_ALMACENAMIENTO = 1";

      rs = await cds.run(query, [ma, ya]);
      for (const row of rs) {
        outPut.MES_ACTUAL.CANTIDAD = row.CANTIDAD;
        outPut.MES_ACTUAL.MES = ma;
        outPut.MES_ACTUAL.YEAR = ya;
      }

      query =
        "SELECT DISTINCT count(DET.ID_DETALLE) AS CANTIDAD FROM DETALLE DET";
      query += " INNER JOIN (select * from TIPO_DOCUMENTO where ID_TIPO_DOCUMENTO in (" + tds +
        ")) TD ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO";
      query += " INNER JOIN DOCUMENTO DOC ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA";
      query += " INNER JOIN VERSIONAMIENTO VER ON VER.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN DETALLE_VISUALIZACION DETVIS ON DETVIS.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN USUARIO USU ON DETVIS.ID_USUARIO = USU.ID_USUARIO";
      query += " INNER JOIN TIPO_ALMACENAMIENTO TA ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO";
      query += " WHERE month(DETVIS.FECHA_VENCIMIENTO) = ? AND year(DETVIS.FECHA_VENCIMIENTO) = ?";
      query += " AND DETVIS.TIPO_ALMACENAMIENTO = 1";

      rs = await cds.run(query, [m1, y1]);
      for (const row of rs) {
        outPut.MES_ANTERIOR.CANTIDAD = row.CANTIDAD;
        outPut.MES_ANTERIOR.MES = m1;
        outPut.MES_ANTERIOR.YEAR = y1;
      }

      query =
        "SELECT DISTINCT count(DET.ID_DETALLE) AS CANTIDAD FROM DETALLE DET";
      query += " INNER JOIN (select * from TIPO_DOCUMENTO where ID_TIPO_DOCUMENTO in (" + tds +
        ")) TD ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO";
      query += " INNER JOIN DOCUMENTO DOC ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA";
      query += " INNER JOIN VERSIONAMIENTO VER ON VER.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN DETALLE_VISUALIZACION DETVIS ON DETVIS.ID_DETALLE = DET.ID_DETALLE";
      query += " INNER JOIN USUARIO USU ON DETVIS.ID_USUARIO = USU.ID_USUARIO";
      query += " INNER JOIN TIPO_ALMACENAMIENTO TA ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO";
      query += " WHERE month(DETVIS.FECHA_VENCIMIENTO) = ? AND year(DETVIS.FECHA_VENCIMIENTO) = ?";
      query += " AND DETVIS.TIPO_ALMACENAMIENTO = 1";

      rs = await cds.run(query, [m2, y2]);
      for (const row of rs) {
        outPut.MES_ANTERIOR_2.CANTIDAD = row.CANTIDAD;
        outPut.MES_ANTERIOR_2.MES = m2;
        outPut.MES_ANTERIOR_2.YEAR = y2;
      }

      return outPut;
    } catch (e) {
      return req.error(500, e.message);
    }
  });

  this.on("visitasPortal", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};

    const sqlUltimosTreinta = `
    select count(ID_VISITAS) as CANT
    from DB_VISITAS
    where FECHA between TO_DATE(?, 'YYYY-MM-DD') and TO_DATE(?, 'YYYY-MM-DD')
      and ID_PORTAL like ?
  `;

    const sqlMesActual = `
    select count(ID_VISITAS) as CANT
    from DB_VISITAS
    where month(FECHA) = ?
      and year(FECHA) = ?
      and ID_PORTAL like ?
  `;

    const sqlMesAnterior = `
    select count(ID_VISITAS) as CANT
    from DB_VISITAS
    where month(FECHA) = ?
      and year(FECHA) = ?
      and ID_PORTAL like ?
  `;

    const sqlMesAnterior2 = `
    select count(ID_VISITAS) as CANT
    from DB_VISITAS
    where month(FECHA) = ?
      and year(FECHA) = ?
      and ID_PORTAL like ?
  `;

    try {
      let result = await cds.run(sqlUltimosTreinta, [fi, ff, portal]);
      for (const rs of result) {
        output.ULTIMOS_TREINTA = rs.CANT;
      }

      result = await cds.run(sqlMesActual, [ma, ya, portal]);
      for (const rs of result) {
        output.MES_ACTUAL = {};
        output.MES_ACTUAL.CANT = rs.CANT;
        output.MES_ACTUAL.MES = ma;
        output.MES_ACTUAL.YEAR = ya;
      }

      result = await cds.run(sqlMesAnterior, [m1, y1, portal]);
      for (const rs of result) {
        output.MES_ANTERIOR = {};
        output.MES_ANTERIOR.CANT = rs.CANT;
        output.MES_ANTERIOR.MES = m1;
        output.MES_ANTERIOR.YEAR = y1;
      }

      result = await cds.run(sqlMesAnterior2, [m2, y2, portal]);
      for (const rs of result) {
        output.MES_ANTERIOR_2 = {};
        output.MES_ANTERIOR_2.CANT = rs.CANT;
        output.MES_ANTERIOR_2.MES = m2;
        output.MES_ANTERIOR_2.YEAR = y2;
      }

      return output;
    } catch (e) {
      return {
        msg: e.message
      };
    }
  });

  this.on("documentosCargados", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const result = {};
    const res = [];
    const resa = [];
    const res1 = [];
    const res2 = [];

    const sqlUltimosTreinta = `
    select count(DISTINCT ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between TO_DATE(?, 'YYYY-MM-DD') and TO_DATE(?, 'YYYY-MM-DD')
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
     and ver.ID_TIPO_DOCUMENTO in (${tds})
  `;

    const sqlMesActual = `
    select count(DISTINCT ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
     and ver.ID_TIPO_DOCUMENTO in (${tds})
  `;

    const sqlMesAnterior = `
    select count(DISTINCT ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
     and ver.ID_TIPO_DOCUMENTO in (${tds})
  `;

    const sqlMesAnterior2 = `
    select count(DISTINCT ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
     and ver.ID_TIPO_DOCUMENTO in (${tds})
  `;

    try {
      let resultQuery = await cds.run(sqlUltimosTreinta, [fi, ff]);
      for (const rs of resultQuery) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.query = sqlUltimosTreinta;
        res.push(record);
      }

      resultQuery = await cds.run(sqlMesActual, [ma, ya]);
      for (const rs of resultQuery) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      resultQuery = await cds.run(sqlMesAnterior, [m1, y1]);
      for (const rs of resultQuery) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      resultQuery = await cds.run(sqlMesAnterior2, [m2, y2]);
      for (const rs of resultQuery) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m2;
        record.YEAR = y1;
        res2.push(record);
      }

      result.ULTIMOS_TREINTA = res;
      result.MES_ACTUAL = resa;
      result.MES_ANTERIOR = res1;
      result.MES_ANTERIOR_2 = res2;

      return result;
    } catch (e) {
      return {
        msg: e.message
      };
    }
  });

  this.on("gigasUsados", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    let query = "";

    const sqlTotal = `
    select sum(ver.SIZE) as TOTAL
    from DB_VERSIONAMIENTO as ver
    inner join (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as det
      on det.ID_DETALLE = ver.ID_DETALLE
  `;

    const sqlUltimosTreinta = `
    select sum(ver.SIZE) as TOTAL
    from (
      select *
      from DB_VERSIONAMIENTO
      where FECHA_CARGA between TO_DATE(?, 'YYYY-MM-DD') and TO_DATE(?, 'YYYY-MM-DD')
    ) as ver
    inner join (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as det
      on det.ID_DETALLE = ver.ID_DETALLE
  `;

    const sqlMesActual = `
    select sum(ver.SIZE) as TOTAL
    from (
      select *
      from DB_VERSIONAMIENTO
      where month(FECHA_CARGA) = ?
        and year(FECHA_CARGA) = ?
    ) as ver
    inner join (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as det
      on det.ID_DETALLE = ver.ID_DETALLE
  `;

    const sqlMesAnterior = `
    select sum(ver.SIZE) as TOTAL
    from (
      select *
      from DB_VERSIONAMIENTO
      where month(FECHA_CARGA) = ?
        and year(FECHA_CARGA) = ?
    ) as ver
    inner join (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as det
      on det.ID_DETALLE = ver.ID_DETALLE
  `;

    const sqlMesAnterior2 = `
    select sum(ver.SIZE) as TOTAL
    from (
      select *
      from DB_VERSIONAMIENTO
      where month(FECHA_CARGA) = ?
        and year(FECHA_CARGA) = ?
    ) as ver
    inner join (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as det
      on det.ID_DETALLE = ver.ID_DETALLE
  `;

    try {
      query = sqlTotal;
      let result = await cds.run(query);
      for (const rs of result) {
        if (rs.TOTAL !== null) {
          output.TOTAL = Math.round((Number(rs.TOTAL) / 1000000) * 100) / 100;
          output.UNIDAD_MEDIDA = "MB";
        } else {
          output.TOTAL = 0;
        }
      }

      query = sqlUltimosTreinta;
      result = await cds.run(query, [fi, ff]);
      for (const rs of result) {
        if (rs.TOTAL !== null) {
          output.ULTIMOS_TREINTA = Math.round((Number(rs.TOTAL) / 1000000) * 100) / 100;
          output.ULTIMOS_TREINTA_UM = "MB";
        } else {
          output.ULTIMOS_TREINTA = 0;
        }
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);
      for (const rs of result) {
        if (rs.TOTAL !== null) {
          output.MES_ACTUAL = Math.round((Number(rs.TOTAL) / 1000000) * 100) / 100;
          output.MES_ACTUAL_UM = "MB";
        } else {
          output.MES_ACTUAL = 0;
        }
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);
      for (const rs of result) {
        if (rs.TOTAL !== null) {
          output.MES_ANTERIOR = Math.round((Number(rs.TOTAL) / 1000000) * 100) / 100;
          output.MES_ANTERIOR_UM = "MB";
        } else {
          output.ULTIMOS_TREINTA = 0;
        }
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);
      for (const rs of result) {
        if (rs.TOTAL !== null) {
          output.MES_ANTERIOR_2 = Math.round((Number(rs.TOTAL) / 1000000) * 100) / 100;
          output.MES_ANTERIOR_2_UM = "MB";
        } else {
          output.MES_ANTERIOR_2 = 0;
        }
      }

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("documentosPorProveedorFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const res = [];
    const resa = [];
    const res1 = [];
    const res2 = [];
    const output = {};

    const sqlUltimosTreinta = `
    select
      pa.NOMBRE,
      count(distinct ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between TO_DATE(?, 'YYYY-MM-DD') and TO_DATE(?, 'YYYY-MM-DD')
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesActual = `
    select
      pa.NOMBRE,
      count(distinct ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesAnterior = `
    select
      pa.NOMBRE,
      count(distinct ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesAnterior2 = `
    select
      pa.NOMBRE,
      count(distinct ver.ID_DOCUMENTO) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    try {
      let result = await cds.run(sqlUltimosTreinta, [fi, ff]);
      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        res.push(record);
      }

      result = await cds.run(sqlMesActual, [ma, ya]);
      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      result = await cds.run(sqlMesAnterior, [m1, y1]);
      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      result = await cds.run(sqlMesAnterior2, [m2, y2]);
      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m2;
        record.YEAR = y2;
        res2.push(record);
      }

      output.ULTIMOS_TREINTA = res;
      output.MES_ACTUAL = resa;
      output.MES_ANTERIOR = res1;
      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: sqlUltimosTreinta,
        msg: e.message
      };
    }
  });

  this.on('documentosPorProveedorDigital', async (req) => {
    try {
      let { PORTAL } = req.data.input;
      if (PORTAL === 'x') PORTAL = '%';

      const tds = await getTiposDocumentoPortal(PORTAL);
      if (!tds || tds.length === 0) {
        return req.error(400, { Error: "El portal no tiene tipos de documentos asociados" });
      }

      const fi = moment().format('YYYY-MM-DD');
      const ff = moment().add(30, 'days').format('YYYY-MM-DD');

      const ma = moment().format('M');
      const ya = moment().format('YYYY');

      const m1 = moment().subtract(1, 'months').format('M');
      const y1 = moment().subtract(1, 'months').format('YYYY');

      const m2 = moment().subtract(2, 'months').format('M');
      const y2 = moment().subtract(2, 'months').format('YYYY');

      const fromJoins = `
      FROM (SELECT * 
            FROM DB_PROVEEDORES_ALMACENAMIENTO 
            WHERE ALMACENAMIENTO = 'Digital' OR ALMACENAMIENTO = '') pa
      LEFT OUTER JOIN (SELECT * 
                       FROM DB_TIPO_DOCUMENTO_DIGITAL 
                       WHERE ID_TIPO_DOCUMENTO IN (${tds})) td
        ON pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
      LEFT OUTER JOIN DB_DETALLE de
        ON td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    `;

      let sql = `
      SELECT pa.NOMBRE AS PROVEEDOR, COUNT(DISTINCT ver.ID_DOCUMENTO) AS DOCUMENTOS
      ${fromJoins}
      INNER JOIN (SELECT * 
                  FROM DB_DOCUMENTO 
                  WHERE UFH_CREAR BETWEEN ? AND ?) ver
        ON de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
      GROUP BY pa.NOMBRE
    `;
      let rows = await cds.run(sql, [fi, ff]);
      const res = rows.map(r => ({
        PROVEEDOR: r.PROVEEDOR,
        DOCUMENTOS: r.DOCUMENTOS
      }));

      sql = `
      SELECT pa.NOMBRE AS PROVEEDOR, COUNT(DISTINCT ver.ID_DOCUMENTO) AS DOCUMENTOS
      ${fromJoins}
      INNER JOIN (SELECT * 
                  FROM DB_DOCUMENTO 
                  WHERE MONTH(UFH_CREAR) = ? AND YEAR(UFH_CREAR) = ?) ver
        ON de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
      GROUP BY pa.NOMBRE
    `;
      rows = await cds.run(sql, [ma, ya]);
      const resa = rows.map(r => ({
        PROVEEDOR: r.PROVEEDOR,
        DOCUMENTOS: r.DOCUMENTOS,
        MES: ma,
        YEAR: ya
      }));

      rows = await cds.run(sql, [m1, y1]);
      const res1 = rows.map(r => ({
        PROVEEDOR: r.PROVEEDOR,
        DOCUMENTOS: r.DOCUMENTOS,
        MES: m1,
        YEAR: y1
      }));

      rows = await cds.run(sql, [m2, y2]);
      const res2 = rows.map(r => ({
        PROVEEDOR: r.PROVEEDOR,
        DOCUMENTOS: r.DOCUMENTOS,
        MES: m2,
        YEAR: y2
      }));

      return {
        ULTIMOS_TREINTA: res,
        MES_ACTUAL: resa,
        MES_ANTERIOR: res1,
        MES_ANTERIOR_2: res2
      };

    } catch (e) {
      return req.error(400, { msg: e.message });
    }
  });

  this.on("cincoTagsMasBuscados", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    let query = "";

    const sqlUltimosTreinta = `
    select top 5
      tg.NOMBRE_TAG,
      count(bt.ID_BUSQUEDA_TAG) as CANTIDAD
    from DB_BUSQUEDA_TAG as bt
    inner join DB_TAG as tg
      on bt.ID_TAG = tg.ID_TAG
    where bt.ID_PORTAL like ?
      and bt.FECHA between TO_DATE(?, 'YYYY-MM-DD') and TO_DATE(?, 'YYYY-MM-DD')
    group by tg.NOMBRE_TAG
    order by CANTIDAD desc
  `;

    const sqlMesActual = `
    select top 5
      tg.NOMBRE_TAG,
      count(bt.ID_BUSQUEDA_TAG) as CANTIDAD
    from DB_BUSQUEDA_TAG as bt
    inner join DB_TAG as tg
      on bt.ID_TAG = tg.ID_TAG
    where bt.ID_PORTAL like ?
      and month(bt.FECHA) = ?
      and year(bt.FECHA) = ?
    group by tg.NOMBRE_TAG
    order by CANTIDAD desc
  `;

    const sqlMesAnterior = `
    select top 5
      tg.NOMBRE_TAG,
      count(bt.ID_BUSQUEDA_TAG) as CANTIDAD
    from DB_BUSQUEDA_TAG as bt
    inner join DB_TAG as tg
      on bt.ID_TAG = tg.ID_TAG
    where bt.ID_PORTAL like ?
      and month(bt.FECHA) = ?
      and year(bt.FECHA) = ?
    group by tg.NOMBRE_TAG
    order by CANTIDAD desc
  `;

    const sqlMesAnterior2 = `
    select top 5
      tg.NOMBRE_TAG,
      count(bt.ID_BUSQUEDA_TAG) as CANTIDAD
    from DB_BUSQUEDA_TAG as bt
    inner join DB_TAG as tg
      on bt.ID_TAG = tg.ID_TAG
    where bt.ID_PORTAL like ?
      and month(bt.FECHA) = ?
      and year(bt.FECHA) = ?
    group by tg.NOMBRE_TAG
    order by CANTIDAD desc
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [portal, fi, ff]);
      let outPuts = [];

      for (const rs of result) {
        const record = {};
        record.TAG = rs.NOMBRE_TAG;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.ULTIMOS_TREINTA = outPuts;

      query = sqlMesActual;
      result = await cds.run(query, [portal, ma, ya]);
      outPuts = [];
      output.MES_ACTUAL = {};

      for (const rs of result) {
        const record = {};
        record.TAG = rs.NOMBRE_TAG;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.MES_ACTUAL.MES = ma;
      output.MES_ACTUAL.YEAR = ya;
      output.MES_ACTUAL.RESULTADO = outPuts;

      query = sqlMesAnterior;
      result = await cds.run(query, [portal, m1, y1]);
      outPuts = [];
      output.MES_ANTERIOR = {};

      for (const rs of result) {
        const record = {};
        record.TAG = rs.NOMBRE_TAG;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.MES_ANTERIOR.MES = m1;
      output.MES_ANTERIOR.YEAR = y1;
      output.MES_ANTERIOR.RESULTADO = outPuts;

      query = sqlMesAnterior2;
      result = await cds.run(query, [portal, m2, y2]);
      outPuts = [];
      output.MES_ANTERIOR_2 = {};

      for (const rs of result) {
        const record = {};
        record.TAG = rs.NOMBRE_TAG;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.MES_ANTERIOR_2.MES = m2;
      output.MES_ANTERIOR_2.YEAR = y2;
      output.MES_ANTERIOR_2.RESULTADO = outPuts;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("topCriterios", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    let query = "";

    const sqlUltimosTreinta = `
    select top 5
      NOMBRE_CRITERIO,
      count(ID_BUSQUEDA_CRITERIOS) as CANTIDAD
    from DB_BUSQUEDA_CRITERIOS
    where ID_PORTAL like ?
      and FECHA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    group by NOMBRE_CRITERIO
    order by CANTIDAD desc
  `;

    const sqlMesActual = `
    select top 5
      NOMBRE_CRITERIO,
      count(ID_BUSQUEDA_CRITERIOS) as CANTIDAD
    from DB_BUSQUEDA_CRITERIOS
    where ID_PORTAL like ?
      and month(FECHA) = ?
      and year(FECHA) = ?
    group by NOMBRE_CRITERIO
    order by CANTIDAD desc
  `;

    const sqlMesAnterior = `
    select top 5
      NOMBRE_CRITERIO,
      count(ID_BUSQUEDA_CRITERIOS) as CANTIDAD
    from DB_BUSQUEDA_CRITERIOS
    where ID_PORTAL like ?
      and month(FECHA) = ?
      and year(FECHA) = ?
    group by NOMBRE_CRITERIO
    order by CANTIDAD desc
  `;

    const sqlMesAnterior2 = `
    select top 5
      NOMBRE_CRITERIO,
      count(ID_BUSQUEDA_CRITERIOS) as CANTIDAD
    from DB_BUSQUEDA_CRITERIOS
    where ID_PORTAL like ?
      and month(FECHA) = ?
      and year(FECHA) = ?
    group by NOMBRE_CRITERIO
    order by CANTIDAD desc
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [portal, fi, ff]);
      let outPuts = [];

      for (const rs of result) {
        const record = {};
        record.VALOR = rs.NOMBRE_CRITERIO;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.ULTIMOS_TREINTA = outPuts;

      query = sqlMesActual;
      result = await cds.run(query, [portal, ma, ya]);
      outPuts = [];

      for (const rs of result) {
        const record = {};
        record.VALOR = rs.NOMBRE_CRITERIO;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.MES_ACTUAL = {};
      output.MES_ACTUAL.MES = ma;
      output.MES_ACTUAL.YEAR = ya;
      output.MES_ACTUAL.RESULTADO = outPuts;

      query = sqlMesAnterior;
      result = await cds.run(query, [portal, m1, y1]);
      outPuts = [];

      for (const rs of result) {
        const record = {};
        record.VALOR = rs.NOMBRE_CRITERIO;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.MES_ANTERIOR = {};
      output.MES_ANTERIOR.MES = m1;
      output.MES_ANTERIOR.YEAR = y1;
      output.MES_ANTERIOR.RESULTADO = outPuts;

      query = sqlMesAnterior2;
      result = await cds.run(query, [portal, m2, y2]);
      outPuts = [];

      for (const rs of result) {
        const record = {};
        record.VALOR = rs.NOMBRE_CRITERIO;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.MES_ANTERIOR_2 = {};
      output.MES_ANTERIOR_2.MES = m2;
      output.MES_ANTERIOR_2.YEAR = y2;
      output.MES_ANTERIOR_2.RESULTADO = outPuts;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("documentosCargadosWorkflow", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    const meses = [];

    for (const _ of Array.from({ length: 12 })) {
      meses.push({
        mes: ff.format("M"),
        year: ff.format("YYYY"),
        cant: 0
      });

      ff = ff.subtract(1, "months");
    }

    let query = `
    select count(det.ID_DETALLE) as CANT
    from (
      select *
      from DB_ESTRATEGIA_LIBERACION
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as el
    inner join DB_DETALLE as det
      on el.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_VERSIONAMIENTO
      where month(FECHA_CARGA) = ?
        and year(FECHA_CARGA) = ?
    ) as v
      on det.ID_DETALLE = v.ID_DETALLE
  `;

    try {
      for (const item of meses) {
        const result = await cds.run(query, [item.mes, item.year]);

        for (const rs of result) {
          item.cant = rs.CANT;
        }
      }

      return meses;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("documentosAprobados", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    let query = "";

    const sqlUltimosTreinta = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and FECHA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    const sqlMesActual = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior2 = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        output.ULTIMOS_TREINTA = rs.CANTIDAD;
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        output.MES_ACTUAL = {};
        output.MES_ACTUAL.CANTIDAD = rs.CANTIDAD;
        output.MES_ACTUAL.MES = ma;
        output.MES_ACTUAL.YEAR = ya;
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        output.MES_ANTERIOR = {};
        output.MES_ANTERIOR.CANTIDAD = rs.CANTIDAD;
        output.MES_ANTERIOR.MES = m1;
        output.MES_ANTERIOR.YEAR = y1;
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        output.MES_ANTERIOR_2 = {};
        output.MES_ANTERIOR_2.CANTIDAD = rs.CANTIDAD;
        output.MES_ANTERIOR_2.MES = m2;
        output.MES_ANTERIOR_2.YEAR = y2;
      }

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("documentosRechazados", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    let query = "";

    const sqlUltimosTreinta = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and FECHA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    const sqlMesActual = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior2 = `
    select count(distinct det.ID_CATEGORIA_HOJA) as CANTIDAD
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        output.ULTIMOS_TREINTA = rs.CANTIDAD;
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        output.MES_ACTUAL = {};
        output.MES_ACTUAL.CANTIDAD = rs.CANTIDAD;
        output.MES_ACTUAL.MES = ma;
        output.MES_ACTUAL.YEAR = ya;
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        output.MES_ANTERIOR = {};
        output.MES_ANTERIOR.CANTIDAD = rs.CANTIDAD;
        output.MES_ANTERIOR.MES = m1;
        output.MES_ANTERIOR.YEAR = y1;
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        output.MES_ANTERIOR_2 = {};
        output.MES_ANTERIOR_2.CANTIDAD = rs.CANTIDAD;
        output.MES_ANTERIOR_2.MES = m2;
        output.MES_ANTERIOR_2.YEAR = y2;
      }

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("topUsuMayorTiempoAprobacion", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("DD.MM.YYYY");
    ff = ff.format("DD.MM.YYYY");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    const resa = [];
    const resu = [];
    const res1 = [];
    const res2 = [];
    let query = "";

    const sqlUltimosTreinta = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(doc.UFH_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and FECHA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_DOCUMENTO as doc
      on det.ID_CATEGORIA_HOJA = doc.ID_DOCUMENTO
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    const sqlMesActual = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    const sqlMesAnterior = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    const sqlMesAnterior2 = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        resu.push(record);
      }

      output.ULTIMOS_TREINTA = resu;

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      output.MES_ACTUAL = resa;

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      output.MES_ANTERIOR = res1;

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m2;
        record.YEAR = y2;
        res2.push(record);
      }

      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("topUsuMayorTiempoRechazo", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    const resa = [];
    const resu = [];
    const res1 = [];
    const res2 = [];
    let query = "";

    const sqlUltimosTreinta = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(doc.UFH_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and FECHA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join DB_DOCUMENTO as doc
      on det.ID_CATEGORIA_HOJA = doc.ID_DOCUMENTO
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    const sqlMesActual = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    const sqlMesAnterior = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    const sqlMesAnterior2 = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO desc
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        resu.push(record);
      }

      output.ULTIMOS_TREINTA = resu;

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      output.MES_ACTUAL = resa;

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      output.MES_ANTERIOR = res1;

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m2;
        record.YEAR = y2;
        res2.push(record);
      }

      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("topUsuMenorTiempoAprobacion", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    const resa = [];
    const resu = [];
    const res1 = [];
    const res2 = [];
    let query = "";

    const sqlUltimosTreinta = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(doc.UFH_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and FECHA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_DOCUMENTO as doc
      on det.ID_CATEGORIA_HOJA = doc.ID_DOCUMENTO
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    const sqlMesActual = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    const sqlMesAnterior = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    const sqlMesAnterior2 = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Aprobado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        resu.push(record);
      }

      output.ULTIMOS_TREINTA = resu;

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      output.MES_ACTUAL = resa;

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      output.MES_ANTERIOR = res1;

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m2;
        record.YEAR = y2;
        res2.push(record);
      }

      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("topUsuMenorTiempoRechazo", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const output = {};
    const resa = [];
    const resu = [];
    const res1 = [];
    const res2 = [];
    let query = "";

    const sqlUltimosTreinta = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(doc.UFH_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and FECHA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join DB_DOCUMENTO as doc
      on det.ID_CATEGORIA_HOJA = doc.ID_DOCUMENTO
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    const sqlMesActual = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    const sqlMesAnterior = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    const sqlMesAnterior2 = `
    select top 5
      ia.LIBERADOR,
      ia.LIBERADOR_NOMBRE,
      avg(days_between(ver.FECHA_CARGA, ia.FECHA)) as PROMEDIO
    from (
      select *
      from DB_INSTANCIA_APROBACION
      where ESTADO = 'Rechazado'
        and month(FECHA) = ?
        and year(FECHA) = ?
    ) as ia
    inner join DB_DETALLE as det
      on ia.ID_DOCUMENTO = det.ID_CATEGORIA_HOJA
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = det.ID_TIPO_DOCUMENTO
    inner join DB_VERSIONAMIENTO as ver
      on det.ID_DETALLE = ver.ID_DETALLE
    group by ia.LIBERADOR, ia.LIBERADOR_NOMBRE
    order by PROMEDIO asc
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        resu.push(record);
      }

      output.ULTIMOS_TREINTA = resu;

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      output.MES_ACTUAL = resa;

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      output.MES_ANTERIOR = res1;

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        const record = {};
        record.LIBERADOR = rs.LIBERADOR;
        record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
        record.PROMEDIO_APROBACION = rs.PROMEDIO;
        record.MES = m2;
        record.YEAR = y2;
        res2.push(record);
      }

      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("archivosPorProveedorDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const res = [];
    const resa = [];
    const res1 = [];
    const res2 = [];
    const output = {};
    let query = "";

    const sqlUltimosTreinta = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Digital' or ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_DIGITAL
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesActual = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Digital' or ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_DIGITAL
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesAnterior = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Digital' or ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_DIGITAL
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesAnterior2 = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Digital' or ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_DIGITAL
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        res.push(record);
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m2;
        record.YEAR = y2;
        res2.push(record);
      }

      output.ULTIMOS_TREINTA = res;
      output.MES_ACTUAL = resa;
      output.MES_ANTERIOR = res1;
      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("archivosPorProveedorFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const res = [];
    const resa = [];
    const res1 = [];
    const res2 = [];
    const output = {};
    let query = "";

    const sqlUltimosTreinta = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where UFH_CREAR between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesActual = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesAnterior = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    const sqlMesAnterior2 = `
    select
      pa.NOMBRE,
      count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_PROVEEDORES_ALMACENAMIENTO
      where ALMACENAMIENTO = 'Fisico' OR ALMACENAMIENTO = ''
    ) as pa
    left outer join (
      select *
      from DB_TIPO_DOCUMENTO_FISICO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as td
      on pa.ID_PROVEEDORES_ALMACENAMIENTO = td.EMPRESA_RESPONSABLE
    left outer join DB_DETALLE as de
      on td.ID_TIPO_DOCUMENTO = de.ID_TIPO_DOCUMENTO
    inner join (
      select *
      from DB_DOCUMENTO
      where month(UFH_CREAR) = ?
        and year(UFH_CREAR) = ?
    ) as ver
      on de.ID_CATEGORIA_HOJA = ver.ID_DOCUMENTO
    group by pa.NOMBRE
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        res.push(record);
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        const record = {};
        record.PROVEEDOR = rs.NOMBRE;
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m2;
        record.YEAR = y2;
        res2.push(record);
      }

      output.ULTIMOS_TREINTA = res;
      output.MES_ACTUAL = resa;
      output.MES_ANTERIOR = res1;
      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("archivosPorVencerDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment().add(30, "days");
    let fi = moment();
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().add(1, "months");
    m1 = m1.format("M");
    let y1 = moment().add(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().add(2, "months");
    m2 = m2.format("M");
    let y2 = moment().add(2, "months");
    y2 = y2.format("YYYY");

    const outPut = {};
    outPut.ULTIMOS_TREINTA = {};
    outPut.MES_ACTUAL = {};
    outPut.MES_ANTERIOR = {};
    outPut.MES_ANTERIOR_2 = {};

    let query = "";

    const sqlUltimosTreinta = `
    SELECT DISTINCT count(distinct DET.ID_DETALLE) as CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_DOCUMENTO DOC
      ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN DB_VERSIONAMIENTO VER
      ON VER.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_DETALLE_VISUALIZACION DETVIS
      ON DETVIS.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_USUARIO USU
      ON DETVIS.ID_USUARIO = USU.ID_USUARIO
    INNER JOIN DB_TIPO_ALMACENAMIENTO TA
      ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN TO_DATE(?, 'DD.MM.YYYY') AND TO_DATE(?, 'DD.MM.YYYY')
      AND DETVIS.TIPO_ALMACENAMIENTO = 1
  `;

    const sqlMesActual = `
    SELECT DISTINCT count(DET.ID_DETALLE) as CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_DOCUMENTO DOC
      ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN DB_VERSIONAMIENTO VER
      ON VER.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_DETALLE_VISUALIZACION DETVIS
      ON DETVIS.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_USUARIO USU
      ON DETVIS.ID_USUARIO = USU.ID_USUARIO
    INNER JOIN DB_TIPO_ALMACENAMIENTO TA
      ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    WHERE month(DETVIS.FECHA_VENCIMIENTO) = ?
      AND year(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 1
  `;

    const sqlMesAnterior = `
    SELECT DISTINCT count(DET.ID_DETALLE) as CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_DOCUMENTO DOC
      ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN DB_VERSIONAMIENTO VER
      ON VER.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_DETALLE_VISUALIZACION DETVIS
      ON DETVIS.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_USUARIO USU
      ON DETVIS.ID_USUARIO = USU.ID_USUARIO
    INNER JOIN DB_TIPO_ALMACENAMIENTO TA
      ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    WHERE month(DETVIS.FECHA_VENCIMIENTO) = ?
      AND year(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 1
  `;

    const sqlMesAnterior2 = `
    SELECT DISTINCT count(DET.ID_DETALLE) as CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_DOCUMENTO DOC
      ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN DB_VERSIONAMIENTO VER
      ON VER.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_DETALLE_VISUALIZACION DETVIS
      ON DETVIS.ID_DETALLE = DET.ID_DETALLE
    INNER JOIN DB_USUARIO USU
      ON DETVIS.ID_USUARIO = USU.ID_USUARIO
    INNER JOIN DB_TIPO_ALMACENAMIENTO TA
      ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    WHERE month(DETVIS.FECHA_VENCIMIENTO) = ?
      AND year(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 1
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);
      for (const rs of result) {
        outPut.ULTIMOS_TREINTA.CANTIDAD = rs.CANTIDAD;
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);
      for (const rs of result) {
        outPut.MES_ACTUAL.CANTIDAD = rs.CANTIDAD;
        outPut.MES_ACTUAL.MES = ma;
        outPut.MES_ACTUAL.YEAR = ya;
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);
      for (const rs of result) {
        outPut.MES_ANTERIOR.CANTIDAD = rs.CANTIDAD;
        outPut.MES_ANTERIOR.MES = m1;
        outPut.MES_ANTERIOR.YEAR = y1;
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);
      for (const rs of result) {
        outPut.MES_ANTERIOR_2.CANTIDAD = rs.CANTIDAD;
        outPut.MES_ANTERIOR_2.MES = m2;
        outPut.MES_ANTERIOR_2.YEAR = y2;
      }

      return outPut;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("archivosCargados", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment();
    let fi = moment().subtract(30, "days");
    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().subtract(1, "months");
    m1 = m1.format("M");
    let y1 = moment().subtract(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().subtract(2, "months");
    m2 = m2.format("M");
    let y2 = moment().subtract(2, "months");
    y2 = y2.format("YYYY");

    const res = [];
    const resa = [];
    const res1 = [];
    const res2 = [];
    const output = {};
    let query = "";

    const sqlUltimosTreinta = `
    select count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_VERSIONAMIENTO
      where FECHA_CARGA between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
    ) as ver
      on de.ID_DETALLE = ver.ID_DETALLE
  `;

    const sqlMesActual = `
    select count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_VERSIONAMIENTO
      where month(FECHA_CARGA) = ?
        and year(FECHA_CARGA) = ?
    ) as ver
      on de.ID_DETALLE = ver.ID_DETALLE
  `;

    const sqlMesAnterior = `
    select count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_VERSIONAMIENTO
      where month(FECHA_CARGA) = ?
        and year(FECHA_CARGA) = ?
    ) as ver
      on de.ID_DETALLE = ver.ID_DETALLE
  `;

    const sqlMesAnterior2 = `
    select count(de.ID_DETALLE) as DOCUMENTOS
    from (
      select *
      from DB_DETALLE
      where ID_TIPO_DOCUMENTO in (${tds})
    ) as de
    inner join (
      select *
      from DB_VERSIONAMIENTO
      where month(FECHA_CARGA) = ?
        and year(FECHA_CARGA) = ?
    ) as ver
      on de.ID_DETALLE = ver.ID_DETALLE
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);

      for (const rs of result) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        res.push(record);
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);

      for (const rs of result) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = ma;
        record.YEAR = ya;
        resa.push(record);
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);

      for (const rs of result) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m1;
        record.YEAR = y1;
        res1.push(record);
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);

      for (const rs of result) {
        const record = {};
        record.DOCUMENTOS = rs.DOCUMENTOS;
        record.MES = m2;
        record.YEAR = y1;
        res2.push(record);
      }

      output.ULTIMOS_TREINTA = res;
      output.MES_ACTUAL = resa;
      output.MES_ANTERIOR = res1;
      output.MES_ANTERIOR_2 = res2;

      return output;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

  this.on("archivosPorVencerFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    let ff = moment().add(30, "days");
    let fi = moment();

    fi = fi.format("YYYY-MM-DD");
    ff = ff.format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    let m1 = moment().add(1, "months");
    m1 = m1.format("M");
    let y1 = moment().add(1, "months");
    y1 = y1.format("YYYY");

    let m2 = moment().add(2, "months");
    m2 = m2.format("M");
    let y2 = moment().add(2, "months");
    y2 = y2.format("YYYY");

    const outPut = {};
    outPut.ULTIMOS_TREINTA = {};
    outPut.MES_ACTUAL = {};
    outPut.MES_ANTERIOR = {};
    outPut.MES_ANTERIOR_2 = {};

    let query = "";

    const sqlUltimosTreinta = `
    select count(distinct DETVIS.ID_DETALLE) as CANTIDAD
    from DB_DETALLE DET
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    inner join DB_DOCUMENTO DOC
      on DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    inner join DB_VERSIONAMIENTO VER
      on VER.ID_DETALLE = DET.ID_DETALLE
    inner join DB_DETALLE_VISUALIZACION DETVIS
      on DETVIS.ID_DETALLE = DET.ID_DETALLE
    inner join DB_USUARIO USU
      on DETVIS.ID_USUARIO = USU.ID_USUARIO
    inner join DB_TIPO_ALMACENAMIENTO TA
      on DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    where DETVIS.FECHA_VENCIMIENTO between TO_DATE(?, 'DD.MM.YYYY') and TO_DATE(?, 'DD.MM.YYYY')
      and DETVIS.TIPO_ALMACENAMIENTO = 2
  `;

    const sqlMesActual = `
    select distinct count(distinct DET.ID_DETALLE) as CANTIDAD
    from DB_DETALLE DET
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    inner join DB_DOCUMENTO DOC
      on DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    inner join DB_VERSIONAMIENTO VER
      on VER.ID_DETALLE = DET.ID_DETALLE
    inner join DB_DETALLE_VISUALIZACION DETVIS
      on DETVIS.ID_DETALLE = DET.ID_DETALLE
    inner join DB_USUARIO USU
      on DETVIS.ID_USUARIO = USU.ID_USUARIO
    inner join DB_TIPO_ALMACENAMIENTO TA
      on DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    where month(DETVIS.FECHA_VENCIMIENTO) = ?
      and year(DETVIS.FECHA_VENCIMIENTO) = ?
      and DETVIS.TIPO_ALMACENAMIENTO = 2
  `;

    const sqlMesAnterior = `
    select distinct count(distinct DET.ID_DETALLE) as CANTIDAD
    from DB_DETALLE DET
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    inner join DB_DOCUMENTO DOC
      on DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    inner join DB_VERSIONAMIENTO VER
      on VER.ID_DETALLE = DET.ID_DETALLE
    inner join DB_DETALLE_VISUALIZACION DETVIS
      on DETVIS.ID_DETALLE = DET.ID_DETALLE
    inner join DB_USUARIO USU
      on DETVIS.ID_USUARIO = USU.ID_USUARIO
    inner join DB_TIPO_ALMACENAMIENTO TA
      on DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    where month(DETVIS.FECHA_VENCIMIENTO) = ?
      and year(DETVIS.FECHA_VENCIMIENTO) = ?
      and DETVIS.TIPO_ALMACENAMIENTO = 2
  `;

    const sqlMesAnterior2 = `
    select distinct count(distinct DET.ID_DETALLE) as CANTIDAD
    from DB_DETALLE DET
    inner join (
      select *
      from DB_TIPO_DOCUMENTO
      where ID_TIPO_DOCUMENTO in (${tds})
    ) TD
      on TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    inner join DB_DOCUMENTO DOC
      on DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    inner join DB_VERSIONAMIENTO VER
      on VER.ID_DETALLE = DET.ID_DETALLE
    inner join DB_DETALLE_VISUALIZACION DETVIS
      on DETVIS.ID_DETALLE = DET.ID_DETALLE
    inner join DB_USUARIO USU
      on DETVIS.ID_USUARIO = USU.ID_USUARIO
    inner join DB_TIPO_ALMACENAMIENTO TA
      on DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    where month(DETVIS.FECHA_VENCIMIENTO) = ?
      and year(DETVIS.FECHA_VENCIMIENTO) = ?
      and DETVIS.TIPO_ALMACENAMIENTO = 2
  `;

    try {
      query = sqlUltimosTreinta;
      let result = await cds.run(query, [fi, ff]);
      for (const rs of result) {
        outPut.ULTIMOS_TREINTA.CANTIDAD = rs.CANTIDAD;
      }

      query = sqlMesActual;
      result = await cds.run(query, [ma, ya]);
      for (const rs of result) {
        outPut.MES_ACTUAL.CANTIDAD = rs.CANTIDAD;
        outPut.MES_ACTUAL.MES = ma;
        outPut.MES_ACTUAL.YEAR = ya;
      }

      query = sqlMesAnterior;
      result = await cds.run(query, [m1, y1]);
      for (const rs of result) {
        outPut.MES_ANTERIOR.CANTIDAD = rs.CANTIDAD;
        outPut.MES_ANTERIOR.MES = m1;
        outPut.MES_ANTERIOR.YEAR = y1;
      }

      query = sqlMesAnterior2;
      result = await cds.run(query, [m2, y2]);
      for (const rs of result) {
        outPut.MES_ANTERIOR_2.CANTIDAD = rs.CANTIDAD;
        outPut.MES_ANTERIOR_2.MES = m2;
        outPut.MES_ANTERIOR_2.YEAR = y2;
      }

      return outPut;
    } catch (e) {
      return {
        query: query,
        msg: e.message
      };
    }
  });

});