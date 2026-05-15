/////////////////////////
///////SERVICESTUBO//////
/////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function getCatNodoDinamicoEstructura1(nodoPadre, desc) {
    console.log(nodoPadre, desc)
    let record = "";
    try {
      const sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA 
      WHERE ID_CATEGORIA_ESPEJO = (SELECT MIN(ID_CATEGORIA) FROM DB_CATEGORIA WHERE ID_PADRE = ? AND DESCRIPCION = ?)
       AND APP = 'Contenido' AND ORIGEN = 'Dinámico'`;
      const result = await cds.run(sql, [nodoPadre, desc]);

      for (const rs of result) {
        record = rs.ID_CATEGORIA;
      }

      return record;

    } catch (e) {
      return { error: e.message, accion: "getCatNodoDinamicoEstructura", query: sql }
    }
  };

  async function getCatNodoDinamico1(nodoPadre) {
    let sql;
    let record = "";

    try {
      sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA
               WHERE ID_PADRE = ?`;
      const result = await cds.run(sql, [nodoPadre]);

      for (const rs of result) {
        record = rs.ID_CATEGORIA;
      }

      return record;
    } catch (e) {
      return { error: e.message, accion: "getCatNodoDinamico", query: sql }
    }
  };

  async function getValidacionEstructura1(nodo, desc) {
    let outPut = [];
    console.log("HOLA")

    const idCategoria = await getCatNodoDinamicoEstructura1(nodo, desc)

    try {
      const sql = `SELECT TIPO_DATO, TABLA_SAP, CAMPO_TABLA_SAP, LARGO_DATO, FORMATO_FECHA
                    FROM DB_VALIDACION WHERE ID_CATEGORIA = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const rs of result) {
        let record = {};
        record.TIPO_DATO = rs.TIPO_DATO;
        record.TABLA_SAP = rs.TABLA_SAP;
        record.CAMPO_TABLA_SAP = rs.CAMPO_TABLA_SAP;
        record.LARGO_DATO = rs.LARGO_DATO;
        record.FORMATO_FECHA = rs.FORMATO_FECHA;

        outPut.push(record);
      }
    } catch (e) {
      return outPut;
    }

    return outPut;

  };

  async function getValidacion2(nodo) {
    let record = {};
    let outPut = [];
    let sql;

    const idCategoria = await getCatNodoDinamico1(nodo);

    try {
      sql = `SELECT TOP 1 TIPO_DATO, TABLA_SAP, CAMPO_TABLA_SAP, LARGO_DATO, FORMATO_FECHA
               FROM DB_VALIDACION WHERE ID_CATEGORIA = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const rs of result) {
        record = {};
        record.TIPO_DATO = rs.TIPO_DATO;
        record.TABLA_SAP = rs.TABLA_SAP;
        record.CAMPO_TABLA_SAP = rs.CAMPO_TABLA_SAP;
        record.LARGO_DATO = rs.LARGO_DATO;
        record.FORMATO_FECHA = rs.FORMATO_FECHA;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getValidacion2", query: sql }
    }
    return outPut;
  };

  async function getSNodo1(td) {
    let sql;
    let sNodo = "";

    try {
      sql = `
      SELECT ID_PADRE
      FROM DB_CATEGORIA
      WHERE ID_CATEGORIA = (
        SELECT ID_NODO
        FROM DB_TIPO_DOCUMENTO
        WHERE ID_TIPO_DOCUMENTO = ?
      )
    `;

      const result = await cds.run(sql, [td]);

      for (const rs of result) {
        sNodo = rs.ID_PADRE;
      }
    } catch (e) {
      return { error: e.message, accion: "getSNodo1", query: sql };
    }

    return sNodo;
  }

  async function getRecursiva2(arr, nodo) {
    let jsonValidacion = {
      TIPO_DATO: "",
      TABLA_SAP: "",
      CAMPO_TABLA_SAP: "",
      LARGO_DATO: "",
      FORMATO_FECHA: ""
    };
    let sql;
    try {
      sql = `
      SELECT ID_PADRE, TITULO, DESCRIPCION, ID_CATEGORIA, ORIGEN
      FROM DB_CATEGORIA
      WHERE ID_CATEGORIA = ? AND ORIGEN IS NOT NULL`;
      const result = await cds.run(sql, [nodo]);

      for (const rs of result) {
        let record = {};
        record.ID_PADRE = rs.ID_PADRE;
        record.TITULO = (rs.ORIGEN === 'Dinámico') ? " " : rs.TITULO;
        record.DESCRIPCION = rs.DESCRIPCION;
        record.ID_CATEGORIA = rs.ID_CATEGORIA;
        record.ORIGEN = rs.ORIGEN;
        record.VALIDACION = (rs.ORIGEN === 'Dinámico')
          ? await getValidacion2(Number(rs.ID_CATEGORIA) + 1)
          : jsonValidacion;

        arr.push(record);

        if (rs.ID_PADRE !== 0) {
          return await getRecursiva2(arr, rs.ID_PADRE);
        } else {
          return arr;
        }
      }
      return arr;
    } catch (e) {
      return { error: e.message, accion: "getRecursiva2", query: sql }
    }
  };

  async function getProceso3(td, id_nodo) {
    let outPut = [];

    try {
      const sql = `SELECT ID_PADRE, TITULO, DESCRIPCION, ID_CATEGORIA, ORIGEN, ID_CATEGORIA_ESPEJO FROM DB_CATEGORIA
                     WHERE ID_CATEGORIA = ? AND APP = 'Contenido'`;
      const result = await cds.run(sql, [id_nodo]);
      console.log("RESP1:", result)

      for (const rs of result) {
        let record = {};
        record.ID_PADRE = rs.ID_PADRE;
        record.TITULO = "";
        record.DESCRIPCION = rs.DESCRIPCION;
        record.ORIGEN = rs.ORIGEN;

        outPut.push(record);

        if (rs.ID_PADRE !== 0) {
          return await getRecursiva2(outPut, rs.ID_CATEGORIA_ESPEJO);
        } else {
          return outPut;
        }
      }
      return outPut;
    } catch (e) {
      return { error: e.message, accion: "getProceso3", query: sql }
    }
  };

  async function getProcesoNodos1(td) {
    let outPut = [];
    let jsonValidacion = {

      TIPO_DATO: "",
      TABLA_SAP: "",
      CAMPO_TABLA_SAP: "",
      LARGO_DATO: "",
      FORMATO_FECHA: ""
    };

    let sql;

    try {
      const sNodo = await getSNodo1(td);
      sql = `SELECT ID_PADRE, TITULO, DESCRIPCION, ID_CATEGORIA, ORIGEN FROM DB_CATEGORIA
              WHERE ID_CATEGORIA = ( SELECT ID_CATEGORIA_ESPEJO FROM DB_CATEGORIA
               WHERE ID_CATEGORIA = (SELECT ID_NODO FROM DB_TIPO_DOCUMENTO WHERE ID_TIPO_DOCUMENTO = ? ))`;
      const result = await cds.run(sql, [td]);
      console.log("resultado de getProcesoNodo1;", result)

      for (const rs of result) {
        let record = {};
        record.ID_PADRE = rs.ID_PADRE;
        record.TITULO = (rs.ORIGEN === "Dinámico") ? "" : rs.TITULO;
        record.DESCRIPCION = rs.DESCRIPCION;
        record.ID_CATEGORIA = rs.ID_CATEGORIA;
        record.ORIGEN = rs.ORIGEN;
        record.VALIDACION = (rs.ORIGEN === "Dinámico") ? await getValidacion2(sNodo) : jsonValidacion;

        outPut.push(record);

        if (rs.ID_PADRE !== 0) {
          return await getRecursiva2(outPut, rs.ID_PADRE);
        } else {
          return outPut;
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getProcesoNodos", query: sql }
    }
    return outPut;
  };

  async function getExisteMetadata1(idTipoDocumento) {
    let sql;

    try {
      sql = `SELECT COUNT(*) AS ID FROM DB_METADATA
               WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idTipoDocumento]);

      for (const rs of result) {
        if (rs.ID > 0) {
          return true;
        } else {
          return false;
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getExisteMetadata", query: sql }
    }
  };

  async function getDataMDManual3(idTipoDocumento, tipo, nodos) {
    let record = {};
    let outPut = [];
    let sql;
    try {
      sql = `SELECT ATRIBUTO, TIPO_ATRIBUTO, ID_METADATA, ORIGEN FROM DB_METADATA 
      WHERE ID_TIPO_DOCUMENTO = ? AND (ORIGEN = 'Manual' OR ORIGEN = 'NODOS DINAMICOS')`;
      const result = await cds.run(sql, [idTipoDocumento]);

      for (const rs of result) {
        record = {};
        record.ATTRIBUTE = rs.ATRIBUTO;
        record.VALUE = "";

        if (tipo === "Interna") {
          record.ID_METADATA = rs.ID_METADATA;
          record.ORIGEN = rs.ORIGEN;
          record.TIPO_ATRIBUTO = rs.TIPO_ATRIBUTO;
        }

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getDataMDManual3", query: sql }
    }
    return outPut;
  };

  async function getDocumentos3(idTipoDocumento, tipo, nodos) {
    let outPut = [];
    let record = {};

    // let recorddatameta = [{
    // ATRIBUTO: "",
    // OBLIGA: "",
    // VALUE: "",
    // ID_METADATA: ""
    // }];

    record.BASE64 = "";
    record.URL = "";
    record.TITLE = "";
    record.FORMAT = "";
    record.SIZE = "";
    record.USER = "";
    record.ID_DOC_BASE = 0;
    record.DESCRIPTOR = "";
    record.CONTAINS_MANUAL_METADATA = await getExisteMetadata1(idTipoDocumento);

    if (record.CONTAINS_MANUAL_METADATA) {

      record.MANUAL_METADATA = await getDataMDManual3(idTipoDocumento, tipo, nodos);
    } else {
      record.MANUAL_METADATA = [];
    }

    outPut.push(record);

    return outPut;

  };

  async function getIdTD2(idApp, idProceso) {
    let record = "";

    try {
      const sql = `SELECT DISTINCT TD.NOMBRE AS NOMBRE 
                     FROM DB_TIPO_DOCUMENTO AS TD
                     JOIN DB_PROCESOS AS PRO
                      ON PRO.TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                     WHERE PRO.ID_ADM_PORTAL = ? AND PRO.ID_PROCESO = ?`;
      const result = await cds.run(sql, [idApp, idProceso]);
      console.log("TD1:", result)

      for (const rs of result) {
        record = rs.NOMBRE;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdTD2", query: sql }
    }
    return record;
  };

  async function getTokenValue() {
    let token;

    const details = {
      grant_type: "client_credentials",
      resource: "00000003-0000-0ff1-ce00-000000000000/gascoglp.sharepoint.com@8510dd4d-19ec-4aea-8708-bc6a0ed235c3",
      client_id: "bd143cf5-f8b3-40d8-9d73-e65ba672e25e@8510dd4d-19ec-4aea-8708-bc6a0ed235c3",
      client_secret: "RWFVOFF+ZFdVUFhTSWdlVXhSUVd1fkl1VDIuc3BOREFKMDVnYWNEWg=="
    };

    const body = [];

    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      body.push(encodedKey + "=" + encodedValue);
    }

    try {
      const dest = await cds.connect.to("destiny");

      const response = await dest.send({
        method: "POST",
        path: "",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        data: body.join("&")
      });

      if (!response) {
        return false;
      }

      const result = typeof response === "string" ? JSON.parse(response) : response;

      token = result.access_token;

      return token;

    } catch (e) {
      return false;
    }
  };

  async function getMetadataNodename(td, idPadre) {
    let sql;
    let outPut = [];
    let response;
    try {
      sql = `SELECT MD.ATRIBUTO AS ATRIBUTO FROM DB_METADATA MD
                INNER JOIN DB_CATEGORIA CAT ON CAT.ID_CATEGORIA = MD.ID_NODO
                WHERE MD.ID_TIPO_DOCUMENTO = ? AND CAT.ID_PADRE = ? AND (MD.ORIGEN = 'Estructura' OR MD.ORIGEN = 'Estructura Lista')`;
      const result = await cds.run(sql, [td, idPadre]);

      for (const rs of result) {
        response = rs.ATRIBUTO;
        outPut.push(response);
      }
    } catch (e) {
      return { error: e.message, accion: "getMetadataNodename", query: sql }
    }
    return response;
  };

  async function getTuboExternaMetadata(td, idTipoDocumento, nodos) {
    let resp = await getProceso3(td, nodos)

    let cant = resp.length;
    let outPut = [];
    let recordURL = {};
    recordURL.Base64 = "";
    recordURL.Titulo = "";

    let jsonDocumento = [{
      BASE64: "",
      URL: "",
      TITULO: "",
      FORMATO: "",
      SIZE: "",
      USER: "",
      ID_DOC_BASE: "",
      DESCRIPCION: "",
      TIENEMDMANUAL: "",
      MDMANUAL: [{
        ATRIBUTO: "",
        TYPE: "",
        VALUE: "",
        ID_METADATA: ""
      }]
    }];

    let jsonValidacion = {
      TIPO_DATO: "",
      TABLA_SAP: "",
      CAMPO_TABLA_SAP: "",
      LARGO_DATO: "",
      FORMATO_FECHA: ""
    };

    let j = 0;
    for (let i = cant - 1; i >= 0; i--) {
      if (resp[i].ORIGEN === "Dinámico") {
        j++;
        let record = {};

        record.CONTAINS_FILE = (i === 0) ? true : false;
        record.DATE = "";
        record.APP = "";
        record.DOCUMENT_NAME = "";

        record.NODE_NAME = "";
        record.DATO_METADATA = await getMetadataNodename(idTipoDocumento, resp[i].ID_PADRE);
        record.VALIDATION = (i === 0) ? [] : await getValidacionEstructura1(resp[i].ID_PADRE, resp[i].DESCRIPCION);
        record.DOCUMENT = (i === 0) ? await getDocumentos3(idTipoDocumento, 'Externa', nodos) : [];

        outPut.push(record);

      } else {
        if (i === 0) {
          let record = {};

          record.CONTAINS_FILE = (i === 0) ? true : false;

          record.DATE = "";
          record.APP = "";
          record.DOCUMENT_NAME = "";

          record.NODE_NAME = "";
          record.DATO_METADATA = "";
          record.VALIDATION = (i === 0) ? [] : await getValidacionEstructura1(resp[i].ID_PADRE, resp[i].DESCRIPCION);
          record.DOCUMENT = (i === 0) ? await getDocumentos3(idTipoDocumento, 'Externa', nodos) : [];

          outPut.push(record);
        }
      }
    }
    return outPut;
  };

  async function getIdTipoDocumento(idApp, idProceso) {
    let sql;
    let record = "";
    let outPut = [];

    try {
      sql = `SELECT DISTINCT TD.ID_TIPO_DOCUMENTO, PRO.ID_NODO FROM DB_TIPO_DOCUMENTO AS TD
              JOIN DB_PROCESOS AS PRO
               ON PRO.TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
              WHERE PRO.ID_ADM_PORTAL = ? AND PRO.ID_PROCESO = ?`;

      const result = await cds.run(sql, [idApp, idProceso]);
      for (const rs of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.ID_NODO = rs.ID_NODO;
        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getIdTipoDocumento", query: sql }
    }
    return outPut;
  };

  async function getIdCatProceso(idTipoDoc) {
    let sql;
    let result = "";

    try {
      sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA
               WHERE ID_CATEGORIA_ESPEJO IN
                (SELECT ID_NODO FROM DB_METADATA WHERE ID_TIPO_DOCUMENTO = ?)
                AND ORIGEN = 'Dinámico'`;
      const result1 = await cds.run(sql, [idTipoDoc]);
      console.log("resultado", result1)

      for (const rs of result1) {
        result = result + rs.ID_CATEGORIA;
        result += ","
      }

      if (result.length > 1) {
        result = result.slice(0, result.length - 1);
      }
    } catch (e) {
      return result;
    }
    return result;
  };

  this.on('getProcesos', async (req) => {
    const { idApp } = req.data;
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT ID_PROCESO, DESCRIPCION_PROCESO
      FROM DB_PROCESOS
      WHERE ID_ADM_PORTAL = ?
    `;

      const result = await cds.run(sql, [idApp]);

      for (const rs of result) {
        let record = {};
        record.ID_PROCESO = rs.ID_PROCESO;
        record.DESCRIPCION_PROCESO = rs.DESCRIPCION_PROCESO;

        outPut.push(record);
      }

      return outPut;
    } catch (e) {
      return { error: e.message, accion: "getProcesos", query: sql }
    }
  });

  this.on('getNodos', async (req) => {
    const { idTipoDoc } = req.data;
    let outPut = [];
    const resp = await getProcesoNodos1(idTipoDoc);
    const cant = resp.length;

    console.log("Esta es la cantidad:", cant)

    let recordInt = {};

    for (let i = 0; i < cant; i++) {
      let record = {};
      record.ID_CATEGORIA = resp[i].ID_CATEGORIA;
      record.NOMBRE_NODO = resp[i].TITULO;
      record.DESCRIPCION = resp[i].DESCRIPCION;
      record.ORIGEN = resp[i].ORIGEN;
      record.VALIDACION = resp[i].VALIDACION;

      outPut.push(record);
    }

    recordInt.NODOS = outPut;
    recordInt.METADATA = await getDataMDManual3(idTipoDoc);

    return recordInt;
  });

  this.on('getEstructuraMD', async (req) => {
    const { ID_APP, ID_PROCESO } = req.data;
    idApp = ID_APP;
    idProceso = ID_PROCESO;

    let response;
    const td = await getIdTD2(ID_APP, ID_PROCESO);
    const resp = await getIdTipoDocumento(ID_APP, ID_PROCESO);

    if (td.length > 0) {
      const idTipoDocumento = resp[0].ID_TIPO_DOCUMENTO;
      const nodo = resp[0].ID_NODO;
      response = await getTuboExternaMetadata(td, idTipoDocumento, nodo);
    }

    return response;
  });

  this.on('getTDBiblioteca', async (req) => {
    const { ID_TIPO_DOCUMENTO } = req.data;

    let record = {
      ID_APP: 0,
      ID_PROCESO: 0
    };

    let sql;

    try {
      const idcatProceso = await getIdCatProceso(ID_TIPO_DOCUMENTO);
      console.log("length del idcatProceso:", idcatProceso)

      const extra = (idcatProceso.length > 0)
        ? ` AND ID_NODO IN (${idcatProceso})`
        : '';

      sql = `SELECT ID_ADM_PORTAL, ID_PROCESO FROM DB_PROCESOS
               WHERE TIPO_DOCUMENTO = ? ${extra}`;
      const result = await cds.run(sql, [ID_TIPO_DOCUMENTO]);

      for (const rs of result) {
        record = {};
        record.ID_APP = Number(rs.ID_ADM_PORTAL);
        record.ID_PROCESO = Number(rs.ID_PROCESO);
      }
      return record;
    } catch (e) {
      return { error: e.message, accion: "getTDBiblioteca", query: sql }
    }
  });

  this.on('getTDoc', async (req) => {
    const { idApp, idProceso } = req.data;
    let sql;
    let outPut = [];

    try {
      sql = `SELECT TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        FROM DB_TIPO_DOCUMENTO AS TD
        JOIN DB_PROCESOS AS PRO
          ON PRO.TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
        WHERE PRO.ID_ADM_PORTAL = ? AND PRO.ID_PROCESO = ?`;

      const result = await cds.run(sql, [idApp, idProceso]);

      for (const rs of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE;
        outPut.push(record);
      }

      return outPut;
    } catch (e) {
      return e.message;
    }
  });

  this.on('getAplicaciones', async () => {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT ID_ADM_PORTAL, NOMBRE_PORTAL FROM DB_ADM_PORTAL`;

      const result = await cds.run(sql);

      for (const rs of result) {
        let record = {};
        record.ID_APLICACION = rs.ID_ADM_PORTAL;
        record.NOMBRE_APLICACION = rs.NOMBRE_PORTAL;

        outPut.push(record);
      }

      return outPut;
    } catch (e) {
      return { error: e.message, accion: "getAplicaciones", query: sql }
    }
  });

  this.on('getTD', async (req) => {
    const { ID_TIPO_DOCUMENTO } = req.data;

    let record = {
      IDAPP: 0,
      IDPROCESO: 0
    };

    let sql;
    try {
      sql = `
      SELECT ID_ADM_PORTAL, ID_PROCESO
      FROM DB_PROCESOS
      WHERE TIPO_DOCUMENTO = ?
    `;

      const result = await cds.run(sql, [ID_TIPO_DOCUMENTO]);

      for (const rs of result) {
        record = {
          IDAPP: rs.ID_ADM_PORTAL,
          IDPROCESO: rs.ID_PROCESO
        };
      }

      return record;
    } catch (e) {
      return sql;
    }
  });

  this.on('getFile', async () => {
    const body = await getTokenValue();
    return body;
  });

});