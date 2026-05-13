
////////////////////////////
///////SERVICESARCHIVOS/////
////////////////////////////

const cds = require("@sap/cds");
const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");


module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    async function getSequence3(nombreSequence) {
        let sValue = false;
        try {
            const sql = `SELECT ${nombreSequence}.NEXTVAL AS ID FROM DUMMY`;

            const result = await cds.run(sql);

            for (const rs of result) {
                sValue = rs.ID
            }
            return sValue
        } catch (e) {
            return false;
        }
    };

    async function getIdSequence(id) {
        let sql;
        let record = "";

        try {
            sql = `SELECT  ${id}.nextval AS ID FROM DUMMY`;

            const result = await cds.run(sql);

            for (const gs of result) {
                record = gs.ID;
            }
        } catch (e) {
            return { error: e.message, accion: "getIdSequence", query: sql }
        }
        return record;
    };

    async function getDocumentos2(nododetalle) {
        let outPut = [];
        try {
            const sql = `SELECT ID_CATEGORIA_HOJA, ID_TIPO_DOCUMENTO, TITULO FROM DB_DETALLE
                     WHERE NODO_HIJO = ?`;
            const result = await cds.run(sql, [nododetalle]);

            for (const rs of result) {
                let record = {};
                record.ID_DOCUMENTO = rs.ID_CATEGORIA_HOJA;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.TITULO = rs.TITULO;

                outPut.push(record);

                return outPut;
            }
        } catch (e) {
            return outPut;
        }

        return outPut;

    };

    this.on('insertContenido', async (req) => {
        const { json } = req.data;
        let resp = false;

        try {
            for (const item of json) {
                const ID_NODO_DETALLE = item.ID_NODO_DETALLE;
                const ID_PORTAL = item.ID_PORTAL;
                const IDNODOCONTENIDO = item.IDNODOCONTENIDO;
                const TIPO = item.TIPO;
                const ID_TIPO = item.ID_TIPO;

                const idDocumentos = await getDocumentos2(ID_NODO_DETALLE);
                const idSequence = await getSequence3("ID_SEQ_PORTAL");


                if (idDocumentos.length > 0) {
                    const doc = idDocumentos[0];

                    const sql = `INSERT INTO DB_PORTALES VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    await cds.run(sql, [
                        idSequence,
                        ID_PORTAL,
                        TIPO,
                        doc.ID_DOCUMENTO,
                        ID_NODO_DETALLE,
                        doc.ID_TIPO_DOCUMENTO,
                        IDNODOCONTENIDO,
                        ID_TIPO,
                        doc.TITULO
                    ]);

                    resp = true;
                }
            }
            return resp;
        } catch (e) {
            return { error: e.message, accion: "insertContenido", query: sql }
        }

    });

    async function getExisteAlmacenamiento(idTipoDocumento, tipoAlm) {
        let sql;
        let sql2;
        const arr = [];

        try {
            if (tipoAlm === 1) {
                sql2 = `DB_TIPO_DOCUMENTO_DIGITAL`;
            } else {
                sql2 = `DB_TIPO_DOCUMENTO_FISICO`;
            }

            sql = `SELECT COUNT(*) AS ID,
                  EMPRESA_RESPONSABLE,
                  TEMPORABILIDAD,
                  CARDINALIDAD
             FROM ${sql2}
            WHERE ID_TIPO_DOCUMENTO = ?
            GROUP BY EMPRESA_RESPONSABLE, TEMPORABILIDAD, CARDINALIDAD`;

            const result = await cds.run(sql, [idTipoDocumento]);

            for (const rs of result) {
                if (rs.ID > 0) {
                    const record = {};
                    record.ID_PROVEEDORES_ALMACENAMIENTO = rs.EMPRESA_RESPONSABLE;
                    record.TIPO_ALMACENAMIENTO = tipoAlm;
                    record.TEMPO = Number(rs.TEMPORABILIDAD);
                    record.CARD = rs.CARDINALIDAD;

                    arr.push(record);
                }
            }

            return arr;

        } catch (e) {
            return { error: e.message, accion: "getExisteAlmacenamiento", query: sql }
        }
    };

    this.on('existeAlmacenamiento', async (req) => {
        let outPut = [];
        const { idTipoDocumento } = req.data
        try {
            const digital = await getExisteAlmacenamiento(idTipoDocumento, 1);
            const fisico = await getExisteAlmacenamiento(idTipoDocumento, 2);

            outPut = [...digital, ...fisico];
            return outPut;
        } catch (e) {
            return { error: e.message, accion: "existeAlmacenamiento" }
        }
    });

    async function existeWork(td) {
        let sValue = false;
        try {
            const sql = `SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION 
                     WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [td]);

            for (const rs of result) {
                sValue = rs.ID_EST_LIB;
            }

            return sValue;
        } catch (e) {
            return false;
        }
    };

    async function getLiberador(est_lib) {
        let sql;
        let sValue = "";

        try {
            sql = `SELECT USU.USERNAME 
               FROM DB_NIVELES NIV 
               JOIN DB_USUARIO USU 
                 ON USU.ID_USUARIO = NIV.ID_USUARIO
               WHERE NIV.ID_EST_LIB = ? 
                 AND NIV.NIVEL = 1`;

            const result = await cds.run(sql, [est_lib]);

            for (const rs of result) {
                sValue = rs.USERNAME;
            }

            return sValue;
        } catch (e) {
            return { error: e.message, accion: "getLiberador", query: sql };
        }
    }

    async function insertDocumento(tb, aprobador, NombreFile, DescFile, fActual, c) {
        let sql;
        try {
            const idDocumento = await getSequence3("ID_DOCUMENTO")
            console.log("idDocumento:", idDocumento)
            sql = `INSERT INTO DB_DOCUMENTO VALUES (?, ?, ? ,?, ?, ?, ?)`;
            await cds.run(sql, [idDocumento, tb, NombreFile, fActual, DescFile, aprobador])

            return idDocumento;
        } catch (e) {
            return { error: e.message, accion: "insertDocumento", query: sql }
        }
    };

    async function setIdNodoTD(td) {
        try {
            const sql = `SELECT ID_NODO FROM TIPO_DOCUMENTO
                     WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [td]);

            for (const rs of result) {
                return rs.ID_NODO;
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    async function insertCategoria(NombreFile, DescFile, idPadreSet) {
        let sql;
        try {
            const idCategoria = await getSequence3("ID_CATEGORIA");

            sql = `INSERT INTO DB_CATEGORIA VALUES (?, ?, 3, ?, null, null, null, ?, 3, null, null, 'Estático', 'Contenido', null, null, 'Administración', null, null, null, 'Activo', null)`;
            await cds.run(sql, [idCategoria, idPadreSet, NombreFile, DescFile]);

            return idCategoria;
        } catch (e) {
            return { error: e.message, accion: "insertCategoria", query: sql }
        }
    };

    async function getRutaSharepoint2(idCat) {
        try {
            const sql = `
      SELECT PATHSP, TITULO
      FROM CATEGORIA
      WHERE ID_CATEGORIA = ?`;

            const result = await cds.run(sql, [idCat]);

            let sValue = false;
            for (const rs of result) {
                const res = rs.PATHSP.indexOf("'");
                if (res === -1) {
                    sValue = rs.PATHSP.replace("/_api/web/folders/add(‘", "");
                } else {
                    sValue = rs.PATHSP.replace("/_api/web/folders/add('", "");
                }

            }

            return encodeURI(sValue);
        } catch (e) {
            return false;
        }
    };

    async function getRutaSharepoint(idCat) {
        let sql;
        let sValue = false;

        try {
            sql = `SELECT PATHSP, TITULO FROM DB_CATEGORIA 
               WHERE ID_CATEGORIA = (SELECT ID_CATEGORIA_ESPEJO from DB_CATEGORIA WHERE ID_CATEGORIA = ?)`;
            const result = await cds.run(sql, [idCat]);

            for (const rs of result) {
                const res = rs.PATHSP.indexOf("'");
                if (res === -1) {
                    sValue = rs.PATHSP.replace("/_api/web/folders/add(‘", "");
                } else {
                    sValue = rs.PATHSP.replace("/_api/web/folders/add(‘", "");
                }
            }
        } catch (e) {
            return false;
        }
        return encodeURI(sValue);
    };

    async function AddArc2(base64, arc, carpet) {
        try {
            const json = {
                base64: base64
            };

            const response = await executeHttpRequest(
                { destinationName: 'GESTOR_DOCUMENTAL' },
                {
                    method: 'POST',
                    url: `?accion=uploadFileToSharePoint&rutaSharePoint=${carpet}&nombreArchivo=${arc}`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: json
                }
            );

            const resp = response.data;

            if (resp.Estado === "Ex") {
                return [{
                    success: false,
                    archivo: arc,
                    link: resp
                }];
            } else {
                return [{
                    success: true,
                    archivo: arc,
                    link: resp.FullPath,
                    size: resp.Length
                }];
            }

        } catch (e) {
            return e.message;
        }
    };

    async function insertDetalle(url, idDocumento, id_tipo_documento, NombreFile, respNodo, type) {
        let sql;
        try {
            sql = `INSERT INTO DB_DETALLE VALUES (?, ?, ?, ?, ?, ?, ?)`;
            await cds.run(sql, [idDetalle, idDocumento, decodeURIComponent(url), respNodo, id_tipo_documento, NombreFile, type]);

            return idDetalle;
        } catch (e) {
            return { error: e.message, accion: "insertDetalle", query: sql }
        }
    };

    async function insertDocObl(idDocObl, idDetalle) {
        let sql;
        try {
            const idDocOblDetalle = await getSequence3("ID_DOC_OBL_DET")
            sql = `INSERT INTO DB_DOCOBLXDET VALUES (?, ?, ?)`;
            await cds.run(sql, [idDocOblDetalle, idDocObl, idDetalle]);

            return idDetalle;
        } catch (e) {
            return false;
        }
    };

    async function getVersionamiento(idDetalle) {
        let sql;
        try {
            sql = `SELECT MAX(VERSION) AS ID FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ?`;

            const result = await cds.run(sql, [idDetalle]);

            for (const rs of result) {
                return (rs.ID !== null) ? rs.ID : 1;
            }

            return 1;

        } catch (e) {
            return 1;
        }
    };

    async function insertMetadataValue(id_tipo_documento, arrBase, idDocumento, idDetalle) {
        let sql;
        try {
            sql = `INSERT INTO DB_METADATA_VALUE VALUES (?, ?, ?, ?, ?, null, ?, null, null, ?, ?, ?, ?)`;
            await cds.run(sql, [
                idMetadataValue,
                id_tipo_documento,
                Number(arrBase.ID_METADATA),
                arrBase.ATRIBUTO,
                arrBase.TIPO_ATRIBUTO,
                arrBase.VALUE,
                idDocumento,
                arrBase.ORIGEN,
                idDetalle,
                periodo
            ]);

            return true;
        } catch (e) {
            return { error: e.message, accion: "insertMetadataValue", query: sql }
        }
    };

    async function getExisteTDMDDate(td) {
        try {
            const sql = `SELECT COUNT(ID_TIPO_DOCUMENTO) AS ID FROM TIPO_DOCUMENTO
                     WHERE ID_TIPO_DOCUMENTO = ? AND ATRIBUTO = 'FechaCarga'`;
            const result = await cds.run(sql, [td]);

            for (const rs of result) {
                if (rs.ID > 0) {
                    return false;
                } else {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    async function insertMetadataValueTest(id_tipo_documento, arrBase, idDocumento, idMetadata, sValue, idDetalle, c) {
        let sql;

        try {
            const idMetadataValue = await getIdSequence("ID_METADATA_VALUE");
            const periodo = await addPeriodo();

            sql = `INSERT INTO DB_METADATA_VALUE
               VALUES (?, ?, ?, ?, ?, null, ?, null, null, ?, ?, ?, ?)`;

            await cds.run(sql, [idMetadataValue, id_tipo_documento, idMetadata, arrBase.ATRIBUTO, arrBase.TIPO_ATRIBUTO, sValue, idDocumento, arrBase.ORIGEN, idDetalle, periodo])

            return sql;
        } catch (e) {
            return { error: e.message, accion: "insertMetadataValueTest", query: sql }
        }

    };

    async function getUsername1(idUsuario) {
        try {
            const sql = `SELECT USERNAME FROM DB_USUARIO
                     WHERE ID_USUARIO = ?`;
            const result = await cds.run(sql, [idUsuario]);

            for (const rs of result) {

                return rs.USERNAME; //<- Retorna si encuentra
            }
        } catch (e) {
            return { error: e.message, accion: "getUsername1" }
        }
        return "" //<- Si llega a estar vacio

    };

    async function insertVersionamiento(versionamiento, idDetalle, urlVersion, fActualDoc, size, usuario, c) {
        let sql;
        try {
            const idVersion = await getIdSequence("ID_VERSIONAMIENTO");

            const lastDot = urlVersion.lastIndexOf(".");
            const extension = lastDot >= 0 ? urlVersion.slice(lastDot) : "";
            let urlBefore;

            if (versionamiento === 1) {
                const base = extension ? urlVersion.slice(0, -extension.length) : urlVersion;
                urlBefore = `${base}_Original${extension}`;
            } else {
                urlBefore = urlVersion;
            }

            sql = `
      INSERT INTO DB_VERSIONAMIENTO
      VALUES (?,?,?,?,?,?,?,?,?)
    `;
            await cds.run(sql, [
                idVersion,
                versionamiento,
                idDetalle,
                urlVersion,
                fActualDoc,
                size,
                usuario,
                urlBefore,
                'X'
            ]);

            return true;
        } catch (e) {
            return { error: e.message, accion: "insertVersionamiento", query: sql }
        }
    };

    async function insertVisDet(json, idCategoria) {
        let sql;

        try {
            for (const item of json) {
                const FECHA_CARGA = item.FECHA_CARGA;
                const FECHA_VENCIMIENTO = item.FECHA_VENCIMIENTO;
                const ID_PROVEEDORES_ALMACENAMIENTO = item.ID_PROVEEDORES_ALMACENAMIENTO;
                const ID_TIPO_DOCUMENTO = item.ID_TIPO_DOCUMENTO;
                const ID_USUARIO = item.ID_USUARIO;
                const TIPO_ALMACENAMIENTO = item.TIPO_ALMACENAMIENTO;

                const idSequence = await getSequence3("ID_DETALLE_VISUALIZACION");
                console.log("DETALLE_VISUALIZACION:", idSequence)
                const idDetalle = idCategoria;

                sql = `INSERT INTO DB_DETALLE_VISUALIZACION
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                await cds.run(sql, [
                    idSequence,
                    idDetalle,
                    FECHA_CARGA,
                    ID_USUARIO,
                    FECHA_VENCIMIENTO,
                    ID_TIPO_DOCUMENTO,
                    TIPO_ALMACENAMIENTO,
                    ID_PROVEEDORES_ALMACENAMIENTO
                ]);
            }

            return "OK";

        } catch (e) {
            return {
                error: e.message,
                accion: "insertVisDet",
                query: sql
            };
        }
    }

    this.on('insert', async (req) => {
        const { json } = req.data;
        try {

            let idDocumento, liberador, resp = false;
            const id_tipo_documento = json.idTipoDocumento;
            const NombreFile = json.nombreFile;
            const DescFile = json.descFile;
            const arrDetalle = json.detalleArchivo || [];
            const arrMetadataValue = json.metadataValue || [];
            const usuario = await getUsername1(json.usuario);

            const arrDesVis = json.DetalleVis || [];
            let fActual = json.FechaActual;

            fActual = fActual.replace("/", "-");
            fActual = fActual.replace("/", "-");

            const idPadreSet = json.idPadreSet;
            const flag = json.flag;

            const outPutResponse = [];

            const respWork = await existeWork(id_tipo_documento);
            if (respWork !== false) {
                liberador = await getLiberador(respWork);
                idDocumento = await insertDocumento(id_tipo_documento, liberador, NombreFile, DescFile, fActual);
            } else {
                idDocumento = await insertDocumento(id_tipo_documento, "''", NombreFile, DescFile, fActual);
            }

            const idPadreAux = await setIdNodoTD(id_tipo_documento);
            const idPadretd = (idPadreAux === false) ? idPadreSet : idPadreAux;

            if (idDocumento !== false) {
                const respNodo = await insertCategoria(NombreFile, DescFile, idPadretd);

                if (respNodo !== false) {
                    for (let i = 0; i < arrDetalle.length; i++) {
                        const carpet = (flag === 1)
                            ? await getRutaSharepoint2(idPadreSet)
                            : await getRutaSharepoint(idPadreSet);

                        const arc = arrDetalle[i].TITULO;
                        const upResp = await AddArc2(arrDetalle[i].URL_ADJUNTO, arc, carpet);
                        outPutResponse.push(upResp);

                        const type = arrDetalle[i].TYPE;

                        const resp2 = await insertDetalle(
                            upResp[0].link,
                            idDocumento,
                            id_tipo_documento,
                            arc,
                            respNodo,
                            type
                        );

                        const ok = await insertVisDet(arrDesVis, resp2);

                        if (arrDetalle[i].ID_DOC_OBL !== null) {
                            await insertDocObl(arrDetalle[i].ID_DOC_OBL, resp2);
                        }

                        const versionamiento = await getVersionamiento(resp2);
                        await insertVersionamiento(
                            versionamiento,
                            resp2,
                            encodeURI(upResp[0].link),
                            fActual,
                            upResp[0].size,
                            usuario
                        );
                    }

                    for (let j = 0; j < arrMetadataValue.length; j++) {
                        const respMV = await insertMetadataValue(
                            id_tipo_documento,
                            arrMetadataValue[j],
                            idDocumento,
                            undefined
                        );

                        if (!respMV) {
                            const msg = `Error al cargar el archivo: ${NombreFile}, fallo proceso de Metadata Value`;
                            return msg;
                        }
                    }


                    const idMetadata = await getIdSequence("ID_METADATA");
                    const existeTDMDDate = await getExisteTDMDDate(id_tipo_documento);
                    if (existeTDMDDate) {

                        const queryMD = `INSERT INTO DB_METADATA VALUES (${idMetadata}, ${id_tipo_documento},
                    'FechaCarga','date','', ${idDocumento}, 'Manual', 'Estático', ${respNodo}, '','','','')
          `;
                        await cds.run(queryMD);

                        const recordMDF = {
                            ATRIBUTO: 'FechaCarga',
                            TIPO_ATRIBUTO: 'date',
                            OBLIGATORIEDAD: '',
                            ORIGEN: 'Manual',
                            TIPO: 'Estático',
                            METADATA: idMetadata
                        };

                        await insertMetadataValueTest(
                            id_tipo_documento,
                            recordMDF,
                            idDocumento,
                            idMetadata,
                            fActual,
                            undefined
                        );
                    }

                    // Respuesta
                    return outPutResponse;

                } else {
                    const msg = `Error al cargar el archivo: ${NombreFile}, fallo proceso de Nodo ${respNodo}`;
                    return msg;
                }

            } else {
                const msg = `Error al cargar el archivo: ${NombreFile}, fallo proceso de Documento`;
                return msg;
            }

        } catch (e) {
            return { error: e.message, accion: "insertFile" }
        }
    });

    async function getDatosAnexos(idDetalle, version) {
        try {
            const sql = `SELECT * FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ?
                     AND VERSION = ?`;
            const result = await cds.run(sql, [idDetalle, version]);

            for (const rs of result) {
                let record = {};

                record.FECHA_CARGA = orderFecha2(rs.FECHA_CARGA);
                record.SIZE = ((rs.SIZE) / 1000).toFixed(0) + " Kb";

                outPut.push(record)
            }

            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getDatosAnexos" }
        }
    };

    async function getDataVersionamiento(idDetalle) {
        let outPut = [];
        try {
            const sql = `SELECT * FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ?`;

            const result = await cds.run(sql, [idDetalle]);

            for (const rs of result) {
                let record = {};
                record.ID_VERSIONAMIENTO = rs.ID_VERSIONAMIENTO;
                record.VERSION = rs.VERSION;
                record.ID_VERSIONAMIENTO = idDetalle; //??
                record.URL_DETALLE = String(rs.URL_VERSION).replace(/\+/g, '%20');
                record.SIZE = rs.SIZE + ' MB';

                outPut.push(record);
            }

            return outPut;

        } catch (e) {
            return { error: e.message, accion: "getDataVersionamiento" }
        }

    };

    this.on('getUrl', async (req) => {
        const { nodoHijo } = req.data;
        let outPut = [];
        try {
            const sql = `SELECT URL, ID_DETALLE, TITULO FROM DB_DETALLE
                     WHERE NODO_HIJO = ?`;
            const result = await cds.run(sql, [nodoHijo]);

            for (const rs of result) {
                let record = {};

                record.URL = rs.URL.replace(/\+/g, '%20');
                record.ID_DETALLE = rs.ID_DETALLE;
                console.log(rs.ID_DETALLE)
                record.VERSIONACTUAL = await getVersionamiento(rs.ID_DETALLE);
                record.VERSIONAMIENTO = await getDataVersionamiento(rs.ID_DETALLE);
                record.TITULO = rs.TITULO;
                record.ACTIVE = (record.VERSIONACTUAL === 1) ? false : true;
                record.VISIBLE = (record.VERSIONACTUAL === 1) ? true : false;

                const datosAnexos = await getDatosAnexos(rs.ID_DETALLE, record.VERSIONACTUAL);
                record.FECHA_CARGA = (datosAnexos.length > 0) ? datosAnexos[0].FECHA_CARGA : "";
                record.SIZE = (datosAnexos.length > 0) ? datosAnexos[0].SIZE : "";

                outPut.push(record);
            }

            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getUrl", query: sql }
        }

    });

    this.on('insertVisDet', async (req) => { //TRANSFORMAR ASYNC FUNCTION YA QUE SE LLAMA DE OTRO SERVICIO
        const { json, idCategoria } = req.data.input;
        console.log(json)
        try {
            for (let i = 0; i < json.length; i++) {
                let FECHA_CARGA = json[i].FECHA_CARGA;
                let FECHA_VENCIMIENTO = json[i].FECHA_VENCIMIENTO;
                let ID_PROVEEDORES_ALMACENAMIENTO = json[i].ID_PROVEEDORES_ALMACENAMIENTO;
                let ID_TIPO_DOCUMENTO = json[i].ID_TIPO_DOCUMENTO;
                let ID_USUARIO = json[i].ID_USUARIO;
                let TIPO_ALMACENAMIENTO = json[i].TIPO_ALMACENAMIENTO;

                const idSequence = await getSequence3("ID_DETALLE_VISUALIZACION");
                console.log(idSequence)
                const idDetalle = idCategoria;
                console.log(idDetalle)

                const sql = `INSERT INTO DB_DETALLE_VISUALIZACION
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                await cds.run(sql, [idSequence, idDetalle, FECHA_CARGA, ID_USUARIO, FECHA_VENCIMIENTO, ID_TIPO_DOCUMENTO, TIPO_ALMACENAMIENTO, ID_PROVEEDORES_ALMACENAMIENTO]);

                return "OK"

            }
        } catch (e) {
            return { error: e.message, accion: "insertVisDet" }
        }
    });



});