////////////////////////////
///////GETTIPODOCUMENTO/////
////////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  let nodoPadreRespuesta = -1;

  async function getTag1(nodo) { //TABLA ID_TIPO_DOCUMENTO NO EXISTE EN TAG
    let sql;
    let outPut = [];

    try {
      sql = `SELECT DISTINCT NOMBRE_TAG FROM DB_TAG 
               WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [nodo]);

      for (const gtag of result) {
        let record = {};
        record.NOMBRE_TAG = gtag.NOMBRE_TAG;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTag1", query: sql }
    }
    return outPut;
  };

  async function getRol2(idUser, rol, idTD) {
    let sql;
    let sValue = false;

    try {
      sql = `
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

      const result = await cds.run(sql, [idUser, idTD, rol]);

      if (result.length > 0) {
        sValue = true;
      }
    } catch (e) {
      return false;
    }

    return sValue;
  }

  async function getTipoDocumentoSetTD(idCategoria, idUser) {
    let sql;
    let outPut = [];


    try {
      sql = `SELECT DISTINCT ID_TIPO_DOCUMENTO, NOMBRE, ORIGEN FROM DB_TIPO_DOCUMENTO
              WHERE ID_NODO = ? ORDER BY NOMBRE ASC`;
      const result = await cds.run(sql, [idCategoria]);

      for (const gtd of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = gtd.ID_TIPO_DOCUMENTO;
        record.NOMBRE = gtd.NOMBRE;
        record.METADATA = await getMetadata3(gtd.ID_TIPO_DOCUMENTO);
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes5(idCategoria);
        record.ORIGEN = (gtd.ORIGEN === 'Ingenieria GLP' || gtd.ORIGEN === 'Integridad Redes') ? true : false;

        let rol = await getRol2(idUser, 'Crear', gtd.ID_TIPO_DOCUMENTO,);
        record.ROL = rol;
        if (rol) {
          outPut.push(record);
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoDocumentoSetTD", query: sql }
    }
    outPut = await getTipoDocumentoVinculacion(idCategoria, idUser, outPut);
    return outPut;
  };

  async function getVisiblePreguntasFrecuentes5(idCategoria) {
    let sql;
    let sValue = false;

    try {
      sql = `
      SELECT COUNT(*) AS TOTAL
      FROM DB_PREGUNTA
      WHERE ID_CATEGORIA = ?
    `;

      const result = await cds.run(sql, [idCategoria]);

      if (Number(result[0].TOTAL) > 0) {
        sValue = true;
      }
    } catch (e) {
      return { error: e.message, accion: "getVisiblePreguntasFrecuentes5", query: sql };
    }

    return sValue;
  }

  async function getEstLib(nodo) {
    let sql;
    let des = -1; //no se encontro

    try {
      sql = `SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION 
              WHERE ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [nodo]);

      for (const gest of result) {

        des = gest.ID_EST_LIB;
      }
    } catch (e) {
      return sql;
    }
    return des;
  };

  async function getWF(nodo) {
    let sql;
    let record = false;
    let estLib = await getEstLib(nodo)

    try {
      sql = `SELECT COUNT(*) FROM DB_NIVELES
              WHERE ID_EST_LIB = ?`;
      const result = await cds.run(sql, [estLib]);

      if (result.length > 0) {
        record = true;
      }
    } catch (e) {
      return sql;
    }
    return record;
  };

  async function getTipoDocumentoVinculacion(idCategoria, idUser, outPut) {
    let sql;

    try {
      sql = `
      SELECT DISTINCT ID_TIPO_DOCUMENTO, NOMBRE, ORIGEN
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_TIPO_DOCUMENTO IN (
        SELECT DISTINCT ID_TIPO_DOCUMENTO
        FROM DB_VINCULACION
        WHERE ID_NODO_VINCULA = ?
      )
      ORDER BY NOMBRE ASC
    `;

      const result = await cds.run(sql, [idCategoria]);

      for (const gvin of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = gvin.ID_TIPO_DOCUMENTO;
        record.NOMBRE = gvin.NOMBRE;
        record.METADATA = await getMetadata3(gvin.ID_TIPO_DOCUMENTO);
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes5(idCategoria);
        record.ORIGEN = (gvin.ORIGEN === 'Ingenieria GLP' || gvin.ORIGEN === 'Integridad Redes') ? true : false;
        record.WF = await getWF(gvin.ID_TIPO_DOCUMENTO);

        const rol = await getRol2(idUser, 'Crear', gvin.ID_TIPO_DOCUMENTO);
        record.ROL = rol;

        if (rol) {
          outPut.push(record);
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoDocumentoVinculacion", query: sql };
    }

    return outPut;
  }
  async function getMetadata3(nodo) {
    let sql;
    let outPut = [];
    console.log(nodo)

    try {
      sql = `SELECT DISTINCT ATRIBUTO, TIPO_ATRIBUTO FROM DB_METADATA 
              WHERE ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [nodo]);

      for (const gmet of result) {
        let record = {};
        record.ATRIBUTO = gmet.ATRIBUTO;
        record.TIPO_ATRIBUTO = gmet.TIPO_ATRIBUTO;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getMetadata3", query: sql }
    }
    return outPut;
  };

  async function getListTipoDocumento(idCategoria) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT * FROM DB_TIPO_DOCUMENTO
              WHERE ID_NODO = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const rs of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
        record.NOMBRE = rs.NOMBRE;
        record.METADATA = await getMetadata3(rs.ID_TIPO_DOCUMENTO);
        record.VISIBLEPDF = await getVisiblePreguntasFrecuentes5(idCategoria);
        record.ORIGEN = (rs.ORIGEN === 'Ingenieria GLP' || rs.ORIGEN === 'Integridad Redes') ? true : false;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getListTipoDocumento", query: sql }
    }
    return outPut;
  };

  async function getTDPrimera(nodoPadre) {
    let sql;

    try {
      sql = `
      SELECT COUNT(ID_TIPO_DOCUMENTO) AS CONTEO
      FROM DB_TIPO_DOCUMENTO
      WHERE ID_NODO = ?
    `;

      const result = await cds.run(sql, [nodoPadre]);

      for (const rs of result) {
        return Number(rs.CONTEO) > 0 ? 1 : 0;
      }
    } catch (e) {
      return 0;
    }

    return 0;
  }

  async function getListTipoDocumentoBase(nodoPadre) {
    let sql;
    let nodoPadreRespuesta = -1;

    const response = await getTDPrimera(nodoPadre);

    if (response === 1) {
      nodoPadreRespuesta = nodoPadre;
    }

    try {
      sql = `
      SELECT ID_CATEGORIA
      FROM DB_CATEGORIA
      WHERE ID_PADRE = ?
        AND APP_DATOS = 'Estructura'
    `;

      const result = await cds.run(sql, [nodoPadre]);

      for (const gbase of result) {
        const nodoHijo = gbase.ID_CATEGORIA;
        const respuestaHijo = await getListTipoDocumentoBase(nodoHijo);

        if (respuestaHijo !== -1) {
          nodoPadreRespuesta = respuestaHijo;
        } else {
          nodoPadreRespuesta = nodoHijo;
        }
      }

    } catch (e) {
      return { error: e.message, accion: "getListTipoDocumentoBase", query: sql };
    }

    return nodoPadreRespuesta;
  }

  async function getTipoDocumento2(idCategoria, idUser) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT * FROM DB_TIPO_DOCUMENTO 
              WHERE ID_NODO = ? ORDER BY NOMBRE ASC`;
      const result = await cds.run(sql, [idCategoria]);

      for (const gtdoc of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = gtdoc.ID_TIPO_DOCUMENTO;
        record.NOMBRE = gtdoc.NOMBRE;
        record.METADATA = await getMetadata3(gtdoc.ID_TIPO_DOCUMENTO);
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes5(idCategoria);
        record.ORIGEN = (gtdoc.ORIGEN === 'Ingenieria GLP' || gtdoc.ORIGEN === 'Integridad Redes') ? true : false;

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoDocumento2", query: sql }
    }
    outPut = await getTipoDocumentoVinculacion(idCategoria, idUser, outPut)
    return outPut;
  };

  async function getVinculacion(idCategoria) {
    let sql;
    let id = null;
    let outPutTD = [];

    try {
        sql = `SELECT DISTINCT ID_TIPO_DOCUMENTO FROM DB_VINCULACION
               WHERE ID_NODO_VINCULA = ?`;
        const result = await cds.run(sql, [idCategoria]);

        for (const gvin of result) {
            let record = {};
            record.TD = gvin.ID_TIPO_DOCUMENTO;

            outPutTD.push(record);
        }
        return outPutTD;
    } catch (e) {
        return e.message;
    }
};

async function getTipoDocumentoVinculado(idUser, idCategoria, arr) {
  let sql;

  try {
    const vinculaciones = await getVinculacion(idCategoria);

    for (const item of vinculaciones) {
      sql = `
        SELECT DISTINCT TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        FROM DB_TIPO_DOCUMENTO AS TD
        JOIN DB_DETALLE AS DET
          ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
        WHERE TD.ID_TIPO_DOCUMENTO = ?
      `;

      const result = await cds.run(sql, [item.TD]);

      for (const gvin of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = gvin.ID_TIPO_DOCUMENTO;
        record.NOMBRE = gvin.NOMBRE;
        record.METADATA = await getMetadata3(gvin.ID_TIPO_DOCUMENTO);
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes5(idCategoria);
        record.TAG = await getTag1(gvin.ID_TIPO_DOCUMENTO);

        const rol = await getRol2(idUser, 'Visualizar', gvin.ID_TIPO_DOCUMENTO);

        if (rol) {
          arr.push(record);
        }
      }
    }
  } catch (e) {
    return { error: e.message, accion: "getTipoDocumentoVinculado", query: sql };
  }

  return arr;
}

  async function getTipoDocumentoPortal(idCategoria, idUser) {
    let sql;
    let outPut = [];
    const id_Categoria = await getIdCategoria2(idCategoria);
    try {

      sql = `
      SELECT TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
      FROM DB_TIPO_DOCUMENTO AS TD
      JOIN DB_DETALLE        AS DET
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      WHERE DET.NODO_HIJO = ?`;
      const result = await cds.run(sql, [id_Categoria]);

      for (const gpor of result) {
        let record = {};
        record.ID_TIPO_DOCUMENTO = gpor.ID_TIPO_DOCUMENTO;
        console.log("TIPODOCUMENTO EN DOCUMENTOPORTAL:", record.ID_TIPO_DOCUMENTO)
        record.NOMBRE = gpor.NOMBRE;
        record.METADATA = await getMetadata3(gpor.ID_TIPO_DOCUMENTO);
        console.log("ESTO DA EL METADATA3 LOL ELEMAO:", record.METADATA)
        record.VISIBLEPF = await getVisiblePreguntasFrecuentes5(idCategoria);
        console.log("VISIBLEPF:", record.VISIBLEPF)
        record.TAG = await getTag1(gpor.ID_TIPO_DOCUMENTO);
        console.log("ESTO DA EL TAG:", record.TAG)

        const rol = await getRol2(idUser, 'Visualizar', gpor.ID_TIPO_DOCUMENTO);
        console.log("ESTO RETORNA DEL ROL ELEMAOOO TYAPOOPAGO", rol)
        if (rol) {
          outPut.push(record);
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoDocumentoPortal", query: sql }
    }

    outPut = await getTipoDocumentoVinculado(idUser, idCategoria, outPut);
    return outPut;
  };

  async function getIdCategoria2(idCategoria) {
    let sql;
    let record = -1; //no se encontro

    try {
      sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA
              WHERE ID_PADRE = ?`;
      const result = await cds.run(sql, [idCategoria]);

      for (const gcat of result) {
        record = gcat.ID_CATEGORIA;
      }
    } catch (e) {
      return { error: e.message, accion: "getIdCategoria2", query: sql }
    }
    return record;
  };

  this.on('getTag', async (req) => {
    const { idTD } = req.data;
    const idNodo = idTD;
    const visualizadores = await getTag1(idNodo);

    return visualizadores;
  });

  this.on('get', async (req) => {
    const { idCat, idUser } = req.data;
    const visualizadores = await getTipoDocumento2(idCat, idUser);

    return visualizadores;
  });

  this.on('getTDSet', async (req) => {
    const { idCat, idUser } = req.data;
    const visualizadores = await getTipoDocumentoSetTD(idCat, idUser);

    return visualizadores;
  });

  this.on('getTipoDocumento', async (req) => {
    const { idCat, idUser } = req.data;
    const visualizadores = await getTipoDocumento2(idCat, idUser);

    return visualizadores;
  });

  this.on('getList', async (req) => {
    const { idCat } = req.data;
    const visualizadores = await getListTipoDocumento(idCat);

    return visualizadores;
  });

  this.on("getListBase", async (req) => {
    const { idCat } = req.data;

    const nodoPadre = idCat;
    const respuesta = await getListTipoDocumentoBase(nodoPadre);

    return Number(respuesta);
  });

  this.on('getTipoDocumentoPortal', async (req) => {
    const { idCat, idUser } = req.data;
    const visualizadores = await getTipoDocumentoPortal(idCat, idUser);
    console.log("RESPUESTA getTipoDocumentoPortal:", visualizadores);
    return visualizadores;
  });

  this.on('getIdNodo', async (req) => {
    const { idCat } = req.data;
    let sql;
    let record;

    try {
      sql = `
      SELECT ID_TIPO_VISUALIZADOR, ID_CATEGORIA
      FROM DB_CATEGORIA
      WHERE ID_CATEGORIA = ?
    `;
      const result = await cds.run(sql, [idCat]);

      for (const gtip of result) {
        if (gtip.ID_TIPO_VISUALIZADOR === 1) {
          record = await getIdCategoria2(idCat);
        } else {
          record = idCat;
        }
      }
    } catch (e) {
      return { error: e.message, accion: "getIdNodo", query: sql }
    }
    return record;
  });

});