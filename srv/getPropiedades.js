////////////////////////////
///////GETPROPIEDADES///////
////////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function getRuta(nodo) {

    let sql, sql2;
    let outPut = [];
    let record = {};

    try {
      sql = `SELECT PATHSP,
                      NOMBRE,
                 DESCRIPCION,
                APP_DATOS FROM DB_CATEGORIA
                WHERE ID_CATEGORIA = (SELECT ID_CATEGORIA_ESPEJO FROM DB_CATEGORIA WHERE ID_CATEGORIA = ?)`;
      const result = await cds.run(sql, [nodo]);
      for (const rs of result) {
        const resp = rs.PATHSP.replace("/api/web/folders/add('", "");
        let record = {};
        record.RUTA = resp;
        record.RESPONSABLE = rs.NOMBRE;
        record.DESCRIPCION = rs.DESCRIPCION;
        record.APP_DATOS = rs.APP_DATOS;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getRuta", query: sql }
    }
    return outPut;
  };

  async function getProceso1(nodo) {
    let sql;
    let output = [];

    try {
      sql = `SELECT DESCRIPCION_PROCESO, ID_NODO FROM DB_PROCESOS WHERE TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [nodo]);

      for (const gpros of result) {
        let record = {};
        let resp = await getRuta(gpros.ID_NODO);
         (resp)

        record.DESCRIPCION_PROCESO = gpros.DESCRIPCION_PROCESO;
        record.RUTA = resp[0].RUTA;
        record.RESPONSABLE = resp[0].RESPONSABLE;
        record.DESCRIPCION = resp[0].DESCRIPCION;
        record.APP_DATOS = resp[0].APP_DATOS;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getProceso1", query: sql }
    }
    return output;
  };

  async function getTipoDocumento1(nodo) {
    let sql;
    let record;

    try {
      sql = `SELECT ID_TIPO_DOCUMENTO FROM DB_TIPO_DOCUMENTO
               WHERE ID_NODO = ?`;
      const result = await cds.run(sql, [nodo]);

      for (const gtdoc of result) {
        record = gtdoc.ID_TIPO_DOCUMENTO;
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoDocumento1", query: sql }
    }
    return record;
  };

  async function getNombreTipoDocumento(nodo) {
    let sql;
    let record;

    try {
      sql = `SELECT NOMBRE FROM DB_TIPO_DOCUMENTO
               WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [nodo]);
       ("result de getnombretipodocumento:", result)

      for (const gtdoc of result) {
        record = gtdoc.NOMBRE;
      }
    } catch (e) {
      return { error: e.message, accion: "getNombreTipoDocumento", query: sql }
    }
    return record;
  };

  async function getFormatos(nodo) {
    let sql;
    let output = [];
    let sValue = await getTipoDocumento1(nodo);

    try {
      sql = `SELECT FORMATO, PESO FROM DB_PROP_TIPO_DOC
               WHERE TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [sValue]);

      for (const gform of result) {
        let record = {};
        record.FORMATO = gform.FORMATO;
        record.PESO = Number(gform.PESO);


        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getFormatos", query: sql }
    }
    return output;
  };

  async function getFormatosLista(nodo) {
    let sql;
    let output = [];

    try {
      sql = `SELECT FORMATO, PESO FROM DB_PROP_TIPO_DOC
               WHERE TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [nodo]);
       (result)

      for (const gforml of result) {
        let record = {};
        record.FORMATO = gforml.FORMATO;
        record.PESO = Number(gforml.PESO);


        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getFormatosLista", query: sql }
    }
    return output;
  };

  async function getMetadata2(nodo) {
    let sql;
    let outPut = [];
    let sValue = await getTipoDocumento1(nodo);

    try {
      sql = `SELECT ATRIBUTO, TIPO_ATRIBUTO, OBLIGATORIEDAD, VALUE FROM DB_METADATA
              WHERE ID_TIPO_DOCUMENTO = ?
              AND (VALUE='' or VALUE is null) `; //<-- Tabla VALUE en METADATA NO EXISTE
      const result = await cds.run(sql, [sValue]);

      for (const gmet of result) {
        let record = {};
        record.ATRIBUTO = gmet.ATRIBUTO;
        record.TIPO_ATRIBUTO = gmet.TIPO_ATRIBUTO;
        record.OBLIGATORIEDAD = gmet.OBLIGATORIEDAD;
        record.VALUE = gmet.VALUE;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getMetadata2", query: sql }
    }
    return outPut;
  };

  async function getMDListaManual(nodo, iddoc, tipo) {
     (nodo, iddoc, tipo)
    let sql;
    let output = [];

    try {
      sql = `SELECT DISTINCT ATRIBUTO, TIPO_ATRIBUTO, VALUE FROM DB_METADATA_VALUE
              WHERE ID_TIPO_DOCUMENTO = ?
              AND ID_DOCUMENTO = ?
              AND ORIGEN = ?`;
      const result = await cds.run(sql, [nodo, iddoc, tipo]);

      for (const gmd of result) {
        let record = {};

        record.ATRIBUTO = gmd.ATRIBUTO;
        record.VALUE = gmd.VALUE;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getMDListaManual", query: sql }
    }
    return output;
  };

  async function getAlmFisico(nodo) {
     ("en getAlmFisico empiezo con esto:", nodo)
    let sql;
    let output = [];
    // let sValue = await getTipoDocumento1(nodo); // ??
    try {

      sql = `
      SELECT
        EMPRESA_RESPONSABLE,
        G_FISICA,
        TEMPORABILIDAD,
        CARDINALIDAD,
        DESCRIPCION,
        OBLIGATORIEDAD
      FROM DB_TIPO_DOCUMENTO_FISICO
      WHERE ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [nodo]);

      // let record = {
      //   EMPRESA_RESPONSABLE: caracter,
      //   RUTA_FISICA: caracter,
      //   OBLIGATORIEDAD: caracter,
      //   OBSERVACION: caracter,
      //   TEMPORABILIDAD: caracter,
      // };

      for (const galm of result) {
        let record = {}
        record.EMPRESA_RESPONSABLE = galm.EMPRESA_RESPONSABLE;
        record.RUTA_FISICA = galm.G_FISICA;
        record.OBLIGATORIEDAD = galm.OBLIGATORIEDAD;
        record.OBSERVACION = galm.DESCRIPCION;
        record.TEMPORABILIDAD = `${galm.TEMPORABILIDAD}  ${galm.CARDINALIDAD}`;
        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getAlmFisico", query: sql }
    }
    return output;
  };

  async function getAlmDigital(nodo) {
     ("Empiezo con esto desde getAlmDigital:", nodo)
    let sql;
    let output = [];

    try {
      sql = `SELECT EMPRESA_RESPONSABLE, G_FISICA, TEMPORABILIDAD, CARDINALIDAD, DESCRIPCION, OBLIGATORIEDAD
              FROM DB_TIPO_DOCUMENTO_DIGITAL 
              WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [nodo]);

      for (const gdig of result) {
        let record = {};
        record.EMPRESA_RESPONSABLE = gdig.EMPRESA_RESPONSABLE;
        record.RUTA_DIGITAL = gdig.RUTA_DIGITAL;
        record.TEMPORABILIDAD = `${gdig.CARDINALIDAD} ${gdig.DESCRIPCION}`;
        record.OBSERVACION = gdig.OBSERVACION;
        record.OBLIGATORIEDAD = gdig.OBLIGATORIEDAD;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getAlmDigital", query: sql }
    }
    return output;
  };

  async function getEstado2(nodo) {
    let sql;
    let des;
     ("Esto recibe getestado2:", nodo)

    try {
      sql = `SELECT est.DESCRIPCION FROM DB_ESTADO est 
               WHERE est.ID_ESTADO = ?`;
      const result = await cds.run(sql, [nodo]);

      for (const gest of result) {
        des = gest.DESCRIPCION;
      }
    } catch (e) {
      return { error: e.message, accion: "getEstado2", query: sql }
    }
    return des;
  };

  async function getWorkflow2(nodo) {
    let sql;
    let output = [];
    // let sValue = await getTipoDocumento1(nodo);
    let estLib = (nodo);
     ("esto viene de workflow2:", estLib)

    try {
      sql = `SELECT NIVEL, NOMBREAPROBADOR, ESTADO FROM DB_NIVELES
               WHERE ID_EST_LIB = ?
               ORDER BY NIVEL ASC`;
      const result = await cds.run(sql, [estLib]);

      for (const gwork of result) {
        let record = {};
        record.NIVEL = gwork.NIVEL;
        record.NOMBREAPROBADOR = gwork.NOMBREAPROBADOR;
        record.ESTADO = await getEstado2(gwork.ESTADO);

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getWorkFlow2", query: sql }
    }
    return output;
  };

  async function getPropiedades(idCategoria, flag) {
    let sql;
    let outPut = [];
    try {
      if (flag !== "1") {
        sql = `
        SELECT ID_PADRE AS ID_COL, TITULO
        FROM DB_CATEGORIA
        WHERE ID_CATEGORIA = ?`;
      } else {
        sql = `
        SELECT ID_CATEGORIA AS ID_COL, TITULO
        FROM DB_CATEGORIA
        WHERE ID_CATEGORIA = ?`;
      }


      const result = await cds.run(sql, [idCategoria]);

       ("Resultado de la query:", result)

      for (const gprop of result) {
        const idCol = gprop.ID_COL; 1.5/10.0
        let record = {};
        record.TITULO = gprop.TITULO;
        record.PROPIEDADES = await getFormatos(idCol);
        record.ALMFISICO = await getAlmFisico(idCol);
        record.ALMDIGITAL = await getAlmDigital(idCol);
        record.METADATA = await getMetadata2(idCategoria);
        record.WORKFLOW = await getWorkflow2(idCategoria);
        record.NOMBRETD = await getNombreTipoDocumento(idCategoria);

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getPropiedades", query: sql }
    }

    return outPut;
  };

  async function getPropiedadesLista(idCategoria) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT CAT.ID_PADRE,
                      CAT.TITULO,
                      DET.ID_TIPO_DOCUMENTO,
                      DET.ID_CATEGORIA_HOJA
            FROM DB_CATEGORIA CAT 
             JOIN DB_DETALLE DET ON DET.NODO_HIJO = CAT.ID_CATEGORIA 
            WHERE CAT.ID_CATEGORIA = ?`;

      const result = await cds.run(sql, [idCategoria]);

      for (const gprop of result) {
        let record = {};
        record.TITULO = gprop.TITULO;
        record.PROPIEDADES = await getFormatosLista(gprop.ID_TIPO_DOCUMENTO);
        record.ALMFISICO = await getAlmFisico(gprop.ID_TIPO_DOCUMENTO);
        record.ALMDIGITAL = await getAlmDigital(gprop.ID_TIPO_DOCUMENTO);
        record.METADATA = await getMDListaManual(gprop.ID_TIPO_DOCUMENTO, gprop.ID_CATEGORIA_HOJA, 'Manual');
        record.WORKFLOW = await getWorkflow2(gprop.ID_TIPO_DOCUMENTO);
        record.NOMBRETD = await getNombreTipoDocumento(gprop.ID_TIPO_DOCUMENTO);
        record.IDPADRE = gprop.ID_TIPO_DOCUMENTO;
        record.METADATASAP = await getMDListaManual(gprop.ID_TIPO_DOCUMENTO, gprop.ID_CATEGORIA_HOJA, 'SAP');
        record.PROCESO = await getProceso1(gprop.ID_TIPO_DOCUMENTO);

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getPropiedadesLista", query: sql }
    }
    return outPut;
  };

  this.on('get', async (req) => {
    const { idCategoria, flag } = req.data;
    const visualizadores = await getPropiedades(idCategoria, flag);
    return visualizadores;
  });

  this.on('getPropiedadesLista', async (req) => {
    const { idCategoria } = req.data;
    const visualizadores = await getPropiedadesLista(idCategoria);
    return visualizadores;
  });

});