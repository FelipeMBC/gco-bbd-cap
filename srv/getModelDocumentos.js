
  /////////////////////////////
  ///////GETMODELDOCUMENTOS////
  /////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getEstado1(nivel, nodo, idDoc) {
    let sql;
    let des = "Pendiente";

    try {
      sql = `SELECT ESTADO FROM DB_INSTANCIA_APROBACION
               WHERE NIVEL = ? 
               AND ID_DOCUMENTO = ?`;
      const result = await cds.run(sql, [nivel, idDoc]);

      for (const ges of result) {
        des = String(ges.ESTADO);
      }
    } catch (e) {
      return { error: e.message, accion: "getEstado1", query: sql }
    }
    return des;
  };

  function getSTATUS(sValue) {
    let text;
    switch (sValue) {
      case `Pendiente`:
        text = "Warning";
        break;

      case `Aprobado`:
        text = "Success";
        break;

      case `Rechazado`:
        text = "Error";
        break;
    }
    return text;
  };

  async function getEstLib3(idTipoDocumento) {
    let sql;
    let des;

    try {
      sql = `SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION 
        WHERE ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [idTipoDocumento]);

      for (const glib of result) {
        des = glib.ID_EST_LIB;
      }

    } catch (e) {
      return { error: e.message, accion: "getEstLib3", query: sql }
    }
    return des;
  };

  async function getMotivo(nodo) {

    let sql;
    let des = "";

    try {
      sql = `SELECT MOTIVO FROM DB_INSTANCIA_APROBACION 
        WHERE ID_DOCUMENTO = ? 
        AND ESTADO = 'Rechazado' 
        AND NIVEL = ?`;

      const result = await cds.run(sql, [idDoc, nodo]);

      for (const gmov of result) {
        des = gmov.MOTIVO;
      }

    } catch (e) {
      return { error: e.message, accion: "getMotivo", query: sql }
    }
    return des;
  };

  async function getWorkflow1(nodo) {
    let sql;
    let output = [];

    try {

      sql = `SELECT DISTINCT 
      NIV.NIVEL               AS NIVEL, 
      NIV.NOMBREAPROBADOR     AS NOMBRE_APROBADOR, 
      us.ID_USUARIO           AS ID_USUARIO_NIV, 
      NIV.ESTADO              AS ESTADO, 
      INSAPRO.LIBERADOR       AS LIBERADOR, 
      usu.ID_USUARIO          AS ID_USUARIO_USU, 
      INSAPRO.LIBERADOR_NOMBRE AS LIBERADOR_NOMBRE, 
      INSAPRO.FECHA           AS FECHA, 
      INSAPRO.HORA            AS HORA, 
      SU.ID_USUARIO_SUPLENTE  AS ID_USUARIO_SUPLENTE, 
      SU.USUARIO_REEMPLAZO    AS USUARIO_REEMPLAZO, 
      SU.FECHA_INICIO         AS FECHA_INICIO, 
      SU.FECHA_TERMINO        AS FECHA_TERMINO, 
      us.USERNAME             AS USERNAME_NIV, 
      USUARIOS.USERNAME       AS USERNAME_SUPLENTE, 
      INSAPRO.ID_USUARIO_REEMPLAZANTE AS ID_USUARIO_REEMPLAZANTE 
      FROM DB_NIVELES NIV
      JOIN DB_ESTRATEGIA_LIBERACION ESTLIB 
      ON ESTLIB.ID_EST_LIB = NIV.ID_EST_LIB
      JOIN DB_TIPO_DOCUMENTO TD 
      ON TD.ID_TIPO_DOCUMENTO = ESTLIB.ID_TIPO_DOCUMENTO
      JOIN DB_DOCUMENTO DOC 
      ON DOC.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
      JOIN DB_USUARIO us                           
      ON us.NOMBRE = NIV.NOMBREAPROBADOR       
      LEFT JOIN DB_INSTANCIA_APROBACION INSAPRO 
      ON INSAPRO.ID_DOCUMENTO = DOC.ID_DOCUMENTO 
      AND INSAPRO.NIVEL = NIV.NIVEL
      LEFT JOIN DB_SUPLENTE SU 
      ON SU.ID_USUARIO_TITULAR = us.ID_USUARIO
      AND SU.ESTADO = 1 
      AND SU.ID_EST_LIB = ESTLIB.ID_EST_LIB
      LEFT JOIN DB_USUARIO usu 
      ON usu.USERNAME = INSAPRO.LIBERADOR
      LEFT JOIN DB_USUARIO USUARIOS 
      ON USUARIOS.ID_USUARIO = SU.ID_USUARIO_SUPLENTE
      WHERE DOC.ID_DOCUMENTO = ?
      ORDER BY NIV.NIVEL ASC`;

      const result = await cds.run(sql, [nodo]);

      for (const gw of result) {
        let record = {};

        if (gw.LIBERADOR_NOMBRE !== null) {
          record.NOMBRE_USUARIO_APROBADOR = (gw.ID_USUARIO_NIV === gw.ID_USUARIO_USU) ? gw.NOMBRE_APROBADOR : gw.LIBERADOR_NOMBRE;
          record.ID_USUARIO = (gw.ID_USUARIO_NIV === gw.ID_USUARIO_USU) ? gw.ID_USUARIO_NIV : gw.ID_USUARIO_USU;
          record.FECHA = `${orderFecha2(gw.FECHA)}, " - ", ${gw.HORA}`;
        } else {
          record.NOMBRE_USUARIO_APROBADOR = gw.NOMBRE_APROBADOR;
          record.ID_USUARIO = gw.ID_USUARIO_NIV;
          record.FECHA = "-";
        }
        record.NIVEL = gw.NIVEL;
        record.ESTADO = await getEstado1(gw.NIVEL, nodo);
        record.STATUS = getSTATUS(record.ESTADO);
        record.VISIBLEMOTIVO = (record.ESTADO === "Rechazado") ? true : false;
        record.MOTIVO = await getMotivo(record.NIVEL);

        record.SUSTITUTO = (gw.ID_USUARIO_SUPLENTE === gw.ID_USERNAME_SUPLENTE) ? (gw.ID_USUARIO_SUPLENTE !== null) ? true : false : false;

        record.ID_USUARIO_REEMPLAZANTE = (record.SUSTITUTO === false) ? false : gw.ID_USUARIO_SUPLENTE;
        record.NOMBRE_USUARIO_REEMPLAZANTE = (record.SUSTITUTO === false) ? false : gw.USUARIO_REEMPLAZO;
        record.USERNAME_TITULAR = gw.USERNAME_NIV;
        record.USERNAME_SUPLENTE = (record.SUSTITUTO === false) ? false : gw.USERNAME_SUPLENTE;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getWorkFlow1", query: sql }
    }
    return output;

  };

  async function getUserName(idUsuario) {
    let usuario;
    try {
      const sql = `SELECT USERNAME FROM DB_USUARIO
                     WHERE ID_USUARIO = ?`;

      const result = await cds.run(sql, [idUsuario]);

      for (const gusu of result) {
        usuario = gusu.USERNAME
        return usuario;
      }
    } catch (e) {
      return false //no encontrado
    }
    return false;
  };

  async function getCantUrl(idDocumento, td) {
    let sql;

    try {
      sql = `
      SELECT COUNT(DISTINCT DET.ID_DETALLE) AS TOTAL
      FROM DB_DETALLE DET
      WHERE DET.ID_TIPO_DOCUMENTO = ?
      AND DET.ID_CATEGORIA_HOJA = ?
    `;

      const result = await cds.run(sql, [td, idDocumento]);
      console.log("Resultado de la query en CantUrl: ", result)

      if (result.length > 0) {
        return result[0].TOTAL;
      }
      return 0;

    } catch (e) {
      return 0;
    }
  };

  async function getPermisoDescarga(td, idUsuario, acc) {
    try {
      const sql = `SELECT DISTINCT COUNT (*) FROM DB_ROLES ROL 
                     INNER JOIN DB_ROLESXUSUARIOS ROLXUSU ON ROLXUSU.ID_ROLES = ROL.ID_ROLES 
                     INNER JOIN DB_ROLESXACCIONES ROLXACC ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROL.ID_TIPO_DOCUMENTO = ? 
                     AND ROLXUSU.ID_USUARIO = ? 
                     AND ROLXACC.ID_ACCION = ?`;

      const result = await cds.run(sql, [td, idUsuario, acc]);
      console.log("RESULTADO DE LA QUERY EN PERMISODESCARGA: ", result)

      if (result.length > 0) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  };



  function getFecha(sValue) {
    let dia, mes, year, sValueOf;

    dia = sValue.slice(sValue.length - 2, sValue.length);
    mes = sValue.slice(sValue.length - 5, sValue.length - 3);
    year = sValue.slice(0, sValue.length - 6);
    sValueOf = `${dia} - ${mes} - ${year}`;

    return sValueOf;
  };

  async function getURLDOC(doc, tipoDocumento) {
    let sql;
    let output = [];
    console.log(doc, tipoDocumento)

    try {
      sql = `SELECT URL, TITULO, ID_DETALLE FROM DB_DETALLE 
               WHERE ID_CATEGORIA_HOJA = ? 
               AND ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [doc, tipoDocumento]);
      console.log("resultado de la URL: ", result)
      for (const gurl of result) {
        let record = {};
        record.URL_DOCUMENTO = gurl.URL;
        record.NOMBRE_DOCUMENTO = gurl.TITULO;
        record.ID_DETALLE = gurl.ID_DETALLE;
        record.ID_TIPO_DOCUMENTO = tipoDocumento;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getURLDOC", query: sql }
    }
    return output;
  };

  async function getCargaDocObl(id_doc_bse) {
    console.log("RETORNO DEL GETCARGADOCOBL:", id_doc_bse)
    try {
      const sql = `SELECT COUNT (*) AS TOTAL FROM DB_DOCOBLXDET
                     WHERE ID_DOC_OBL = ? `
      //  AND ID_DETALLE = ?;

      const result = await cds.run(sql, [id_doc_bse]);
      console.log(result)

      if (result.length > 0 && result[0].TOTAL > 0) {
        return "sap-icon://accept";
      } else {
        return "sap-icon://decline";
      }

    } catch (e) {
      return "sap-icon://decline";
    }
  };

  async function setEnabedDocObl(tipoDocumento) {
    try {
      const sql = `SELECT COUNT (*) AS ID FROM DB_DOC_OBL
                    WHERE ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [tipoDocumento]);

      return (result?.[0]?.ID ?? 0) > 0;
    } catch (e) {
      return false;
    }
  };

  async function getModelTipDoc(tipoDocumento, idDoc) {
    let sql;
    let output = [];

    try {
      sql = `
      SELECT DISTINCT
        TD.NOMBRE                 AS TD_NOMBRE,
        TD.DESCRIPCION            AS TD_DESCRIPCION,
        CAT.TITULO                AS CAT_TITULO,
        DOC.NOMBRE                AS DOC_NOMBRE,
        DOC.UFH_CREAR             AS DOC_UFH_CREAR,
        DOC.DESCRIPCION           AS DOC_DESCRIPCION,
        DOC.ID_DOCUMENTO          AS ID_DOCUMENTO,
        DET.ID_DETALLE            AS ID_DETALLE
      FROM DB_TIPO_DOCUMENTO TD
      JOIN DB_DOCUMENTO DOC
        ON DOC.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
      JOIN DB_DETALLE DET
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      JOIN DB_CATEGORIA CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      WHERE TD.ID_TIPO_DOCUMENTO = ?
        AND DOC.ID_DOCUMENTO     = ?
    `;

      const result = await cds.run(sql, [tipoDocumento, idDoc]);

      for (const gmo of result) {
        let record = {};
        record.NOMBRE = gmo.TD_NOMBRE;
        record.DESCRIPCION = gmo.TD_DESCRIPCION;
        record.TITULO = gmo.CAT_TITULO;
        record.NOMBRE_DOCUMENTO = gmo.DOC_NOMBRE;
        record.FECHA_CARGA = orderFecha2(String(gmo.DOC_UFH_CREAR));
        record.DESCRIPCION_DOCUMENTO = gmo.DOC_DESCRIPCION;
        record.ID_DOCUMENTO = gmo.ID_DOCUMENTO;
        record.ID_DETALLE = gmo.ID_DETALLE;
        record.ENABLED = await setEnabedDocObl(tipoDocumento);
        record.ESTADOS = await getWorkflow1(gmo.ID_DOCUMENTO);
        record.ID_TIPO_DOCUMENTO = tipoDocumento;
        record.URL = await getURLDOC(gmo.ID_DOCUMENTO, gmo.DOC_NOMBRE);


        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getModelTipDoc", query: sql }
    }

    return output;
  };

  this.on('getModelTipoDocumento', async (req) => {
    const { tipoDocumento, idDoc } = req.data.input;
    const visualizadores = await getModelTipDoc(tipoDocumento, idDoc);
    return visualizadores;
  });

  async function getCantVinculacion(idPortal, td) {
    try {
      const sql = `SELECT COUNT(*) AS CANT FROM DB_VINCULACION
                     WHERE NODO_PORTAL = ? 
                     AND ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idPortal, td]);

      return result.length ? Number(result[0].CANT) : 0;
    } catch (e) {
      return 0;
    }
  };

  async function getCantBusqueda(idPortal, td) {
    try {
      const sql = `SELECT COUNT(*) AS CANT DB_FROM DB_NODOBUSQUEDA
                     WHERE ID_PORTAL = ? 
                     AND ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idPortal, td]);

      return result.length ? Number(result[0].CANT) : 0;
    } catch (e) {
      return 0;
    }
  };

  async function getCantContenido(idPortal, td) {
    try {
      const sql = `SELECT COUNT(*) AS CANT FROM DB_PORTALES
                     WHERE ID_PORTAL = ? 
                     AND ID_TIPO_DOCUMENTO = ?`;
      const result = await cds.run(sql, [idPortal, td]);

      return result.length ? Number(result[0].CANT) : 0;
    } catch (e) {
      return 0;
    }
  };

  async function getModelDoc(idUsuario) {
    let output = [];

    try {
      const userName = await getUserName(idUsuario);
      console.log(userName)
      if (userName === false) return [];

      const sql = `
      SELECT DISTINCT
        DOC.ID_DOCUMENTO                 AS ID_DOCUMENTO,
        DOC.ID_TIPO_DOCUMENTO            AS ID_TIPO_DOCUMENTO,
        DOC.NOMBRE                       AS DOC_NOMBRE,
        DOC.UFH_CARGA                    AS DOC_FECHA,
        DOC.DESCRIPCION                  AS DOC_DESCRIPCION,
        TD.NOMBRE                        AS TD_NOMBRE,
        DET.NODO_HIJO                    AS NODO_HIJO,
        SUP.ID_USUARIO_TITULAR           AS ID_USUARIO_TITULAR,
        SUP2.ID_USUARIO_SUPLENTE         AS ID_USUARIO_SUPLENTE,
        SUP2.FECHA_INICIO                AS FECHA_INICIO,
        SUP2.FECHA_TERMINO               AS FECHA_TERMINO,
        USU.USERNAME                     AS USERNAME_TITULAR,
        USUSUP2.USERNAME                 AS SUPL_USERNAME,
        USUSUP2.NOMBRE                   AS SUPL_NOMBRE,
        USUSUP2.APELLIDO                 AS SUPL_APELLIDO
      FROM DB_DOCUMENTO DOC
      JOIN DB_DETALLE  DET ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      JOIN DB_TIPO_DOCUMENTO TD ON TD.ID_TIPO_DOCUMENTO = DOC.ID_TIPO_DOCUMENTO
      LEFT JOIN DB_USUARIO USU
             ON USU.USERNAME = DOC.SIGUIENTELIBERADOR
      LEFT JOIN DB_SUPLENTE SUP
             ON SUP.ID_USUARIO_TITULAR = USU.ID_USUARIO
      LEFT JOIN (
        SELECT ID_USUARIO_TITULAR, FECHA_INICIO, FECHA_TERMINO, ID_USUARIO_SUPLENTE, ESTADO
        FROM DB_SUPLENTE
      ) SUP2
             ON SUP2.ID_USUARIO_TITULAR = SUP.ID_USUARIO_TITULAR
            AND SUP2.ESTADO = 1
      LEFT JOIN (
        SELECT USERNAME, ID_USUARIO
        FROM DB_USUARIO
      ) USU2
             ON USU2.ID_USUARIO = SUP2.ID_USUARIO_SUPLENTE
      LEFT JOIN (
        SELECT USERNAME, ID_USUARIO, NOMBRE, APELLIDO
        FROM DB_USUARIO
      ) USUSUP2
             ON USUSUP2.ID_USUARIO = SUP2.ID_USUARIO_TITULAR
      WHERE ( LOWER(DOC.SIGUIENTELIBERADOR) = LOWER(?) OR LOWER(USU2.USERNAME) = LOWER(?) )
    `;

      const result = await cds.run(sql, [userName, userName]);
      console.log("RESULTADO DE LA QUERY PRINCIPAL: ", result)
      const hoy = new Date();

      for (const gmo of result) {
        let record = {
          ID_DOCUMENTO: gmo.ID_DOCUMENTO,
          NOMBRE: gmo.DOC_NOMBRE,
          FECHA_CREACION: orderFecha2(gmo.DOC_FECHA),
          DESCRIPCION: gmo.DOC_DESCRIPCION,
          ESTADO: "Pendiente",
          FECHA_CLASIFICA: orderFecha2(gmo.DOC_FECHA),
          ID_TIPO_DOCUMENTO: gmo.ID_TIPO_DOCUMENTO,
          TITULO: gmo.TD_NOMBRE,
          TIPO: "Documento",
          DESCARGA: await getPermisoDescarga(gmo.ID_TIPO_DOCUMENTO, idUsuario, 4),
          ID_CATEGORIA: gmo.NODO_HIJO,
          URL: await getCantUrl(gmo.ID_DOCUMENTO, gmo.ID_TIPO_DOCUMENTO)
        };

        output.push(record);

        if (record.NOMBRE !== "") {
          if (gmo.ID_USUARIO_SUPLENTE !== null) {
            const finicio = new Date(gmo.FECHA_INICIO);
            const ftermino = new Date(gmo.FECHA_TERMINO);
            const resultado = hoy.getTime() >= finicio.getTime() && hoy.getTime() <= ftermino.getTime();

            if (resultado) {
              record.ID_USUARIO_SUPLENTE = gmo.ID_USUARIO_SUPLENTE;
              record.CODNAME = gmo.SUPL_USERNAME;
              record.NAMEUSER = `${gmo.SUPL_NOMBRE} ${gmo.SUPL_APELLIDO}`;
              record.SUPLENTE = true;

              output = [];
              output.push(record);
            }
          } else {
            record.SUPLENTE = false;
            output.push(record);
          }
        }
      }

    } catch (e) {
      return { error: e.message, accion: "getModelDoc" }
    }
    return output;
  };

  this.on('getModelDocumento', async (req) => {
    const { idUsuario, idPortal } = req.data;

    const visualizadores = await getModelDoc(idUsuario);
    const body = [];

    for (let i = 0; i < visualizadores.length; i++) {
      let encontrado = false;

      const cantVinc = await getCantVinculacion(idPortal, visualizadores[i].ID_TIPO_DOCUMENTO);
      if (cantVinc > 0) {
        body.push(visualizadores[i]);
        encontrado = true;
      }

      if (!encontrado) {
        const cantBusq = await getCantBusqueda(idPortal, visualizadores[i].ID_TIPO_DOCUMENTO);
        if (cantBusq > 0) {
          body.push(visualizadores[i]);
          encontrado = true;
        }
      }

      if (!encontrado) {
        const cantCont = await getCantContenido(idPortal, visualizadores[i].ID_TIPO_DOCUMENTO);
        if (cantCont > 0) {
          body.push(visualizadores[i]);
          encontrado = true;
        }
      }
    }

    return body;
  });

  async function getTipoDocumento(nombre, doc, idTipoDocumento) {
    let sql;
    let output = [];

    try {
      sql = `SELECT URL FROM DETALLE 
               WHERE ID_CATEGORIA_HOJA = ? 
               AND ID_TIPO_DOCUMENTO = ?`;

      const result = await cds.run(sql, [doc, idTipoDocumento]);

      for (const gdoc of result) {
        let record = {};
        record.URL_DOCUMENTO = gdoc.URL;
        record.NOMBRE_DOCUMENTO = nombre;

        output.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getTipoDocumento", query: sql }
    }
    return output;
  };

  async function getInsta(idEstLib, nameUser) {
    idEstLib = await getEstLib3(tipoDocumento);
    nameUser = (nameUser === "fherrera") ? 21 : nameUser;
    nameUser = (nameUser === "pmendez") ? 8 : nameUser;
    nameUser = (nameUser === "llopez") ? 129 : nameUser;
    nameUser = (nameUser === "eperez") ? 112 : nameUser;
    try {
      const sql = `SELECT NIV.NIVEL FROM DB_NIVELES AS NIV
                   JOIN DB_USUARIO AS US
                   ON US.ID_USUARIO = NIV.ID_USUARIO
                   WHERE ID_EST_LIB = ?
                   AND US.ID_USUARIO = ?`;

      const result = await cds.run(sql, [idEstLib, nameUser]);

      for (const gin of result) {
        let record;
        record = gin.NIVEL;
      }
    } catch (e) {
      return { error: e.message, accion: "getInsta", query: sql }
    }
    return record;
  };

  async function getInstaNivel(nivel) {
    let sql;
    try {
      const idEstLib = await getEstLib3();

      sql = `
      SELECT
        US.USERNAME              AS TITULAR,
        USU.USERNAME             AS SUPLENTE,
        USU.ID_USUARIO           AS ID_USUARIO_SUPLENTE
      FROM DB_NIVELES   AS NIV
      JOIN DB_USUARIO   AS US
        ON US.ID_USUARIO = NIV.ID_USUARIO
      LEFT JOIN DB_SUPLENTE AS SU
        ON SU.ID_USUARIO_TITULAR = US.ID_USUARIO
      LEFT JOIN DB_USUARIO  AS USU
        ON USU.ID_USUARIO = SU.ID_USUARIO_SUPLENTE
      WHERE NIV.ID_EST_LIB = ? AND NIV.NIVEL = ?
    `;

      const result = await cds.run(sql, [idEstLib, nivel]);

      for (const gniv of result) {

        record.USERNAME = gniv.TITULAR;
        record.EST_LIB = idEstLib;

        if (gniv.SUPLENTE !== null) {
          if (gniv.TITULAR !== gniv.SUPLENTE) {
            record.USUARIO_REEMPLAZO = gniv.SUPLENTE;
            record.ID_USUARIO_REEMPLAZO = gniv.ID_USUARIO_SUPLENTE;
          } else {
            record.USUARIO_REEMPLAZO = null;
            record.ID_USUARIO_REEMPLAZO = null;
          }
        } else {
          record.USUARIO_REEMPLAZO = null;
          record.ID_USUARIO_REEMPLAZO = null;
        }
      }

    } catch (e) {
      return { error: e.message, accion: "getInstaNivel", query: sql }
    }
    return record;
  };

  async function updateDocumento(nameUser, idDoc) {
    let sql;
    try {
      sql = `
      UPDATE DB_DOCUMENTO
      SET SIGUIENTELIBERADOR = ?
      WHERE ID_DOCUMENTO = ?
    `;
      await cds.run(sql, [nameUser.toLowerCase(), idDoc]);
      return "OK";
    } catch (e) {
      return "FALLO";
    }
  };

  this.on('getInstancia', async (req) => {
    const { nivel } = req.data.input;
    let output = [];
    let visualizadores = {};

    visualizadores.PRENIVEL = await getInsta(nivel);

    if (visualizadores.PRENIVEL !== false) {
      visualizadores.NIVEL = await getInsta(nivel) + 1;

      const resp = await getInstaNivel(visualizadores.NIVEL);
      visualizadores.SIGUIENTELIBERADOR = resp.USERNAME;
      visualizadores.EST_LIB = resp.EST_LIB;
      visualizadores.USERNAME_SUPLENTE = resp.USUARIO_REEMPLAZO;
      visualizadores.ID_SUPLENTE = resp.ID_USUARIO_REEMPLAZO;
    }
    output.push(visualizadores);
    return output;

  });

  async function updateEstadoNivel(idEstLib, niv) {
    let sql;
    try {
      sql = `UPDATE DB_NIVELES
               SET ESTADO = 2 
               WHERE ID_EST_LIB = ? 
               AND NIVEL = ?`;

      await cds.run(sql, [idEstLib, niv]);

      return "OK";
    } catch (e) {
      return { error: e.message, accion: "updateEstadoNivel", query: sql }
    }
  };
  
  this.on('updateDocumento', async (req) => {
    const { nameUser, idDoc, idEstLib, niv } = req.data.input;
    let resp, resp2;

    resp = await updateDocumento(nameUser, idDoc);
    if (resp === "OK") {
      resp2 = await updateEstadoNivel(idEstLib, niv);
    }
    return resp2;
  });

});