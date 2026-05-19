////////////////////
///////REPORTES/////
////////////////////

const cds = require("@sap/cds");
const res = require("express/lib/response");
const moment = require("moment");

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

  async function getActivo(version, iddetalle) {
    let sql;

    try {
      sql = `
      SELECT ACTIVO
      FROM DB_VERSIONAMIENTO
      WHERE ID_DETALLE = ?
        AND VERSION = ?
    `;

      const result = await cds.run(sql, [iddetalle, version]);

      for (const row of result) {
        if (row.ACTIVO === "X") {
          return true;
        }

        return false;
      }

    } catch (e) {
      return false;
    }

    return false;
  }

  async function getUrlArchivo(arrCategoria, version) {
    let sql;
    let sValue = [];

    try {
      sql = `
      SELECT
        VER.URL_DETALLE AS URL_DETALLE,
        DET.TITULO AS TITULO,
        DET.ID_DETALLE AS ID_DETALLE,
        VER.SIZE AS SIZE,
        MAX(VER.VERSION) AS VERSION_ACTIVO,
        DET.TYPE AS TYPE,
        FORM.MYMETYPE AS MYMETYPE,
        DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
        MAX(VER2.VERSION) AS VERSION
      FROM DB_DETALLE AS DET
      INNER JOIN DB_VERSIONAMIENTO AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      LEFT JOIN DB_FORMATOS AS FORM
        ON FORM.NOMBRE_FORMATO = DET.TYPE
      INNER JOIN (
        SELECT ID_DETALLE, VERSION
        FROM DB_VERSIONAMIENTO
      ) AS VER2
        ON VER2.ID_DETALLE = DET.ID_DETALLE
       AND VER2.VERSION = ?
      WHERE DET.NODO_HIJO = ?
      GROUP BY
        VER.URL_DETALLE,
        DET.TITULO,
        DET.ID_DETALLE,
        VER.SIZE,
        DET.TYPE,
        FORM.MYMETYPE,
        DET.ID_TIPO_DOCUMENTO
    `;

      const result = await cds.run(sql, [version, arrCategoria]);

      for (const rs of result) {
        const record = {};

        record.URL = rs.URL_DETALLE;
        record.TITULO = rs.TITULO;
        record.ID_DETALLE = rs.ID_DETALLE;
        record.SIZE = (rs.SIZE === null || rs.SIZE === "")
          ? "—"
          : (Number(rs.SIZE) / 1000).toFixed(1) + " KB";
        record.VERSION = rs.VERSION;
        record.FORMATO = rs.TYPE;
        record.ICONO = getIconoDocumento(rs.TYPE);
        record.MYME_TYPE = rs.MYMETYPE === null ? "octet/stream" : rs.MYMETYPE;
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(rs.VERSION_ACTIVO, rs.ID_DETALLE);

        if (record.ACTIVO) {
          sValue.push(record);
        }
      }

    } catch (e) {
      return {
        error: e.message,
        accion: "getUrlArchivo",
        query: sql
      };
    }

    return sValue;
  }

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

      if (usuarioCarga && usuarioCarga !== "") {
        where += ` AND VER.USUARIO = ?`;
        params.push(usuarioCarga);
      }

      if (fechaInicio && fechaInicio !== "") {
        where += ` AND VER.FECHA_CARGA BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
      }

      sql = `
      SELECT
        VER.URL_DETALLE AS URL_DETALLE,
        DET.TITULO AS TITULO,
        DET.ID_DETALLE AS ID_DETALLE,
        VER.SIZE AS SIZE,
        VER.VERSION AS VERSION,
        DET.TYPE AS TYPE,
        FORM.MYMETYPE AS MYMETYPE,
        DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
        VER.USUARIO AS USUARIO
      FROM DB_DETALLE AS DET
      INNER JOIN DB_VERSIONAMIENTO AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      LEFT JOIN DB_FORMATOS AS FORM
        ON FORM.NOMBRE_FORMATO = DET.TYPE
      WHERE ${where}
      GROUP BY
        VER.URL_DETALLE,
        DET.TITULO,
        DET.ID_DETALLE,
        VER.SIZE,
        VER.VERSION,
        DET.TYPE,
        FORM.MYMETYPE,
        DET.ID_TIPO_DOCUMENTO,
        VER.USUARIO
    `;

      const result = await cds.run(sql, params);

      for (const rs of result) {
        const record = {};

        record.URL = rs.URL_DETALLE;
        record.TITULO = rs.TITULO;
        record.ID_DETALLE = rs.ID_DETALLE;
        record.SIZE = (rs.SIZE === null || rs.SIZE === "")
          ? "—"
          : (Number(rs.SIZE) / 1000).toFixed(1) + " KB";
        record.VERSION = rs.VERSION;
        record.FORMATO = rs.TYPE;
        record.ICONO = getIconoDocumento(rs.TYPE);
        record.MYME_TYPE = rs.MYMETYPE === null ? "octet/stream" : rs.MYMETYPE;
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(rs.VERSION, rs.ID_DETALLE);
        record.USUARIO = rs.USUARIO;

        if (record.ACTIVO) {
          sValue.push(record);
        }
      }

      return sValue;

    } catch (e) {
      return {
        error: e.message,
        accion: "getUrlArchivoWF",
        query: sql
      };
    }
  }

  async function getTiposDocumentoPortal(portal) {
    let sql;
    const td = [];
    const t = [];

    try {
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
      FROM DB_VINCULACION
      WHERE TO_VARCHAR(NODO_PORTAL) LIKE ?
    `;

      const result1 = await cds.run(sql, [portal]);

      for (const r of result1) {
        td.push(r.ID_TIPO_DOCUMENTO);
      }

      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
      FROM DB_PORTALES
      WHERE TO_VARCHAR(ID_PORTAL) LIKE ?
    `;

      const result2 = await cds.run(sql, [portal]);

      for (const r of result2) {
        t.push(r.ID_TIPO_DOCUMENTO);
      }

      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO
      FROM DB_NODOBUSQUEDA
      WHERE TO_VARCHAR(ID_PORTAL) LIKE ?
    `;

      const result3 = await cds.run(sql, [portal]);

      for (const r of result3) {
        t.push(r.ID_TIPO_DOCUMENTO);
      }

      for (const tipoDocumento of t) {
        let existe = false;

        for (const tipoDocumentoBase of td) {
          if (tipoDocumento === tipoDocumentoBase) {
            existe = true;
            break;
          }
        }

        if (!existe) {
          td.push(tipoDocumento);
        }
      }

      let result = "";

      for (const tipoDocumento of td) {
        if (result.length > 0) {
          result += ",";
        }

        result += tipoDocumento;
      }

      return result;

    } catch (e) {
      return {
        error: e.message,
        accion: "getTiposDocumentoPortal",
        query: sql
      };
    }
  }

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

  async function getUrlDocumento(arrCategoria) {
    let sql;
    const sValue = [];

    try {
      sql = `
      SELECT
        VER.URL_DETALLE AS URL_DETALLE,
        DET.TITULO AS TITULO,
        DET.ID_DETALLE AS ID_DETALLE,
        VER.SIZE AS SIZE,
        MAX(VER.VERSION) AS VERSION_ACTIVO,
        DET.TYPE AS TYPE,
        FORM.MYMETYPE AS MYMETYPE,
        DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
        MAX(VER2.VERSION) AS VERSION
      FROM DB_DETALLE AS DET
      INNER JOIN DB_VERSIONAMIENTO AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      LEFT JOIN DB_FORMATOS AS FORM
        ON FORM.NOMBRE_FORMATO = DET.TYPE
      INNER JOIN (
        SELECT ID_DETALLE, VERSION
        FROM DB_VERSIONAMIENTO
      ) AS VER2
        ON VER2.ID_DETALLE = DET.ID_DETALLE
      WHERE DET.NODO_HIJO = ?
      GROUP BY
        VER.URL_DETALLE,
        DET.TITULO,
        DET.ID_DETALLE,
        VER.SIZE,
        DET.TYPE,
        FORM.MYMETYPE,
        DET.ID_TIPO_DOCUMENTO
    `;

      const result = await cds.run(sql, [arrCategoria]);

      for (const rs of result) {
        const record = {};

        record.URL = rs.URL_DETALLE;
        record.TITULO = rs.TITULO;
        record.ID_DETALLE = rs.ID_DETALLE;
        record.SIZE = (rs.SIZE === null || rs.SIZE === "")
          ? "—"
          : (Number(rs.SIZE) / 1000).toFixed(1) + " KB";
        record.VERSION = rs.VERSION;
        record.FORMATO = rs.TYPE;
        record.ICONO = getIconoDocumento(rs.TYPE);
        record.MYME_TYPE = rs.MYMETYPE === null ? "octet/stream" : rs.MYMETYPE;
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(rs.VERSION_ACTIVO, rs.ID_DETALLE);

        if (record.ACTIVO) {
          sValue.push(record);
        }
      }

    } catch (e) {
      return {
        error: e.message,
        accion: "getUrlDocumento",
        query: sql
      };
    }

    return sValue;
  }

  async function getUrlArchivoWF(arrCategoria, idDetalle, usuarioCarga, fechaInicio, fechaFin) {
    let sql;
    const sValue = [];

    try {
      let where = `DET.NODO_HIJO = ?`;
      const params = [arrCategoria];

      if (usuarioCarga !== "") {
        where += ` AND VER.USUARIO = ?`;
        params.push(usuarioCarga);
      }

      if (fechaInicio !== "") {
        where += ` AND VER.FECHA_CARGA BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
      }

      sql = `
      SELECT
        VER.URL_DETALLE AS URL_DETALLE,
        DET.TITULO AS TITULO,
        DET.ID_DETALLE AS ID_DETALLE,
        VER.SIZE AS SIZE,
        VER.VERSION AS VERSION,
        DET.TYPE AS TYPE,
        FORM.MYMETYPE AS MYMETYPE,
        DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
        VER.VERSION AS VERSION2,
        VER.USUARIO AS USUARIO
      FROM DB_DETALLE AS DET
      INNER JOIN DB_VERSIONAMIENTO AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      LEFT JOIN DB_FORMATOS AS FORM
        ON FORM.NOMBRE_FORMATO = DET.TYPE
      WHERE ${where}
      GROUP BY
        VER.URL_DETALLE,
        DET.TITULO,
        DET.ID_DETALLE,
        VER.SIZE,
        VER.VERSION,
        DET.TYPE,
        FORM.MYMETYPE,
        DET.ID_TIPO_DOCUMENTO,
        VER.USUARIO
    `;

      const result = await cds.run(sql, params);

      for (const rs of result) {
        const record = {};

        record.URL = rs.URL_DETALLE;
        record.TITULO = rs.TITULO;
        record.ID_DETALLE = rs.ID_DETALLE;
        record.SIZE = (rs.SIZE === null || rs.SIZE === "")
          ? "—"
          : (Number(rs.SIZE) / 1000).toFixed(1) + " KB";
        record.VERSION = rs.VERSION2;
        record.FORMATO = rs.TYPE;
        record.ICONO = getIconoDocumento(rs.TYPE);
        record.MYME_TYPE = rs.MYMETYPE === null ? "octet/stream" : rs.MYMETYPE;
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ACTIVO = await getActivo(rs.VERSION, rs.ID_DETALLE);
        record.USUARIO = rs.USUARIO;

        if (record.ACTIVO) {
          sValue.push(record);
        }
      }

      return sValue;

    } catch (e) {
      return {
        error: e.message,
        accion: "getUrlArchivoWF",
        query: sql
      };
    }
  }

  async function getWorkflows(id, itd) {
    let sql;
    const results = [];

    try {
      sql = `
      SELECT
        NV.NIVEL AS NIVEL,
        NV.NOMBREAPROBADOR AS NOMBREAPROBADOR,
        IA.ESTADO AS ESTADO,
        IA.FECHA AS FECHA,
        IA.HORA AS HORA
      FROM DB_ESTRATEGIA_LIBERACION AS EL
      INNER JOIN DB_NIVELES AS NV
        ON EL.ID_EST_LIB = NV.ID_EST_LIB
      INNER JOIN (
        SELECT *
        FROM DB_INSTANCIA_APROBACION
        WHERE ID_DOCUMENTO = ?
      ) AS IA
        ON IA.NIVEL = NV.NIVEL
      WHERE EL.ID_TIPO_DOCUMENTO = ?
    `;

      const rows = await cds.run(sql, [id, itd]);

      for (const rs of rows) {
        const record = {};

        record.NIVEL = rs.NIVEL;
        record.APROBADOR = rs.NOMBREAPROBADOR;
        record.ESTADO = rs.ESTADO;
        record.FECHA = orderFecha(String(rs.FECHA).split("T")[0]);
        record.HORA = rs.HORA;

        results.push(record);
      }

      return results;

    } catch (e) {
      return {
        query: sql,
        msg: e.message
      };
    }
  }

  this.on('getPortalXUser', async (req) => {
    const { json } = req.data;
    const email = json.EMAIL;

    let sql;
    let outPut = [];

    try {
      sql = `SELECT DISTINCT CAT.TITULO,
                             CAT.ID_CATEGORIA
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

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaArchivosProveedorDigital"
      };
    }

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;

    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;

    let sql;

    try {
      sql = `
      SELECT DISTINCT
        DE.TITULO AS DOCUMENTO,
        PA.NOMBRE AS PROVEEDOR,
        VER.UFH_CREAR AS FECHA_CARGA,
        DE.URL AS URL,
        CA.ID_CATEGORIA AS ID_CATEGORIA,
        VERS.USUARIO AS USUARIO,
        VER.NOMBRE AS NOMBRE_DOCUMENTO,
        VERS.VERSION AS VERSION
      FROM (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ALMACENAMIENTO = 'Digital'
           OR ALMACENAMIENTO = ''
      ) AS PA
      LEFT OUTER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO_FISICO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
      LEFT OUTER JOIN DB_DETALLE AS DE
        ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE UFH_CREAR BETWEEN ? AND ?
      ) AS VER
        ON VER.ID_DOCUMENTO = DE.ID_CATEGORIA_HOJA
      INNER JOIN (
        SELECT TITULO, ID_PADRE, ID_CATEGORIA
        FROM DB_CATEGORIA
      ) AS CA
        ON CA.ID_CATEGORIA = DE.NODO_HIJO
      INNER JOIN (
        SELECT ID_DETALLE, VERSION, USUARIO
        FROM DB_VERSIONAMIENTO
      ) AS VERS
        ON VERS.ID_DETALLE = DE.ID_DETALLE
       AND VERS.VERSION = 1
    `;

      const result = await cds.run(sql, [fi, ff]);
      const output = [];

      for (const rs of result) {
        const record = {};

        record.DOCUMENTO = rs.DOCUMENTO;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(String(rs.FECHA_CARGA).split("T")[0]);
        record.NOMBRE_DOCUMENTO = rs.NOMBRE_DOCUMENTO;
        record.FILES = await getUrlArchivo(rs.ID_CATEGORIA, rs.VERSION);

        output.push(record);
      }

      return output;

    } catch (e) {
      return {
        error: e.message,
        accion: "planillaArchivosProveedorDigital",
        query: sql
      };
    }
  });

  this.on("planillaArchivosPorVencerDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaArchivosPorVencerDigital"
      };
    }

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;

    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fechaVencimiento = json.FECHA_VENCIMIENTO_INICIO;
    const fvf = json.FECHA_VENCIMIENTO_FIN;

    let sql;
    const result = [];

    try {
      sql = `
      SELECT
        USU.USERNAME AS USERNAME,
        PA.NOMBRE AS PROVEEDOR,
        DETVIS.FECHA_VENCIMIENTO AS FECHA_VENCIMIENTO,
        DET.TITULO AS TITULO,
        DET.ID_DETALLE AS ID_DETALLE,
        CAT.ID_CATEGORIA AS ID_CATEGORIA,
        DOC.UFH_CREAR AS UFH_CREAR
      FROM DB_DETALLE AS DET
      INNER JOIN DB_CATEGORIA AS CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      INNER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO AS DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_DETALLE_VISUALIZACION AS DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN (
        SELECT *
        FROM DB_USUARIO
        WHERE ID_USUARIO LIKE ?
      ) AS USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO AS TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
      INNER JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ID_PROVEEDORES_ALMACENAMIENTO LIKE ?
      ) AS PA
        ON DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE DETVIS.TIPO_ALMACENAMIENTO = 1
        AND DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
      ORDER BY DET.ID_DETALLE ASC
    `;

      const rows = await cds.run(sql, [
        `${user}%`,
        `${res}%`,
        fechaVencimiento,
        fvf
      ]);

      for (const row of rows) {
        const record = {};

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
      return {
        error: e.message,
        accion: "planillaArchivosPorVencerDigital",
        query: sql
      };
    }
  });

  this.on("planillaArchivosProveedorFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaArchivosProveedorFisico"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
    }

    const json = req.data.input || req.data;

    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;

    let sql;

    try {
      sql = `
      SELECT
        DE.TITULO AS DOCUMENTO,
        PA.NOMBRE AS PROVEEDOR,
        VER.UFH_CREAR AS FECHA_CARGA,
        DE.URL AS URL,
        CA.ID_CATEGORIA AS ID_CATEGORIA,
        VERS.USUARIO AS USUARIO,
        VER.NOMBRE AS NOMBRE_DOCUMENTO,
        VERS.VERSION AS VERSION
      FROM (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ALMACENAMIENTO = 'Fisico'
           OR ALMACENAMIENTO = ''
      ) AS PA
      LEFT OUTER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO_FISICO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
      LEFT OUTER JOIN DB_DETALLE AS DE
        ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE UFH_CREAR BETWEEN ? AND ?
      ) AS VER
        ON VER.ID_DOCUMENTO = DE.ID_CATEGORIA_HOJA
      INNER JOIN (
        SELECT TITULO, ID_PADRE, ID_CATEGORIA
        FROM DB_CATEGORIA
      ) AS CA
        ON CA.ID_CATEGORIA = DE.NODO_HIJO
      INNER JOIN (
        SELECT ID_DETALLE, VERSION, USUARIO
        FROM DB_VERSIONAMIENTO
      ) AS VERS
        ON VERS.ID_DETALLE = DE.ID_DETALLE
       AND VERS.VERSION = 1
    `;

      const rows = await cds.run(sql, [fi, ff]);
      const result = [];

      for (const rs of rows) {
        const record = {};

        record.DOCUMENTO = rs.DOCUMENTO;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(String(rs.FECHA_CARGA).split("T")[0]);
        record.NOMBRE_DOCUMENTO = rs.NOMBRE_DOCUMENTO;
        record.FILES = await getUrlArchivo(rs.ID_CATEGORIA, rs.VERSION);

        result.push(record);
      }

      return result;

    } catch (e) {
      return {
        error: e.message,
        accion: "planillaArchivosProveedorFisico",
        query: sql
      };
    }
  });

  this.on("planillaArchivosPorVencerFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaArchivosPorVencerFisico"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
    }

    const json = req.data.input || req.data;

    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fechaVencimiento = json.FECHA_VENCIMIENTO_INICIO;
    const fvf = json.FECHA_VENCIMIENTO_FIN;

    let sql;
    const result = [];

    try {
      sql = `
      SELECT
        USU.USERNAME AS USERNAME,
        PA.NOMBRE AS PROVEEDOR,
        DETVIS.FECHA_VENCIMIENTO AS FECHA_VENCIMIENTO,
        DET.TITULO AS TITULO,
        DET.ID_DETALLE AS ID_DETALLE,
        CAT.ID_CATEGORIA AS ID_CATEGORIA,
        DOC.UFH_CREAR AS UFH_CREAR
      FROM DB_DETALLE AS DET
      INNER JOIN DB_CATEGORIA AS CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      INNER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO AS DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_DETALLE_VISUALIZACION AS DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN (
        SELECT *
        FROM DB_USUARIO
        WHERE ID_USUARIO LIKE ?
      ) AS USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO AS TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
      INNER JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ID_PROVEEDORES_ALMACENAMIENTO LIKE ?
      ) AS PA
        ON DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE DETVIS.TIPO_ALMACENAMIENTO = 2
        AND DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
      ORDER BY DET.ID_DETALLE ASC
    `;

      const rows = await cds.run(sql, [
        `${user}%`,
        `${res}%`,
        fechaVencimiento,
        fvf
      ]);

      for (const row of rows) {
        const record = {};

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
      return {
        error: e.message,
        accion: "planillaArchivosPorVencerFisico",
        query: sql
      };
    }
  });

  this.on("planillaDocumentosProveedorDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaDocumentosProveedorDigital"
      };
    }

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;

    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;

    let sql;

    try {
      sql = `
      SELECT DISTINCT
        VER.NOMBRE AS NOMBRE,
        PA.NOMBRE AS PROVEEDOR,
        VER.UFH_CREAR AS FECHA_CARGA,
        CA.ID_CATEGORIA AS ID_CATEGORIA,
        VERS.USUARIO AS USUARIO
      FROM (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ALMACENAMIENTO = 'Digital'
           OR ALMACENAMIENTO = ''
      ) AS PA
      LEFT OUTER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO_FISICO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
      LEFT OUTER JOIN DB_DETALLE AS DE
        ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE UFH_CREAR BETWEEN ? AND ?
      ) AS VER
        ON VER.ID_DOCUMENTO = DE.ID_CATEGORIA_HOJA
       AND VER.ID_TIPO_DOCUMENTO IN (${tds})
      INNER JOIN (
        SELECT TITULO, ID_PADRE, ID_CATEGORIA
        FROM DB_CATEGORIA
      ) AS CA
        ON CA.ID_CATEGORIA = DE.NODO_HIJO
      INNER JOIN (
        SELECT ID_DETALLE, VERSION, USUARIO
        FROM DB_VERSIONAMIENTO
      ) AS VERS
        ON VERS.ID_DETALLE = DE.ID_DETALLE
       AND VERS.VERSION = 1
    `;

      const rows = await cds.run(sql, [fi, ff]);
      const result = [];

      for (const rs of rows) {
        const record = {};

        record.DOCUMENTO = rs.NOMBRE === null ? "—" : rs.NOMBRE;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = rs.FECHA_CARGA === null
          ? "—"
          : orderFecha(String(rs.FECHA_CARGA).split("T")[0]);
        record.FILES = await getUrlDocumento(rs.ID_CATEGORIA);

        result.push(record);
      }

      return result;

    } catch (e) {
      return {
        error: e.message,
        accion: "planillaDocumentosProveedorDigital",
        query: sql
      };
    }
  });

  this.on("planillaDocumentosProveedorFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaDocumentosProveedorFisico"
      };
    }

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;

    const fi = json.FECHA_CARGA_INI;
    const ff = json.FECHA_CARGA_FIN;
    console.log(fi, ff)

    let sql;

    try {
      sql = `
      SELECT DISTINCT
        VER.NOMBRE AS NOMBRE,
        PA.NOMBRE AS PROVEEDOR,
        VER.UFH_CREAR AS FECHA_CARGA,
        CA.ID_CATEGORIA AS ID_CATEGORIA,
        VERS.USUARIO AS USUARIO
      FROM (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ALMACENAMIENTO = 'Fisico'
           OR ALMACENAMIENTO = ''
      ) AS PA
      LEFT OUTER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO_FISICO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
      LEFT OUTER JOIN DB_DETALLE AS DE
        ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE UFH_CREAR BETWEEN ? AND ?
      ) AS VER
        ON VER.ID_DOCUMENTO = DE.ID_CATEGORIA_HOJA
      INNER JOIN (
        SELECT TITULO, ID_PADRE, ID_CATEGORIA
        FROM DB_CATEGORIA
      ) AS CA
        ON CA.ID_CATEGORIA = DE.NODO_HIJO
      INNER JOIN (
        SELECT ID_DETALLE, VERSION, USUARIO
        FROM DB_VERSIONAMIENTO
      ) AS VERS
        ON VERS.ID_DETALLE = DE.ID_DETALLE
       AND VERS.VERSION = 1
    `;

      const rows = await cds.run(sql, [fi, ff]);
      const result = [];

      for (const rs of rows) {
        const record = {};

        record.DOCUMENTO = rs.NOMBRE;
        record.USUARIO = rs.USUARIO;
        record.PROVEEDOR = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(String(rs.FECHA_CARGA).split("T")[0]);
        record.FILES = await getUrlDocumento(rs.ID_CATEGORIA);

        result.push(record);
      }

      return result;

    } catch (e) {
      return {
        error: e.message,
        accion: "planillaDocumentosProveedorFisico",
        query: sql
      };
    }
  });

  this.on("planillaDocumentosPorVencerDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaDocumentosPorVencerDigital"
      };
    }

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;

    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fechaVencimiento = json.FECHA_VENCIMIENTO_INICIO;
    const fvf = json.FECHA_VENCIMIENTO_FIN;

    let sql;

    try {
      sql = `
      SELECT DISTINCT
        DOC.NOMBRE AS NOMBRE,
        USU.USERNAME AS USERNAME,
        PA.NOMBRE AS PROVEEDOR,
        DOC.UFH_CREAR AS FECHA_CARGA,
        DETVIS.FECHA_VENCIMIENTO AS FECHA_VENCIMIENTO,
        CAT.ID_CATEGORIA AS ID_CATEGORIA
      FROM DB_DETALLE AS DET
      INNER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO AS DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_CATEGORIA AS CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      INNER JOIN DB_DETALLE_VISUALIZACION AS DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN (
        SELECT *
        FROM DB_USUARIO
        WHERE TO_VARCHAR(ID_USUARIO) LIKE ?
      ) AS USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO AS TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
      INNER JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE TO_VARCHAR(ID_PROVEEDORES_ALMACENAMIENTO) LIKE ?
      ) AS PA
        ON DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE DETVIS.TIPO_ALMACENAMIENTO = 1
        AND DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
    `;

      const rows = await cds.run(sql, [
        `${user}%`,
        `${res}%`,
        fechaVencimiento,
        fvf
      ]);

      const result = [];

      for (const rs of rows) {
        const record = {};

        record.NOMBRE_DOCUMENTO = rs.NOMBRE;
        record.USUARIO = rs.USERNAME;
        record.RESPONSABLE = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(String(rs.FECHA_CARGA).split("T")[0]);
        record.FECHA_VENCIMIENTO = orderFecha(String(rs.FECHA_VENCIMIENTO).split("T")[0]);
        record.FILES = await getUrlArchivoPorVencer(rs.ID_CATEGORIA);

        result.push(record);
      }

      return result;

    } catch (e) {
      return {
        error: e.message,
        accion: "planillaDocumentosPorVencerDigital",
        query: sql
      };
    }
  });

  this.on("planillaDocumentosPorVencerFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaDocumentosPorVencerFisico"
      };
    }

    if (tds.length === 0) {
      return { Error: "El portal no tiene tipos de documentos asociados" };
    }

    const json = req.data.input || req.data;

    const user = json.USUARIO;
    const res = json.RESPONSABLE;
    const fechaVencimiento = json.FECHA_VENCIMIENTO_INICIO;
    const fvf = json.FECHA_VENCIMIENTO_FIN;

    let sql;

    try {
      sql = `
      SELECT DISTINCT
        DOC.NOMBRE AS NOMBRE,
        USU.USERNAME AS USERNAME,
        PA.NOMBRE AS PROVEEDOR,
        DOC.UFH_CREAR AS FECHA_CARGA,
        DETVIS.FECHA_VENCIMIENTO AS FECHA_VENCIMIENTO,
        CAT.ID_CATEGORIA AS ID_CATEGORIA
      FROM DB_DETALLE AS DET
      INNER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO AS DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_CATEGORIA AS CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      INNER JOIN DB_DETALLE_VISUALIZACION AS DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN (
        SELECT *
        FROM DB_USUARIO
        WHERE TO_VARCHAR(ID_USUARIO) LIKE ?
      ) AS USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO AS TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
      INNER JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE TO_VARCHAR(ID_PROVEEDORES_ALMACENAMIENTO) LIKE ?
      ) AS PA
        ON DETVIS.ID_PROVEEDORES_ALMACENAMIENTO = PA.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE DETVIS.TIPO_ALMACENAMIENTO = 2
        AND DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
    `;

      const rows = await cds.run(sql, [
        `${user}%`,
        `${res}%`,
        fechaVencimiento,
        fvf
      ]);

      const result = [];

      for (const rs of rows) {
        const record = {};

        record.NOMBRE_DOCUMENTO = rs.NOMBRE;
        record.USUARIO = rs.USERNAME;
        record.RESPONSABLE = rs.PROVEEDOR;
        record.FECHA_CARGA = orderFecha(String(rs.FECHA_CARGA).split("T")[0]);
        record.FECHA_VENCIMIENTO = orderFecha(String(rs.FECHA_VENCIMIENTO).split("T")[0]);
        record.FILES = await getUrlArchivoPorVencer(rs.ID_CATEGORIA);

        result.push(record);
      }

      return result;

    } catch (e) {
      return {
        error: e.message,
        accion: "planillaDocumentosPorVencerFisico",
        query: sql
      };
    }
  });

  this.on("planillaWorkflows", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "planillaWorkflows"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
    }

    const json = req.data.input || req.data;

    const usu = json.USUARIO || "";
    const fi = json.FECHA_INICIO || "";
    const ff = json.FECHA_FIN || "";
    const est = json.ESTADO_APROBACION;
    const fli = json.FECHA_LIBERACION_INICIO;
    const flf = json.FECHA_LIBERACION_FIN;
    const ln = json.LIBERADOR_NOMBRE || "";

    let sql;

    try {
      sql = `
      SELECT DISTINCT
        CAT.TITULO AS NOMBRE_DOCUMENTO,
        IA.NIVEL AS NIVEL,
        DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
        IA.LIBERADOR AS LIBERADOR,
        IA.LIBERADOR_NOMBRE AS LIBERADOR_NOMBRE,
        IA.FECHA AS FECHA,
        CAT.ID_CATEGORIA AS ID_CATEGORIA,
        IA.ID_DOCUMENTO AS ID_DOCUMENTO
      FROM DB_TAGXPORTAL AS TXP
      INNER JOIN DB_TAG AS TAG
        ON TAG.ID_TAG = TXP.ID_TAG
      INNER JOIN DB_TAGXTD AS TXTD
        ON TXTD.ID_TAG = TXP.ID_TAG
      INNER JOIN DB_DETALLE AS DET
        ON DET.ID_TIPO_DOCUMENTO = TXTD.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_INSTANCIA_APROBACION
        WHERE LIBERADOR_NOMBRE LIKE ?
          AND ESTADO = ?
          AND FECHA BETWEEN ? AND ?
      ) AS IA
        ON DET.ID_CATEGORIA_HOJA = IA.ID_DOCUMENTO
      INNER JOIN DB_CATEGORIA AS CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      WHERE TO_VARCHAR(TXP.ID_CATEGORIA) LIKE ?
    `;

      const rows = await cds.run(sql, [
        `${ln}%`,
        est,
        fli,
        flf,
        portal
      ]);

      const results = [];

      for (const rs of rows) {
        const nivel = Number(rs.NIVEL);
        const maxNivel = Number(await getMaxNivel(nivel, rs.ID_DOCUMENTO));

        if (nivel === maxNivel) {
          const record = {};

          record.NOMBRE_DOC = rs.NOMBRE_DOCUMENTO;
          record.LIBERADOR = rs.LIBERADOR;
          record.LIBERADOR_NOMBRE = rs.LIBERADOR_NOMBRE;
          record.FECHA_LIBERACION = orderFecha(String(rs.FECHA).split("T")[0]);
          record.WORKFLOW = await getWorkflows(rs.ID_DOCUMENTO, rs.ID_TIPO_DOCUMENTO);
          record.FILES = await getUrlArchivoWF(rs.ID_CATEGORIA, rs.NIVEL, usu, fi, ff);

          results.push(record);
        }
      }

      return results;

    } catch (e) {
      return {
        query: sql,
        msg: e.message,
        accion: "planillaWorkflows"
      };
    }
  });

  this.on("planillaCriterios", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const json = req.data.input || req.data;

    const usu = json.USUARIO || "";
    const fi = json.FECHA_INICIO;
    const ff = json.FECHA_FIN;
    const res = json.RESPONSABLE || "";

    let sql;

    try {
      sql = `
      SELECT DISTINCT
        TAG.NOMBRE_TAG AS NOMBRE_TAG,
        VER.USUARIO AS USUARIO_CARGA,
        CAT.TITULO AS NOMBRE_DOCUMENTO,
        DET.TITULO AS NOMBRE_ARCHIVO,
        VER.FECHA_CARGA AS FECHA_CARGA,
        VER.VERSION AS VERSION,
        TID.NOMBRE AS NOMBRE_TIPO_DOCUMENTO,
        MDV.ATRIBUTO AS ATRIBUTO,
        MDV.VALUE AS VALUE,
        VER.URL_DETALLE AS URL_DETALLE,
        PAF.NOMBRE AS RES_FIS,
        PAD.NOMBRE AS RES_DIG,
        CAT.ID_CATEGORIA AS ID_CATEGORIA
      FROM DB_TAGXPORTAL AS TXP
      INNER JOIN DB_TAG AS TAG
        ON TAG.ID_TAG = TXP.ID_TAG
      INNER JOIN DB_TAGXTD AS TXTD
        ON TXTD.ID_TAG = TXP.ID_TAG
      INNER JOIN DB_DETALLE AS DET
        ON DET.ID_TIPO_DOCUMENTO = TXTD.ID_TIPO_DOCUMENTO
      INNER JOIN DB_TIPO_DOCUMENTO AS TID
        ON DET.ID_TIPO_DOCUMENTO = TID.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_VERSIONAMIENTO
        WHERE USUARIO LIKE ?
          AND FECHA_CARGA BETWEEN ? AND ?
      ) AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_CATEGORIA AS CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      INNER JOIN DB_METADATA_VALUE AS MDV
        ON MDV.ID_DETALLE = DET.ID_DETALLE
      LEFT JOIN DB_TIPO_DOCUMENTO_FISICO AS TDF
        ON TXTD.ID_TIPO_DOCUMENTO = TDF.ID_TIPO_DOCUMENTO
      LEFT JOIN DB_TIPO_DOCUMENTO_DIGITAL AS TDD
        ON TXTD.ID_TIPO_DOCUMENTO = TDD.ID_TIPO_DOCUMENTO
      LEFT JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE NOMBRE LIKE ?
      ) AS PAF
        ON TDF.EMPRESA_RESPONSABLE = PAF.ID_PROVEEDORES_ALMACENAMIENTO
      LEFT JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE NOMBRE LIKE ?
      ) AS PAD
        ON TDD.EMPRESA_RESPONSABLE = PAD.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE TO_VARCHAR(TXP.ID_CATEGORIA) LIKE ?
    `;

      const result = await cds.run(sql, [
        `${usu}%`,
        fi,
        ff,
        `${res}%`,
        `${res}%`,
        portal
      ]);

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
        record.ID_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;
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
        error: e.message,
        accion: "planillaCriterios",
        query: sql
      };
    }
  });

  this.on("planillaTags", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const json = req.data.input || req.data;

    const usu = json.USUARIO || "";
    const fi = json.FECHA_INICIO;
    const ff = json.FECHA_FIN;
    const tag = json.TAG || "";
    const res = json.RESPONSABLE || "";

    let sql;
    const results = [];

    try {
      sql = `
      SELECT DISTINCT
        TAG.NOMBRE_TAG AS NOMBRE_TAG,
        VER.USUARIO AS USUARIO_CARGA,
        CAT.TITULO AS NOMBRE_DOCUMENTO,
        DET.TITULO AS NOMBRE_ARCHIVO,
        VER.FECHA_CARGA AS FECHA_CARGA,
        VER.VERSION AS VERSION,
        TID.NOMBRE AS ID_TIPO_DOCUMENTO,
        VER.URL_DETALLE AS URL_DETALLE,
        PAF.NOMBRE AS RES_FIS,
        PAD.NOMBRE AS RES_DIG,
        CAT.ID_CATEGORIA AS ID_CATEGORIA
      FROM DB_TAGXPORTAL AS TXP
      INNER JOIN DB_TAG AS TAG
        ON TAG.ID_TAG = TXP.ID_TAG
      INNER JOIN DB_TAGXTD AS TXTD
        ON TXTD.ID_TAG = TXP.ID_TAG
      INNER JOIN DB_DETALLE AS DET
        ON DET.ID_TIPO_DOCUMENTO = TXTD.ID_TIPO_DOCUMENTO
      INNER JOIN DB_TIPO_DOCUMENTO AS TID
        ON DET.ID_TIPO_DOCUMENTO = TID.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_VERSIONAMIENTO
        WHERE USUARIO LIKE ?
          AND FECHA_CARGA BETWEEN ? AND ?
      ) AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_CATEGORIA AS CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      LEFT JOIN DB_TIPO_DOCUMENTO_FISICO AS TDF
        ON TXTD.ID_TIPO_DOCUMENTO = TDF.ID_TIPO_DOCUMENTO
      LEFT JOIN DB_TIPO_DOCUMENTO_DIGITAL AS TDD
        ON TXTD.ID_TIPO_DOCUMENTO = TDD.ID_TIPO_DOCUMENTO
      LEFT JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE NOMBRE LIKE ?
      ) AS PAF
        ON TDF.EMPRESA_RESPONSABLE = PAF.ID_PROVEEDORES_ALMACENAMIENTO
      LEFT JOIN (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE NOMBRE LIKE ?
      ) AS PAD
        ON TDD.EMPRESA_RESPONSABLE = PAD.ID_PROVEEDORES_ALMACENAMIENTO
      WHERE TO_VARCHAR(TXP.ID_CATEGORIA) LIKE ?
        AND TAG.NOMBRE_TAG LIKE ?
    `;

      const result = await cds.run(sql, [
        `${usu}%`,
        fi,
        ff,
        `%${res}%`,
        `%${res}%`,
        portal,
        `%${tag}%`
      ]);

      for (const rs of result) {
        const record = {};

        const fecha = new Date(rs.FECHA_CARGA);
        const month = fecha.getMonth() + 1;

        record.NOMBRE_TAG = rs.NOMBRE_TAG;
        record.USUARIO_CARGA = rs.USUARIO_CARGA;
        record.ARCHIVO = rs.NOMBRE_ARCHIVO;
        record.FECHA_CARGA = `${fecha.getDate()}-${month}-${fecha.getFullYear()}`;
        record.VERSION = rs.VERSION;
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;

        if (rs.RES_FIS === null) {
          record.RESPONSABLE = rs.RES_DIG;
        } else {
          record.RESPONSABLE = rs.RES_FIS;
        }

        record.FILES = await getUrlArchivo(rs.ID_CATEGORIA, rs.VERSION);

        results.push(record);
      }

      return results;

    } catch (e) {
      return {
        error: e.message,
        accion: "planillaTags",
        query: sql
      };
    }
  });

  this.on("documentosPorVencerFisico", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "documentosPorVencerFisico"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
    }

    const fi = moment().format("YYYY-MM-DD");
    const ff = moment().add(30, "days").format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    const m1 = moment().add(1, "months").format("M");
    const y1 = moment().add(1, "months").format("YYYY");

    const m2 = moment().add(2, "months").format("M");
    const y2 = moment().add(2, "months").format("YYYY");

    let sql;

    try {
      const fromJoins = `
      FROM DB_DETALLE AS DET
      INNER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO AS DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_VERSIONAMIENTO AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_DETALLE_VISUALIZACION AS DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_USUARIO AS USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO AS TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    `;

      sql = `
      SELECT DISTINCT
        COUNT(DISTINCT DOC.ID_DOCUMENTO) AS CANTIDAD
      ${fromJoins}
      WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
        AND DETVIS.TIPO_ALMACENAMIENTO = 2
    `;

      let rows = await cds.run(sql, [fi, ff]);

      const outPut = {};
      outPut.ULTIMOS_TREINTA = {};
      outPut.MES_ACTUAL = {};
      outPut.MES_ANTERIOR = {};
      outPut.MES_ANTERIOR_2 = {};

      for (const row of rows) {
        outPut.ULTIMOS_TREINTA.CANTIDAD = row.CANTIDAD;
      }

      sql = `
      SELECT DISTINCT
        COUNT(DISTINCT DOC.ID_DOCUMENTO) AS CANTIDAD
      ${fromJoins}
      WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
        AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
        AND DETVIS.TIPO_ALMACENAMIENTO = 2
    `;

      rows = await cds.run(sql, [ma, ya]);
      for (const row of rows) {
        outPut.MES_ACTUAL.CANTIDAD = row.CANTIDAD;
        outPut.MES_ACTUAL.MES = ma;
        outPut.MES_ACTUAL.YEAR = ya;
      }

      rows = await cds.run(sql, [m1, y1]);
      for (const row of rows) {
        outPut.MES_ANTERIOR.CANTIDAD = row.CANTIDAD;
        outPut.MES_ANTERIOR.MES = m1;
        outPut.MES_ANTERIOR.YEAR = y1;
      }

      rows = await cds.run(sql, [m2, y2]);
      for (const row of rows) {
        outPut.MES_ANTERIOR_2.CANTIDAD = row.CANTIDAD;
        outPut.MES_ANTERIOR_2.MES = m2;
        outPut.MES_ANTERIOR_2.YEAR = y2;
      }

      return outPut;

    } catch (e) {
      return {
        error: e.message,
        accion: "documentosPorVencerFisico",
        query: sql
      };
    }
  });

  this.on("documentosPorVencerDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "documentosPorVencerDigital"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
    }

    const fi = moment().format("YYYY-MM-DD");
    const ff = moment().add(30, "days").format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    const m1 = moment().add(1, "months").format("M");
    const y1 = moment().add(1, "months").format("YYYY");

    const m2 = moment().add(2, "months").format("M");
    const y2 = moment().add(2, "months").format("YYYY");

    let sql;

    try {
      const fromJoins = `
      FROM DB_DETALLE AS DET
      INNER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN DB_DOCUMENTO AS DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      INNER JOIN DB_VERSIONAMIENTO AS VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_DETALLE_VISUALIZACION AS DETVIS
        ON DETVIS.ID_DETALLE = DET.ID_DETALLE
      INNER JOIN DB_USUARIO AS USU
        ON DETVIS.ID_USUARIO = USU.ID_USUARIO
      INNER JOIN DB_TIPO_ALMACENAMIENTO AS TA
        ON DETVIS.TIPO_ALMACENAMIENTO = TA.ID_TIPO_ALMACENAMIENTO
    `;

      sql = `
      SELECT DISTINCT
        COUNT(DET.ID_DETALLE) AS CANTIDAD
      ${fromJoins}
      WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
        AND DETVIS.TIPO_ALMACENAMIENTO = 1
    `;

      let rows = await cds.run(sql, [fi, ff]);

      const outPut = {};
      outPut.ULTIMOS_TREINTA = {};
      outPut.MES_ACTUAL = {};
      outPut.MES_ANTERIOR = {};
      outPut.MES_ANTERIOR_2 = {};

      for (const row of rows) {
        outPut.ULTIMOS_TREINTA.CANTIDAD = row.CANTIDAD;
      }

      sql = `
      SELECT DISTINCT
        COUNT(DET.ID_DETALLE) AS CANTIDAD
      ${fromJoins}
      WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
        AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
        AND DETVIS.TIPO_ALMACENAMIENTO = 1
    `;

      rows = await cds.run(sql, [ma, ya]);
      for (const row of rows) {
        outPut.MES_ACTUAL.CANTIDAD = row.CANTIDAD;
        outPut.MES_ACTUAL.MES = ma;
        outPut.MES_ACTUAL.YEAR = ya;
      }

      rows = await cds.run(sql, [m1, y1]);
      for (const row of rows) {
        outPut.MES_ANTERIOR.CANTIDAD = row.CANTIDAD;
        outPut.MES_ANTERIOR.MES = m1;
        outPut.MES_ANTERIOR.YEAR = y1;
      }

      rows = await cds.run(sql, [m2, y2]);
      for (const row of rows) {
        outPut.MES_ANTERIOR_2.CANTIDAD = row.CANTIDAD;
        outPut.MES_ANTERIOR_2.MES = m2;
        outPut.MES_ANTERIOR_2.YEAR = y2;
      }

      return outPut;

    } catch (e) {
      return {
        error: e.message,
        accion: "documentosPorVencerDigital",
        query: sql
      };
    }
  });

  this.on("visitasPortal", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const fi = moment().subtract(30, "days").format("YYYY-MM-DD");
    const ff = moment().format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    const m1 = moment().subtract(1, "months").format("M");
    const y1 = moment().subtract(1, "months").format("YYYY");

    const m2 = moment().subtract(2, "months").format("M");
    const y2 = moment().subtract(2, "months").format("YYYY");

    const output = {};
    let sql;

    try {
      sql = `
      SELECT COUNT(ID_VISITAS) AS CANT
      FROM DB_VISITAS
      WHERE FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
        AND TO_VARCHAR(ID_PORTAL) LIKE ?
    `;

      let result = await cds.run(sql, [fi, ff, portal]);

      for (const rs of result) {
        output.ULTIMOS_TREINTA = rs.CANT;
      }

      sql = `
      SELECT COUNT(ID_VISITAS) AS CANT
      FROM DB_VISITAS
      WHERE MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
        AND TO_VARCHAR(ID_PORTAL) LIKE ?
    `;

      result = await cds.run(sql, [ma, ya, portal]);

      for (const rs of result) {
        output.MES_ACTUAL = {};
        output.MES_ACTUAL.CANT = rs.CANT;
        output.MES_ACTUAL.MES = ma;
        output.MES_ACTUAL.YEAR = ya;
      }

      result = await cds.run(sql, [m1, y1, portal]);

      for (const rs of result) {
        output.MES_ANTERIOR = {};
        output.MES_ANTERIOR.CANT = rs.CANT;
        output.MES_ANTERIOR.MES = m1;
        output.MES_ANTERIOR.YEAR = y1;
      }

      result = await cds.run(sql, [m2, y2, portal]);

      for (const rs of result) {
        output.MES_ANTERIOR_2 = {};
        output.MES_ANTERIOR_2.CANT = rs.CANT;
        output.MES_ANTERIOR_2.MES = m2;
        output.MES_ANTERIOR_2.YEAR = y2;
      }

      return output;

    } catch (e) {
      return {
        error: e.message,
        accion: "visitasPortal",
        query: sql
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

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "documentosPorProveedorFisico"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
    }

    const fi = moment().subtract(30, "days").format("YYYY-MM-DD");
    const ff = moment().format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    const m1 = moment().subtract(1, "months").format("M");
    const y1 = moment().subtract(1, "months").format("YYYY");

    const m2 = moment().subtract(2, "months").format("M");
    const y2 = moment().subtract(2, "months").format("YYYY");

    let sql;

    try {
      const fromJoins = `
      FROM (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ALMACENAMIENTO = 'Fisico'
           OR ALMACENAMIENTO = ''
      ) AS PA
      LEFT OUTER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO_FISICO
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
      LEFT OUTER JOIN DB_DETALLE AS DE
        ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    `;

      sql = `
      SELECT
        PA.NOMBRE AS PROVEEDOR,
        COUNT(DISTINCT VER.ID_DOCUMENTO) AS DOCUMENTOS
      ${fromJoins}
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE UFH_CREAR BETWEEN ? AND ?
      ) AS VER
        ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
      GROUP BY PA.NOMBRE
    `;

      let rows = await cds.run(sql, [fi, ff]);
      const res = [];

      for (const rs of rows) {
        res.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS
        });
      }

      sql = `
      SELECT
        PA.NOMBRE AS PROVEEDOR,
        COUNT(DISTINCT VER.ID_DOCUMENTO) AS DOCUMENTOS
      ${fromJoins}
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE MONTH(UFH_CREAR) = ?
          AND YEAR(UFH_CREAR) = ?
      ) AS VER
        ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
      GROUP BY PA.NOMBRE
    `;

      rows = await cds.run(sql, [ma, ya]);
      const resa = [];

      for (const rs of rows) {
        resa.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS,
          MES: ma,
          YEAR: ya
        });
      }

      rows = await cds.run(sql, [m1, y1]);
      const res1 = [];

      for (const rs of rows) {
        res1.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS,
          MES: m1,
          YEAR: y1
        });
      }

      rows = await cds.run(sql, [m2, y2]);
      const res2 = [];

      for (const rs of rows) {
        res2.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS,
          MES: m2,
          YEAR: y2
        });
      }

      return {
        ULTIMOS_TREINTA: res,
        MES_ACTUAL: resa,
        MES_ANTERIOR: res1,
        MES_ANTERIOR_2: res2
      };

    } catch (e) {
      return {
        error: e.message,
        accion: "documentosPorProveedorFisico",
        query: sql
      };
    }
  });

  this.on("documentosPorProveedorDigital", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "documentosPorProveedorDigital"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
    }

    const fi = moment().subtract(30, "days").format("YYYY-MM-DD");
    const ff = moment().format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    const m1 = moment().subtract(1, "months").format("M");
    const y1 = moment().subtract(1, "months").format("YYYY");

    const m2 = moment().subtract(2, "months").format("M");
    const y2 = moment().subtract(2, "months").format("YYYY");

    let sql;

    try {
      const fromJoins = `
      FROM (
        SELECT *
        FROM DB_PROVEEDORES_ALMACENAMIENTO
        WHERE ALMACENAMIENTO = 'Digital'
           OR ALMACENAMIENTO = ''
      ) AS PA
      LEFT OUTER JOIN (
        SELECT *
        FROM DB_TIPO_DOCUMENTO_DIGITAL
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS TD
        ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
      LEFT OUTER JOIN DB_DETALLE AS DE
        ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    `;

      sql = `
      SELECT
        PA.NOMBRE AS PROVEEDOR,
        COUNT(DISTINCT VER.ID_DOCUMENTO) AS DOCUMENTOS
      ${fromJoins}
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE UFH_CREAR BETWEEN ? AND ?
      ) AS VER
        ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
      GROUP BY PA.NOMBRE
    `;

      let rows = await cds.run(sql, [fi, ff]);
      const res = [];

      for (const rs of rows) {
        res.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS
        });
      }

      sql = `
      SELECT
        PA.NOMBRE AS PROVEEDOR,
        COUNT(DISTINCT VER.ID_DOCUMENTO) AS DOCUMENTOS
      ${fromJoins}
      INNER JOIN (
        SELECT *
        FROM DB_DOCUMENTO
        WHERE MONTH(UFH_CREAR) = ?
          AND YEAR(UFH_CREAR) = ?
      ) AS VER
        ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
      GROUP BY PA.NOMBRE
    `;

      rows = await cds.run(sql, [ma, ya]);
      const resa = [];

      for (const rs of rows) {
        resa.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS,
          MES: ma,
          YEAR: ya
        });
      }

      rows = await cds.run(sql, [m1, y1]);
      const res1 = [];

      for (const rs of rows) {
        res1.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS,
          MES: m1,
          YEAR: y1
        });
      }

      rows = await cds.run(sql, [m2, y2]);
      const res2 = [];

      for (const rs of rows) {
        res2.push({
          PROVEEDOR: rs.PROVEEDOR,
          DOCUMENTOS: rs.DOCUMENTOS,
          MES: m2,
          YEAR: y2
        });
      }

      return {
        ULTIMOS_TREINTA: res,
        MES_ACTUAL: resa,
        MES_ANTERIOR: res1,
        MES_ANTERIOR_2: res2
      };

    } catch (e) {
      return {
        error: e.message,
        accion: "documentosPorProveedorDigital",
        query: sql
      };
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

    const fi = moment().subtract(30, "days").format("YYYY-MM-DD");
    const ff = moment().format("YYYY-MM-DD");

    const ma = moment().format("M");
    const ya = moment().format("YYYY");

    const m1 = moment().subtract(1, "months").format("M");
    const y1 = moment().subtract(1, "months").format("YYYY");

    const m2 = moment().subtract(2, "months").format("M");
    const y2 = moment().subtract(2, "months").format("YYYY");

    const output = {};
    let sql;

    try {
      sql = `
      SELECT TOP 5
        NOMBRE_CRITERIO,
        COUNT(ID_BUSQUEDA_CRITERIOS) AS CANTIDAD
      FROM DB_BUSQUEDA_CRITERIOS
      WHERE TO_VARCHAR(ID_PORTAL) LIKE ?
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
      GROUP BY NOMBRE_CRITERIO
      ORDER BY CANTIDAD DESC
    `;

      let result = await cds.run(sql, [portal, fi, ff]);
      let outPuts = [];

      for (const rs of result) {
        const record = {};
        record.VALOR = rs.NOMBRE_CRITERIO;
        record.CANTIDAD = rs.CANTIDAD;
        outPuts.push(record);
      }

      output.ULTIMOS_TREINTA = outPuts;

      sql = `
      SELECT TOP 5
        NOMBRE_CRITERIO,
        COUNT(ID_BUSQUEDA_CRITERIOS) AS CANTIDAD
      FROM DB_BUSQUEDA_CRITERIOS
      WHERE TO_VARCHAR(ID_PORTAL) LIKE ?
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
      GROUP BY NOMBRE_CRITERIO
      ORDER BY CANTIDAD DESC
    `;

      result = await cds.run(sql, [portal, ma, ya]);
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

      result = await cds.run(sql, [portal, m1, y1]);
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

      result = await cds.run(sql, [portal, m2, y2]);
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
        error: e.message,
        accion: "topCriterios",
        query: sql
      };
    }
  });

  this.on("documentosCargadosWorkflow", async (req) => {
    let portal = req.http.req.query.PORTAL;

    if (portal === "x") {
      portal = "%";
    }

    const tds = await getTiposDocumentoPortal(portal);

    if (typeof tds !== "string") {
      return {
        error: "getTiposDocumentoPortal no retornó string",
        detalle: tds,
        accion: "documentosCargadosWorkflow"
      };
    }

    if (tds.length === 0) {
      return {
        Error: "El portal no tiene tipos de documentos asociados"
      };
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

    let sql;

    try {
      sql = `
      SELECT COUNT(DET.ID_DETALLE) AS CANT
      FROM (
        SELECT *
        FROM DB_ESTRATEGIA_LIBERACION
        WHERE ID_TIPO_DOCUMENTO IN (${tds})
      ) AS EL
      INNER JOIN DB_DETALLE AS DET
        ON EL.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      INNER JOIN (
        SELECT *
        FROM DB_VERSIONAMIENTO
        WHERE MONTH(FECHA_CARGA) = ?
          AND YEAR(FECHA_CARGA) = ?
      ) AS V
        ON DET.ID_DETALLE = V.ID_DETALLE
    `;

      for (const item of meses) {
        const result = await cds.run(sql, [
          item.mes,
          item.year
        ]);

        for (const rs of result) {
          item.cant = rs.CANT;
        }
      }

      return meses;

    } catch (e) {
      return {
        error: e.message,
        accion: "documentosCargadosWorkflow",
        query: sql
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
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
  `;

    const sqlMesActual = `
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior = `
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior2 = `
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
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
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
  `;

    const sqlMesActual = `
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior = `
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
  `;

    const sqlMesAnterior2 = `
    SELECT COUNT(DISTINCT DET.ID_CATEGORIA_HOJA) AS CANTIDAD
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
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
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(DOC.UFH_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_DOCUMENTO AS DOC
      ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
  `;

    const sqlMesActual = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
  `;

    const sqlMesAnterior = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
  `;

    const sqlMesAnterior2 = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
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
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(DOC.UFH_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN DB_DOCUMENTO AS DOC
      ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
  `;

    const sqlMesActual = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
  `;

    const sqlMesAnterior = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
  `;

    const sqlMesAnterior2 = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO DESC
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
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(DOC.UFH_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_DOCUMENTO AS DOC
      ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
  `;

    const sqlMesActual = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
  `;

    const sqlMesAnterior = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
  `;

    const sqlMesAnterior2 = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Aprobado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
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
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(DOC.UFH_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND FECHA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN DB_DOCUMENTO AS DOC
      ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
  `;

    const sqlMesActual = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
  `;

    const sqlMesAnterior = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
  `;

    const sqlMesAnterior2 = `
    SELECT TOP 5
      IA.LIBERADOR,
      IA.LIBERADOR_NOMBRE,
      AVG(DAYS_BETWEEN(VER.FECHA_CARGA, IA.FECHA)) AS PROMEDIO
    FROM (
      SELECT *
      FROM DB_INSTANCIA_APROBACION
      WHERE ESTADO = 'Rechazado'
        AND MONTH(FECHA) = ?
        AND YEAR(FECHA) = ?
    ) AS IA
    INNER JOIN DB_DETALLE AS DET
      ON IA.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) TD
      ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
    INNER JOIN DB_VERSIONAMIENTO AS VER
      ON DET.ID_DETALLE = VER.ID_DETALLE
    GROUP BY IA.LIBERADOR, IA.LIBERADOR_NOMBRE
    ORDER BY PROMEDIO ASC
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
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Digital'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_DIGITAL
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE UFH_CREAR BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
  `;

    const sqlMesActual = `
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Digital'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_DIGITAL
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE MONTH(UFH_CREAR) = ?
        AND YEAR(UFH_CREAR) = ?
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
  `;

    const sqlMesAnterior = `
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Digital'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_DIGITAL
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE MONTH(UFH_CREAR) = ?
        AND YEAR(UFH_CREAR) = ?
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
  `;

    const sqlMesAnterior2 = `
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Digital'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_DIGITAL
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE MONTH(UFH_CREAR) = ?
        AND YEAR(UFH_CREAR) = ?
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
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
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Fisico'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_FISICO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE UFH_CREAR BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
  `;

    const sqlMesActual = `
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Fisico'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_FISICO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE MONTH(UFH_CREAR) = ?
        AND YEAR(UFH_CREAR) = ?
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
  `;

    const sqlMesAnterior = `
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Fisico'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_FISICO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE MONTH(UFH_CREAR) = ?
        AND YEAR(UFH_CREAR) = ?
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
  `;

    const sqlMesAnterior2 = `
    SELECT
      PA.NOMBRE,
      COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_PROVEEDORES_ALMACENAMIENTO
      WHERE ALMACENAMIENTO = 'Fisico'
         OR ALMACENAMIENTO = ''
    ) AS PA
    LEFT OUTER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO_FISICO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS TD
      ON PA.ID_PROVEEDORES_ALMACENAMIENTO = TD.EMPRESA_RESPONSABLE
    LEFT OUTER JOIN DB_DETALLE AS DE
      ON TD.ID_TIPO_DOCUMENTO = DE.ID_TIPO_DOCUMENTO
    INNER JOIN (
      SELECT *
      FROM DB_DOCUMENTO
      WHERE MONTH(UFH_CREAR) = ?
        AND YEAR(UFH_CREAR) = ?
    ) AS VER
      ON DE.ID_CATEGORIA_HOJA = VER.ID_DOCUMENTO
    GROUP BY PA.NOMBRE
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
    SELECT DISTINCT COUNT(DISTINCT DET.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
      AND DETVIS.TIPO_ALMACENAMIENTO = 1
  `;

    const sqlMesActual = `
    SELECT DISTINCT COUNT(DET.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
      AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 1
  `;

    const sqlMesAnterior = `
    SELECT DISTINCT COUNT(DET.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
      AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 1
  `;

    const sqlMesAnterior2 = `
    SELECT DISTINCT COUNT(DET.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
      AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
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
    SELECT COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_DETALLE
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS DE
    INNER JOIN (
      SELECT *
      FROM DB_VERSIONAMIENTO
      WHERE FECHA_CARGA BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    ) AS VER
      ON DE.ID_DETALLE = VER.ID_DETALLE
  `;

    const sqlMesActual = `
    SELECT COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_DETALLE
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS DE
    INNER JOIN (
      SELECT *
      FROM DB_VERSIONAMIENTO
      WHERE MONTH(FECHA_CARGA) = ?
        AND YEAR(FECHA_CARGA) = ?
    ) AS VER
      ON DE.ID_DETALLE = VER.ID_DETALLE
  `;

    const sqlMesAnterior = `
    SELECT COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_DETALLE
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS DE
    INNER JOIN (
      SELECT *
      FROM DB_VERSIONAMIENTO
      WHERE MONTH(FECHA_CARGA) = ?
        AND YEAR(FECHA_CARGA) = ?
    ) AS VER
      ON DE.ID_DETALLE = VER.ID_DETALLE
  `;

    const sqlMesAnterior2 = `
    SELECT COUNT(DE.ID_DETALLE) AS DOCUMENTOS
    FROM (
      SELECT *
      FROM DB_DETALLE
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
    ) AS DE
    INNER JOIN (
      SELECT *
      FROM DB_VERSIONAMIENTO
      WHERE MONTH(FECHA_CARGA) = ?
        AND YEAR(FECHA_CARGA) = ?
    ) AS VER
      ON DE.ID_DETALLE = VER.ID_DETALLE
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
    SELECT COUNT(DISTINCT DETVIS.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
      AND DETVIS.TIPO_ALMACENAMIENTO = 2
  `;

    const sqlMesActual = `
    SELECT DISTINCT COUNT(DISTINCT DET.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
      AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 2
  `;

    const sqlMesAnterior = `
    SELECT DISTINCT COUNT(DISTINCT DET.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
      AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 2
  `;

    const sqlMesAnterior2 = `
    SELECT DISTINCT COUNT(DISTINCT DET.ID_DETALLE) AS CANTIDAD
    FROM DB_DETALLE DET
    INNER JOIN (
      SELECT *
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (${tds})
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
    WHERE MONTH(DETVIS.FECHA_VENCIMIENTO) = ?
      AND YEAR(DETVIS.FECHA_VENCIMIENTO) = ?
      AND DETVIS.TIPO_ALMACENAMIENTO = 2
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