
//////////////////////
///////SERVICESTD/////
//////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    function orderFecha(fecha) {
        const newFecha = fecha.split("-")[2] + "-" + fecha.split("-")[1] + "-" + fecha.split("-")[0];
        return newFecha;
    };

    async function getSequence(nombreSequence) {
        let sValue = false;
        try {
            const sql = `SELECT ${nombreSequence}.NEXTVAL AS NEXT_ID FROM DUMMY`;
            const result = await cds.run(sql)
            console.log("esto trae la sequencia", result, "a nombre de", nombreSequence)

            for (const rs of result) {
                sValue = rs.NEXT_ID;
            }
        } catch (e) {
            return false;
        }
        return sValue
    };

    async function getIdSequence(id) {
        let sql;
        let record = "";

        try {
            sql = `SELECT ${id}.NEXTVAL AS ID FROM DUMMY`;

            const result = await cds.run(sql);
            for (const gi of result) {
                record = gi.ID;

            }
        } catch (e) {
            return { error: e.message, accion: "getIdSequence", query: sql }
        }
        return record;
    };

    this.on('getArchivo', async (req) => {
        const { idTD } = req.data;
        let record = {};
        try {
            const sql = `SELECT DISTINCT TP.* FROM DB_INDEX AS IND
                     JOIN DB_TIPO_DOCUMENTO AS TP 
                      ON TP.ID_TIPO_DOCUMENTO = IND.ID_TIPO_DOCUMENTO
                     WHERE TP.ID_NODO = (SELECT ID_CATEGORIA FROM DB_CATEGORIA WHERE ID_CATEGORIA_ESPEJO = ? AND APP = 'Contenido')
                     `;
            const result = await cds.run(sql, [idTD]);

            for (const rs of result) {
                record = rs.ID_TIPO_DOCUMENTO;
            }
        } catch (e) {
            return { error: e.message, accion: "getArchivo" }
        }
        return record;
    });

    async function getNodoTD(idTD) {
        let record = false;
        try {
            const sql = `SELECT MAX (ID_CATEGORIA) AS ID_CATEGORIA
                   FROM DB_CATEGORIA
                   WHERE ID_CATEGORIA_ESPEJO = ?`;
            const result = await cds.run(sql, [idTD]);

            for (const gn of result) {
                record = gn.ID_CATEGORIA;
            }

        } catch (e) {
            return { error: e.message, accion: "getNodoTD", query: sql }
        }
        return record;
    };

    this.on('getListaTDNodo', async (req) => {
        const { idTD } = req.data;
        let outPut = [];
        const idNodoCalculado = await getNodoTD(idTD);
        console.log(idNodoCalculado)

        if (idNodoCalculado === false) {
            return false;
        }

        try {
            const sql = `SELECT ID_TIPO_DOCUMENTO, ID_NODO, NOMBRE
                     FROM DB_TIPO_DOCUMENTO 
                     WHERE ID_NODO = ?`;

            const result = await cds.run(sql, [idNodoCalculado]);

            for (const gl of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = gl.ID_TIPO_DOCUMENTO;
                record.ID_NODO = gl.ID_NODO;
                record.NOMBRE = gl.NOMBRE;

                outPut.push(record);
            }
            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getListaTDNodo", query: sql }
        }
    });

    async function getNodoPadre(idCat) {
        let sql;
        try {
            sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA
               WHERE ID_PADRE = ?`;

            const result = await cds.run(sql, [idCat]);

            for (const rs of result) {
                return rs.ID_CATEGORIA
            }
        } catch (e) {
            return { error: e.message, accion: "getNodoPadre", query: sql }
        }
    };

    this.on('getNodoVisible', async (req) => {
        const { idCat } = req.data;
        let record = "false";
        let sql;
        let result;
        try {
            sql = `SELECT ORIGEN FROM DB_CATEGORIA
                     WHERE ID_PADRE = ?`;
            result = await cds.run(sql, [idCat]);

            for (const rs of result) {
                if (rs.ORIGEN === 'Dinámico') {
                    record = await getNodoPadre(idCat)
                } else {
                    record = idCat;
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getNodoVisible", query: sql }
        }

        if (record === "false") {
            sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA
               WHERE ID_CATEGORIA_ESPEJO = ?
               AND ORIGEN = 'Estático'`;
            result = await cds.run(sql, [idCat]);

            for (const gn1 of result) {
                record = gn1.ID_CATEGORIA;
            }
        }
        return record;
    });

    this.on('getListaTDFiltro', async (req) => {
        const { texto } = req.data.input;
        let record = {};
        let outPut = [];
        try {
            const sql = `SELECT DISTINCT NOMBRE, DESCRIPCION, ID_TIPO_DOCUMENTO FROM DB_TIPO_DOCUMENTO
                    WHERE ORIGEN = 'Dinámico' AND UPPER(NOMBRE) LIKE ?`;
            const result = await cds.run(sql, [`%${texto}%`]);

            for (const gl of result) {
                record.NOMBRE = gl.NOMBRE;
                record.DESCRIPCION = gl.DESCRIPCION;
                record.ID_TIPO_DOCUMENTO = gl.ID_TIPO_DOCUMENTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListaTDFiltro", query: sql }
        }
        return outPut;
    });

    this.on('getListaTD', async () => {
        let outPut = [];
        try {
            const sql = `SELECT DISTINCT NOMBRE, DESCRIPCION, ID_TIPO_DOCUMENTO FROM DB_TIPO_DOCUMENTO 
                    WHERE ORIGEN = 'Dinámico'`;
            const result = await cds.run(sql);

            for (const gl of result) {
                let record = {};
                record.NOMBRE = gl.NOMBRE;
                record.DESCRIPCION = gl.DESCRIPCION;
                record.ID_TIPO_DOCUMENTO = gl.ID_TIPO_DOCUMENTO;

                outPut.push(record)
            }

            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getListaTD" }
        }
    });

    async function getTDRefenciaArr(nodoTD) {
        let outPut = [];
        let record = {};
        let sql;
        try {
            sql = `SELECT * FROM DB_TIPO_DOCUMENTO 
                     WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [nodoTD]);

            for (const rs of result) {
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.ID_NODO = rs.ID_NODO;
                record.ID_WF = rs.ID_WF;
                record.NOMBRE = rs.NOMBRE;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.G_DIGITAL = rs.G_DIGITAL;
                record.DESCRIPCION_DIGITAL = rs.DESCRIPCION_DIGITAL;
                record.ORIGEN = rs.ORIGEN;

                outPut.push(record);
                console.log("esto es record:", record)
                return outPut;


            }
        } catch (e) {
            return { error: e.message, accion: "getTDReferenciaArr", query: sql }
        }
        return outPut;
    };

    async function insertMetadata(id_tipo_documento, arrBase, idDocumento) {
        let sql;
        try {
            const idMetadata = await getSequence('ID_METADATA');

            sql = `INSERT INTO METADATA
                      VALUES (?, ?, ?, ?, ?, null, null, 'Nodo Jerárquico', ?, ?)`;
            await cds.run(sql, [
                idMetadata,
                id_tipo_documento,
                arrBase.TITULO,
                arrBase.TITULO,
                arrBase.ORIGEN,
                idDocumento
            ]);
            return true;

        } catch (e) {
            return { error: e.message, accion: "insertMetadata", query: sql }
        }
    };

    async function getMetadataManual(nodoTD) {
        let sql;
        try {
            sql = `SELECT * FROM METADATA 
               WHERE ID_TIPO_DOCUMENTO = ? AND ORIGEN = 'Manual'`;
            const result = await cds.run(sql, [nodoTD]);

            for (const gm of result) {
                let record = {};
                record.ATRIBUTO = gm.ATRIBUTO;
                record.TIPO_ATRIBUTO = gm.TIPO_ATRIBUTO;
                record.OBLIGATORIEDAD = gm.OBLIGATORIEDAD;
                record.ORIGEN = gm.ORIGEN;
                record.TIPO = gm.TIPO;

                outPut.push(record);
                return outPut;
            }
        } catch (e) {
            return { error: e.message, accion: "getMetadataManual", query: sql }
        }
        return outPut;
    };

    async function insertMetadataManual(id_tipo_documento, arrBase, idDocumento) {
        let sql;
        try {
            const idMetadata = await getSequence('ID_METADATA');

            sql = `INSERT INTO DB_METADATA
                      VALUES (?, ?, ?, ?, ?, null, 'Manual', ?, ?)`;
            await cds.run(sql, [
                idMetadata,
                id_tipo_documento,
                arrBase.ATRIBUTO,
                arrBase.ATRIBUTO,
                arrBase.OBLIGATORIEDAD,
                arrBase.ORIGEN,
                idDocumento
            ]);
            return true;

        } catch (e) {
            return { error: e.message, accion: "insertMetadataManual", query: sql }
        }
    };

    this.on('insertTD', async (req) => {
        const { ID_TIPO_DOCUMENTO, ID_NODO } = req.data.input;
        let sql;

        try {
            const arrBase = await getTDRefenciaArr(ID_TIPO_DOCUMENTO);

            sql = `
      INSERT INTO DB_TIPO_DOCUMENTO (ID_TIPO_DOCUMENTO, ID_NODO, ID_WF, NOMBRE, DESCRIPCION, ORIGEN)
      VALUES (?,?,?,?,?,?)
    `;

            await cds.run(sql, [
                ID_TIPO_DOCUMENTO,
                ID_NODO,
                arrBase[0].ID_WF,
                arrBase[0].NOMBRE,
                arrBase[0].DESCRIPCION,
                arrBase[0].ORIGEN
            ]);

            let outPut = [];
            outPut = await getEstructuraArriba(ID_NODO, outPut);

            const cant = outPut.length;
            for (let i = 0; i < cant; i++) {
                const resp = await insertMetadata(ID_TIPO_DOCUMENTO, outPut[i], ID_NODO);
                if (!resp) {
                    const msg = `Error al cargar el tipo de documento: ${arrBase[0].NOMBRE}, fallo proceso de cargar de Metadata`;
                    return msg;
                }
            }

            let outPutManual = [];
            outPutManual = await getMetadataManual(ID_TIPO_DOCUMENTO, outPutManual);

            if (outPutManual.length) {
                const respManual = await insertMetadataManual(ID_TIPO_DOCUMENTO, outPutManual[0], ID_NODO);
                if (!respManual) {
                    const msg = `Error al cargar el tipo de documento: ${arrBase[0].NOMBRE}, fallo proceso de cargar de Metadata Manual`;
                    return msg;
                }
            }

            return "OK";

        } catch (e) {
            return { error: e.message };
        }
    });

    async function getNodoContenedor(idCat) {
        let sql;
        let id;

        try {
            sql = `SELECT ID_PADRE FROM DB_CATEGORIA
               WHERE ID_CATEGORIA = ?`;
            const result = await cds.run(sql, [idCat]);

            for (const gn of result) {
                id = gn.ID_PADRE;
            }

            return id;
        } catch (e) {
            return { error: e.message, accion: "getNodoContenedor", query: sql }
        }
    };

    async function getCascada(id, arr) {
        let sql;

        try {
            sql = `SELECT ID_CATEGORIA, ORIGEN FROM DB_CATEGORIA
              WHERE ID_PADRE = ?`;
            const result = await cds.run(sql, [id]);

            for (const gc of result) {
                arr.push(gc.ID_CATEGORIA);
                // let r = await getCascada(gc.ID_CATEGORIA, arr);
            }

            return arr;
        } catch (e) {
            return { error: e.message, accion: "getCascada", query: sql }
        }
    };

    async function getOrigen(nodo) {
        try {
            const sql = `SELECT ORIGEN FROM DB_CATEGORIA
                     WHERE ID_CATEGORIA = ?`;
            const result = await cds.run(sql, [nodo]);

            let id = null;

            for (const go of result) {
                id = (go.ORIGEN === 'Dinámico')
                    ? Number(nodo) + 2
                    : Number(nodo) + 1
            };

            return id;
        } catch (e) {
            return null;
        }
    };

    this.on('deleteCat', async (req) => {
        const { idCat } = req.data.input;
        let sql;

        try {
            const nodoContenedor = await getNodoContenedor(idCat); //12345 id_padre

            let arr = [];
            arr.push(Number(idCat)); //12345 id_padre

            const requestDeleteEst = await getCascada(idCat, arr); // 12345

            for (let j = 0; j < requestDeleteEst.length; j++) {
                const nodo = requestDeleteEst[j];
                const padre = await getOrigen(nodo);

                // UPDATE 1: por ID_CATEGORIA
                sql = `UPDATE DB_CATEGORIA 
             SET ESTADO='Inactivo' 
             WHERE ID_CATEGORIA = ?`;
                await cds.run(sql, [nodo]);

                // UPDATE 2: por ID_CATEGORIA_ESPEJO
                sql = `UPDATE DB_CATEGORIA 
             SET ESTADO='Inactivo' 
             WHERE ID_CATEGORIA_ESPEJO = ?`;
                await cds.run(sql, [nodo]);

                // UPDATE 3: por ID_PADRE
                sql = `UPDATE DB_CATEGORIA 
             SET ESTADO='Inactivo' 
             WHERE ID_PADRE = ?`;
                await cds.run(sql, [padre]);
            }

            return nodoContenedor;

        } catch (e) {

            return { error: e.message, accion: "deleteCat", query: sql }
        }
    });

    this.on('habilitaCascada', async (req) => {
        const { idCat } = req.data.input;
        let sql;
        try {
            const nodoContenedor = await getNodoContenedor(idCat);

            let arr = [];
            arr.push(Number(idCat));

            const requestDeleteEst = await getCascada(idCat, arr);

            for (let j = 0; j < requestDeleteEst.length; j++) {
                const nodo = requestDeleteEst[j];
                const padre = await getOrigen(nodo);

                // UPDATE 1: por ID_CATEGORIA
                sql = `UPDATE DB_CATEGORIA 
             SET ESTADO='Activo' 
             WHERE ID_CATEGORIA = ?`;
                await cds.run(sql, [nodo]);

                // UPDATE 2: por ID_CATEGORIA_ESPEJO
                sql = `UPDATE DB_CATEGORIA 
             SET ESTADO='Activo' 
             WHERE ID_CATEGORIA_ESPEJO = ?`;
                await cds.run(sql, [nodo]);

                // UPDATE 3: por ID_PADRE
                sql = `UPDATE DB_CATEGORIA 
             SET ESTADO='Activo' 
             WHERE ID_PADRE = ?`;
                await cds.run(sql, [padre]);
            }

            return nodoContenedor;

        } catch (e) {
            return { error: e.message, accion: "habilitadaCascada", query: sql }
        }
    });

    this.on('validaMD', async (req) => {
        const { idTD } = req.data;
        try {
            const sql = `SELECT COUNT(ID_TIPO_DOCUMENTO) AS ID_TIP_DOC FROM DB_TIPO_DOCUMENTO
                    WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idTD]);

            for (const vm of result) {
                if (vm.ID_TIP_DOC > 1) {
                    return false;
                }
            }
            return true;
        } catch (e) {
            return { error: e.message, data: false }
        }
    });

    async function getIDPadreRef(idTD) {
        let sql;
        try {
            sql = `SELECT ID_CATEGORIA, ID_PADRE, ORIGEN, APP FROM DB_CATEGORIA
                    WHERE ID_CATEGORIA = (SELECT ID_PADRE FROM DB_CATEGORIA WHERE ID_CATEGORIA = (SELECT ID_CATEGORIA_ESPEJO
                    FROM DB_CATEGORIA WHERE ID_CATEGORIA = ?))`;
            const result = await cds.run(sql, [idTD]);
            console.log("padre", result)

            for (const rs of result) {
                return rs.ID_CATEGORIA;
            }
        } catch (e) {
            return { error: e.message, accion: "getIDPadreRef" }
        }
        return sql;
    };

    async function getRecursiva1(arr, nodo) {
        let sql;
        let record = {};
        try {
            sql = `SELECT ID_PADRE, TITULO, DESCRIPCION, ID_CATEGORIA, ORIGEN, PATHSP FROM DB_CATEGORIA
               WHERE ID_CATEGORIA = ? AND ORIGEN IS NOT NULL`;

            const result = await cds.run(sql, [nodo]);

            for (const gr of result) {
                record.ID_PADRE = gr.ID_PADRE;
                record.TITULO = gr.TITULO;
                record.ID_CATEGORIA = gr.ID_CATEGORIA;
                record.ORIGEN = gr.ORIGEN;

                arr.push(record);

                if (gr.ID_PADRE !== 0) {
                    return await getRecursiva1(arr, gr.ID_PADRE);
                } else {
                    return arr;
                }
            }
            return arr;
        } catch (e) {
            return { error: e.message, accion: "getRecursiva1" }
        }
    };

    async function getEstructuraArriba(idNodo, outPut) {
        let record = {};
        try {
            const sql = `SELECT * FROM DB_CATEGORIA
                    WHERE ID_CATEGORIA = ?`;
            const result = await cds.run(sql, [idNodo]);

            for (const rs of result) {
                record.ID_PADRE = rs.ID_PADRE;
                record.TITULO = rs.TITULO;
                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ORIGEN = rs.ORIGEN;

                outPut.push(record);

                if (rs.ID_PADRE !== 0) {
                    return await getRecursiva1(outPut, rs.ID_PADRE)
                } else {
                    return outPut;
                }
            }
            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getEstructuraArriba" }
        }
    };

    async function cargaID(idEspejo, idPadre, origen) {
        let sql;
        let record = {
            ATRIBUTO: "",
            TIPO_ATRIBUTO: ""
        };
        try {

            if (origen !== 'Estático') {

                sql = `SELECT TIPO_DATO, TABLA_SAP, CAMPO_TABLA_SAP, FORMATO_FECHA FROM DB_VALIDACION
                     WHERE ID_CATEGORIA = (SELECT ID_CATEGORIA FROM DB_CATEGORIA WHERE ID_CATEGORIA_ESPEJO = ?
                     AND ORIGEN = ?)`;
                const result = await cds.run(sql, [idEspejo, origen]);

                for (const ci of result) {
                    if (ci.TIPO_DATO === 'DatosSAP') {
                        record.ATRIBUTO = ci.CAMPO_TABLA_SAP;
                        record.TIPO_ATRIBUTO = ci.CAMPO_TABLA_SAP;
                        record.ORIGEN = origen;
                    } else {
                        record.Trae = true;
                        record.ATRIBUTO = "Fecha";
                        record.TIPO_ATRIBUTO = "Fecha";
                        record.ORIGEN = origen;
                    }

                }

            } else {
                sql = `SELECT TITULO FROM DB_CATEGORIA
                   WHERE ID_CATEGORIA = ?`;
                const result = await cds.run(sql, [idEspejo]);

                for (const gi of result) {
                    record.Trae = true;
                    record.ATRIBUTO = gi.TITULO;
                    record.TIPO_ATRIBUTO = gi.TITULO;

                }
                return record;
            }
            return record;

        } catch (e) {
            return { error: e.message, accion: "cargaID" }
        }
    };

    this.on('getNodosEstructura', async (req) => {
        const { idTD } = req.data;
        let arrID = [];
        let arrFinal = [];

        const idNodo = await getIDPadreRef(idTD);
        console.log("IDNODO:", idNodo)
        arrID = await getEstructuraArriba(idNodo, arrID);
        console.log("ARRID:", arrID)

        for (let j = 0; j < arrID.length; j++) {
            const resp = await cargaID(arrID[j].ID_CATEGORIA, arrID[j].ID_PADRE, arrID[j].ORIGEN);
            let recordMetadata = {};

            recordMetadata.ATRIBUTO = resp.ATRIBUTO;
            recordMetadata.TIPO_ATRIBUTO = resp.TIPO_ATRIBUTO;
            recordMetadata.VALUE = arrID[j].TITULO;
            recordMetadata.OBLIGATORIEDAD = "NO";
            recordMetadata.ORIGEN = arrID[j].ORIGEN;

            arrFinal.push(recordMetadata);
        }
        return arrFinal;
    });

    this.on('getNodoVisiblePadre', async (req) => {
        const { idCat } = req.data;
        let record = {};
        try {
            const sql = `SELECT ID_CATEGORIA FROM DB_CATEGORIA
                     WHERE ID_CATEGORIA_ESPEJO = ? AND APP = 'Contenido' AND ORIGEN = 'Dinámico'`;
            const result = await cds.run(sql, [idCat]);

            for (const gn of result) {
                record = gn.ID_CATEGORIA;
            }
        } catch (e) {
            return "false"
        }
        return record;

    });

    async function updatePropiedades(arrPropiedades) {
        const tipDoc = arrPropiedades[0].TIPO_DOCUENTO;
        const cant = arrPropiedades.length;
        console.log("cantidad", cant);
        console.log("parapiripam", tipDoc)
        let sql;

        try {
            // DELETE
            sql = `DELETE FROM DB_PROP_TIPO_DOC WHERE TIPO_DOCUMENTO = ?`;
            await cds.run(sql, [tipDoc]);

            // INSERT por cada propiedad
            for (let i = 0; i < cant; i++) {
                const idPropiedad = await getSequence("ID_PROPIEDAD");
                console.log("Esto llega1232", idPropiedad);

                sql = `INSERT INTO DB_PROP_TIPO_DOC VALUES ( ?, ?, ?, ?, ? )`;
                await cds.run(sql, [
                    idPropiedad,
                    arrPropiedades[i].ID_CATEGORIA_NODO,
                    arrPropiedades[i].FORMATO,
                    arrPropiedades[i].PESO,
                    tipDoc
                ]);
            }
            console.log("tututurutum")
            return 0;
        } catch (e) {
            console.log("CLAN CLAN CLAN")
            return 1
        }
    };

    async function existeMD(arr, td) {
        console.log("Esto llega a existeMD", arr, "Y", td)
        let des = -1;
        try {
            const sql = `SELECT COUNT(*) AS ID
            FROM DB_METADATA WHERE ID_TIPO_DOCUMENTO = ?
            AND ATRIBUTO = ?
            AND TIPO_ATRIBUTO = ?
            AND ORIGEN = ?`;

            const result = await cds.run(sql, [td, arr.ATRIBUTO, arr.DESCRIPCION, arr.ORIGEN]);
            console.log(result)
            des = result?.[0]?.ID ?? -1;

        } catch (e) {
            return -1
        }
        return des;
    };

    async function updateMetadata(arrPropiedades, tipDoc, idNodo) {
        let resp = 0;
        let sql;

        try {
            for (const prop of arrPropiedades) {
                const existeAtt = await existeMD(prop, tipDoc);

                const est = (prop.ESTADO === "Activo") ? "" : prop.ESTADO;

                if (existeAtt) {
                    sql = `
                    UPDATE DB_METADATA 
                    SET ESTADO = ?
                    WHERE ID_TIPO_DOCUMENTO = ?
                    AND ATRIBUTO = ?
                    AND TIPO_ATRIBUTO = ?
                    AND ORIGEN = ?
                `;

                    await cds.run(sql, [
                        est,
                        tipDoc,
                        prop.ATRIBUTO,
                        prop.DESCRIPCION,
                        prop.ORIGEN
                    ]);

                    resp += 0;

                } else {
                    const idMetadata = await getSequence("ID_METADATA");

                    sql = `
                    INSERT INTO DB_METADATA
                    VALUES (?, ?, ?, ?, '', -1, ?, '', ?, ?, ?, ?, '')`;

                    await cds.run(sql, [
                        idMetadata,
                        tipDoc,
                        prop.ATRIBUTO,
                        prop.DESCRIPCION,
                        prop.ORIGEN,
                        idNodo,
                        prop.TABLASAP + " ",
                        prop.CAMPOSAP,
                        prop.FECHA
                    ]);

                    resp += 0;
                }
            }

            return resp;

        } catch (e) {
            return 1;
        }
    }

    async function existeLB(td) {
        let sql;
        try {
            sql = `
      SELECT COUNT(*) AS ID
      FROM DB_ESTRATEGIA_LIBERACION
      WHERE ID_TIPO_DOCUMENTO = ?
    `;
            const result = await cds.run(sql, [td]);

            for (const rs of result) {
                if (rs.ID > 0) {
                    return true;
                } else {
                    return false;
                }
            }

            return false;

        } catch (e) {
            return false;
        }
    };

    async function getArrNivel(td) {
        try {
            const sql = `SELECT COUNT(*) AS CANT, NIVEL, NOMBREAPROBADOR, ID_EST_LIB, ID_USUARIO FROM DB_NIVELES
        WHERE ID_EST_LIB = (SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION WHERE ID_TIPO_DOCUMENTO = ?)
        GROUP BY NIVEL, NOMBREAPROBADOR, ID_EST_LIB, ID_USUARIO ORDER BY NIVEL`;

            const result = await cds.run(sql, [td]);

            for (const rs of result) {
                let record = {};
                record.NIVEL = rs.NIVEL;
                record.NAPROBADOR = rs.NOMBREAPROBADOR;
                record.CANT = rs.CANT;
                record.ID_EST_LIB = rs.ID_EST_LIB;
                record.ID_USUARIO = rs.ID_USUARIO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getArrNivel", query: sql }
        }
        return outPut;
    };

    async function getEL(td) {
        let outPutResponse = [];
        try {
            const sql = `SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION
                     WHERE ID_TIPO_DOCUMENTO = ?`;

            const result = await cds.run(sql, [td]);

            for (const ge of result) {
                return ge.ID_EST_LIB;
            }
        } catch (e) {
            return { error: e.message, accion: "getEL", query: sql }
        }
    };

    async function getListDocumento(c, estLib, proxNivel) {
        let outPut = [];
        try {
            const sql = `SELECT ID_DOCUMENTO, MAX(NIVEL) FROM DB_INSTANCIA_APROBACION
                     WHERE ID_EST_LIB = 757 GROUP BY ID_DOCUMENTO`;
            const result = await cds.run(sql);

            for (const rs of result) {
                let record = {};
                record.ID = rs.ID_DOCUMENTO;
                record.NIVEL = rs.NIVEL;

                outPut.push(record);
            }

            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getListDocumento", query: sql }
        }
    };

    async function getUsername2(user) {
        try {
            const sql = `SELECT USERNAME FROM USUARIO
                     WHERE ID_USUARIO = ?`;
            const result = await cds.run(sql, [user]);

            for (const gu of result) {
                return gu.USERNAME;
            }
        } catch (e) {
            return { error: e.message, accion: "getUsername2", query: sql }
        }
    };

    async function getArrIdDocumentLibCodName(td, user) {
        try {
            const sql = `SELECT DOC.ID_DOCUMENTO FROM DOCUMENTO DOC
                     JOIN USUARIO USU ON USU.USERNAME = DOC.SIGUIENTELIBERADOR
                     WHERE DOC.ID_TIPO_DOCUMENTO = ? AND USU.ID_USUARIO = ?`;
            const result = await cds.run(sql, [td, user]);

            for (const ga of result) {
                let record = {};
                record.ID = ga.ID_DOCUMENTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getArrIdDocumentLibCodName", query: sql }
        }
        return outPut;
    };

    async function updateNivel(nivel, naprobador, est_lib, td, naprobadorOri, idUsuario, idUsuarioReemplazo) {
        let sql;

        try {
            // UPDATE en NIVELES
            sql = `
      UPDATE DB_NIVELES
      SET NIVEL = ?, NOMBREAPROBADOR = ?, ID_USUARIO = ?
      WHERE ID_EST_LIB = ? AND NIVEL = ?
    `;
            await cds.run(sql, [nivel, naprobador, idUsuario, est_lib, nivel]);

            // UPDATE en SUPLENTE
            sql = `
      UPDATE DB_SUPLENTE
      SET ID_USUARIO_TITULAR = ?, USUARIO_TITULAR = ?
      WHERE ID_USUARIO_TITULAR = ?
    `;
            await cds.run(sql, [idUsuario, naprobador, idUsuarioReemplazo]);

            return true;

        } catch (e) {
            return { error: e.message, accion: "updateNivel", query: sql }
        }
    };

    async function getArrIdDocumentLib(td, user) {
        try {
            const sql = `SELECT ID_DOCUMENTO FROM DOCUMENTO
                    WHERE ID_TIPO_DOCUMENTO = ?
                    AND SIGUIENTELIBERADOR = ?`;
            const result = await cds.run(sql, [td, user]);

            for (const ga of result) {
                let record = {};
                record.ID = ga.ID_DOCUMENTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getArrIdDocumentLib", query: sql }
        }
        return outPut;
    };

    async function updateDocumento1(user, td, user2) {
        let sql;

        try {
            const username = await getUsername2(user);
            const username2 = await getUsername2(user2);
            const arrIdDocument = await getArrIdDocumentLib(td, username2);

            if (arrIdDocument.length > 0) {
                for (let y = 0; y < arrIdDocument.length; y++) {
                    sql = `
          UPDATE DB_DOCUMENTO
          SET SIGUIENTELIBERADOR = ?
          WHERE ID_DOCUMENTO = ?
            AND SIGUIENTELIBERADOR = ?`;

                    await cds.run(sql, [username, arrIdDocument[y].ID, username2]);
                }

                return sql;
            }

        } catch (e) {
            return { error: e.message, accion: "updateDocumento1", query: sql }
        }
    };

    async function getArrIdDocument(td) {
        let outPut = [];
        let outPutResponse = [];

        try {
            sql = `SELECT ID_DOCUMENTO FROM DOCUMENTO
               WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [td]);

            for (const ga of result) {
                let record = {};
                record.ID = ga.ID_DOCUMENTO;

                outPutResponse.push(record);
                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getArrIdDocument", query: sql }
        }
        return outPut;
    };

    async function insertDocument(td, user) {
        let sql;
        try {
            const arrIdDocument = await getArrIdDocument(td);

            if (arrIdDocument.length > 0) {
                const username = await getUsername2(user);

                for (let y = 0; y < arrIdDocument.length; y++) {
                    sql = `
          UPDATE DOCUMENTO
          SET SIGUIENTELIBERADOR = ?
          WHERE ID_DOCUMENTO = ?
        `;
                    await cds.run(sql, [username, arrIdDocument[y].ID]);
                }
            }
            return "OK";

        } catch (e) {
            return { error: e.message, accion: "insertDocument", query: sql }
        }
    };

    async function procesaWorkFlow(arrWF, td) {
        console.log("OKAY OKAY, ESTO ES ARRWF", arrWF, "y esto es TD", td)
        let sql;
        const cant = arrWF.length;
        try {
            const exiLB = await existeLB(td);
            if (exiLB) {
                const arrLB = await getArrNivel(td);
                const cantExiste = arrLB.length;
                const estLib = await getEL(td);

                if (cant > cantExiste) {
                    for (let s = cantExiste; s < cant; s++) {
                        sql = `INSERT INTO DB_NIVELES VALUES ( ?, ?, ?, 1, ? )`;

                        await cds.run(sql, [
                            arrWF[s].NIVEL,
                            estLib,
                            arrWF[s].NOMBRE_USUARIO_APROBADOR,
                            arrWF[s].ID_USUARIO
                        ]);

                        const respExiste = await getListDocumento(estLib);

                        for (let l = 0; l < respExiste.length; l++) {
                            const niv = respExiste[l].NIVEL + 1;

                            if (arrWF[s].NIVEL === niv) {
                                const codName = await getUsername2(arrWF[s].ID_USUARIO);
                                sql = `
                UPDATE DB_DOCUMENTO
                SET SIGUIENTELIBERADOR = ?
                WHERE ID_DOCUMENTO = ?
              `;
                                await cds.run(sql, [codName, respExiste[l].ID]);
                            }
                        }
                    }
                }

                if (cantExiste > cant) {
                    outPutResponse.push("1Entro");
                    for (let s = cant; s < cantExiste; s++) {
                        sql = `
            DELETE FROM DB_NIVELES
            WHERE NIVEL = ?
              AND ID_EST_LIB = ?
              AND NOMBREAPROBADOR = ?
              AND ID_USUARIO = ?
          `;
                        await cds.run(sql, [arrLB[s].NIVEL, estLib, arrLB[s].NAPROBADOR, arrLB[s].ID_USUARIO]);

                        const arrIdDocument = await getArrIdDocumentLibCodName(td, arrLB[s].ID_USUARIO);
                        const flagUpdate = (arrIdDocument.length > 0) ? true : false;

                        if (flagUpdate) {
                            let strIdDoc = '(';
                            for (let k = 0; k < arrIdDocument.length; k++) {
                                strIdDoc += arrIdDocument[k].ID + ',';
                            }
                            strIdDoc = strIdDoc.slice(0, -1) + ')';

                            const rawSql = `
              UPDATE DB_DOCUMENTO
              SET SIGUIENTELIBERADOR = ''
              WHERE ID_DOCUMENTO IN ${strIdDoc}
            `;
                            await cds.run(rawSql);
                        }
                    }
                }

                for (let r = 0; r <= cant; r++) {
                    if (arrWF[r].NIVEL === arrLB[r].NIVEL && arrWF[r].ID_USUARIO === arrLB[r].ID_USUARIO) {
                    } else {
                        outPutResponse.push(arrLB[r]);
                        outPutResponse.push(arrWF[r]);
                        await updateNivel(
                            arrWF[r].NIVEL,
                            arrWF[r].NOMBRE_USUARIO_APROBADOR,
                            estLib,
                            td,
                            arrLB[r].NAPROBADOR,
                            arrWF[r].ID_USUARIO,
                            arrLB[r].ID_USUARIO
                        );
                        await updateDocumento1(arrWF[r].ID_USUARIO, td, arrLB[r].ID_USUARIO);
                    }
                }
            } else {
                if (cant > 0) {
                    for (let t = 0; t < cant; t++) {
                        const idESTL = await getSequence('ID_EST_LIB');

                        sql = `
            INSERT INTO DB_ESTRATEGIA_LIBERACION
            VALUES ( ?, 1, ? )
          `;
                        await cds.run(sql, [idESTL, td]);

                        sql = `
            INSERT INTO DB_NIVELES
            VALUES ( ?, ?, ?, 1 )
          `;
                        await cds.run(sql, [
                            arrWF[t].NIVEL,
                            idESTL,
                            arrWF[t].NOMBRE_USUARIO_APROBADOR
                        ]);

                        if (arrWF[t].NIVEL === 1) {
                            await insertDocument(td, arrWF[t].ID_USUARIO);
                        }
                    }
                }
                return 0;
            }

            return 0;
        } catch (e) {
            return 1;
        }
    };

    this.on('editTD', async (req) => {

        let respPropiedades = 0;
        let respMetadata = 0;
        let resp;

        try {
            const json = req.data.input;

            const arrPropiedades = json[0].arrPropiedades;
            const arrMetadata = json[0].arrMetadata;
            const arrWorkflow = json[0].arrWorkflow;

            console.log("esto llega:", arrPropiedades);

            respPropiedades = await updatePropiedades(arrPropiedades);

            const tipDoc = arrPropiedades[0].TIPO_DOCUENTO;
            const idNodo = arrPropiedades[0].ID_CATEGORIA_NODO;

            if (arrMetadata.length > 0) {
                respMetadata = await updateMetadata(arrMetadata, tipDoc, idNodo);
            }

            if (arrWorkflow.length > 0) {
                await procesaWorkFlow(arrWorkflow, tipDoc);
            }

            const result = respPropiedades + respMetadata;
            if (result > 0) {
                resp = "FALLO";
            } else {
                resp = "OK";
            }

            return resp;

        } catch (e) {
            return { error: e.message, accion: "editTD" }
        }
    });

    async function getExisteNodo(id_nodo) {
        try {
            const sql = `SELECT COUNT(*) AS ID FROM DB_PORTALES
                    WHERE ID_NODO_DETALLE = ?`;
            const result = await cds.run(sql, [id_nodo]);


            for (const ge of result) {
                const coun = ge.ID;
                if (coun > 0) {
                    return false;
                } else {
                    return true;
                }
            }
        } catch (e) {
            return false;
        }
        return false;
    };

    this.on('getListaArc', async (req) => {
        const { idCat } = req.data;
        let resp = [];
        let existe;
        try {
            const sql = `SELECT CAT.ID_CATEGORIA,
                                     CAT.ID_TIPO,
                                     DET.TITULO
                                FROM DB_CATEGORIA AS CAT
                     JOIN DB_DETALLE AS DET
                      ON DET.NODO_HIJO = CAT.ID_CATEGORIA
                     WHERE CAT.ID_PADRE = ? AND CAT.ID_TIPO = 3`;
            const result = await cds.run(sql, [idCat]);

            for (const rs of result) {
                let record = {};
                existe = await getExisteNodo(rs.ID_CATEGORIA);

                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO = rs.ID_TIPO;
                record.TITULO = rs.TITULO;
                record.SELECTED = false;

                if (existe === true) {
                    resp.push(record);
                }
            }
        } catch (e) {
            return resp;
        }
        return resp;
    });

    async function verificaVinc(idTD, nodo) {
        try {
            const sql = `SELECT DISTINCT ID_TIPO_DOCUMENTO FROM DB_VINCULACION
                     WHERE ID_NODO_VINCULA = ?`;
            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                const sValue = rs.ID_TIPO_DOCUMENTO;
                if (sValue !== idTD) {
                    return "FALLO"
                }
            }
            return "OK"
        } catch (e) {
            return "FALLO"
        }
    };

    this.on('verificaVinc', async (req) => {
        const { idTD, nodo } = req.data;
        const tipos = await verificaVinc(idTD, nodo);
        return tipos;
    });

    async function getRefencia(idNodo) {
        let record;
        try {
            const sql = `SELECT PATHSP, APP_DATOS, ID_CATEGORIA FROM DB_CATEGORIA
                     WHERE ID_CATEGORIA = (SELECT ID_CATEGORIA_ESPEJO FROM DB_CATEGORIA WHERE ID_CATEGORIA = ?)`;
            const result = await cds.run(sql, [idNodo]);

            for (const gf of result) {
                if (gf.APP_DATOS === 'API REST') {
                    record = gf.PATHSP.replace("/_api/web/folders/add(‘GASCO/", "");
                } else {
                    record = gf.PATHSP.replace("/_api/web/folders/add(‘GASCO/", "");
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getRefencia" }
        }
        return record;
    };

    this.on('getTDRefencia', async (req) => {
        const { idTD } = req.data
        let outPut = [];
        try {
            const sql = `SELECT * FROM DB_TIPO_DOCUMENTO 
                     WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idTD]);

            for (const gt of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = gt.ID_TIPO_DOCUMENTO;
                record.ID_NODO = gt.ID_NODO;
                record.ID_WF = gt.ID_WF;
                record.NOMBRE = gt.NOMBRE;
                record.DESCRIPCION = gt.DESCRIPCION;
                record.G_DIGITAL = gt.G_DIGITAL;
                record.DESCRIPCION_DIGITAL = gt.DESCRIPCION_DIGITAL;
                record.ORIGEN = gt.ORIGEN;
                record.REFERENCIA = await getRefencia(gt.ID_NODO)

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getTDRefencia" }
        }
        return outPut;
    });

    this.on('obtieneVinculacion', async (req) => {
        const { idCat } = req.data;
        let arr = [];
        try {

            const sql = `SELECT DISTINCT TD.NOMBRE, TD.DESCRIPCION, VIN.ID_VINCULACION FROM DB_TIPO_DOCUMENTO AS TD
                      INNER JOIN DB_VINCULACION AS VIN
                       ON VIN.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                      WHERE VIN.ID_NODO_VINCULA = ?`;
            const result = await cds.run(sql, [idCat])

            for (const rs of result) {
                let record = {};
                record.NOMBRE = rs.NOMBRE;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.ID_VINCULACION = rs.ID_VINCULACION;

                arr.push(record)
            }
        } catch (e) {
            return { error: e.message, accion: "obtieneVinculacion", query: sql }
        }
        return arr;
    });

    this.on('getNodosDinamicos', async (req) => {
        const { nodo } = req.data;
        let arrID = [];
        let arrFinal = [];

        arrID = await getEstructuraArriba(nodo, arrID);

        for (let j = 0; j < arrID.length; j++) {
            const resp = await cargaID(arrID[j].ID_CATEGORIA, arrID[j].ID_PADRE, arrID[j].ORIGEN);
            const recordMetadata = {};

            recordMetadata.ATRIBUTO = resp.ATRIBUTO;
            recordMetadata.TIPO_ATRIBUTO = resp.TIPO_ATRIBUTO;
            recordMetadata.VALUE = arrID[j].TITULO;
            recordMetadata.OBLIGATORIEDAD = "NO";

            arrFinal.push(recordMetadata);
        }
        return arrFinal;
    });

    this.on('getFiltros', async (req) => {
        const { idTD } = req.data;
        let outPut = []
        let record = {};
        try {
            const sql = `SELECT DISTINCT ID_TIPO_DOCUMENTO, ATRIBUTO, TIPO_ATRIBUTO, ORIGEN FROM DB_METADATA
                      WHERE ID_TIPO_DOCUMENTO = ? 
                      ORDER BY ORIGEN DESC`;
            const result = await cds.run(sql, [idTD]);

            for (const gf of result) {
                record.ID_TIPO_DOCUMENTO = gf.ID_TIPO_DOCUMENTO;
                record.ATRIBUTO = gf.ATRIBUTO;
                record.TIPO_ATRIBUTO = gf.TIPO_ATRIBUTO;
                record.ORIGEN = gf.ORIGEN;

                if (record.ATRIBUTO !== "FechaCarga") {
                    outPut.push(record);
                }
            }
        } catch (e) {
            return e.message;
        }
        return outPut;
    });

    this.on('getNombreTD', async (req) => {
        const { idTD } = req.data;
        let outPut = [];
        let sql;

        try {
            sql = `
      SELECT TD.NOMBRE, TD.DESCRIPCION
      FROM DB_TIPO_DOCUMENTO AS TD
      WHERE ID_TIPO_DOCUMENTO = ?
    `;
            const result = await cds.run(sql, [idTD]);

            for (const gn of result) {
                let record = {}
                record.NOMBRE = gn.NOMBRE,
                    record.DESCRIPCION = gn.DESCRIPCION

                outPut.push(record);
            }

            return outPut;

        } catch (e) {
            return { error: e.message, accion: "getNombreTD", query: sql }
        }
    });

    this.on('getMD', async (req) => {
        const { NA } = req.data.input;
        let sql;
        let outPut = [];
        try {
            sql = `SELECT DISTINCT TD.NOMBRE, MD.ATRIBUTO, TD.ID_TIPO_DOCUMENTO
             FROM DB_METADATA AS MD
               JOIN DB_TIPO_DOCUMENTO AS TD 
            ON TD.ID_TIPO_DOCUMENTO = MD.ID_TIPO_DOCUMENTO
               WHERE MD.ATRIBUTO LIKE UPPER(?) OR MD.ATRIBUTO LIKE (?)`;
            const result = await cds.run(sql, [`%${NA}%`, `%${NA}%`]);
            for (const gm of result) {
                let record = {};
                record.NOMBRETD = gm.NOMBRE;
                record.NOMBREATRIBUTO = gm.ATRIBUTO;
                record.ID_TIPO_DOCUMENTO = gm.ID_TIPO_DOCUMENTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getMD", query: sql }
        }
        return outPut;

    });

    this.on('insertMD', async (req) => {
        const { json } = req.data;
        console.log(json)
        const output = [];
        let sql;

        for (let i = 0; i < json.length; i++) {
            const ID_BUSQUEDA = await getIdSequence("ID_BUSQUEDA");
            console.log("esto es id busqueda", ID_BUSQUEDA)
            const ID_TIPO_DOCUMENTO = json[i].ID_TIPO_DOCUMENTO;
            const ATRIBUTO = json[i].ATRIBUTO;
            const ID_NODO = json[i].ID_NODO;
            const LABEL = json[i].LABEL;
            const ID_PORTAL = json[i].ID_PORTAL;

            try {
                sql = `INSERT INTO DB_NODOBUSQUEDA VALUES (?,?,?,?,?,?)`;
                await cds.run(sql, [
                    ID_BUSQUEDA,
                    ID_TIPO_DOCUMENTO,
                    ATRIBUTO,
                    ID_NODO,
                    LABEL,
                    ID_PORTAL
                ]);

                const resp = { RESULT: true, REASON: " " };
                output.push(resp);

            } catch (e) {
                const resp = { RESULT: false, REASON: e.message };
                output.push(resp);
            }
        }

        return output;
    }); //insertMD

    //getLista Revisar Carpeta

    this.on('getLabel', async (req) => {
        const { nodoTD } = req.data;
        let outPut = [];
        let sql;
        try {
            sql = `SELECT DISTINCT LABEL FROM DB_NODOBUSQUEDA
               WHERE ID_NODO = ?`;
            const result = await cds.run(sql, [nodoTD]);

            for (const rs of result) {
                let record = {};
                record.LABEL = rs.LABEL;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getLabel", query: sql }
        }
        return outPut;
    });

    async function getIdDocumento6(idTD, idCat) {
        let sql;
        let record;
        try {
            sql = `SELECT DOC.ID_DOCUMENTO AS ID_DOCUMENTO
               FROM DB_DOCUMENTO DOC
                INNER JOIN DB_DETALLE DET
                 ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
                WHERE DET.ID_TIPO_DOCUMENTO = ?
                AND DET.NODO_HIJO = ?`;
            const result = await cds.run(sql, [idTD, idCat]);

            for (const rs of result) {

                record = rs.ID_DOCUMENTO;
            }

            // if (result.length > 0){
            //     let record;
            //     record = gi.ID_DOCUMENTO
            // }
        } catch (e) {
            return { error: e.message, accion: "getIdDocumento6", query: sql }
        }
        return record;
    };

    async function getEsFavoritos(idCat, portalId, userId) {
        try {
            const sql = `SELECT COUNT(*) AS ID FROM DB_FAVORITOS WHERE ID_PORTAL = ?
                     AND ID_USUARIO = ?
                     AND ID_CATEGORIA = ?`;
            const result = await cds.run(sql, [portalId, userId, idCat]); //9999 ,  , 5000

            for (const rs of result) {
                if (rs.ID > 0) {
                    return true;
                }
            }
        } catch (e) {
            return false;
        }
    };

    async function getWF3(nodo) {
        let record;
        let estLib = (nodo);
        let sql;

        try {
            sql = `SELECT COUNT(*) AS ID FROM DB_NIVELES
                     WHERE ID_EST_LIB = ?`;
            const result = await cds.run(sql, [estLib]);

            for (const gw of result) {
                if (gw.ID > 0) {
                    record = true;
                } else {
                    record = false;
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getWF3", query: sql }
        }
        return record;
    };

    async function getUrl2(id_categoria) { //5000
        let sql;
        let sValue = [];
        try {
            sql = `SELECT  
        VER.URL_DETALLE    AS URL_DETALLE,
        DET.TITULO         AS TITULO,
        DET.ID_DETALLE     AS ID_DETALLE,
        VER.SIZE           AS SIZE,
        MAX(VER.VERSION)   AS VERSION
        FROM DB_DETALLE DET
         INNER JOIN DB_VERSIONAMIENTO VER
        ON VER.ID_DETALLE = DET.ID_DETALLE
        WHERE DET.NODO_HIJO = ?
        GROUP BY 
        VER.URL_DETALLE,
        DET.TITULO,
        DET.ID_DETALLE,
        VER.SIZE`;
            const result = await cds.run(sql, [id_categoria]);

            for (const rs of result) {
                let record = {};

                record.URL = rs.ID_DETALLE;
                record.TITULO = rs.TITULO;
                record.ID_DETALLE = rs.ID_DETALLE;
                record.SIZE = rs.SIZE;
                record.VERSION = rs.VERSION;

                sValue.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getUrl2", query: sql }
        }
        return sValue;
    };

    async function getRolVisualiza1(td, idUsuario, acc) { //700 112 , 3
        try {
            const sql = `SELECT COUNT(*) AS ID FROM DB_ROLES ROL
                     INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
                      ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES ROLXACC
                      ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROL.ID_TIPO_DOCUMENTO = ? AND ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = ?`;

            const result = await cds.run(sql, [td, idUsuario, acc]);

            const count = result?.[0]?.ID ?? 0;

            return count > 0;
        } catch (e) {
            return false;
        }
    };

    this.on('getBusquedaArc', async (req) => {
        const { json } = req.data;
        const data = Array.isArray(json) ? json[0] : json;
        const outPut = { TOTAL_REGISTROS: 0, DATA: [] };

        const ID_PORTAL = data.ID_PORTAL;
        const ID_USUARIO = data.ID_USUARIO;
        const ID_CATEGORIA = data.ID_CATEGORIA;
        const INICIO_PAGINA = data.INICIO_PAGINA;
        const FIN_PAGINA = data.FIN_PAGINA;

        const diff = FIN_PAGINA - INICIO_PAGINA;

        try {

            sql = `
      SELECT DISTINCT 
        POR.TITULO,
        CAT.DESCRIPCION,
        DOC.UFH_CREAR,
        DET.URL,
        TD.ID_TIPO_DOCUMENTO,
        CAT.ID_CATEGORIA,
        CAT.ID_TIPO_VISUALIZADOR
      FROM DB_PORTALES POR
      JOIN DB_DETALLE DET 
        ON POR.ID_NODO_DETALLE = DET.NODO_HIJO
      JOIN DB_TIPO_DOCUMENTO TD 
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      JOIN DB_CATEGORIA CAT 
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      JOIN DB_DOCUMENTO DOC 
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      WHERE POR.ID_PORTAL = ? 
        AND POR.ID_NODO_CONTENIDO = ?
      ORDER BY POR.TITULO ASC`;

            const countResult = await cds.run(sql, [ID_PORTAL, ID_CATEGORIA]);
            outPut.TOTAL_REGISTROS = countResult.length;

            const sqlPag = `${sql} LIMIT ${diff} OFFSET ${INICIO_PAGINA}`;

            const result = await cds.run(sqlPag, [ID_PORTAL, ID_CATEGORIA]);

            for (const rs of result) {
                let record = {};
                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.ID_DOCUMENTO = await getIdDocumento6(rs.ID_TIPO_DOCUMENTO, rs.ID_CATEGORIA); //700 5000 - Check
                record.TITULO = rs.TITULO;
                record.DOCUMENTO = true;
                record.TIPO = "Documento";
                record.FAVORITO = await getEsFavoritos(rs.ID_CATEGORIA, ID_PORTAL, ID_USUARIO); // 5000 - 9999 -
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = await getWF3(rs.ID_TIPO_DOCUMENTO);
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(rs.UFH_CREAR);
                record.ICONO = "sap-icon://document";
                record.URL = (rs.ID_TIPO_VISUALIZADOR === 3) ? await getUrl2(rs.ID_CATEGORIA) : [];
                record.DESCARGAR = await getRolVisualiza1(rs.ID_TIPO_DOCUMENTO, ID_USUARIO, 4);

                const rolVisualiza = await getRolVisualiza1(rs.ID_TIPO_DOCUMENTO, ID_USUARIO, 3);
                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }

            return outPut;

        } catch (e) {
            return { error: e.message, accion: "getBusquedaArc", query: sql }
        }
    });

    this.on('getBusquedaAllArc', async (req) => {
        const { nodoPortal, value } = req.data.input;
        const arr = [];
        let sql;

        try {
            sql = `
      SELECT DISTINCT
        POR.TITULO,
        CAT.DESCRIPCION,
        DOC.UFH_CREAR,
        DET.URL,
        TD.ID_TIPO_DOCUMENTO,
        CAT.ID_CATEGORIA
      FROM DB_PORTALES POR
      JOIN DB_DETALLE DET
        ON POR.ID_NODO_DETALLE = DET.NODO_HIJO
      JOIN DB_TIPO_DOCUMENTO TD
        ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
      JOIN DB_CATEGORIA CAT
        ON CAT.ID_CATEGORIA = DET.NODO_HIJO
      JOIN DB_DOCUMENTO DOC
        ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
      WHERE POR.ID_PORTAL = ?
        AND POR.TITULO LIKE ?
      ORDER BY POR.TITULO ASC
    `;

            const result = await cds.run(sql, [nodoPortal, `%${value}%`]);

            for (const gb of result) {
                const record = {};
                record.TITULO = gb.TITULO;
                record.DESCRIPCION = gb.DESCRIPCION;
                record.UFH_CARGA = orderFecha(gb.UFH_CREAR);
                record.URL = gb.URL;
                record.WF = await getWF3(gb.ID_TIPO_DOCUMENTO);
                record.IDCATEGORIA = gb.ID_CATEGORIA;
                arr.push(record);
            }

            return arr;

        } catch (e) {
            return { error: e.message, accion: "getBusquedaAllArc", query: sql }
        }
    });

    async function getTDBusqueda(nodoTD) {
        let outPut = [];
        try {
            const sql = `SELECT DISTINCT ID_TIPO_DOCUMENTO, ATRIBUTO FROM DB_NODOBUSQUEDA
                     WHERE ID_NODO = ?`;
            const result = await cds.run(sql, [nodoTD]);

            for (const gt of result) {
                let record = {};

                record.NOMBREATRIBUTO = gt.ATRIBUTO;
                record.ID_TIPO_DOCUMENTO = gt.ID_TIPO_DOCUMENTO;
                outPut.push(record);
            }
        } catch (e) {
            return false;
        }
        return outPut;
    };

    this.on('getBusquedaFiltros', async (req) => {
        const { nodoTD, NA } = req.data.input;
        const td = await getTDBusqueda(nodoTD);
        console.log("esto es td", td)
        let sql;
        let outPut = [];

        if (td.length === 0) {
            return outPut;
        } else {
            try {
                const sValue = NA.toUpperCase();
                for (let q = 0; q < td.length; q++) {
                    sql = `SELECT DISTINCT
          DET.TITULO AS NOMBREARCHIVO,
          CAT.APP_DATOS AS APP_DATOS,
          PROC.DESCRIPCION_PROCESO AS DESCRIPCION_PROCESO,
          TD.DESCRIPCION AS TD_DESCRIPCION,
          DET.URL AS URL,
          DET.TITULO AS TITULOURL,
          CAT.DESCRIPCION AS CAT_DESCRIPCION,
          CAT.ID_CATEGORIA AS ID_CATEGORIA,
          DOC.UFH_CREAR AS UFH_CREAR
       FROM DB_METADATA_VALUE AS MDV
       JOIN DB_TIPO_DOCUMENTO AS TD
         ON TD.ID_TIPO_DOCUMENTO = MDV.ID_TIPO_DOCUMENTO
       JOIN DB_DETALLE AS DET
         ON DET.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
       JOIN DB_DOCUMENTO AS DOC
         ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
       JOIN DB_PROCESOS AS PROC
         ON PROC.TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
       JOIN DB_CATEGORIA AS CAT
         ON CAT.ID_CATEGORIA = DET.NODO_HIJO
       WHERE UPPER(MDV.VALUE) LIKE ?
         AND MDV.ATRIBUTO = ?
         AND MDV.ID_TIPO_DOCUMENTO = ?
         LIMIT 20`;
                    const result = await cds.run(sql, [`%${sValue}%`, td[q].NOMBREATRIBUTO, td[q].ID_TIPO_DOCUMENTO]);

                    for (const gb of result) {
                        const record = {};
                        record.NOMBREARCHIVO = gb.NOMBREARCHIVO;
                        record.APP = gb.APP_DATOS;
                        record.PROCESO = gb.DESCRIPCION_PROCESO;
                        record.NOMBRETD = gb.TD_DESCRIPCION;
                        record.URL = gb.URL;
                        record.TITULOURL = gb.TITULOURL;
                        record.DESCRIPCION = gb.CAT_DESCRIPCION;
                        record.IDCATEGORIA = gb.ID_CATEGORIA;
                        record.UFH_CARGA = orderFecha(gb.UFH_CREAR);
                        record.WF = await getWF3(td[q].ID_TIPO_DOCUMENTO);

                        if (record.PROCESO !== 'PRUEBA_VCH') {
                            outPut.push(record);
                        }
                    }

                }
            } catch (e) {
                return { error: e.message, accion: "getBusquedaFiltros", query: sql }
            }
            return outPut;
        }
    });

    this.on('getMetadata', async (req) => {
        const { json } = req.data;

        const TIPO_DOCUMENTO = json[0].TIPO_DOCUMENTO;
        const ATRIBUTO = json[0].ATRIBUTO;
        const TIPO_ATRIBUTO = json[0].TIPO_ATRIBUTO;

        let outPut = [];
        let record = {};
        let sql;

        try {

            sql = `SELECT DISTINCT VALUE FROM DB_METADATA_VALUE WHERE ID_TIPO_DOCUMENTO = ?
                                                                      AND ATRIBUTO = ? 
                                                                      AND TIPO_ATRIBUTO = ?`;

            const result = await cds.run(sql, [TIPO_DOCUMENTO, ATRIBUTO, TIPO_ATRIBUTO]);

            for (const rs of result) {

                record.VALUE = rs.VALUE;
                outPut.push(record);
            }

            return outPut;

        } catch (e) {
            return { error: e.message, accion: "getMetadata", query: sql }
        }
    });

    this.on('getListaProcesos', async () => {
        let sql;
        let arr = [];

        try {
            sql = `SELECT DISTINCT
            PRO.ID_ADM_PORTAL           AS ID_ADM_PORTAL,
            ADM.NOMBRE_PORTAL           AS NOMBRE_PORTAL,
            PRO.ID_PROCESO              AS ID_PROCESO,
            PRO.DESCRIPCION_PROCESO     AS DESCRIPCION_PROCESO,
            TD.ID_TIPO_DOCUMENTO        AS ID_TIPO_DOCUMENTO,
            TD.NOMBRE                   AS NOMBRE
            FROM DB_PROCESOS AS PRO
             JOIN DB_TIPO_DOCUMENTO AS TD
              ON PRO.TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
             JOIN DB_ADM_PORTAL AS ADM
              ON ADM.ID_ADM_PORTAL = PRO.ID_ADM_PORTAL
            ORDER BY PRO.ID_PROCESO ASC`;

            const result = await cds.run(sql);

            for (const rs of result) {
                let record = {};
                record.ID_ADM_PORTAL = rs.ID_ADM_PORTAL
                record.NOMBRE_PORTAL = rs.NOMBRE_PORTAL
                record.ID_PROCESO = rs.ID_PROCESO
                record.DESCRIPCION_PROCESO = rs.DESCRIPCION_PROCESO
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO
                record.NOMBRE = rs.NOMBRE

                arr.push(record);
            }


        } catch (e) {
            return { error: e.message, accion: "getListaProcesos", query: sql };
        }
        return arr;
    });

});
