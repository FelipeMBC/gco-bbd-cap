//////////////////////////////////
/////GETMETADATATIPODOCUMENTO/////
//////////////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  function eliminaDuplicado(tuArreglo, atributodetuArreglo) {

    const nuevoArreglo = [];
    const nuevoJson = {};

    for (const i in tuArreglo) {
      nuevoJson[tuArreglo[i][atributodetuArreglo]] = tuArreglo[i];
    }

    for (i in nuevoJson) {
      nuevoArreglo.push(nuevoJson[i]);
    }
    return nuevoArreglo;

  };

  function getType(sValue) {
    var text;
    switch (sValue) {
      case "INTEGER":
        text = "Number";
        break;

      case "DATE":
        text = "date";
        break;

      case "date":
        text = "date";
        break;

      case "TIME":
        text = "time";
        break;
      case "dateMax":
        text = "dateMax";
        break;
      case "textArea":
        text = "textArea";
        break;
      case "numeric":
        text = "numeric";
        break;
      default:
        text = "Text";
        break;

    }

    return text;

  };

  this.on('getValue', async (req) => {

    const { idMetadata, tipoDocumento } = req.data.input;
    let record = "";
    let sql;

    try {
      sql = `
      SELECT VALUE
      FROM DB_METADATA_VALUE
      WHERE ID_METADATA = ? AND ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [idMetadata, tipoDocumento]);
      for (const rs of result) {
        record = {};
        record.VALUE = rs.VALUE;
      }

    } catch (e) {
      return { error: e.message, accion: "getValue", query: sql }
    }
    return record;

  });

  async function getMetadata1(tipoDocumento) {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT DISTINCT
        ATRIBUTO,
        OBLIGATORIEDAD,
        TIPO_ATRIBUTO,
        ORIGEN,
        ID_METADATA,
        TIPO
      FROM DB_METADATA
      WHERE ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const gmet of result) {
        let record = {};
        record.ATRIBUTO = gmet.ATRIBUTO;
        record.REQUIRED = (gmet.TIPO === "Estático") ? false : true;
        record.ORIGEN = gmet.ORIGEN;
        record.TIPO_ATRIBUTO = gmet.TIPO_ATRIBUTO;
        record.ID_METADATA = gmet.ID_METADATA;
        record.VALUE = (gmet.TIPO === "Estático") ? gmet.ATRIBUTO : "";
        record.ENABLED = (gmet.TIPO === "Estático") ? false : true;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getMetadata1", query: sql }
    }

    return outPut;
  };

  async function getListDocObl(tipoDocumento) {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT
        ID_DOC_OBL,
        ID_TIPO_DOCUMENTO,
        NOMBRE_DOCUMENTO,
        OBLIGATORIO
      FROM DB_DOC_OBL
      WHERE ID_TIPO_DOCUMENTO = ?
      ORDER BY NOMBRE_DOCUMENTO ASC
    `;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const glis of result) {
        let record = {};
        record.ID_DOC_OBL = glis.ID_DOC_OBL;
        record.ID_TIPO_DOCUMENTO = glis.ID_TIPO_DOCUMENTO;
        record.NOMBRE_DOCUMENTO = glis.NOMBRE_DOCUMENTO;
        record.OBLIGATORIO = glis.OBLIGATORIO;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getListDocObl", query: sql, info: outPut }
    }
    return outPut;
  };

  async function getValoresLista(att, tipoDocumento) {
    let sql;
    let outPut = [];

    try {

      sql = `SELECT * FROM DB_METADATA_LISTA 
    WHERE ID_TIPO_DOCUMENTO = ? 
    AND NOMBRE_ATRIBUTO = ? 
    ORDER BY ID_METADATA_LISTA ASC`;

      const result = await cds.run(sql, [tipoDocumento, att]);

      for (const gval of result) {
        let recordValue = {};
        recordValue.VALUE = gval.VALUE;
        recordValue.APODO = gval.NOMBRE_ATRIBUTO.split(" ")[0]; // ??

        outPut.push(recordValue);
      }
    } catch (e) {
      return { error: e.message, accion: "getValoresLista", query: sql, info: outPut }
    }
    return outPut;
  };

  function ordenarAsc(p_array_json, p_key) {
    p_array_json.sort(function (a, b) {
      if (a[p_key] < b[p_key]) return -1;
      if (a[p_key] > b[p_key]) return 1;
      return 0;
    });
  };

  async function getValoresListaNormas(att, td) {
    let outPut = [];
    let sql;
    let result;

    try {
      switch (att) {
        case "SOCIEDAD":
          sql = `SELECT * FROM COMPLIANCE_NORMAS.SOCIEDAD ORDER BY NOMBRE_SOCIEDAD DESC`;
          result = await cds.run(sql);
          for (const gv1 of result) {
            const recordValue = {};
            recordValue.VALUE = gv1.NOMBRE_SOCIEDAD; // col 2 
            recordValue.APODO = att;
            outPut.push(recordValue);
          }
          break;

        case "GERENCIA/SUBGERENCIA/AREA":
          sql = `SELECT * FROM COMPLIANCE_NORMAS.GERENCIA ORDER BY NOMBRE_GERENCIA DESC`;
          result = await cds.run(sql);
          for (const gv2 of result) {
            const recordValue = {};
            recordValue.VALUE = gv2.NOMBRE_GERENCIA; // col 3
            recordValue.APODO = att;
            outPut.push(recordValue);
          }
          break;

        case "TIPO DE DOCUMENTO":
          sql = `SELECT * FROM COMPLIANCE_NORMAS.TIPO_DOCUMENTO ORDER BY UPPER(NOMBRE) DESC`;
          result = await cds.run(sql);
          for (const gv3 of result) {
            const recordValue = {};
            recordValue.VALUE = gv3.NOMBRE; // col 2
            recordValue.APODO = att;
            outPut.push(recordValue);
          }
          break;
      }
    } catch (e) {
      return { error: e.message, accion: "getValoresListaNormas", query: sql, info: outPut }
    }
    return outPut;
  };

  async function getFlagVinculacion(att, tipoDocumento) {

    try {
      const sql = `SELECT COUNT (*)
                FROM VINCULACION
                WHERE ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [tipoDocumento]);

      if (result.length > 0 && Number(result[0].TOTAL) > 0) {
        return "Metadata_Busqueda";
      } else {
        return "Documento_Sugerido";
      }
    } catch (e) {
      return "Documento_Sugerido";
    }
  };

  async function getFlagNodoBusqueda(att, tipoDocumento) {

    try {
      const sql = `SELECT COUNT (*)
                FROM DB_NODOBUSQUEDA 
                WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [tipoDocumento]);

      if (result.length > 0 && Number(result[0].TOTAL) > 0) {
        return "Metadata_Busqueda";
      } else {
        return await getFlagVinculacion(att, tipoDocumento);
      }

    } catch (e) {
      return "Documento_Sugerido";
    }
  };

  async function getListMetadata(tipoDocumento) {
    let sql;
    let outPutValores = [];
    let outPut = [];

    try {
      sql = `SELECT DISTINCT MD.ATRIBUTO, MD.OBLIGATORIEDAD, MD.TIPO_ATRIBUTO, MD.ORIGEN, MD.ID_METADATA, MD.TIPO, MDL.NOMBRE_ATRIBUTO
          FROM DB_METADATA MD 
          LEFT JOIN (SELECT ID_TIPO_DOCUMENTO, VALUE, NOMBRE_ATRIBUTO FROM DB_METADATA_LISTA) AS MDL ON MDL.NOMBRE_ATRIBUTO = MD.ATRIBUTO AND MDL.ID_TIPO_DOCUMENTO = MD.ID_TIPO_DOCUMENTO
          WHERE MD.ID_TIPO_DOCUMENTO = ?
          AND MD.TIPO_ATRIBUTO <> 'Tipo SAP' AND MD.ORIGEN <> 'Nodo Jerárquico' ORDER BY MD.ID_METADATA ASC`;

      const result = await cds.run(sql, [tipoDocumento]);
      const especiales = new Set([2799, 2803, 2804, 2808, 2809, 2810, 2811, 2812, 2813, 2814, 2815, 2816]);


      for (const glmet of result) {
        let record = {};
        record.ATRIBUTO = glmet.ATRIBUTO;
        record.ORIGEN = glmet.ORIGEN;
        record.OBLIGATORIO = (glmet.OBLIGATORIEDAD.toUpperCase() === 'NO') ? false : true;
        record.REQUIRED = (glmet.OBLIGATORIEDAD.toUpperCase() === 'NO') ? false : true;
        record.TYPE = getType(glmet.TIPO_ATRIBUTO);
        record.TIPO_ATRIBUTO = glmet.TIPO_ATRIBUTO;
        record.ID_METADATA = glmet.ID_METADATA;
        record.VALUE = (glmet.TIPO === 'Estático') ? glmet.ATRIBUTO : '';
        record.ENABLED = (glmet.TIPO === 'Estático') ? false : true;

        if (glmet.ORIGEN === 'Lista' || glmet.ORIGEN === 'Estructura Lista') {
          let recordValue = {};
          outPutValores.push(recordValue);

          if (!especiales.has(Number(tipoDocumento))) {
            record.VALORESLISTA = await getValoresLista(glmet.ATRIBUTO, tipoDocumento);
            record.TIPO_LISTA = await getFlagNodoBusqueda(glmet.ATRIBUTO, tipoDocumento);
          } else {
            if (record.ATRIBUTO !== "SOCIEDAD" && record.ATRIBUTO !== "GERENCIA/SUBGERENCIA/AREA" && record.ATRIBUTO !== "TIPO DE DOCUMENTO") {
              record.VALORESLISTA = await getValoresLista(glmet.ATRIBUTO, tipoDocumento);
              record.TIPO_LISTA = await getFlagNodoBusqueda(glmet.ATRIBUTO, tipoDocumento);
            } else {
              record.VALORESLISTA = await getValoresListaNormas(glmet.ATRIBUTO, tipoDocumento);
              record.TIPO_LISTA = await getFlagNodoBusqueda(glmet.ATRIBUTO, tipoDocumento);
            }

          }
        } else {
          record.VALORESLISTA = [];
          record.TIPO_LISTA = "";
        }

        if (record.ATRIBUTO !== "FechaCarga") {
          outPut.push(record);
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getListMetadata", query: sql }
    }
    const outPut2 = eliminaDuplicado(outPut, "ATRIBUTO");
    return outPut2;
  };

  async function getUrlDocumento(idDoc, tipoDocumento) {
    console.log("getUrlDocumento -> idDocumento:", idDoc);
    console.log("getUrlDocumento -> tipoDocumento:", tipoDocumento);

    let sql;
    let outPut = [];

    try {
      sql = `SELECT DISTINCT DET.URL, DOC.NOMBRE, DET.ID_DETALLE
             FROM DB_DETALLE DET 
             JOIN DB_DOCUMENTO DOC ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
             WHERE DET.ID_CATEGORIA_HOJA = ? 
             AND DET.ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [idDoc, tipoDocumento]);

      for (const gurl of result) {
        let record = {};
        record.URL_ADJUNTO = gurl.URL;
        record.TITULO = gurl.NOMBRE;
        record.DOCUMENTID = gurl.ID_DETALLE;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getUrlDocumento", query: sql }
    }
    return outPut;
  };

  async function getValueMetadata(nodo, idDocumento, tipoDocumento) {
    console.log("getValueMetadata -> nodo:", nodo);
    console.log("getValueMetadata -> idDocumento:", idDocumento);
    console.log("getValueMetadata -> tipoDocumento:", tipoDocumento);

    let sql;
    let value = "";

    try {
      sql = `
      SELECT DISTINCT VALUE
      FROM DB_METADATA_VALUE 
      WHERE ID_TIPO_DOCUMENTO = ?
        AND ATRIBUTO = ?
        AND ID_DOCUMENTO = ?
    `;

      const result = await cds.run(sql, [tipoDocumento, nodo, idDocumento]);

      // for (const rs of result){
      //   value.VALUE = rs.VALUE;
      // }

      if (result && result.length > 0) {
        value = result[0].VALUE;
      }

    } catch (e) {
      return { error: e.message, accion: "getValueMetadata", query: sql };
    }
    console.log("este es value:", value)
    return value;

  };

  async function getValueDateMetadata(nodo, idDocumento, tipoDocumento) {
    let sql;
    let valueDate = "";

    console.log("getValueDATEMetadata -> nodo:", nodo);
    console.log("getValueDATEMetadata -> idDocumento:", idDocumento);
    console.log("getValueDATEMetadata -> tipoDocumento:", tipoDocumento);

    try {
      sql = `
      SELECT DISTINCT VALUEDATE
      FROM DB_METADATA_VALUE 
      WHERE ID_TIPO_DOCUMENTO = ?
        AND ATRIBUTO = ?
        AND ID_DOCUMENTO = ?
    `;

      const result = await cds.run(sql, [tipoDocumento, nodo, idDocumento]);

      if (result && result.length > 0) {
        valueDate = result[0].VALUEDATE;
      }
    } catch (e) {
      return { error: e.message, accion: "getValueDateMetadata", query: sql };
    }
    return valueDate;
  };

  async function getIdDocumento3(tipoDocumento, nombre) {
    let sql;
    let idDocumento = null;

    console.log("getIdDocumento3 - TipoDocumento:", tipoDocumento, "Nombre del documento:", nombre);

    try {
      sql = `
      SELECT DISTINCT ID_DOCUMENTO
      FROM DB_DOCUMENTO 
      WHERE ID_TIPO_DOCUMENTO = ? 
        AND NOMBRE = ?
    `;
      const result = await cds.run(sql, [tipoDocumento, nombre]);

      if (result && result.length > 0) {
        idDocumento = result[0].ID_DOCUMENTO;
      }

      console.log("Resultado de la query en getIdDocumento3:", idDocumento);
    } catch (e) {
      return { error: e.message, accion: "getIdDocumento3", query: sql };
    }

    return idDocumento;
  };

  async function getValueTimeMetadata(nodo, idDocumento, tipoDocumento) {
    let sql;
    let valueTime = "";

    try {
      sql = `
      SELECT DISTINCT VALUETIME
      FROM DB_METADATA_VALUE 
      WHERE ID_TIPO_DOCUMENTO = ? 
        AND ATRIBUTO = ?
        AND ID_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [tipoDocumento, nodo, idDocumento]);

      if (result && result.length > 0) {
        valueTime = result[0].VALUETIME; // <- CAMBIA VALUE POR VALUETIME
      }
    } catch (e) {
      return { error: e.message, accion: "getValueTimeMetadata", query: sql };
    }
    return valueTime;
  };

  async function getDocumentos(tipoDocumento, nodo) {
    let sql;
    let record;

    try {
      sql = `SELECT COUNT(*) AS VALUE FROM DB_METADATA_VALUE
           WHERE ID_TIPO_DOCUMENTO = ? 
           AND ATRIBUTO = ?`;
      const result = await cds.run(sql, [tipoDocumento, nodo]);

      if (result.length > 0) {
        record = result[0].VALUE;
      }
    } catch (e) {
      return { error: e.message, accion: "getDocumentos", query: sql }
    }
    return record;

  };

  async function getMetadataValue(tipoDocumento, nombre) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT DISTINCT ATRIBUTO, OBLIGATORIEDAD, TIPO_ATRIBUTO
           FROM DB_METADATA 
           WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const gmet of result) {
        let record = {};
        record.ATRIBUTO = gmet.ATRIBUTO;
        record.REQUIRED = (gmet.OBLIGATORIEDAD === 'SI') ? true : false;
        record.TYPE = getType(gmet.TIPO_ATRIBUTO);
        record.TIPO_ATRIBUTO = gmet.TIPO_ATRIBUTO;

        const idDocumento = await getIdDocumento3(tipoDocumento, nombre);
        record.ID_DOCUMENTO = idDocumento;

        record.VALUE = await getValueMetadata(gmet.ATRIBUTO, idDocumento, tipoDocumento);
        record.VALUEDATE = await getValueDateMetadata(gmet.ATRIBUTO, idDocumento, tipoDocumento);
        record.VALUETIME = await getValueTimeMetadata(gmet.ATRIBUTO, idDocumento, tipoDocumento);

        record.URL = await getUrlDocumento(idDocumento, tipoDocumento);
        const cantidadDocumentos = await getDocumentos(tipoDocumento, gmet.ATRIBUTO);
        record.NUEVO = (cantidadDocumentos === 0);

        record.TipoDocumento = Number(tipoDocumento);

        outPut.push(record);

      }
    } catch (e) {
      return { error: e.message, accion: "getMetadataValue", query: sql }
    }
    return outPut;
  };

  async function getDocObl(tipoDocumento) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT DISTINCT ID_DOC_OBL, NOMBRE_DOCUMENTO, OBLIGATORIO, DESCRIPCION
           FROM DB_DOC_OBL
           WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const gobl of result) {
        let record = {};
        record.ID_DOC_OBL = gobl.ID_DOC_OBL;
        record.NOMBRE_DOCUMENTO = gobl.NOMBRE_DOCUMENTO;
        record.OBLIGATORIO = gobl.OBLIGATORIO;
        record.DESCRIPCION = gobl.DESCRIPCION;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getDocObl", query: sql }
    }
    return outPut;
  };

  async function getTag(tipoDocumento) { // No existe ID_TIPO_DOCUMENTO EN LA TABLA
    let sql;
    let outPut = [];

    try {
      sql = `SELECT DISTINCT NOMBRE_TAG, ID_TAG
          FROM DB_TAG 
          WHERE ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [tipoDocumento]);
      for (const gtag of result) {
        let record = {};
        record.NOMBRE_TAG = gtag.NOMBRE_TAG;
        record.ID_TAG = gtag.ID_TAG;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTag", query: sql }
    }
    return outPut;
  };

  async function getMetadataUpdate(tipoDocumento) {
    let sql;
    const outPut = [];

    try {
      sql = `
      SELECT DISTINCT
        ATRIBUTO,
        TIPO_ATRIBUTO,
        NOMBRETABLA,
        NOMBRECAMPO,
        FORMATOFECHA,
        ID_METADATA,
        ESTADO,
        ORIGEN
      FROM DB_METADATA
      WHERE ID_TIPO_DOCUMENTO = ?
        AND (
          ORIGEN = 'Manual' OR
          ORIGEN = 'Lista' OR
          ORIGEN = 'Estructura' OR
          ORIGEN = 'Lista Estructura'
        )
    `;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const gup of result) {
        const estadoRaw = gup.ESTADO;
        const isActive = (estadoRaw === ' ' || estadoRaw == null || estadoRaw === '');

        const record = {};
        record.ATRIBUTO = gup.ATRIBUTO;
        record.DESCRIPCION = gup.TIPO_ATRIBUTO;
        record.TABLASAP = gup.NOMBRETABLA;
        record.CAMPOSAP = gup.NOMBRECAMPO;
        record.FECHA = gup.FORMATOFECHA;
        record.ID_METADATA = gup.ID_METADATA;
        record.ORIGEN = gup.ORIGEN;
        record.ESTADO = isActive ? 'Activo' : 'Inactivo';
        record.STATUS = isActive ? 'Success' : 'Error';

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getMetadataUpdate", query: sql }
    }

    return outPut;
  };

  async function getIdMData(tipoDocumento, nombre) {
    let sql;
    let record = {};

    try {
      sql = `SELECT ID_METADATA FROM DB_METADATA 
           WHERE ID_TIPO_DOCUMENTO = ?
           AND ATRIBUTO = ?`
        ;

      const result = await cds.run(sql, [tipoDocumento, nombre]);

      for (const gm of result) {
        record.ID_METADATA = gm.ID_METADATA;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdMData", query: sql }
    }
    return record;
  };

  this.on('getData', async (req) => {
    const { tipoDocumento, nombre } = req.data.input;
    const visualizadores = await getMetadataValue(tipoDocumento, nombre);
    return visualizadores;
  });

  this.on('get', async (req) => {
    const { tipoDocumento } = req.data;
    const visualizadores = await getMetadata1(tipoDocumento);
    return visualizadores;
  });

  this.on('getListDocObl', async (req) => {
    const { tipoDocumento } = req.data;
    const visualizadores = await getListDocObl(tipoDocumento);
    return visualizadores;
  });

  this.on('getList', async (req) => {
    const { tipoDocumento } = req.data;
    const visualizadores = await getListMetadata(tipoDocumento);
    return visualizadores;
  });

  this.on('update', async (req) => {
    const { tipoDocumento } = req.data;
    const visualizadores = await getMetadataUpdate(tipoDocumento);
    return visualizadores;
  });

  this.on('getDataDocObl', async (req) => {
    const { tipoDocumento } = req.data.input;
    const visualizadores = await getDocObl(tipoDocumento);
    return visualizadores;
  });

  this.on('getDataTag', async (req) => {
    const { tipoDocumento } = req.data.input;
    const visualizadores = await getTag(tipoDocumento);
    return visualizadores;
  });

  this.on('getIdMetadata', async (req) => {
    const { tipoDocumento, nombre } = req.data.input;
    const visualizadores = await getIdMData(tipoDocumento, nombre);
    return visualizadores;
  });

  async function getSelect(cond, td) {
    let str = '';

    try {
      const lt = cond.indexOf('~');
      cond = cond.slice(0, lt + 1);

      const sql = `
      SELECT DISTINCT ZFIELDNAME
      FROM DB_QUERY_MSAP_CATEGORIA
      WHERE ID_TIPO_DOCUMENTO = ?
        AND ZCONDICION LIKE ?
    `;
      const result = await cds.run(sql, [td, cond]);

      let aux = '';
      for (const gsel of result) {
        aux += String(gsel.ZFIELDNAME).slice(lt) + ',';
        str = aux;
      }
    } catch (e) {
      return '';
    }
    return str.slice(0, str.length - 1);
  };

  async function getCantSelect(cond, td) {
    let cant = 0;
    try {
      const lt = cond.indexOf('~');
      cond = cond.slice(0, lt + 1);

      const sql = `
     SELECT DISTINCT ZFIELDNAME
     FROM DB_QUERY_MSAP_CATEGORIA 
     WHERE ID_TIPO_DOCUMENTO = ? 
     AND ZCONDICION LIKE ?`;

      const result = await cds.run(sql, [td, `%${cond}%`]);

      for (const _ of result) {
        cant = cant + 1;
      }

    } catch (e) {
      return { error: e.message, accion: "getCantSelect", query: sql, cant: cant }
    }
    return cant;
  };

  async function getListaFormatos(tipoDocumento) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT PTD.ID_CATEGORIA_NODO, PTD.FORMATO, PTD.PESO, FORM.MYMETYPE
           FROM PROP_TIPO_DOC PTD 
           JOIN FORMATOS FORM ON FORM.NOMBRE_FORMATO = PTD.FORMATO 
           WHERE PTD.TIPO_DOCUENTO = ?`;

      const result = await cds.run(sql, [tipoDocumento]);
      const str = "";
      const aux = "";
      for (const gform of result) {
        let record = {};
        record.MYMETYPE = gform.MYMETYPE;
        record.DESCRIPCION = gform.FORMATO;
        record.TAMANO = gform.PESO;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getListaFormatos", query: sql }
    }
    return outPut;
  };

  async function getMDSAP(tipoDocumento) {
    let sql;
    let outPut = [];

    try {
      sql = `
      SELECT DISTINCT 
        CAT.TITULO,
        QUERY.ZJOIN,
        QUERY.ZCONDICION,
        QUERY.ID_CATEGORIA,
        QUERY.TABNAME
      FROM DB_QUERY_MSAP_CATEGORIA QUERY
      JOIN DB_CATEGORIA CAT 
        ON CAT.ID_CATEGORIA = QUERY.ID_CATEGORIA
      WHERE QUERY.ID_TIPO_DOCUMENTO = ?
    `;

      const result = await cds.run(sql, [tipoDocumento]);

      for (const gmdsap of result) {
        let record = {};
        record.NOMBRENODO = gmdsap.TITULO;
        record.SELECT = await getSelect(gmdsap.ZCONDICION, tipoDocumento);
        record.JOIN = gmdsap.ZJOIN;
        record.CONDICION = String(gmdsap.ZCONDICION).split("~")[1];
        record.CANTIDAD = await getCantSelect(gmdsap.ZCONDICION, tipoDocumento);
        record.ENCABEZADO = String(gmdsap.TABNAME).split("~")[0] + "~";
        record.ID_CATEGORIA = gmdsap.ID_CATEGORIA;
        record.TABNAME = gmdsap.TABNAME;
        record.ADD = false;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getMDSAP", query: sql }
    }

    return outPut;
  };

  this.on('getDataMDSAP', async (req) => {
    const { tipoDocumento } = req.data.input;
    const visualizadores = await getMDSAP(tipoDocumento);
    return visualizadores;
  });

  this.on('getDataListaFormatos', async (req) => {
    const { tipoDocumento } = req.data.input;
    let sql;
    let outPut = [];
    try {
      sql = `
      SELECT DISTINCT
        CAT.TITULO,
        QUERY.ZJOIN,
        QUERY.ZCONDICION,
        QUERY.ID_CATEGORIA,
        QUERY.TABNAME
      FROM DB_QUERY_MSAP_CATEGORIA QUERY
      JOIN DB_CATEGORIA CAT
        ON CAT.ID_CATEGORIA = QUERY.ID_CATEGORIA
      WHERE QUERY.ID_TIPO_DOCUMENTO = ?
    `;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const gdalis of result) {
        const record = {};
        record.value = gdalis.TITULO;
        record.SELECT = await getSelect(gdalis.ZCONDICION, tipoDocumento);
        record.JOIN = gdalis.ZJOIN;
        record.CONDICION = String(gdalis.ZCONDICION).split("~")[1];
        record.CANTIDAD = await getCantSelect(gdalis.ZCONDICION, tipoDocumento);
        record.ENCABEZADO = String(gdalis.TABNAME).split("~")[0] + "~";
        record.ID_CATEGORIA = gdalis.ID_CATEGORIA;
        record.TABNAME = gdalis.TABNAME;
        record.ADD = false;
        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getDataListaFormatos", query: sql }
    }

    return outPut;

  })

  this.on('getListGerencias', async (req) => {
    const { tipoDocumento } = req.data.input;
    let sql;
    let outPut = [];

    try {
      sql = `SELECT ger.nombre_gerencia FROM COMPLIANCE_NORMAS.SOCIEDAD SOC 
           INNER JOIN COMPLIANCE_NORMAS.GERENCIA GER ON GER.ID_SOCIEDAD = SOC.ID_SOCIEDAD 
           WHERE SOC.NOMBRE_SOCIEDAD = ?`;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const glige of result) {
        let record = {};
        record.VALUE = glige.nombre_gerencia;
        record.APODO = "GERENCIA/SUBGERENCIA/AREA";

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getListGerencias", query: sql }
    }
    return outPut;

  });

});