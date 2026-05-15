//////////////////////////////
///////UPDATETIPODOCUMENTO////
//////////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function updateEstadoQuery(json) {

    const tipoDocumento = json[0].TIPO_DOCUMENTO;
    const att = json[0].ATT;

    try {
      const sql = `UPDATE DB_QUERY_MSAP_CATEGORIA SET ESTADO = 'Inactivo'
                    WHERE ID_QUERY IN 
                    (SELECT ID_QUERY FROM DB_QUERY_MSAP_CATEGORIA
                    WHERE ID_TIPO_DOCUMENTO = ? 
                    AND ZCONDICION LIKE ?)`;
      await cds.run(sql, [tipoDocumento, `%${att}%`]); //1411 , 

      return "OK"
    } catch (e) {
      return "FALLO";
    };
  };

  async function getAtributo(json) {

    const idMD = json[0].ID_MD;
    const tipoDocumento = json[0].tipoDocumento;

    let sql;
    let record = 0;

    try {
      sql = `SELECT ATRIBUTO FROM DB_METADATA
               WHERE ID_METADATA = ? 
               AND ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idMD, tipoDocumento]);

      for (const ga of result) {
        record = ga.ATRIBUTO;
      }
    } catch (e) {
      return { error: e.message, accion: "getAtributo", query: sql }
    }
    return record;
  };

  async function updateMetadata2(json) {

    const idMD = json[0].ID_MD;
    const tipoDocumento = json[0].tipoDocumento;

    try {
      const sql = `UPDATE DB_METADATA
                     SET ESTADO = 'Inactivo' 
                     WHERE ID_METADATA = ? 
                     AND ID_TIPO_DOCUMENTO = ?`;
      await cds.run(sql, [idMD, tipoDocumento]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }

  };

  async function updateTipoDocumento(json) {

    const nombre = json.NOMBRE;
    const desc = json.DESC;
    const tipoDocumento = json.TIPO_DOCUMENTO;

    try {
      const sql = `UPDATE DB_TIPO_DOCUMENTO 
                     SET NOMBRE = ?,
                     DESCRIPCION = ? 
                     WHERE ID_TIPO_DOCUMENTO = ?`;
      await cds.run(sql, [nombre, desc, tipoDocumento]);

      return "OK"
    } catch (e) {
      "FALLO"
    }
  };

  this.on('updateFormato', async (req) => {
    const { tipoDocumento } = req.data.input;
    try {
      const sql = `DELETE FROM DB_PROP_TIPO_DOC
                     WHERE TIPO_DOCUMENTO = ?`;
      await cds.run(sql, [tipoDocumento]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }
  });

  this.on('updateMetadata', async (req) => {
    const { tipoDocumento } = req.data.input;
    try {
      const sql = `DELETE FROM DB_METADATA
                     WHERE ID_TIPO_DOCUMENTO = ?`;
      await cds.run(sql, [tipoDocumento]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }
  });

  this.on('updateNiveles', async (req) => {
    const { idEST } = req.data.input;
    try {
      const sql = `DELETE FROM DB_NIVELES
                     WHERE ID_EST_LIB = ?`;
      await cds.run(sql, [idEST]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }
  });

  this.on('updateADigital', async (req) => {
    const { tipoDocumento } = req.data.input;
    try {
      const sql = `DELETE FROM DB_TIPO_DOCUMENTO_DIGITAL
                    WHERE ID_TIPO_DOCUMENTO = ?`;
      await cds.run(sql, [tipoDocumento]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }
  });

  this.on('updateAFisico', async (req) => {
    const { tipoDocumento } = req.data.input;
    try {
      const sql = `DELETE FROM DB_TIPO_DOCUMENTO_FISICO
                    WHERE ID_TIPO_DOCUMENTO = ?`;
      await cds.run(sql, [tipoDocumento]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }
  });

  this.on('update', async (req) => {
    const { json } = req.data.input;
    const rsp = await updateTipoDocumento(json);
    return rsp;
  });

  this.on('updateMetadataData', async (req) => {
    const { json } = req.data.input;

    const rsp = await updateMetadata2(json);
    const att = await getAtributo(json);
    const resp = await updateEstadoQuery(json);

    return resp;
  });

  async function deleteElib(tipoDocumento) {
    try {
      const sql = `DELETE FROM DB_ESTRATEGIA_LIBERACION 
                     WHERE ID_TIPO_DOCUMENTO = ?`;
      await cds.run(sql, [tipoDocumento]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }
  };

  async function getLib(tipoDocumento) {

    let sql;
    let record = 0;

    try {
      sql = `SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION
               WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [tipoDocumento]);

      for (const rs of result) {
        record = rs.ID_EST_LIB;
      }
    } catch (e) {
      return { error: e.message, accion: "getLib", query: sql }
    }
    return record;
  };

  this.on('updateElib', async (req) => {
    const { tipoDocumento } = req.data.input;
    const rsp = await getLib(tipoDocumento);

    if (rsp !== 0) {
      await deleteElib(tipoDocumento);
    }
    return rsp;
  });

  async function getTipoDocumentos(tipoDocumento, nombre) {
    let sql;
    let record;

    try {
      sql = `SELECT COUNT(*) AS C FROM METADATA_VALUE 
               WHERE ID_TIPO_DOCUMENTO = ? 
               AND ATRIBUTO = ?`;
      const result = await cds.run(sql, [tipoDocumento, nombre]);

      for (const gt of result) {
        record = gt.C;
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoDocumentos", query: sql }
    }
    return record;
  };

  async function getIdMetadata(tipoDocumento, atributo) {
    let sql;
    let record;

    try {
      sql = `SELECT ID_METADATA FROM METADATA
               WHERE ID_TIPO_DOCUMENTO = ? 
               AND ATRIBUTO = ?`;
      const result = await cds.run(sql, [tipoDocumento, atributo]);

      for (const gd of result) {
        record = gd.ID_METADATA;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdMetadata", query: sql }
    }
    return record;
  };

  this.on('updateMetadataDocumento', async (req) => {
    try {
      const { type, nombre, tipoDocumento, atributo, idDocumento } = req.data;

      const idMetadata = await getIdMetadata(tipoDocumento, atributo);

      let setClause = '';
      switch (type) {
        case 'date':
          setClause = `"VALUEDATE" = ?`;
          break;
        case 'time':
          setClause = `"VALUETIME" = ?`;
          break;
        case 'Number':
          setClause = `"VALUE" = ?`;
          break;
        default:
          setClause = `"VALUE" = ?`;
          break;
      }
      const sql = `
      UPDATE "METADATA_VALUE"
      SET ${setClause}, ID_METADATA = ?
      WHERE "ID_TIPO_DOCUMENTO" = ?
        AND ATRIBUTO = ?
        AND ID_DOCUMENTO = ?
    `;

      await cds.run(sql, [nombre, idMetadata, tipoDocumento, atributo, idDocumento]);

      return 'OK';

    } catch (e) {
      return 'FALLO';
    }
  });

  async function deleteMetadataDocumento(json) {
    const tipoDocumento = json.TIPO_DOCUMENTO
    const idDocumento = json.ID_DOCUMENTO
    const atributo = json.ATRIBUTO

    try {
      const sql = `DELETE FROM DB_METADATA_VALUE
                     WHERE ID_TIPO_DOCUMENTO = ? 
                     AND ID_DOCUMENTO = ? 
                     AND ATRIBUTO = ?`;
      await cds.run(sql, [tipoDocumento, idDocumento, atributo]);

      return "OK"
    } catch (e) {
      return "FALLO"
    }
  };

  this.on('updateDocumento', async (req) => {
    const { json } = req.data.input;
    console.log(json)
    const rsp = await deleteMetadataDocumento(json);
    return rsp;
  })

  async function getIdDocumento8(titulo) {
    let sql;
    let record;

    try {
      sql = `SELECT ID_DOCUMENTO FROM DB_DOCUMENTO
               WHERE NOMBRE = ?`;
      const result = await cds.run(sql, [titulo]);

      for (const gdoc of result) {
        record = gdoc.ID_DOCUMENTO;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdDocumento8", query: sql }
    }
    return record;
  };

  async function deleteDocumento(sValue) {
    try {
      const sql = `DELETE FROM DB_DOCUMENTO 
                     WHERE ID_DOCUMENTO = ?`;
      await cds.run(sql, [sValue]);

      return 0;
    } catch (e) {
      return 1;
    }

  };

  async function deleteDetalle(sValueIdDocumento, idCategoria) {

    try {
      const sql = `DELETE FROM DB_DETALLE 
                     WHERE ID_CATEGORIA_HOJA = ?`
      //  AND NODO_HIJO = ?`;
      await cds.run(sql, [sValueIdDocumento, /*idCategoria*/]);

      return 0;
    } catch (e) {
      return 1;
    }
  };

  async function deleteMetadataValue(sValueIdDocumento) {

    try {
      const sql = `DELETE FROM DB_METADATA_VALUE 
                     WHERE ID_DOCUMENTO = ?`;
      await cds.run(sql, [sValueIdDocumento]);

      return 0;
    } catch (e) {
      return 1;
    }
  };

  async function deleteCategoria(nodo) {

    try {
      const sql = `DELETE FROM CATEGORIA 
                     WHERE ID_PADRE = ?`;
      await cds.run(sql, [nodo]);

      return 0;
    } catch (e) {
      return 1;
    }
  };

  this.on('deleteDocumento', async (req) => {
    const { titulo } = req.data.input;

    const sValueIdDoc = await getIdDocumento8(titulo);
    const rspDocumento = await deleteDocumento(sValueIdDoc);
    const rspDetalle = await deleteDetalle(sValueIdDoc);
    const rspMetadataValue = await deleteMetadataValue(sValueIdDoc);

    let total;

    const rsp = rspDocumento + rspDetalle + rspMetadataValue;

    if (rsp > 0) {
      total = "FALLO";
    } else {
      total = "OK";
    }

    return total;
  });

});