/////////////////////////////
///////////SERVICES//////////
/////////////////////////////

require("dotenv").config();

const cds = require("@sap/cds");
const { json } = require("@sap/cds/lib/compile/parse");
const { response } = require("express");
const nodemailer = require("nodemailer");


module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    function orderFecha(fecha) {
        if (!fecha) {
            return "";
        }

        const fechaTexto = String(fecha).split("T")[0];
        const partesGuion = fechaTexto.split("-");
        let newFecha = "";

        if (partesGuion.length === 3) {
            newFecha =
                partesGuion[2] + "-" +
                partesGuion[1] + "-" +
                partesGuion[0];
        } else {
            const partesPunto = fechaTexto.split(".");
            if (partesPunto.length === 3) {
                newFecha =
                    partesPunto[2] + "-" +
                    partesPunto[1] + "-" +
                    partesPunto[0];
            } else {
                newFecha = fechaTexto;
            }
        }

        return newFecha;
    }

    function parseAlmacenamientoToIds(almValue) {
        if (!almValue) {
            return [];
        }

        // Espera strings tipo: "IN (1,2,3)"
        const match = String(almValue).match(/\(([^)]+)\)/);
        if (!match || !match[1]) {
            return [];
        }

        return match[1]
            .split(",")
            .map(v => Number(String(v).trim()))
            .filter(v => Number.isInteger(v) && v > 0);
    }

    async function getIdSequence(id) {
        let record = "";

        try {
            const sql = `SELECT ${id}.NEXTVAL AS ID FROM DUMMY`;
            const result = await cds.run(sql);

            for (const rs of result) {
                record = rs.ID;
            }
        } catch (e) {
            return sql;
        }
        return record;
    }

    this.on("getDetVis", async (req) => {
        const { Almacenamiento, fechaInicial, fechaTope } = req.data;
        console.log("HEY")

        let sql;
        let outPut = [];

        try {
            const idsAlmacenamiento = parseAlmacenamientoToIds(Almacenamiento);

            if (!fechaInicial || !fechaTope) {
                return [];
            }

            if (idsAlmacenamiento.length === 0) {
                return [];
            }

            const placeholders = idsAlmacenamiento.map(() => "?").join(",");

            sql = `SELECT DISTINCT
                      DET.TITULO AS TITULO,
                      USU.NOMBRE AS NOMBRE,
                      DOC.UFH_CREAR AS UFH_CARGA,
                      TD.NOMBRE AS TD_NOMBRE,
                      DETVIS.FECHA_VENCIMIENTO AS FECHA_VENCIMIENTO,
                      TA.NOMBRE_ALMACENAMIENTO AS NOMBRE_ALMACENAMIENTO,
                      DETVIS.ID_PROVEEDORES_ALMACENAMIENTO AS ID_PROVEEDORES_ALMACENAMIENTO
                   FROM DB_DETALLE AS DET
                   INNER JOIN DB_TIPO_DOCUMENTO AS TD
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
                   WHERE DETVIS.FECHA_VENCIMIENTO BETWEEN ? AND ?
                     AND DETVIS.TIPO_ALMACENAMIENTO IN (${placeholders})
                   ORDER BY DETVIS.FECHA_VENCIMIENTO ASC`;

            const params = [fechaInicial, fechaTope, ...idsAlmacenamiento];
            const result = await cds.run(sql, params);

            for (const rs of result) {
                let record = {};
                record.NOMBREARC = rs.TITULO;
                record.NOMBREUSU = rs.NOMBRE;
                record.FECHA_CARGA = orderFecha(rs.UFH_CARGA);
                record.NOMBRETIPDOC = rs.TD_NOMBRE;
                record.FECHA_VENCIMIENTO = orderFecha(rs.FECHA_VENCIMIENTO);
                record.NOMBRE_ALMACENAMIENTO = rs.NOMBRE_ALMACENAMIENTO;
                record.ID_PROVEEDORES_ALMACENAMIENTO = rs.ID_PROVEEDORES_ALMACENAMIENTO;

                outPut.push(record);
            }
        } catch (e) {
            return {
                error: e.message,
                accion: "getDetVis",
                query: sql
            };
        }

        return outPut;
    });

    this.on("getAyuda", async () => {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT TITULO, URL FROM DB_AYUDA_VIDEOS ORDER BY ID_AYUDA_VIDEOS`;
            const result = await cds.run(sql);

            for (const rs of result) {
                let record = {};
                record.TITULO = rs.TITULO;
                record.URL = rs.URL;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getAyuda", query: sql };
        }
        return outPut;
    });

    this.on("getAmbiente", async () => {
        let sql;

        try {
            sql = `SELECT PATH FROM DB_PATHSP`;

            const result = await cds.run(sql);

            for (const rs of result) {
                return rs.PATH;
            }
        } catch (e) {
            return 1; //GASCO_PRD
        }
        return 1; //GASCO_PRD
    });

    async function getDatosVisitas(idVisitas) {
        let sql;

        try {
            sql = `SELECT ID_USUARIO, ID_PORTAL FROM DB_VISITAS
               WHERE ID_VISITAS = ?`;
            const result = await cds.run(sql, [idVisitas]);

            for (const rs of result) {
                let record = {};
                record.ID_USUARIO = rs.ID_USUARIO;
                record.ID_PORTAL = rs.ID_PORTAL;
                return record;
            }
        } catch (e) {
            return { error: e.message, accion: "getDatosVisita", query: sql };
        }
    }

    async function getRolVisualiza(td, idUsuario, acc) {
        let sql;

        try {
            sql = `SELECT DISTINCT COUNT(*) AS TOTAL FROM DB_ROLES AS ROL
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                 ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                 ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
               WHERE ROL.ID_TIPO_DOCUMENTO = ?
                AND ROLXUSU.ID_USUARIO = ?
                AND ROLXACC.ID_ACCION = ?`;
            const result = await cds.run(sql, [td, idUsuario, acc]);

            for (const rs of result) {
                if (rs.TOTAL > 0) {
                    return true;
                } else {
                    return false;
                }
            }
        } catch (e) {
            return false;
        }
    }

    function getQuery(idPadre) {
        const orderBy = Number(idPadre) === 457471
            ? "CAT.ID_CATEGORIA ASC"
            : "CAT.TITULO ASC";

        const sql = `
        SELECT
            CAT.ID_CATEGORIA,
            CAT.TITULO,
            CAT.ID_TIPO_VISUALIZADOR,
            CAT.ESTADO,
            TV.NOMBRE AS TIPO_NODO,
            CAT.ID_PADRE
        FROM DB_CATEGORIA CAT
        INNER JOIN DB_TIPO_VISUALIZADOR TV
            ON TV.ID_TIPO_VISUALIZADOR = CAT.ID_TIPO_VISUALIZADOR
        WHERE CAT.ESTADO = 'Activo'
          AND CAT.ID_PADRE = ?
        ORDER BY ${orderBy}
    `;

        return { sql, params: [idPadre] };
    }

    this.on("getRecientes", async (req) => {
        const { json } = req.data;
        let sql;
        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: [],
        };
        const idVisitas = json.ID_VISITAS;
        const marca = json.MARCA;
        const rInicio = json.INICIO_PAGINA;
        const rFin = json.FIN_PAGINA;
        const diff = rFin - rInicio;

        let queryPag = " limit " + diff + " offset " + rInicio;

        const jsonDatos = await getDatosVisitas(idVisitas);

        try {
            sql = `SELECT DISTINCT DET.TITULO           AS TITULO,
                               VER.URL_DETALLE      AS URL, 
                               TD.NOMBRE            AS NOMBRE_TIPO_DOCUMENTO,
                               VER.FECHA_CARGA      AS FECHA_CARGA,
                               REC.FECHA            AS FECHA_VISITA, 
                               REC.HORA             AS HORA_VISITA,
                               MAX (VER.VERSION)    AS VERSION,
                               VER.SIZE             AS SIZE,
                               DET.ID_DETALLE       AS ID_DETALLE, 
                               DET.TYPE             AS FORMATO,
                               TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                               DET.NODO_HIJO        AS ID_CATEGORIA,
                               FORM.MYMETYPE        AS MYME_TYPE
                FROM DB_RECIENTES AS REC
                 INNER JOIN DB_DETALLE AS DET
                  ON DET.ID_DETALLE = REC.ID_DETALLE
                 INNER JOIN DB_FORMATOS AS FORM
                  ON lower(FORM.NOMBRE_FORMATO)=lower(DET.TYPE)
                 INNER JOIN DB_CATEGORIA AS CAT
                  ON CAT.ID_CATEGORIA = DET.NODO_HIJO
                 INNER JOIN DB_VISITAS AS VIS
                  ON VIS.ID_VISITAS = REC.ID_VISITAS
                 INNER JOIN DB_TIPO_DOCUMENTO AS TD
                  ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
                 INNER JOIN DB_DOCUMENTO AS DOC
                  ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
                 INNER JOIN DB_VERSIONAMIENTO AS VER
                  ON VER.ID_DETALLE = DET.ID_DETALLE
                WHERE VIS.ID_USUARIO = ${jsonDatos.ID_USUARIO} AND VIS.ID_PORTAL = ${jsonDatos.ID_PORTAL}
                GROUP BY DET.TITULO, VER.URL_DETALLE,
                         TD.NOMBRE, VER.FECHA_CARGA,
                         REC.FECHA, REC.HORA,
                         VER.SIZE, DET.ID_DETALLE,
                         DET.TYPE, TD.ID_TIPO_DOCUMENTO,
                         DET.NODO_HIJO, FORM.MYMETYPE
                ORDER BY REC.FECHA DESC, REC.HORA DESC`;

            const rset = await cds.run(sql);
            const rowCount = rset.length;
            outPut.TOTAL_REGISTROS = rowCount;
            const queryFinal = sql + queryPag;
            const result = await cds.run(queryFinal);

            for (const rs of result) {
                let record = {};
                record.TITULO = rs.TITULO;
                record.URL = rs.URL;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;
                record.FECHA_CARGA = orderFecha(rs.FECHA_CARGA);
                record.FECHA_VISITA = orderFecha(rs.FECHA_VISITA);
                record.HORA_VISITA = rs.HORA_VISITA;
                record.ICONO = await getIconoDocumento(rs.FORMATO);

                record.VERSION = rs.VERSION;
                record.SIZE =
                    rs.SIZE === null || rs.SIZE === ""
                        ? "-"
                        : Math.round((rs.SIZE / 1000).toFixed(1)) + " KB";
                record.ID_DETALLE = rs.ID_DETALLE;
                record.DESCARGA = await getRolVisualiza(
                    rs.ID_TIPO_DOCUMENTO,
                    jsonDatos.ID_USUARIO,
                    4,
                );
                record.MAYOR = true;
                record.FORMATO = rs.FORMATO;
                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.MYME_TYPE = rs.MYME_TYPE;
                record.ACTIVO = await getActivo(rs.VERSION, rs.ID_DETALLE);

                if (record.ACTIVO) {
                    outPut.DATA.push(record);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getRecientes", query: sql };
        }

        outPut.DATA.forEach(function (element) {
            const fecha = element.FECHA_VISITA;
            const hora = element.HORA_VISITA;

            const anio = Number(fecha.split("-")[2]);
            const mes = Number(fecha.split("-")[1]) - 1;
            const dia = Number(fecha.split("-")[0]);

            const horas = Number(hora.split(":")[0]);
            const minuto = Number(hora.split(":")[1]);
            const segundo = Number(hora.split(":")[2]);

            const fechaHora = new Date(anio, mes, dia, horas, minuto, segundo);
            element.ORDEN = fechaHora.getTime();
        });

        outPut.DATA.sort(function (a, b) {
            if (a.ORDEN > b.ORDEN) {
                return -1;
            }
            if (a.ORDEN < b.ORDEN) {
                return 1;
            }
            return 0;
        });

        for (let f = 0; f < outPut.DATA.length; f++) {
            if (outPut.DATA[f].MAYOR) {
                outPut.DATA.forEach(function (elementM, index) {
                    if (outPut.DATA[f].ID_DETALLE === elementM.ID_DETALLE) {
                        if (outPut.DATA[f].ORDEN > elementM.ORDEN) {
                            outPut.DATA[index].MAYOR = false;
                        }
                    }
                });
            } else {
                continue;
            }
        }

        let arrayFianl = [];
        outPut.DATA.forEach(function (element2) {
            if (element2.MAYOR) {
                arrayFianl.push(element2);
            }
        });

        arrayFianl.sort(function (a, b) {
            if (a.ORDEN > b.ORDEN) {
                return -1;
            }
            if (a.ORDEN < b.ORDEN) {
                return 1;
            }
            return 0;
        });

        if (marca === "X") {
            let arrayConMarca = [];

            let num = 0;

            if (arrayFianl.length > 5) {
                num = 6;
            } else {
                num = arrayFianl.length;
            }

            for (let n = 0; n < num; n++) {
                arrayConMarca.push(arrayFianl[n]);
            }
            arrayFianl = arrayConMarca;
        }
        outPut.DATA = arrayFianl;
        return outPut;
    });

    this.on("datosUserPortal", async (req) => {
        const { CORREO } = req.data;
        let sql;

        try {
            sql = `SELECT USU.NOMBRE AS NOMBRE,
                      USU.USERNAME   AS USERNAME,
                      USU.CORREO     AS CORREO,
                      USU.ID_USUARIO AS ID_USUARIO,
                      USU.APELLIDO   AS APELLIDO
                FROM DB_USUARIO AS USU
               WHERE USU.CORREO = ?`;
            const result = await cds.run(sql, [CORREO]);

            for (const rs of result) {
                let outPut = {};
                outPut.NOMBRE = rs.NOMBRE + " " + rs.APELLIDO;
                outPut.USERNAME = rs.USERNAME;
                outPut.CORREO = rs.CORREO;
                outPut.ID_USUARIO = rs.ID_USUARIO;

                return outPut;
            }
        } catch (e) {
            return { error: e.message, accion: "datosUserPortal", query: sql };
        }
    });

    this.on("portalesPorUsuario", async (req) => {
        const { ID_USUARIO } = req.data;
        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT userPortal.ID_PORTAL AS NODO_PORTAL,
                               user.NOMBRE          AS NOMBRE,
                               cat.TITULO           AS NOMBREPORTAL,
                               cat.URL_ICONO        AS ICONOPORTAL
               FROM DB_USUARIO_PORTAL AS userPortal
               JOIN DB_USUARIO AS user
                ON user.ID_USUARIO = userPortal.ID_USUARIO 
               JOIN DB_CATEGORIA AS cat 
                ON cat.ID_CATEGORIA = userPortal.ID_PORTAL 
               WHERE userPortal.ID_USUARIO = ?`;

            const result = await cds.run(sql, [ID_USUARIO]);

            for (const rs of result) {
                let record = {};
                record.NOMBREPORTAL = rs.NOMBREPORTAL;
                record.NODO_PORTAL = rs.NODO_PORTAL;
                record.ICONOPORTAL = rs.ICONOPORTAL;
                record.REPORTE_CUSTOM = rs.NODO_PORTAL === 283 ? true : false;
                record.ID_CATEGORIA_REPORTE_CUSTOM =
                    rs.NOMBREPORTAL === 283 ? 16434 : null;

                outPut.push(record);
            }
            return outPut;
        } catch (e) {
            return { error: e.message, accion: "portalesPorUsuario", query: sql };
        }
    });

    function getQuery(idPadre) {
        const orderBy = Number(idPadre) === 457471
            ? "CAT.ID_CATEGORIA ASC"
            : "CAT.TITULO ASC";

        const sql = `
        SELECT
            CAT.ID_CATEGORIA,
            CAT.TITULO,
            CAT.ID_TIPO_VISUALIZADOR,
            CAT.ESTADO,
            TV.NOMBRE AS TIPO_NODO,
            CAT.ID_PADRE
        FROM DB_CATEGORIA CAT
        INNER JOIN DB_TIPO_VISUALIZADOR TV
            ON TV.ID_TIPO_VISUALIZADOR = CAT.ID_TIPO_VISUALIZADOR
        WHERE CAT.ESTADO = 'Activo'
          AND CAT.ID_PADRE = ?
        ORDER BY ${orderBy}
    `;

        return { sql, params: [idPadre] };
    }

    function iconoSegunTipoNodo(idTipo) {
        const prefijo = "sap-icon://";
        let icono;

        switch (Number(idTipo)) {
            case 4:
                icono = prefijo + "add-folder";
                break;
            case 7:
                icono = prefijo + "browse-folder";
                break;
            case 8:
                icono = prefijo + "work-history";
                break;
            default:
                icono = prefijo + "folder-full";
        }

        return icono;
    }

    function estadoNodo(estado) {
        let enabled = false;

        if (estado === "Activo") {
            enabled = true;
        }

        return enabled;
    }

    function enbledLinkNodoContenedor(idTipoVisualizador) {
        let enabled = false;

        if (
            Number(idTipoVisualizador) === 4 ||
            Number(idTipoVisualizador) === 7 ||
            Number(idTipoVisualizador) === 8
        ) {
            enabled = true;
        }

        return enabled;
    }

    async function ejecutaTX(sql, params) {
        let hijos = [];

        try {
            const result = await cds.run(sql, params);

            for (const rs of result) {
                const idTipoVisualizador = Number(rs.ID_TIPO_VISUALIZADOR);

                let json = {};
                json.ID_CATEGORIA = Number(rs.ID_CATEGORIA);
                json.TITULO = rs.TITULO;
                json.ICONO = iconoSegunTipoNodo(idTipoVisualizador);
                json.ID_TIPO_VISUALIZADOR = idTipoVisualizador;
                json.ENABLED = estadoNodo(rs.ESTADO);
                json.TIPO_NODO = rs.TIPO_NODO;
                json.ID_PADRE = Number(rs.ID_PADRE);
                json.SELECCIONABLE = enbledLinkNodoContenedor(idTipoVisualizador);
                json.NIVEL = 0;
                json.BREADBCRUMS = {
                    LINKS: [],
                    CURRENT_LOCATION_TEXT: ""
                };
                json.NODOS = [];

                hijos.push(json);
            }

            return hijos;
        } catch (e) {
            return { error: e.message, accion: "ejecutaTX", query: sql };
        }
    }

    async function getDataNodo(nodos, inicio, hijos, nivel, state) {
        let nivelFuncion = nivel;

        if (nodos.length > 0) {
            state.niveles++;
        }

        for (const nodo of nodos) {
            nodo.NIVEL = nivelFuncion;

            const queryNodo = getQuery(nodo.ID_CATEGORIA);
            const isNodos = await ejecutaTX(queryNodo.sql, queryNodo.params);

            if (!Array.isArray(isNodos)) {
                return isNodos;
            }

            state.breadcrums.push({
                TEXT_LINK: nodo.TITULO,
                ID_CATEGORIA: nodo.ID_CATEGORIA,
                ID_TIPO_VISUALIZADOR: nodo.ID_TIPO_VISUALIZADOR,
                ENABLED: enbledLinkNodoContenedor(nodo.ID_TIPO_VISUALIZADOR),
                TIPO_NODO: nodo.TIPO_NODO,
                NIVEL: nivelFuncion
            });

            for (const elementB of state.breadcrums) {
                if (nodo.ID_CATEGORIA !== elementB.ID_CATEGORIA) {
                    if (elementB.NIVEL >= nodo.NIVEL || elementB.NIVEL >= nivelFuncion) {
                        elementB.DELETE = true;
                    }

                    nodo.BREADBCRUMS.LINKS.push(elementB);

                } else if (nodo.ID_CATEGORIA === elementB.ID_CATEGORIA) {
                    nodo.BREADBCRUMS.CURRENT_LOCATION_TEXT = nodo.TITULO;
                }
            }

            if (isNodos.length === 0) {
                delete nodo.NODOS;
            } else {
                nivel++;
            }

            let newArray = [];

            for (const posEliminar of nodo.BREADBCRUMS.LINKS) {
                if (posEliminar.DELETE !== true) {
                    newArray.push(posEliminar);
                }
            }

            nodo.BREADBCRUMS.LINKS = newArray;
            nodo.BREADBCRUMS = JSON.stringify(nodo.BREADBCRUMS);

            if (inicio) {
                state.arbol.push(nodo);
            } else {
                hijos.push(nodo);
            }

            if (isNodos.length > 0) {
                await getDataNodo(isNodos, false, nodo.NODOS, nivel, state);
            }
        }
    }

    async function insertVisita(json) {
        let sql;

        const idPadre = Number(json.ID_CATEGORIA_PADRE);
        const fecha = json.FECHA;
        const hora = json.HORA;
        const idUsuario = Number(json.ID_USUARIO);
        const generaVisita = json.GENERA_VISITA;

        if (generaVisita) {
            const idVisita = await getIdSequence("ID_VISITAS");
            console.log(idVisita)

            try {
                sql = `
                INSERT INTO DB_VISITAS
                VALUES (?, ?, ?, ?, ?)
            `;

                await cds.run(sql, [idVisita, idUsuario, fecha, hora, idPadre]);

                return idVisita;
            } catch (e) {
                return { error: e.message, accion: "insertVisita", query: sql };
            }
        }

        return "";
    }

    this.on("arbolDeNavegacionPortal", async (req) => {
        const { json } = req.data;
        const idPadre = Number(json.ID_CATEGORIA_PADRE);

        let arrayNiveles = [];

        const state = {
            arbol: [],
            breadcrums: [],
            niveles: 0
        };

        try {
            const queryNodo = getQuery(idPadre);
            const nodos = await ejecutaTX(queryNodo.sql, queryNodo.params);

            if (!Array.isArray(nodos)) {
                return nodos;
            }

            for (const element of nodos) {
                let nod = {};
                nod.NODOS = [];

                await getDataNodo([element], true, nod, 0, state);

                arrayNiveles.push(state.niveles);
                state.niveles = 0;
                state.breadcrums = [];
            }

            arrayNiveles.sort(function (a, b) {
                return b - a;
            });

            return {
                NIVELES: arrayNiveles[0] || 0,
                ARBOL: state.arbol,
                ID_VISITA: await insertVisita(json)
            };

        } catch (e) {
            return { error: e.message, accion: "arbolDeNavegacionPortal" };
        }
    });

    async function getUserAdmin(json) {
        const idUsuario = json.ID_USUARIO;
        const idPortal = json.ID_PORTAL;
        let sql;

        try {
            sql = `SELECT COUNT(ID_USUARIO) AS ID FROM DB_ADMINISTRADOR_PORTAL WHERE ID_USUARIO = ? AND ID_PORTAL = ?`;

            const result = await cds.run(sql, [idUsuario, idPortal]);
            for (const rs of result) {
                if (rs.ID > 0) {
                    outPut = true;
                } else {
                    outPut = false;
                }
            }
            return outPut;
        } catch (e) {
            return false;
        }
    }

    async function getUserAprob(json) {
        const idUsuario = json.ID_USUARIO;
        const idPortal = json.ID_PORTAL;
        let sql;

        try {
            sql = `SELECT COUNT(ROLXUSU.ID_USUARIO) AS ID FROM DB_ROLESXUSUARIOS AS ROLXUSU
            INNER JOIN DB_ROLESXACCIONES AS ROLXACC
             ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
            WHERE ROLXACC.ID_ACCION = 1 AND ROLXUSU.ID_USUARIO = ?`;

            const result = cds.run(sql, [idUsuario]);

            for (const rs of result) {
                if (rs.ID > 0) {
                    outPut = true;
                } else {
                    outPut = false;
                }

                return outPut;
            }
        } catch (e) {
            return false;
        }
    }

    this.on("getUserAdministrator", async (req) => {
        const { json } = req.data;
        try {
            let outPut = {};
            outPut.ADMINISTRADOR = await getUserAdmin(json);
            outPut.APROBADOR = await getUserAprob(json);

            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getUserAdministrator" };
        }
    });

    async function countNotificationAprobBYPortal(idUsuario, idPortal) {
        let outPut = [];
        let sql;

        try {
            sql = `SELECT COUNT(DISTINCT DOC.ID_DOCUMENTO) AS CANTIDAD,
                                 DOC.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
           FROM DB_DOCUMENTO AS DOC
           INNER JOIN DB_USUARIO AS USU
            ON USU.USERNAME = DOC.SIGUIENTELIBERADOR
           INNER JOIN DB_CATEGORIA AS CAT
            ON CAT.TITULO = DOC.NOMBRE
          WHERE USU.ID_USUARIO = ? AND CAT.ID_TIPO = 3
          GROUP BY DOC.ID_TIPO_DOCUMENTO`;
            const result = await cds.run(sql, [idUsuario]);

            for (const rs of result) {
                if (rs.CANTIDAD > 0) {
                    let record = {};
                    record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                    record.CANTIDAD = rs.CANTIDAD;

                    outPut.push(record);
                }
            }
        } catch (e) {
            return outPut;
        }
        return outPut;
    }

    async function getCantVinculacion(idPortal, td) {
        let sql;

        try {
            sql = `SELECT COUNT(*) AS ID FROM DB_VINCULACION WHERE NODO_PORTAL = ? AND ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idPortal, td]);

            for (const rs of result) {
                return rs.ID;
            }
        } catch (e) {
            return 0;
        }
        return 0;
    }

    async function getCantBusqueda(idPortal, td) {
        let sql;

        try {
            sql = `SELECT COUNT(*) AS ID FROM DB_NODOBUSQUEDA WHERE ID_PORTAL = ? AND ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idPortal, td]);

            for (const rs of result) {
                return rs.ID;
            }
        } catch (e) {
            return 0;
        }
        return 0;
    }

    async function getCantContenido(idPortal, td) {
        let sql;

        try {
            sql = `SELECT COUNT(*) AS ID FROM DB_PORTALES WHERE ID_PORTAL = ? AND ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idPortal, td]);

            for (const rs of result) {
                return rs.ID;
            }
        } catch (e) {
            return 0;
        }
        return 0;
    }

    this.on("countNotificationAprob", async (req) => {
        const { json } = req.data;

        let cantGral = 0;
        const idUsuario = json.ID_USUARIO;
        const idPortal = json.ID_PORTAL;
        let arrCant = [];

        arrCant = await countNotificationAprobBYPortal(idUsuario, idPortal);
        try {
            for (let i = 0; i < arrCant.length; i++) {
                let encontrado = false;
                let cant = 0;
                let cantVinc = await getCantVinculacion(
                    idPortal,
                    arrCant[i].ID_TIPO_DOCUMENTO,
                );

                if (cantVinc > 0) {
                    cant += arrCant[i].CANTIDAD;
                    encontrado = true;
                }

                if (!encontrado) {
                    let cantBusq = await getCantBusqueda(
                        idPortal,
                        arrCant[i].ID_TIPO_DOCUMENTO,
                    );
                    if (cantBusq > 0) {
                        cant += arrCant[i].CANTIDAD;
                        encontrado = true;
                    }
                }

                if (!encontrado) {
                    let cantCont = await getCantContenido(
                        idPortal,
                        arrCant[i].ID_TIPO_DOCUMENTO,
                    );
                    if (cantCont > 0) {
                        cant += arrCant[i].CANTIDAD;
                        encontrado = true;
                    }
                }
                cantGral += cant;
            }
        } catch (e) {
            return { error: e.message, accion: "countNotificationAprob" };
        }

        return cantGral;
    });

    function getDecode(codigo) {
        return Buffer.from(String(codigo), "base64").toString("utf8");
    }

    this.on("validacionUsuarioCategoria", async (req) => {
        const { json } = req.data;

        let valor = json.VALOR;
        let entrada = getDecode(valor);
        let division = entrada.split(":");
        let sql;
        let body = "";

        const ID_CATEGORIA = Number(division[0]);
        const ID_USUARIO = Number(division[1]);

        try {
            sql = `SELECT COUNT(*) AS ID FROM DB_PERFILESXUSUARIOS AS PXU
            INNER JOIN DB_NODOSXPERFILES AS NXP
             ON NXP.ID_PERFILES = PXU.ID_PERFILES
            WHERE PXU.ID_USUARIO = ? AND NXP.ID_CATEGORIA = ?`;
            const result = await cds.run(sql, [ID_CATEGORIA, ID_USUARIO]);

            for (const rs of result) {
                if (rs.ID > 0) {
                    body = true;
                } else {
                    body = false;
                }
            }

            return body;
        } catch (e) {
            return {
                error: e.message,
                accion: "validacionUsuarioCategoria",
                query: sql,
            };
        }
    });

    async function formatterFormatos(svalue) {
        let text;
        switch (svalue) {
            case "pdf":
                text = "pdf";
                break;
            case "png":
                text = "imagen-png";
                break;
            case "jpg":
                text = "imagen-jpg";
                break;
            case "jpeg":
                text = "image-jpeg";
                break;
            case "mp4":
                text = "video";
                break;
            default:
                text = "octet/stream";
        }

        return text;
    }

    async function formatterMymetipe(svalue) {
        let text;
        switch (svalue.toLowerCase()) {
            case "pdf":
                text = "application/pdf";
                break;
            case "png":
                text = "image/jpeg";
                break;
            case "jpg":
                text = "image/jpeg";
                break;
            case "jpeg":
                text = "image/jpeg";
                break;
            default:
                text = "octet/stream";
        }

        return text;
    }

    async function getIconoDocumento(tipo) {
        const prefijo = "sap-icon://";
        let icono;

        switch (tipo.toLowerCase()) {
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
    }

    async function getActivo(version, iddetalle) {
        let sql;

        try {
            sql = `SELECT ACTIVO FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ? AND VERSION = ?`;

            const result = await cds.run(sql, [iddetalle, version]);

            for (const rs of result) {
                if (rs.ACTIVO === "X") {
                    return true;
                } else {
                    return false;
                }
            }
        } catch (e) {
            return false;
        }
    }

    this.on("getUrlDocumento", async (req) => {
        const { json } = req.data;
        let sql, url;
        let sValue = [];

        let arrCategoria = JSON.parse(json.IDS_CATEGORIA);

        try {
            for (let i = 0; i < arrCategoria.length; i++) {
                sql = `SELECT VER.URL_DETALLE        AS URL_DETALLE,
                    DET.TITULO             AS TITULO,
                    DET.ID_DETALLE         AS ID_DETALLE,
                    VER.SIZE               AS SIZE,
                    MAX(VER.VERSION)       AS VERSION_MAX,
                    DET.TYPE               AS TYPE,
                    FORM.MYMETYPE          AS MYMETYPE,
                    DET.ID_TIPO_DOCUMENTO  AS ID_TIPO_DOCUMENTO,
                    MAX(VER2.VERSION)      AS VERSION2_MAX,
                    DET.URL                AS URL,
                    CAT.TITULO             AS TITULO_CATEGORIA,
                    VER.URL_BEFORE         AS URL_BEFORE,
                    VER3.VERSION           AS VERSION3,
                    DET.ID_CATEGORIA_HOJA  AS ID_CATEGORIA_HOJA
              FROM DB_DETALLE AS DET
              LEFT JOIN DB_VERSIONAMIENTO AS VER
                ON VER.ID_DETALLE = DET.ID_DETALLE
              LEFT JOIN DB_FORMATOS AS FORM
                ON FORM.NOMBRE_FORMATO = LOWER(DET.TYPE)
              LEFT JOIN (SELECT ID_DETALLE, VERSION FROM DB_VERSIONAMIENTO) AS VER2
                ON VER2.ID_DETALLE = DET.ID_DETALLE
              LEFT JOIN (SELECT ID_DETALLE, VERSION FROM DB_VERSIONAMIENTO WHERE ACTIVO = 'X') AS VER3
                ON VER3.ID_DETALLE = DET.ID_DETALLE
              INNER JOIN DB_CATEGORIA AS CAT
                ON CAT.ID_CATEGORIA = DET.NODO_HIJO
             WHERE DET.NODO_HIJO = ?
             GROUP BY VER.URL_DETALLE, DET.ID_CATEGORIA_HOJA, DET.TITULO,
                      DET.ID_DETALLE, VER.SIZE, DET.TYPE,
                      FORM.MYMETYPE, DET.ID_TIPO_DOCUMENTO, DET.URL,
                      CAT.TITULO, VER.URL_BEFORE, VER3.VERSION`;

                const result = await cds.run(sql, [arrCategoria[i]]);

                for (const rs of result) {
                    let record = {};
                    if (rs.VERSION3 > 1) {
                        url = rs.URL_BEFORE;
                    } else {
                        url = rs.URL;
                    }

                    if (
                        rs.ID_TIPO_DOCUMENTO === 664 ||
                        rs.ID_TIPO_DOCUMENTO === 665 ||
                        rs.ID_TIPO_DOCUMENTO === 666 ||
                        rs.ID_TIPO_DOCUMENTO === 700
                    ) {
                        if (rs.VERSION3 === rs.VERSION2_MAX) {
                            url = rs.URL_DETALLE; // 1
                        } else {
                            url = rs.URL; // 10
                        }
                    }
                    record.URL =
                        rs.ID_TIPO_DOCUMENTO === 2797 ||
                            rs.ID_TIPO_DOCUMENTO === 2798 ||
                            rs.ID_TIPO_DOCUMENTO === 2792
                            ? rs.URL_DETALLE
                            : url;

                    let arr = "";
                    arr = String(rs.TITULO || "").split(".")[1];
                    record.TITULO =
                        typeof arr === "undefined" ? rs.TITULO + "." + rs.TYPE : rs.TITULO;

                    record.ID_DETALLE = rs.ID_DETALLE;
                    record.SIZE =
                        rs.SIZE === null || rs.SIZE === ""
                            ? "—"
                            : (rs.SIZE / 1000).toFixed(1) + " KB";
                    record.VERSION = rs.VERSION2_MAX === null ? 1 : rs.VERSION2_MAX;

                    record.FORMATO = await formatterFormatos(
                        String(rs.TYPE || "").toLowerCase(),
                    );
                    record.ICONO = await getIconoDocumento(rs.TYPE);
                    record.MYME_TYPE = await formatterMymetipe(rs.TYPE);
                    record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                    record.ACTIVO =
                        rs.URL_DETALLE === null
                            ? true
                            : await getActivo(rs.VERSION_MAX, rs.ID_DETALLE);

                    record.MYMEtIPE = await formatterMymetipe(rs.TYPE);
                    record.NOMBRE_DOCUMENTO = rs.TITULO_CATEGORIA;
                    record.ID_DOCUMENTO = rs.ID_CATEGORIA_HOJA;

                    if (record.ACTIVO) {
                        sValue.push(record);
                    }
                }
            }

            return sValue;
        } catch (e) {
            return { error: e.message, accion: "getUrlDocumento", query: sql };
        }
    });

    async function getNodoContenido(idNodoEstructura) {

        let sql;
        let response = {
            success: false
        };

        try {
            sql = `SELECT MAX(ID_CATEGORIA) AS ID_TOTAL FROM DB_CATEGORIA WHERE ID_CATEGORIA_ESPEJO = ?`;

            const result = await cds.run(sql, [idNodoEstructura]);
            for (const rs of result) {
                response.success = true;
                response.idNodo = rs.ID_TOTAL

                return response;
            }

        } catch (e) {
            response.success = false;
            response.idNodo = e.message;
            return response;
        }
    };

    async function getArrBaseTD(idTD) {

        let sql;
        let outPut = [];

        try {

            sql = `SELECT ID_WF,
                          G_DIGITAL,
                          DESCRIPCION_DIGITAL,
                          ORIGEN,
                          ID_TIPO_DOCUMENTO_ORIGINAL
                    FROM DB_TIPO_DOCUMENTO WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idTD]);

            for (const rs of result) {
                let record = {};
                record.ID_WF = rs.ID_WF;
                record.G_DIGITAL = rs.G_DIGITAL;
                record.DESCRIPCION_DIGITAL = rs.DESCRIPCION_DIGITAL;
                record.ORIGEN = rs.ORIGEN;
                record.ID_TIPO_DOCUMENTO_ORIGINAL = rs.ID_TIPO_DOCUMENTO_ORIGINAL;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getArrBaseTD", query: sql };
        }
        return outPut;
    };

    async function insertCopyTD(idTipoDocumentoOriginal, descripcion, nombre, idNodo, sOrigen) {
        let sql;
        let response = {
            success: false
        };

        try {
            const arrbase = await getArrBaseTD(idTipoDocumentoOriginal);

            if (!Array.isArray(arrbase) || arrbase.length === 0) {
                response.success = false;
                response.idTD = `No existe configuración base en DB_TIPO_DOCUMENTO para ID_TIPO_DOCUMENTO = ${idTipoDocumentoOriginal}`;
                return response;
            }

            const idTd = await getIdSequence("ID_TIPO_DOCUMENTO");
            console.log(idTd)

            sql = `INSERT INTO DB_TIPO_DOCUMENTO VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await cds.run(sql, [
                idTd,
                idNodo,
                arrbase[0].ID_WF,
                nombre,
                descripcion,
                arrbase[0].G_DIGITAL,
                arrbase[0].DESCRIPCION_DIGITAL,
                sOrigen,
                arrbase[0].ID_TIPO_DOCUMENTO_ORIGINAL
            ]);

            response.success = true;
            response.idTD = idTd;
            return response;

        } catch (e) {
            response.success = false;
            response.idTD = e.message;
            return response;
        }
    }

    async function getArrBaseFormatos(idTD) {

        let sql;
        let outPut = [];

        try {
            sql = `SELECT FORMATO,
                          PESO FROM DB_PROP_TIPO_DOC WHERE TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idTD]);
            for (const rs of result) {
                let record = {};

                record.FORMATO = rs.FORMATO;
                record.PESO = rs.PESO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getArrBaseFormatos", query: sql };
        }

        return outPut;
    };

    async function insertCopyFormato(respCopyTD, idTipoDocumentoOriginal, idNodo) {
        let sql;

        try {
            const arrbase = await getArrBaseFormatos(idTipoDocumentoOriginal);

            console.log("insertCopyFormato - idTipoDocumentoOriginal:", idTipoDocumentoOriginal);
            console.log("insertCopyFormato - idNodo destino:", idNodo);
            console.log("insertCopyFormato - respCopyTD nuevo:", respCopyTD);
            console.log("insertCopyFormato - arrbase:", arrbase);
            console.log("insertCopyFormato - arrbase.length:", arrbase.length);

            if (arrbase.length === 0) {
                return {
                    success: true,
                    message: `No existen formatos para copiar desde TIPO_DOCUMENTO = ${idTipoDocumentoOriginal}`
                };
            }

            for (const item of arrbase) {
                console.log("insertCopyFormato - item:", item);

                const idProp = await getIdSequence("ID_PROPIEDAD");
                console.log("insertCopyFormato - idProp:", idProp);

                sql = `INSERT INTO DB_PROP_TIPO_DOC VALUES (?, ?, ?, ?, ?)`;

                await cds.run(sql, [
                    idProp,
                    idNodo,
                    item.FORMATO,
                    item.PESO,
                    respCopyTD
                ]);

                console.log("insertCopyFormato - insert OK:", {
                    idProp,
                    idNodo,
                    formato: item.FORMATO,
                    peso: item.PESO,
                    tipoDocumentoNuevo: respCopyTD
                });
            }

            return {
                success: true,
                message: "Formatos copiados correctamente"
            };

        } catch (e) {
            return {
                success: false,
                error: e.message,
                accion: "insertCopyFormato",
                query: sql
            };
        }
    }

    async function getArrBaseELiberacion(idTD, idTdOri) {
        let sql;
        let response = {
            success: false,
            idEtLib: "vacio"
        };

        try {
            sql = `SELECT DISTINCT * 
               FROM DB_ESTRATEGIA_LIBERACION 
               WHERE ID_TIPO_DOCUMENTO = ?`;

            const result = await cds.run(sql, [idTdOri]);

            for (const rs of result) {
                const idEstLibCreado = await getIdSequence("ID_EST_LIB");

                sql = `INSERT INTO DB_ESTRATEGIA_LIBERACION VALUES (?, ?, ?)`;

                await cds.run(sql, [
                    idEstLibCreado,
                    rs.ESTADO,
                    idTD
                ]);

                response.success = true;
                response.idEtLibCreado = idEstLibCreado;
                response.idEtLibExistente = rs.ID_EST_LIB;
            }

        } catch (e) {
            response.success = false;
            response.idEtLib = e.message;
            return response;
        }

        return response;
    }

    async function getArrNiveles(etLibExistente) {
        let sql;
        let outPut = [];
        let response = {};

        try {
            sql = `SELECT DISTINCT * 
               FROM DB_NIVELES 
               WHERE ID_EST_LIB = ?`;

            const result = await cds.run(sql, [etLibExistente]);

            for (const rs of result) {
                let record = {};
                record.NIVEL = rs.NIVEL;
                record.NOMBREAPROBADOR = rs.NOMBREAPROBADOR;
                record.ESTADO = rs.ESTADO;

                outPut.push(record);
            }

        } catch (e) {
            response.success = false;
            response.results = e.message;
            return response;
        }

        response.success = true;
        response.results = outPut;
        return response;
    }

    async function insertCopyWF(idTD, idTipoDocumentoOriginal) {
        let sql;
        let response = {
            success: false
        };

        try {
            const arrbase = await getArrBaseELiberacion(idTD, idTipoDocumentoOriginal);

            if (arrbase.success !== false) {
                const etLibCreado = arrbase.idEtLibCreado;
                const etLibExistente = arrbase.idEtLibExistente;
                const resultNivel = await getArrNiveles(etLibExistente);

                if (resultNivel.success !== false) {
                    const arrBaseNiveles = resultNivel.results;

                    for (const item of arrBaseNiveles) {
                        sql = `INSERT INTO DB_NIVELES VALUES (?, ?, ?, ?)`;

                        await cds.run(sql, [
                            item.NIVEL,
                            etLibCreado,
                            item.NOMBREAPROBADOR,
                            item.ESTADO
                        ]);
                    }

                    response.success = true;
                    return response;
                } else {
                    if (arrbase.idEtLib === "vacio") {
                        response.success = true;
                        return response;
                    } else {
                        response.success = false;
                        response.razon = arrbase.idEtLib;
                        return response;
                    }
                }
            }

        } catch (e) {
            response.success = false;
            response.razon = e.message;
            return response;
        }
    }

    async function getMetadataZTD(idTD) {

        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT ATRIBUTO, TIPO_ATRIBUTO, OBLIGATORIEDAD, ID_DOCUMENTO, ORIGEN,
                   TIPO, ID_NODO, NOMBRETABLA, NOMBRECAMPO, FORMATOFECHA, ESTADO FROM DB_METADATA
                   WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idTD]);
            for (const rs of result) {
                let record = {};

                record.ATRIBUTO = (rs.ATRIBUTO === null) ? " " : rs.ATRIBUTO;
                record.TIPO_ATRIBUTO = (rs.TIPO_ATRIBUTO === null) ? " " : rs.TIPO_ATRIBUTO;
                record.OBLIGATORIEDAD = (rs.OBLIGATORIEDAD === null) ? " " : rs.OBLIGATORIEDAD;
                record.ID_DOCUMENTO = (rs.ID_DOCUMENTO === null) ? " " : rs.ID_DOCUMENTO;
                record.ORIGEN = (rs.ORIGEN === null) ? " " : rs.ORIGEN;
                record.TIPO = (rs.TIPO === null) ? " " : rs.TIPO;
                record.ID_NODO = (rs.ID_NODO === null) ? " " : rs.ID_NODO;
                record.NOMBRETABLA = (rs.NOMBRETABLA === null) ? " " : rs.NOMBRETABLA;
                record.NOMBRECAMPO = (rs.NOMBRECAMPO === null) ? " " : rs.NOMBRECAMPO;
                record.FORMATOFECHA = (rs.FORMATOFECHA === null) ? " " : rs.FORMATOFECHA;
                record.ESTADO = (rs.ESTADO === null) ? " " : rs.ESTADO;

                outPut.push(record);

            }
        } catch (e) {
            return { error: e.message, accion: "getMetadataZTD", query: sql };
        }
        return outPut;
    };

    async function insertCopyMD(idTD, idTipoDocumentoOriginal) {
        let sql;
        let response = {
            success: false
        };

        try {
            const arrbase = await getMetadataZTD(idTipoDocumentoOriginal);

            for (const item of arrbase) {
                const idMD = await getIdSequence("ID_METADATA");

                sql = `INSERT INTO DB_METADATA VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                await cds.run(sql, [
                    idMD,
                    idTD,
                    item.ATRIBUTO,
                    item.TIPO_ATRIBUTO,
                    item.OBLIGATORIEDAD,
                    item.ID_DOCUMENTO,
                    item.ORIGEN,
                    item.TIPO,
                    item.ID_NODO,
                    item.NOMBRETABLA,
                    item.NOMBRECAMPO,
                    item.FORMATOFECHA,
                    item.ESTADO
                ]);
            }

            response.success = true;
            return response;

        } catch (e) {
            response.success = false;
            response.razon = e.message;
            return response;
        }
    }

    async function Metadata_SAP(idTD) {

        let sql;
        let outPut = [];
        let response = {
            success: false
        }

        try {
            sql = `SELECT DISTINCT ZJOIN, ZFIELDNAME, ZCONDICION, TABNAME, LARGOCAMPO, ESTADO FROM DB_QUERY_MSAP_CATEGORIA WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idTD]);

            for (const rs of result) {
                let record = {};
                record.ZJOIN = rs.ZJOIN;
                record.ZFIELDNAME = rs.ZFIELDNAME;
                record.ZCONDICION = rs.ZCONDICION.replace(/'/g, "''");
                record.TABNAME = rs.TABNAME;
                record.LARGOCAMPO = rs.LARGOCAMPO;
                record.ESTADO = rs.ESTADO;

                outPut.push(record);
            }

        } catch (e) {
            response.results = e.message;
            return response;
        }

        response.success = true;
        response.results = outPut;
        return response;
    };

    async function insertCopyMDSAP(idTD, idTipoDocumentoOriginal, idNodoEstructura) {
        let sql;
        let response = {
            success: false
        };

        try {
            const arrbase = await Metadata_SAP(idTipoDocumentoOriginal);

            if (arrbase.success !== false) {
                for (const item of arrbase.results) {
                    const id = await getIdSequence("ID_QUERY");

                    sql = `INSERT INTO DB_QUERY_MSAP_CATEGORIA VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                    await cds.run(sql, [
                        id,
                        idNodoEstructura,
                        item.ZJOIN,
                        item.ZFIELDNAME,
                        item.ZCONDICION,
                        item.TABNAME,
                        item.LARGOCAMPO,
                        idTD,
                        item.ESTADO
                    ]);
                }

                response.success = true;
                return response;
            } else {
                response.success = false;
                response.razon = arrbase.results;
                return response;
            }

        } catch (e) {
            response.success = false;
            response.razon = e.message;
            return response;
        }
    }

    async function getArrDocBase(idTD) {

        let sql;
        let outPut = [];
        let response = {
            success: false
        };

        try {
            sql = `SELECT DISTINCT NOMBRE_DOCUMENTO, OBLIGATORIO, DESCRIPCION FROM DB_DOC_OBL
                   WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [idTD]);

            for (const rs of result) {
                let record = {};
                record.NOMBRE_DOCUMENTO = rs.NOMBRE_DOCUMENTO;
                record.OBLIGATORIO = rs.OBLIGATORIO;
                record.DESCRIPCION = rs.DESCRIPCION;

                outPut.push(record);
            }
        } catch (e) {
            response.results = e.message;
            return response;
        }
        response.success = true;
        response.results = outPut;
        return response;
    };

    async function insertCopyDocObl(idTD, idTipoDocumentoOriginal) {
        let sql;
        let response = {
            success: false
        };

        try {
            const arrbase = await getArrDocBase(idTipoDocumentoOriginal);

            if (arrbase.success !== false) {
                for (const item of arrbase.results) {
                    const id = await getIdSequence("ID_DOC_OBL");

                    sql = `INSERT INTO DB_DOC_OBL VALUES (?, ?, ?, ?, ?)`;

                    await cds.run(sql, [
                        id,
                        idTD,
                        item.NOMBRE_DOCUMENTO,
                        item.OBLIGATORIO,
                        item.DESCRIPCION
                    ]);
                }

                response.success = true;
                return response;

            } else {
                response.success = false;
                response.razon = arrbase.results;
                return response;
            }

        } catch (e) {
            response.success = false;
            response.razon = e.message;
            return response;
        }
    }

    async function rollBackCopyTD(idTd) {

        let sql;

        sql = `DELETE FROM DB_TIPO_DOCUMENTO WHERE ID_TIPO_DOCUMENTO = ?`;
        await cds.run(sql, [idTd]);

        sql = `DELETE FROM DB_PROP_TIPO_DOC WHERE TIPO_DOCUMENTO = ?`;
        await cds.run(sql, [idTd]);

        sql = `DELETE FROM DB_NIVELES WHERE ID_EST_LIB = (SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION WHERE ID_TIPO_DOCUMENTO = ?)`;
        await cds.run(sql, [idTd]);

        sql = `DELETE FROM DB_ESTRATEGIA_LIBERACION WHERE ID_TIPO_DOCUMENTO = ?`;
        await cds.run(sql, [idTd]);

        sql = `DELETE FROM DB_METADATA WHERE ID_TIPO_DOCUMENTO = ?`;
        await cds.run(sql, [idTd]);

        sql = `DELETE FROM DB_QUERY_MSAP_CATEGORIA WHERE ID_TIPO_DOCUMENTO = ?`;
        await cds.run(sql, [idTd]);

        sql = `DELETE FROM DB_DOC_OBL WHERE ID_TIPO_DOCUMENTO = ?`;
        await cds.run(sql, [idTd]);

    };

    this.on("copyTD", async (req) => {
        const { json } = req.data;

        const idTipoDocumentoOriginal = json.ID_TIPO_DOCUMENTO_ORIGINAL;
        const descripcion = json.DESCRIPCION;
        const nombre = json.NOMBRE;
        const idNodoEstructura = json.ID_NODO;
        const sOrigen = json.ORIGEN;

        let body;

        try {
            const responseNodo = await getNodoContenido(idNodoEstructura);

            if (responseNodo.success !== false) {
                const idNodo = responseNodo.idNodo;

                const respCopyTD = await insertCopyTD(
                    idTipoDocumentoOriginal,
                    descripcion,
                    nombre,
                    idNodo,
                    sOrigen
                );

                if (respCopyTD.success !== false) {
                    const respCopyForm = await insertCopyFormato(
                        respCopyTD.idTD,
                        idTipoDocumentoOriginal,
                        idNodo
                    );

                    if (respCopyForm.success !== false) {
                        const respCopyWF = await insertCopyWF(
                            respCopyTD.idTD,
                            idTipoDocumentoOriginal
                        );

                        if (respCopyWF !== false) {
                            const respCopyMD = await insertCopyMD(
                                respCopyTD.idTD,
                                idTipoDocumentoOriginal
                            );

                            if (respCopyMD.success !== false) {
                                const respCopyMDSAP = await insertCopyMDSAP(
                                    respCopyTD.idTD,
                                    idTipoDocumentoOriginal,
                                    idNodoEstructura
                                );

                                if (respCopyMDSAP.success !== false) {
                                    const respCopyDocObl = await insertCopyDocObl(
                                        respCopyTD.idTD,
                                        idTipoDocumentoOriginal
                                    );

                                    if (respCopyDocObl.success !== false) {
                                        body = respCopyDocObl;
                                    } else {
                                        await rollBackCopyTD(respCopyTD.idTD);
                                        return respCopyDocObl.razon;
                                    }
                                } else {
                                    await rollBackCopyTD(respCopyTD.idTD);
                                    return respCopyMDSAP.razon;
                                }
                            } else {
                                await rollBackCopyTD(respCopyTD.idTD);
                                return respCopyMD.razon;
                            }
                        } else {
                            await rollBackCopyTD(respCopyTD.idTD);
                            return respCopyWF.razon;
                        }
                    } else {
                        await rollBackCopyTD(respCopyTD.idTD);
                        return respCopyForm;
                    }
                } else {
                    return respCopyTD.idTD;
                }
            } else {
                return responseNodo.idNodo;
            }

        } catch (e) {
            return e.message;
        }

        return body;
    });

    this.on("updateRecientes", async (req) => {
        const { json } = req.data;

        let idVisita = json.ID_VISITAS;
        let fecha = json.FECHA;
        let hora = json.HORA;
        let idCategoria = json.ID_DETALLE;

        try {
            let querySequence = await getIdSequence("ID_RECIENTES");
            console.log("querySequence:", querySequence);
            sql = `INSERT INTO DB_RECIENTES VALUES ( ?, ?, ?, ?, ?)`;
            await cds.run(sql, [querySequence, idVisita, idCategoria, fecha, hora]);

            return "OK";
        } catch (e) {
            return { error: e.message, accion: "updateRecientes", query: sql };
        }
    });

    this.on("busquedaPermiso", async (req) => {
        const { json } = req.data;
        let body = false;
        let sql;

        let idTD = json.ID_TIPO_DOCUMENTO;
        let idUsuario = json.ID_USUARIO;
        let texto = json.ACCION;

        try {
            sql = `SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3 
          FROM DB_ROLESXTD AS ROLXTD
          INNER JOIN DB_ROLES AS ROL
           ON ROL.ID_ROLES = ROLXTD.ID_ROLES
          INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
           ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
          INNER JOIN DB_ROLESXACCIONES AS ROLXACC
           ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES`;

            switch (texto) {
                case "Versionar":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 5 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                case "Activar_Version":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 6 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                case "Crear":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 2 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                case "Visualizar":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 3 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                case "Descargar":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 4 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                case "Aprobar":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 1 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                case "Visualizar_Nodo_Portal":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 7 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                case "Editar":
                    sql += ` WHERE ROLXUSU.ID_USUARIO = ? AND ROLXACC.ID_ACCION = 10 AND ROLXTD.ID_TIPO_DOCUMENTO = ?`;
                    break;
                default:
                    return body;
            }

            const result = await cds.run(sql, [idUsuario, idTD]);
            for (const rs of result) {
                if (rs.IDTD3) {
                    body = true;
                }
            }
        } catch (e) {
            return body;
        }
        return body;
    });

    this.on("getVersionDetalle", async (req) => {
        const { idDetalle } = req.data;

        let outPut = [];
        let sql;

        try {
            sql = `SELECT ID_VERSIONAMIENTO,
                  VERSION,
                  ID_DETALLE,
                  URL_DETALLE,
                  FECHA_CARGA,
                  SIZE,
                  USUARIO,
                  ACTIVO
            FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ?`;

            const result = await cds.run(sql, [idDetalle]);

            for (const rs of result) {
                let record = {};
                record.ID_VERSIONAMIENTO = rs.ID_VERSIONAMIENTO;
                record.VERSION = rs.VERSION;
                record.ID_DETALLE = rs.ID_DETALLE;
                record.URL_DETALLE = rs.URL_DETALLE;
                record.FECHA_CARGA = orderFecha(rs.FECHA_CARGA);
                record.SIZE = (rs.SIZE / 1000).toFixed(1) + " KB";
                record.USUARIO = rs.USUARIO;
                record.ACTIVO = rs.ACTIVO = await getActivo(rs.VERSION, rs.ID_DETALLE);

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getVersionDetalle", query: sql };
        }
        return outPut;
    });

    this.on("getTipoDocumentoPorNodo", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];
        let nodo = json.ID_CATEGORIA;

        try {
            sql = `SELECT ID_TIPO_DOCUMENTO, NOMBRE FROM DB_TIPO_DOCUMENTO WHERE ID_NODO = ?`;

            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.NOMBRETD = rs.NOMBRE;

                outPut.push(record);
            }
        } catch (e) {
            return outPut;
        }
        return outPut;
    });

    async function getMetadata(nodo) {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT ATRIBUTO, TIPO_ATRIBUTO FROM DB_METADATA WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [nodo]);
            for (const rs of result) {
                let record = {};
                record.ATRIBUTO = rs.ATRIBUTO;
                record.TIPO_ATRIBUTO = rs.TIPO_ATRIBUTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getMetadata", query: sql };
        }
        return outPut;
    }

    this.on("getTipoDocumento", async (req) => {
        const { json } = req.data;

        const idCategoria = json.ID_CATEGORIA;
        const texto = json.TEXTO;
        const idPortal = Number(json.ID_PORTAL);
        const idUsuario = json.ID_USUARIO;

        let sql, result;
        let outPut = [];

        try {
            switch (texto) {
                case "listaArchivo": {
                    sql = `
          SELECT TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                 TD.NOMBRE           AS NOMBRE,
                 COUNT(ROL2.IDTD2)   AS TOTAL
            FROM DB_VINCULACION AS VIN
      INNER JOIN DB_TIPO_DOCUMENTO AS TD
              ON VIN.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
       LEFT JOIN (
                  SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                    FROM DB_ROLESXTD AS ROLXTD
              INNER JOIN DB_ROLES AS ROL
                      ON ROL.ID_ROLES = ROLXTD.ID_ROLES
              INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                      ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
              INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                      ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                   WHERE ROLXUSU.ID_USUARIO = ?
                     AND ROLXACC.ID_ACCION = 2
                ) AS ROL2
              ON ROL2.IDTD2 = VIN.ID_TIPO_DOCUMENTO
           WHERE VIN.ID_NODO_VINCULA = ?
             AND VIN.NODO_PORTAL = ?
        GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        ORDER BY TD.NOMBRE ASC
        `;

                    result = await cds.run(sql, [idUsuario, idCategoria, idPortal]);

                    for (const rs of result) {
                        const rol = rs.TOTAL > 0;
                        if (rol) {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.NOMBRE = rs.NOMBRE;
                            record.METADATA = await getMetadata(rs.ID_TIPO_DOCUMENTO);
                            outPut.push(record);
                        }
                    }
                    break;
                }

                case "nodoBusqueda": {
                    sql = `
          SELECT TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                 TD.NOMBRE           AS NOMBRE,
                 COUNT(ROL2.IDTD2)   AS TOTAL
            FROM DB_NODOBUSQUEDA AS NB
      INNER JOIN DB_TIPO_DOCUMENTO AS TD
              ON NB.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
       LEFT JOIN (
                  SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                    FROM DB_ROLESXTD AS ROLXTD
              INNER JOIN DB_ROLES AS ROL
                      ON ROL.ID_ROLES = ROLXTD.ID_ROLES
              INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                      ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
              INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                      ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                   WHERE ROLXUSU.ID_USUARIO = ?
                     AND ROLXACC.ID_ACCION = 2
                ) AS ROL2
              ON ROL2.IDTD2 = NB.ID_TIPO_DOCUMENTO
           WHERE NB.ID_NODO = ?
        GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        ORDER BY TD.NOMBRE ASC
        `;

                    result = await cds.run(sql, [idUsuario, idCategoria]);

                    for (const rs of result) {
                        const rol = rs.TOTAL > 0;
                        if (rol) {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.NOMBRE = rs.NOMBRE;
                            record.METADATA = await getMetadata(rs.ID_TIPO_DOCUMENTO);
                            outPut.push(record);
                        }
                    }
                    break;
                }

                case "nodoContenido": {
                    sql = `
          SELECT TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                 TD.NOMBRE           AS NOMBRE,
                 COUNT(ROL2.IDTD2)   AS TOTAL
            FROM DB_PORTALES AS POR
      INNER JOIN DB_TIPO_DOCUMENTO AS TD
              ON POR.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
       LEFT JOIN (
                  SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                    FROM DB_ROLESXTD AS ROLXTD
              INNER JOIN DB_ROLES AS ROL
                      ON ROL.ID_ROLES = ROLXTD.ID_ROLES
              INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                      ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
              INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                      ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                   WHERE ROLXUSU.ID_USUARIO = ?
                     AND ROLXACC.ID_ACCION = 2
                ) AS ROL2
              ON ROL2.IDTD2 = POR.ID_TIPO_DOCUMENTO
           WHERE POR.ID_PORTAL = ?
        GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        ORDER BY TD.NOMBRE ASC
        `;

                    result = await cds.run(sql, [idUsuario, idPortal]);

                    for (const rs of result) {
                        const rol = rs.TOTAL > 0;
                        if (rol) {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.NOMBRE = rs.NOMBRE;
                            record.METADATA = await getMetadata(rs.ID_TIPO_DOCUMENTO);
                            outPut.push(record);
                        }
                    }
                    break;
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getTipoDocumento", query: sql };
        }

        return outPut;
    });

    this.on("getPermisosNodo", async () => {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT ACC.NOMBRE AS NOMBRE,
                  ACC.ID_ACCION AS ID_ACTIVIDAD
            FROM DB_ACCION AS ACC ORDER BY ACC.NOMBRE ASC`;
            const result = await cds.run(sql);

            for (const rs of result) {
                let record = {};
                record.NOMBRE = rs.NOMBRE;
                record.ID_ACTIVIDAD;
                if (rs.NOMBRE !== "Aprobar" && rs.NOMBRE !== "Visualizar_Nodo_Portal") {
                    switch (rs.NOMBRE) {
                        case "Visualizar":
                            record.ORDEN = 1;
                            break;
                        case "Crear":
                            record.ORDEN = 2;
                            break;
                        case "Descargar":
                            record.ORDEN = 3;
                            break;
                        case "Versionar":
                            record.ORDEN = 4;
                            break;
                        case "Activar_Version":
                            record.ORDEN = 5;
                            break;
                        case "Editar":
                            record.ORDEN = 6;
                            break;
                    }
                    outPut.push(record);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getPermisoNodo", query: sql };
        }
        return outPut;
    });

    this.on("getAllPermisos", async () => {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT ACC.NOMBRE AS NOMBRE,
                  ACC.ID_ACCION AS ID_ACCION,
                  ACT.ID_ACTIVIDADES AS ID_ACTIVIDAD
          FROM DB_ACCION AS ACC
            INNER JOIN DB_ACTIVIDADES AS ACT
             ON ACT.ID_ACCION = ACC.ID_ACCION ORDER BY ACC.NOMBRE ASC`;

            const result = await cds.run(sql);

            for (const rs of result) {
                let record = {};
                record.NOMBRE = rs.NOMBRE;
                record.ID_ACTIVIDAD = rs.ID_ACTIVIDAD;

                outPut.push(record);
            }
        } catch (e) {
            return outPut;
        }
        return outPut;
    });

    this.on("getRolesTD", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];

        let idCategoria = json.ID_CATEGORIA;
        let texto = json.TEXTO;
        let idPortal = Number(json.ID_PORTAL);
        let idUsuario = json.ID_USUARIO;

        try {
            switch (texto) {
                case "listaArchivo":
                    sql = `SELECT DISTINCT
                      TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                      TD.NOMBRE AS NOMBRE,
                      COUNT(ROL2.IDTD2) AS TOTAL_2,
                      COUNT(ROL3.IDTD3) AS TOTAL_3,
                      COUNT(ROL4.IDTD4) AS TOTAL_4,
                      COUNT(ROL5.IDTD5) AS TOTAL_5,
                      COUNT(ROL6.IDTD6) AS TOTAL_6,
                      COUNT(ROL10.IDTD10) AS TOTAL_10
                 FROM DB_VINCULACION AS VIN
                INNER JOIN DB_TIPO_DOCUMENTO AS TD
                   ON VIN.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 2
                ) AS ROL2
                   ON ROL2.IDTD2 = VIN.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 3
                ) AS ROL3
                   ON ROL3.IDTD3 = VIN.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 4
                ) AS ROL4
                   ON ROL4.IDTD4 = VIN.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD5
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 5
                ) AS ROL5
                   ON ROL5.IDTD5 = VIN.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD6
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 6
                ) AS ROL6
                   ON ROL6.IDTD6 = VIN.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD10
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 10
                ) AS ROL10
                   ON ROL10.IDTD10 = VIN.ID_TIPO_DOCUMENTO
                WHERE VIN.ID_NODO_VINCULA = ?
                  AND VIN.NODO_PORTAL = ?
                GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
                ORDER BY TD.NOMBRE ASC`;

                    {
                        const result = await cds.run(sql, [
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idCategoria,
                            idPortal,
                        ]);

                        for (const rs of result) {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.NOMBRE = rs.NOMBRE;
                            record.CREAR = rs.TOTAL_2 > 0 ? true : false;
                            record.VISUALIZAR = rs.TOTAL_3 > 0 ? true : false;
                            record.DESCARGAR = rs.TOTAL_4 > 0 ? true : false;
                            record.VERSIONAR = rs.TOTAL_5 > 0 ? true : false;
                            record.ACTIVAR_VERSION = rs.TOTAL_6 > 0 ? true : false;
                            record.EDITAR = rs.TOTAL_10 > 0 ? true : false;

                            outPut.push(record);
                        }
                    }
                    break;

                case "nodoBusqueda":
                    sql = `SELECT DISTINCT
                      TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                      TD.NOMBRE AS NOMBRE,
                      COUNT(ROL2.IDTD2) AS TOTAL_2,
                      COUNT(ROL3.IDTD3) AS TOTAL_3,
                      COUNT(ROL4.IDTD4) AS TOTAL_4,
                      COUNT(ROL5.IDTD5) AS TOTAL_5,
                      COUNT(ROL6.IDTD6) AS TOTAL_6,
                      COUNT(ROL10.IDTD10) AS TOTAL_10
                 FROM DB_NODOBUSQUEDA AS NB
                INNER JOIN DB_TIPO_DOCUMENTO AS TD
                   ON NB.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 2
                ) AS ROL2
                   ON ROL2.IDTD2 = NB.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 3
                ) AS ROL3
                   ON ROL3.IDTD3 = NB.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 4
                ) AS ROL4
                   ON ROL4.IDTD4 = NB.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD5
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 5
                ) AS ROL5
                   ON ROL5.IDTD5 = NB.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD6
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 6
                ) AS ROL6
                   ON ROL6.IDTD6 = NB.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD10
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 10
                ) AS ROL10
                   ON ROL10.IDTD10 = NB.ID_TIPO_DOCUMENTO
                WHERE NB.ID_NODO = ?
                GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
                ORDER BY TD.NOMBRE ASC`;

                    {
                        const result = await cds.run(sql, [
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idCategoria,
                        ]);

                        for (const rs of result) {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.NOMBRE = rs.NOMBRE;
                            record.CREAR = rs.TOTAL_2 > 0 ? true : false;
                            record.VISUALIZAR = rs.TOTAL_3 > 0 ? true : false;
                            record.DESCARGAR = rs.TOTAL_4 > 0 ? true : false;
                            record.VERSIONAR = rs.TOTAL_5 > 0 ? true : false;
                            record.ACTIVAR_VERSION = rs.TOTAL_6 > 0 ? true : false;
                            record.EDITAR = rs.TOTAL_10 > 0 ? true : false;

                            outPut.push(record);
                        }
                    }
                    break;

                case "nodoContenido":
                    sql = `SELECT DISTINCT
                      TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                      TD.NOMBRE AS NOMBRE,
                      COUNT(ROL2.IDTD2) AS TOTAL_2,
                      COUNT(ROL3.IDTD3) AS TOTAL_3,
                      COUNT(ROL4.IDTD4) AS TOTAL_4,
                      COUNT(ROL10.IDTD10) AS TOTAL_10
                 FROM DB_PORTALES AS POR
                INNER JOIN DB_TIPO_DOCUMENTO AS TD
                   ON POR.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 2
                ) AS ROL2
                   ON ROL2.IDTD2 = POR.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 3
                ) AS ROL3
                   ON ROL3.IDTD3 = POR.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 4
                ) AS ROL4
                   ON ROL4.IDTD4 = POR.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT DISTINCT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD10
                      FROM DB_ROLESXTD AS ROLXTD
                     INNER JOIN DB_ROLES AS ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 10
                ) AS ROL10
                   ON ROL10.IDTD10 = POR.ID_TIPO_DOCUMENTO
                WHERE POR.ID_PORTAL = ?
                GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
                ORDER BY TD.NOMBRE ASC`;

                    {
                        const result = await cds.run(sql, [
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idUsuario,
                            idPortal,
                        ]);

                        for (const rs of result) {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.NOMBRE = rs.NOMBRE;
                            record.CARGAR = rs.TOTAL_2 > 0 ? true : false;
                            record.VISUALIZAR = rs.TOTAL_3 > 0 ? true : false;
                            record.DESCARGAR = rs.TOTAL_4 > 0 ? true : false;
                            record.EDITAR = rs.TOTAL_10 > 0 ? true : false;

                            outPut.push(record);
                        }
                    }
                    break;
            }

            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getRolesTD", query: sql };
        }
    });

    this.on("getListaAdjuntos", async (req) => {
        const { json } = req.data;
        const idPregunta = json.ID_PREGUNTA;

        let sql;
        let outPut = [];

        try {
            sql = `SELECT TITULO_ADJUNTO, URL FROM DB_ADJUNTO_PREGUNTA WHERE ID_PREGUNTA = ?`;
            const result = await cds.run(sql, [idPregunta]);

            for (const rs of result) {
                let record = {};
                record.TITULO_ADJUNTO = rs.TITULO_ADJUNTO;
                record.URL = rs.URL;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListAdjuntos", query: sql };
        }
        return outPut;
    });

    async function getVisible(idPregunta) {
        let sql;
        let sValue;

        try {
            sql = `SELECT COUNT(*) AS TOTAL FROM DB_ADJUNTO_PREGUNTA WHERE ID_PREGUNTA = ?`;
            const result = await cds.run(sql, [idPregunta]);

            for (const rs of result) {
                if (rs.TOTAL > 0) {
                    return (sValue = true);
                } else {
                    return (sValue = false);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getVisible", query: sql };
        }
        return sValue;
    }

    this.on("getPreguntasFrecuentes", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];
        let idCategoria = json.ID_CATEGORIA;

        try {
            sql = `SELECT 
            PREGUNTA.PREGUNTA,
            PREGUNTA.RESPUESTA,
            CATEGORIA.TITULO,
            PREGUNTA.ID_PREGUNTA,
            COUNT(AP.URL) AS COUNT_ADJUNTO
         FROM DB_PREGUNTA AS PREGUNTA
         JOIN DB_CATEGORIA AS CATEGORIA
           ON PREGUNTA.ID_CATEGORIA = CATEGORIA.ID_CATEGORIA
         LEFT JOIN DB_ADJUNTO_PREGUNTA AP
           ON AP.ID_PREGUNTA = PREGUNTA.ID_PREGUNTA
         WHERE PREGUNTA.ID_CATEGORIA = ?
         GROUP BY 
            PREGUNTA.PREGUNTA,
            PREGUNTA.RESPUESTA,
            CATEGORIA.TITULO,
            PREGUNTA.ID_PREGUNTA`;

            const result = await cds.run(sql, [idCategoria]);
            for (const rs of result) {
                let record = {};
                record.PREGUNTA = rs.PREGUNTA;
                record.RESPUESTA = rs.RESPUESTA;
                record.TITULO = rs.TITULO;
                record.VISIBLEADJUNTO = await getVisible(rs.ID_PREGUNTA);
                record.COUNT_ADJUNTO = rs.COUNT_ADJUNTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getPreguntasFrecuentes", query: sql };
        }
        return outPut;
    });

    function eliminaDuplicado(tuArreglo, atributodetuArreglo) {
        const nuevoArreglo = [];
        const nuevoJson = {};

        for (const i in tuArreglo) {
            nuevoJson[tuArreglo[i][atributodetuArreglo]] = tuArreglo[i];
        }

        for (const i in nuevoJson) {
            nuevoArreglo.push(nuevoJson[i]);
        }

        return nuevoArreglo;
    }

    this.on("getListaMetadata", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];

        const idCategoria = json.ID_CATEGORIA;
        const texto = json.TEXTO;
        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;

        const marca = "";

        try {
            switch (texto) {
                case "listaArchivo":
                    sql = `SELECT DISTINCT
                      MD.ATRIBUTO       AS ATRIBUTO,
                      COUNT(ROL2.IDTD2) AS TOTAL_3,
                      TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
                 FROM DB_VINCULACION VIN
                INNER JOIN DB_TIPO_DOCUMENTO TD
                   ON VIN.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                      FROM DB_ROLESXTD ROLXTD
                     INNER JOIN DB_ROLES ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 3
                ) ROL2
                   ON ROL2.IDTD2 = VIN.ID_TIPO_DOCUMENTO
                INNER JOIN DB_METADATA MD
                   ON MD.ID_TIPO_DOCUMENTO = VIN.ID_TIPO_DOCUMENTO
                WHERE VIN.ID_NODO_VINCULA = ?
                  AND VIN.NODO_PORTAL = ?
                  AND (MD.ORIGEN='Manual'
                    OR MD.ORIGEN='SAP'
                    OR MD.ORIGEN='Lista'
                    OR MD.ORIGEN='Estructura Lista'
                    OR MD.ORIGEN='Estructura')
                GROUP BY MD.ATRIBUTO, TD.ID_TIPO_DOCUMENTO`;

                    {
                        const result = await cds.run(sql, [idUsuario, idCategoria, idPortal]);

                        let idTipDoc;
                        for (const rs of result) {
                            let record = {};

                            idTipDoc = rs.ID_TIPO_DOCUMENTO;
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.ATRIBUTO = rs.ATRIBUTO;

                            const rolCrea = rs.TOTAL_3 > 0 ? true : false;
                            if (rolCrea) {
                                outPut.push(record);
                            }
                        }

                        if (marca === "X") {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = idTipDoc;
                            record.ATRIBUTO = "FECHA CARGA";
                            outPut.push(record);
                        }
                    }
                    break;

                case "nodoBusqueda":
                    sql = `SELECT DISTINCT
                      MD.ATRIBUTO       AS ATRIBUTO,
                      COUNT(ROL2.IDTD2) AS TOTAL_3,
                      TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
                 FROM DB_NODOBUSQUEDA NB
                INNER JOIN DB_TIPO_DOCUMENTO TD
                   ON NB.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                      FROM DB_ROLESXTD ROLXTD
                     INNER JOIN DB_ROLES ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 3
                ) ROL2
                   ON ROL2.IDTD2 = NB.ID_TIPO_DOCUMENTO
                INNER JOIN DB_METADATA MD
                   ON MD.ID_TIPO_DOCUMENTO = NB.ID_TIPO_DOCUMENTO
                WHERE NB.ID_NODO = ?
                  AND (MD.ORIGEN='Manual'
                    OR MD.ORIGEN='SAP'
                    OR MD.ORIGEN='Lista'
                    OR MD.ORIGEN='Estructura Lista'
                    OR MD.ORIGEN='Estructura')
                GROUP BY MD.ATRIBUTO, TD.ID_TIPO_DOCUMENTO`;

                    {
                        const result = await cds.run(sql, [idUsuario, idCategoria]);

                        let idTipDoc;
                        for (const rs of result) {
                            let record = {};
                            idTipDoc = rs.ID_TIPO_DOCUMENTO;

                            if (rs.ATRIBUTO === "GERENCIA/SUBGERENCIA/AREA") {
                                record.ATRIBUTO = "GERENCIASUBGERENCIAAREA";
                            } else {
                                record.ATRIBUTO = rs.ATRIBUTO;
                            }
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;

                            const rolCrea = rs.TOTAL_3 > 0 ? true : false;
                            if (rolCrea) {
                                outPut.push(record);
                            }
                        }

                        if (marca === "X") {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = idTipDoc;
                            record.ATRIBUTO = "FECHA CARGA";
                            outPut.push(record);
                        }
                    }
                    break;

                case "nodoContenido":
                    sql = `SELECT DISTINCT
                      MD.ATRIBUTO       AS ATRIBUTO,
                      COUNT(ROL2.IDTD2) AS TOTAL_3,
                      TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
                 FROM DB_PORTALES POR
                INNER JOIN DB_TIPO_DOCUMENTO TD
                   ON POR.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                      FROM DB_ROLESXTD ROLXTD
                     INNER JOIN DB_ROLES ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 3
                ) ROL2
                   ON ROL2.IDTD2 = POR.ID_TIPO_DOCUMENTO
                INNER JOIN DB_METADATA MD
                   ON MD.ID_TIPO_DOCUMENTO = POR.ID_TIPO_DOCUMENTO
                WHERE POR.ID_PORTAL = ?
                  AND (MD.ORIGEN='Manual'
                    OR MD.ORIGEN='SAP'
                    OR MD.ORIGEN='Lista'
                    OR MD.ORIGEN='Estructura Lista'
                    OR MD.ORIGEN='Estructura')
                GROUP BY MD.ATRIBUTO, TD.ID_TIPO_DOCUMENTO`;

                    {
                        const result = await cds.run(sql, [idUsuario, idPortal]);

                        let idTipDoc;
                        for (const rs of result) {
                            let record = {};
                            idTipDoc = rs.ID_TIPO_DOCUMENTO;
                            record.ATRIBUTO = rs.ATRIBUTO;
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;

                            const rolCrea = rs.TOTAL_3 > 0 ? true : false;
                            if (rolCrea) {
                                outPut.push(record);
                            }
                        }

                        if (marca === "X") {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = idTipDoc;
                            record.ATRIBUTO = "FECHA CARGA";
                            outPut.push(record);
                        }
                    }
                    break;

                case "busquedaTAG": {
                    const arrIdTag = JSON.parse(json.TAGS);

                    let idTipDoc;
                    for (let i = 0; i < arrIdTag.length; i++) {
                        sql = `SELECT DISTINCT
                        MD.ATRIBUTO       AS ATRIBUTO,
                        COUNT(ROL2.IDTD2) AS TOTAL_3,
                        TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
                   FROM DB_TAGXTD TAGXTD
                  INNER JOIN DB_TIPO_DOCUMENTO TD
                     ON TAGXTD.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                  LEFT JOIN (
                      SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                        FROM DB_ROLESXTD ROLXTD
                       INNER JOIN DB_ROLES ROL
                          ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                       INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
                          ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                       INNER JOIN DB_ROLESXACCIONES ROLXACC
                          ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                       WHERE ROLXUSU.ID_USUARIO = ?
                         AND ROLXACC.ID_ACCION = 3
                  ) ROL2
                     ON ROL2.IDTD2 = TAGXTD.ID_TIPO_DOCUMENTO
                  INNER JOIN DB_METADATA MD
                     ON MD.ID_TIPO_DOCUMENTO = TAGXTD.ID_TIPO_DOCUMENTO
                  WHERE TAGXTD.ID_TAG = ?
                    AND (MD.ORIGEN='Manual'
                      OR MD.ORIGEN='SAP'
                      OR MD.ORIGEN='Lista')
                  GROUP BY MD.ATRIBUTO, TD.ID_TIPO_DOCUMENTO`;

                        const result = await cds.run(sql, [idUsuario, arrIdTag[i]]);

                        for (const rs of result) {
                            let record = {};
                            idTipDoc = rs.ID_TIPO_DOCUMENTO;
                            record.ATRIBUTO = rs.ATRIBUTO;
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;

                            const rolCrea = rs.TOTAL_3 > 0 ? true : false;
                            if (rolCrea) {
                                outPut.push(record);
                            }
                        }
                    }

                    if (marca === "X") {
                        let record = {};
                        record.ID_TIPO_DOCUMENTO = idTipDoc;
                        record.ATRIBUTO = "FECHA CARGA";
                        outPut.push(record);
                    }
                    break;
                }

                case "favoritos":
                    sql = `SELECT DISTINCT
                      MD.ATRIBUTO       AS ATRIBUTO,
                      COUNT(ROL2.IDTD2) AS TOTAL_3,
                      TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO
                 FROM DB_FAVORITOS FAV
                INNER JOIN DB_TIPO_DOCUMENTO TD
                   ON FAV.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                LEFT JOIN (
                    SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                      FROM DB_ROLESXTD ROLXTD
                     INNER JOIN DB_ROLES ROL
                        ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                     INNER JOIN DB_ROLESXUSUARIOS ROLXUSU
                        ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                     INNER JOIN DB_ROLESXACCIONES ROLXACC
                        ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                     WHERE ROLXUSU.ID_USUARIO = ?
                       AND ROLXACC.ID_ACCION = 3
                ) ROL2
                   ON ROL2.IDTD2 = FAV.ID_TIPO_DOCUMENTO
                INNER JOIN DB_METADATA MD
                   ON MD.ID_TIPO_DOCUMENTO = FAV.ID_TIPO_DOCUMENTO
                WHERE FAV.ID_USUARIO = ?
                  AND FAV.ID_PORTAL = ?
                  AND (MD.ORIGEN='Manual'
                    OR MD.ORIGEN='SAP'
                    OR MD.ORIGEN='Lista')
                GROUP BY MD.ATRIBUTO, TD.ID_TIPO_DOCUMENTO`;

                    {
                        const result = await cds.run(sql, [idUsuario, idUsuario, idPortal]);

                        for (const rs of result) {
                            let record = {};
                            record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                            record.ATRIBUTO = rs.ATRIBUTO;

                            const rolCrea = rs.TOTAL_3 > 0 ? true : false;
                            if (rolCrea) {
                                outPut.push(record);
                            }
                        }
                    }
                    break;
            }
        } catch (e) {
            return { error: e.message, accion: "getListaMetadata", query: sql };
        }

        outPut = eliminaDuplicado(outPut, "ATRIBUTO");
        return outPut;
    });

    async function getAllTD(json) {
        let sql;
        let outPut = [];

        const idCategoria = json.ID_CATEGORIA;
        const idPortal = json.ID_PORTAL;
        const texto = json.TEXTO;

        try {
            switch (texto) {
                case "listaArchivo":
                    sql = `SELECT DISTINCT 
                            TD.ID_TIPO_DOCUMENTO
                       FROM DB_VINCULACION AS VIN
                       INNER JOIN DB_TIPO_DOCUMENTO AS TD 
                        ON VIN.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                       WHERE VIN.ID_NODO_VINCULA = ? 
                         AND VIN.NODO_PORTAL = ?
                       ORDER BY TD.ID_TIPO_DOCUMENTO ASC`;

                    const resultListaArchivo = await cds.run(sql, [idCategoria, idPortal]);

                    for (const rs of resultListaArchivo) {
                        outPut.push(Number(rs.ID_TIPO_DOCUMENTO));
                    }

                    break;

                case "nodoBusqueda":
                    sql = `SELECT DISTINCT 
                            TD.ID_TIPO_DOCUMENTO
                       FROM DB_NODOBUSQUEDA AS NB
                       INNER JOIN DB_TIPO_DOCUMENTO AS TD 
                        ON NB.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                       WHERE NB.ID_NODO = ?
                       ORDER BY TD.ID_TIPO_DOCUMENTO ASC`;

                    const resultNodoBusqueda = await cds.run(sql, [idCategoria]);

                    for (const rs of resultNodoBusqueda) {
                        outPut.push(Number(rs.ID_TIPO_DOCUMENTO));
                    }

                    break;

                case "nodoContenido":
                    sql = `SELECT DISTINCT 
                            TD.ID_TIPO_DOCUMENTO
                       FROM DB_PORTALES AS POR
                       INNER JOIN DB_TIPO_DOCUMENTO AS TD 
                        ON POR.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                       WHERE POR.ID_PORTAL = ?
                       ORDER BY TD.ID_TIPO_DOCUMENTO ASC`;

                    const resultNodoContenido = await cds.run(sql, [idPortal]);

                    for (const rs of resultNodoContenido) {
                        outPut.push(Number(rs.ID_TIPO_DOCUMENTO));
                    }

                    break;

                case "busquedaTAG":
                    const arrIdTag = typeof json.TAGS === "string"
                        ? JSON.parse(json.TAGS)
                        : json.TAGS || [];

                    for (const idTag of arrIdTag) {
                        sql = `SELECT DISTINCT 
                                TD.ID_TIPO_DOCUMENTO
                           FROM DB_TAGXTD AS TAGXTD
                           INNER JOIN DB_TIPO_DOCUMENTO AS TD 
                            ON TAGXTD.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                           WHERE TAGXTD.ID_TAG = ?
                           ORDER BY TD.ID_TIPO_DOCUMENTO ASC`;

                        const resultBusquedaTag = await cds.run(sql, [idTag]);

                        for (const rs of resultBusquedaTag) {
                            outPut.push(Number(rs.ID_TIPO_DOCUMENTO));
                        }
                    }

                    break;
            }

        } catch (e) {
            return " AND 1 = 0 ";
        }

        const tiposDocumento = [...new Set(outPut)]
            .filter(id => Number.isInteger(id) && id > 0);

        if (tiposDocumento.length === 0) {
            return " AND 1 = 0 ";
        }

        return ` AND MDV.ID_TIPO_DOCUMENTO IN (${tiposDocumento.join(",")})`;
    }

    async function insertCriterio(idPortal, atributo, fecha, hora) {
        let sql, body;

        try {
            const querySequence = await getIdSequence("ID_BUSQUEDA_CRITERIOS");
            sql = `INSERT INTO DB_BUSQUEDA_CRITERIOS VALUES (?, ?, ?, ?, ?)`;
            await cds.run(sql, [querySequence, idPortal, atributo, fecha, hora]);

            body = sql;
        } catch (e) {
            return { error: e.message, accion: "insertCriterio", query: sql };
        }
        return body;
    };

    async function getBusquedaAvanzadaAll(json) {
        console.log("este es el json", json)
        let sql;

        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: [],
            QUERY: ""
        };

        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const fecha = json.FECHA;
        const hora = json.HORA;

        const arrContenidoExtra = typeof json.CONTENIDO_EXTRA === "string"
            ? JSON.parse(json.CONTENIDO_EXTRA)
            : json.CONTENIDO_EXTRA || [];

        const arrContenido = typeof json.CONTENIDO === "string"
            ? JSON.parse(json.CONTENIDO)
            : json.CONTENIDO || [];

        const rInicio = Number(json.INICIO_PAGINA);
        const rFin = Number(json.FIN_PAGINA);
        const diff = rFin - rInicio;
        const queryPag = ` LIMIT ${diff} OFFSET ${rInicio}`;

        let queryWhere = "";
        let queryExtraSelect = "";
        let queryExtraGroup = "";
        let queryExtraJoin = "";

        const paramsBase = [];
        const paramsExtra = [];
        const paramsWhere = [];

        try {
            const condiciones = [];

            for (const item of arrContenido) {
                let idTipoDoc = item.ID_TIPO_DOCUMENTO;
                let atributo = item.ATRIBUTO;
                const operador = item.OPERADOR;
                let value = item.VALUE;
                let value2 = item.VALUE2;

                if (atributo === "FECHA CARGA") {
                    atributo = "FechaCarga";
                }

                let condicionOperador = "";

                if (operador === "Contiene") {
                    condicionOperador = "UPPER(MDV.VALUE) LIKE UPPER(?)";

                    condiciones.push(`
                    (
                        MDV.ID_TIPO_DOCUMENTO = ?
                        AND MDV.ATRIBUTO = ?
                        AND ${condicionOperador}
                    )
                `);

                    paramsWhere.push(idTipoDoc, atributo, `%${value}%`);
                }

                if (operador === "Es Igual") {
                    condicionOperador = "UPPER(MDV.VALUE) = UPPER(?)";

                    condiciones.push(`
                    (
                        MDV.ID_TIPO_DOCUMENTO = ?
                        AND MDV.ATRIBUTO = ?
                        AND ${condicionOperador}
                    )
                `);

                    paramsWhere.push(idTipoDoc, atributo, value);
                }

                if (operador === "Entre") {
                    value = orderFecha(value);
                    value2 = orderFecha(value2);

                    condicionOperador = "MDV.VALUE BETWEEN ? AND ?";

                    condiciones.push(`
                    (
                        MDV.ID_TIPO_DOCUMENTO = ?
                        AND MDV.ATRIBUTO = ?
                        AND ${condicionOperador}
                    )
                `);

                    paramsWhere.push(idTipoDoc, atributo, value, value2);
                }

                await insertCriterio(idPortal, atributo, fecha, hora);
            }

            queryWhere = ` WHERE ${condiciones.join(" OR ")}`;

            let indexExtra = 0;

            for (const item of arrContenidoExtra) {
                queryExtraSelect += `, MDVBTD${indexExtra}.VALUE AS VALUE${indexExtra}`;
                queryExtraGroup += `, MDVBTD${indexExtra}.VALUE`;

                queryExtraJoin += `
                LEFT JOIN (
                    SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
                    FROM DB_METADATA_VALUE
                    WHERE ATRIBUTO = ?
                ) AS MDVBTD${indexExtra}
                  ON MDVBTD${indexExtra}.ID_DETALLE = DET.ID_DETALLE
                 AND MDVBTD${indexExtra}.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            `;

                paramsExtra.push(item);
                indexExtra++;
            }

            sql = `
            SELECT DISTINCT
                CAT.ID_CATEGORIA AS ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR AS ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE AS ID_PADRE,
                CAT.TITULO AS TITULO,
                DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION AS DESCRIPCION,
                DOC.UFH_CREAR AS UFH_CREAR,
                COUNT(FAV.ID_FAVORITOS) AS TOTAL_FAVORITOS,
                COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS TOTAL_WF,
                COUNT(DISTINCT DET2.ID_DETALLE) AS TOTAL_URL,
                COUNT(ROL3.IDTD3) AS TOTAL_ROL3,
                COUNT(ROL4.IDTD4) AS TOTAL_ROL4,
                DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
                TD.NOMBRE AS NOMBRE_TIPO_DOCUMENTO
                ${queryExtraSelect}
            FROM DB_METADATA_VALUE AS MDV
            INNER JOIN DB_DETALLE AS DET
                ON DET.ID_DETALLE = MDV.ID_DETALLE
            INNER JOIN DB_CATEGORIA AS CAT
                ON CAT.ID_CATEGORIA = DET.NODO_HIJO
            INNER JOIN DB_DOCUMENTO AS DOC
                ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
            INNER JOIN DB_TIPO_DOCUMENTO AS TD
                ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN DB_FAVORITOS AS FAV
                ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA
               AND FAV.ID_USUARIO = ?
               AND FAV.ID_PORTAL = ?
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 3
            ) AS ROL3
                ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 4
            ) AS ROL4
                ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
            ${queryExtraJoin}
            LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
                ON EL.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            INNER JOIN (
                SELECT ID_DETALLE, NODO_HIJO
                FROM DB_DETALLE
            ) AS DET2
                ON DET2.NODO_HIJO = CAT.ID_CATEGORIA
            ${queryWhere}
            GROUP BY
                TD.NOMBRE,
                CAT.ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE,
                CAT.TITULO,
                DET.ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION,
                DOC.UFH_CREAR,
                DOC.ID_DOCUMENTO
                ${queryExtraGroup}
            ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC
        `;

            paramsBase.push(idUsuario, idPortal, idUsuario, idUsuario);

            const params = [
                ...paramsBase,
                ...paramsExtra,
                ...paramsWhere
            ];

            const rset = await cds.run(sql, params);
            outPut.TOTAL_REGISTROS = rset.length;

            const queryFinal = sql + queryPag;
            outPut.QUERY = queryFinal;

            const result = await cds.run(queryFinal, params);

            for (const rs of result) {
                let record = {};

                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.ID_DOCUMENTO = rs.ID_DOCUMENTO;
                record.TITULO = rs.TITULO;
                record.DOCUMENTO = true;
                record.TIPO = "Documento";
                record.FAVORITO = Number(rs.TOTAL_FAVORITOS) > 0;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = Number(rs.TOTAL_WF) > 0;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(String(rs.UFH_CREAR));
                record.ICONO = "sap-icon://document";
                record.URL = rs.TOTAL_URL;
                record.DESCARGA = Number(rs.TOTAL_ROL4) > 0;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;
                record.QUERY = sql;

                const guiaDespacho = await getGuiaDespacho(record.ID_DOCUMENTO);

                if (record.ID_TIPO_DOCUMENTO !== 2800) {
                    record.TITULO = rs.TITULO;
                } else {
                    record.TITULO = "Documento_GD_" + guiaDespacho;
                }

                const rolVisualiza = Number(rs.TOTAL_ROL3) > 0;

                let indexMetadata = 0;

                for (const item of arrContenidoExtra) {
                    const valueExtra = rs[`VALUE${indexMetadata}`];

                    record[item] = valueExtra == null
                        ? "—"
                        : item.toUpperCase().includes("FECHA")
                            ? orderFecha(String(valueExtra))
                            : String(valueExtra);

                    indexMetadata++;
                }

                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }

        } catch (e) {
            return {
                error: e.message,
                accion: "getBusquedaAvanzadaAll",
                query: sql
            };
        }

        return outPut;
    }

    async function getBusquedaAvanzadaXTipoDocumento(json) {
        let sql;

        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: []
        };

        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;

        const arrContenidoExtra = typeof json.CONTENIDO_EXTRA === "string"
            ? JSON.parse(json.CONTENIDO_EXTRA)
            : json.CONTENIDO_EXTRA || [];

        const arrContenido = typeof json.CONTENIDO === "string"
            ? JSON.parse(json.CONTENIDO)
            : json.CONTENIDO || [];

        const rInicio = Number(json.INICIO_PAGINA);
        const rFin = Number(json.FIN_PAGINA);
        const diff = rFin - rInicio;
        const queryPag = ` LIMIT ${diff} OFFSET ${rInicio}`;

        let queryWhere = "";
        let queryExtraSelect = "";
        let queryExtraGroup = "";
        let queryExtraJoin = "";

        const paramsExtra = [];
        const paramsWhere = [];

        try {
            const condiciones = [];

            for (const item of arrContenido) {
                const idTipoDoc = item.ID_TIPO_DOCUMENTO;

                condiciones.push(`MDV.ID_TIPO_DOCUMENTO = ?`);
                paramsWhere.push(idTipoDoc);
            }

            queryWhere = ` WHERE ${condiciones.join(" OR ")}`;

            let indexExtra = 0;

            for (const item of arrContenidoExtra) {
                queryExtraSelect += `, MDVBTD${indexExtra}.VALUE AS VALUE${indexExtra}`;
                queryExtraGroup += `, MDVBTD${indexExtra}.VALUE`;

                queryExtraJoin += `
                LEFT JOIN (
                    SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
                    FROM DB_METADATA_VALUE
                    WHERE ATRIBUTO = ?
                ) AS MDVBTD${indexExtra}
                  ON MDVBTD${indexExtra}.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
                 AND MDVBTD${indexExtra}.ID_DETALLE = DET.ID_DETALLE
            `;

                paramsExtra.push(item);
                indexExtra++;
            }

            sql = `
            SELECT DISTINCT
                CAT.ID_CATEGORIA AS ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR AS ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE AS ID_PADRE,
                CAT.TITULO AS TITULO,
                DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION AS DESCRIPCION,
                DOC.UFH_CREAR AS UFH_CREAR,
                COUNT(FAV.ID_FAVORITOS) AS TOTAL_FAVORITOS,
                COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS TOTAL_WF,
                COUNT(DISTINCT DET2.ID_DETALLE) AS TOTAL_URL,
                COUNT(ROL3.IDTD3) AS TOTAL_ROL3,
                COUNT(ROL4.IDTD4) AS TOTAL_ROL4,
                DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
                TD.NOMBRE AS NOMBRE_TIPO_DOCUMENTO
                ${queryExtraSelect}
            FROM DB_METADATA_VALUE AS MDV
            INNER JOIN DB_DETALLE AS DET
                ON DET.ID_DETALLE = MDV.ID_DETALLE
            INNER JOIN DB_CATEGORIA AS CAT
                ON CAT.ID_CATEGORIA = DET.NODO_HIJO
            INNER JOIN DB_DOCUMENTO AS DOC
                ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
            INNER JOIN DB_TIPO_DOCUMENTO AS TD
                ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN DB_FAVORITOS AS FAV
                ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA
               AND FAV.ID_USUARIO = ?
               AND FAV.ID_PORTAL = ?
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 3
            ) AS ROL3
                ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 4
            ) AS ROL4
                ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
            ${queryExtraJoin}
            LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
                ON EL.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            INNER JOIN (
                SELECT ID_DETALLE, NODO_HIJO
                FROM DB_DETALLE
            ) AS DET2
                ON DET2.NODO_HIJO = CAT.ID_CATEGORIA
            ${queryWhere}
            GROUP BY
                TD.NOMBRE,
                CAT.ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE,
                CAT.TITULO,
                DET.ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION,
                DOC.UFH_CREAR,
                DOC.ID_DOCUMENTO
                ${queryExtraGroup}
            ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC
        `;

            const params = [
                idUsuario,
                idPortal,
                idUsuario,
                idUsuario,
                ...paramsExtra,
                ...paramsWhere
            ];

            const rset = await cds.run(sql, params);
            outPut.TOTAL_REGISTROS = rset.length;

            const queryFinal = sql + queryPag;
            const result = await cds.run(queryFinal, params);

            for (const rs of result) {
                let record = {};

                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.ID_DOCUMENTO = rs.ID_DOCUMENTO;
                record.DOCUMENTO = true;
                record.TIPO = "Documento";
                record.FAVORITO = Number(rs.TOTAL_FAVORITOS) > 0;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = Number(rs.TOTAL_WF) > 0;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(String(rs.UFH_CREAR));
                record.ICONO = "sap-icon://document";
                record.URL = rs.TOTAL_URL;
                record.DESCARGA = Number(rs.TOTAL_ROL4) > 0;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;

                const guiaDespacho = await getGuiaDespacho(record.ID_DOCUMENTO);

                if (record.ID_TIPO_DOCUMENTO !== 2800) {
                    record.TITULO = rs.TITULO;
                } else {
                    record.TITULO = "Documento_GD_" + guiaDespacho;
                }

                const rolVisualiza = Number(rs.TOTAL_ROL3) > 0;

                let indexMetadata = 0;

                for (const item of arrContenidoExtra) {
                    const valueExtra = rs[`VALUE${indexMetadata}`];

                    record[item] = valueExtra == null
                        ? "—"
                        : item.toUpperCase().includes("FECHA")
                            ? orderFecha(String(valueExtra))
                            : String(valueExtra);

                    indexMetadata++;
                }

                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }

        } catch (e) {
            return {
                error: e.message,
                accion: "getBusquedaAvanzadaXTipoDocumento",
                query: sql
            };
        }

        return outPut;
    }

    async function getBusquedaAvanzadaXMetadata(json) {
        let sql;

        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: [],
            query: ""
        };

        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const fecha = json.FECHA;
        const hora = json.HORA;

        const arrContenidoExtra = typeof json.CONTENIDO_EXTRA === "string"
            ? JSON.parse(json.CONTENIDO_EXTRA)
            : json.CONTENIDO_EXTRA || [];

        const arrContenido = typeof json.CONTENIDO === "string"
            ? JSON.parse(json.CONTENIDO)
            : json.CONTENIDO || [];

        const rInicio = Number(json.INICIO_PAGINA);
        const rFin = Number(json.FIN_PAGINA);
        const diff = rFin - rInicio;
        const queryPag = ` LIMIT ${diff} OFFSET ${rInicio}`;

        let queryWhere = "";
        let queryExtraSelect = "";
        let queryExtraGroup = "";
        let queryExtraJoin = "";

        const paramsExtra = [];
        const paramsWhere = [];

        try {
            const condiciones = [];

            for (const item of arrContenido) {
                let atributo = item.ATRIBUTO;
                const operador = item.OPERADOR;
                let value = item.VALUE;
                let value2 = item.VALUE2;

                if (atributo === "FECHA CARGA") {
                    atributo = "FechaCarga";
                }

                let condicionOperador = "";

                if (operador === "Contiene") {
                    condicionOperador = "UPPER(MDV.VALUE) LIKE UPPER(?)";

                    condiciones.push(`
                    (
                        MDV.ATRIBUTO = ?
                        AND ${condicionOperador}
                    )
                `);

                    paramsWhere.push(atributo, `%${value}%`);
                }

                if (operador === "Es Igual") {
                    condicionOperador = "UPPER(MDV.VALUE) = UPPER(?)";

                    condiciones.push(`
                    (
                        MDV.ATRIBUTO = ?
                        AND ${condicionOperador}
                    )
                `);

                    paramsWhere.push(atributo, value);
                }

                if (operador === "Entre") {
                    value = orderFecha(value);
                    value2 = orderFecha(value2);

                    condicionOperador = "MDV.VALUE BETWEEN ? AND ?";

                    condiciones.push(`
                    (
                        MDV.ATRIBUTO = ?
                        AND ${condicionOperador}
                    )
                `);

                    paramsWhere.push(atributo, value, value2);
                }

                await insertCriterio(idPortal, atributo, fecha, hora);
            }

            queryWhere = condiciones.length > 0
                ? ` WHERE ${condiciones.join(" OR ")}`
                : "";

            let indexExtra = 0;

            for (const item of arrContenidoExtra) {
                queryExtraSelect += `, MDVBTD${indexExtra}.VALUE AS VALUE${indexExtra}`;
                queryExtraGroup += `, MDVBTD${indexExtra}.VALUE`;

                queryExtraJoin += `
                LEFT JOIN (
                    SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
                    FROM DB_METADATA_VALUE
                    WHERE ATRIBUTO = ?
                ) AS MDVBTD${indexExtra}
                  ON MDVBTD${indexExtra}.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
                 AND MDVBTD${indexExtra}.ID_DETALLE = DET.ID_DETALLE
            `;

                paramsExtra.push(item);
                indexExtra++;
            }

            sql = `
            SELECT DISTINCT
                CAT.ID_CATEGORIA AS ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR AS ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE AS ID_PADRE,
                CAT.TITULO AS TITULO,
                DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION AS DESCRIPCION,
                DOC.UFH_CREAR AS UFH_CREAR,
                COUNT(FAV.ID_FAVORITOS) AS TOTAL_FAVORITOS,
                COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS TOTAL_WF,
                COUNT(DISTINCT DET2.ID_DETALLE) AS TOTAL_URL,
                COUNT(ROL3.IDTD3) AS TOTAL_ROL3,
                COUNT(ROL4.IDTD4) AS TOTAL_ROL4,
                DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
                TD.NOMBRE AS NOMBRE_TIPO_DOCUMENTO
                ${queryExtraSelect}
            FROM DB_METADATA_VALUE AS MDV
            INNER JOIN DB_DETALLE AS DET
                ON DET.ID_DETALLE = MDV.ID_DETALLE
            INNER JOIN DB_CATEGORIA AS CAT
                ON CAT.ID_CATEGORIA = DET.NODO_HIJO
            INNER JOIN DB_DOCUMENTO AS DOC
                ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
            INNER JOIN DB_TIPO_DOCUMENTO AS TD
                ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN DB_FAVORITOS AS FAV
                ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA
               AND FAV.ID_USUARIO = ?
               AND FAV.ID_PORTAL = ?
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 3
            ) AS ROL3
                ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 4
            ) AS ROL4
                ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
            ${queryExtraJoin}
            LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
                ON EL.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            INNER JOIN (
                SELECT ID_DETALLE, NODO_HIJO
                FROM DB_DETALLE
            ) AS DET2
                ON DET2.NODO_HIJO = CAT.ID_CATEGORIA
            ${queryWhere}
            GROUP BY
                CAT.ID_CATEGORIA,
                TD.NOMBRE,
                CAT.ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE,
                CAT.TITULO,
                DET.ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION,
                DOC.UFH_CREAR,
                DOC.ID_DOCUMENTO
                ${queryExtraGroup}
            ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC
        `;

            const params = [
                idUsuario,
                idPortal,
                idUsuario,
                idUsuario,
                ...paramsExtra,
                ...paramsWhere
            ];

            const rset = await cds.run(sql, params);
            outPut.TOTAL_REGISTROS = rset.length;
            outPut.query = sql;

            const queryFinal = sql + queryPag;
            const result = await cds.run(queryFinal, params);

            for (const rs of result) {
                let record = {};

                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.ID_DOCUMENTO = rs.ID_DOCUMENTO;
                record.DOCUMENTO = true;
                record.TIPO = "Documento";
                record.FAVORITO = Number(rs.TOTAL_FAVORITOS) > 0;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = Number(rs.TOTAL_WF) > 0;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(String(rs.UFH_CREAR));
                record.ICONO = "sap-icon://document";
                record.URL = rs.TOTAL_URL;
                record.DESCARGA = Number(rs.TOTAL_ROL4) > 0;

                const guiaDespacho = await getGuiaDespacho(record.ID_DOCUMENTO);

                if (record.ID_TIPO_DOCUMENTO !== 2800) {
                    record.TITULO = rs.TITULO;
                } else {
                    record.TITULO = "Documento_GD_" + guiaDespacho;
                }

                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;

                const rolVisualiza = Number(rs.TOTAL_ROL3) > 0;

                let indexMetadata = 0;

                for (const item of arrContenidoExtra) {
                    const valueExtra = rs[`VALUE${indexMetadata}`];

                    record[item] = valueExtra == null
                        ? "—"
                        : item.toUpperCase().includes("FECHA")
                            ? orderFecha(String(valueExtra))
                            : String(valueExtra);

                    indexMetadata++;
                }

                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }

        } catch (e) {
            return {
                error: e.message,
                accion: "getBusquedaAvanzadaXMetadata",
                query: sql
            };
        }

        return outPut;
    }

    async function getBusquedaAvanzadaXFecha(json) {
        let sql;

        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: [],
            query: ""
        };

        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const fecha = json.FECHA;
        const hora = json.HORA;

        const arrContenidoExtra = typeof json.CONTENIDO_EXTRA === "string"
            ? JSON.parse(json.CONTENIDO_EXTRA)
            : json.CONTENIDO_EXTRA || [];

        const arrContenido = typeof json.CONTENIDO === "string"
            ? JSON.parse(json.CONTENIDO)
            : json.CONTENIDO || [];

        const rInicio = Number(json.INICIO_PAGINA);
        const rFin = Number(json.FIN_PAGINA);
        const diff = rFin - rInicio;
        const queryPag = ` LIMIT ${diff} OFFSET ${rInicio}`;

        let queryWhere = "";
        let queryExtraSelect = "";
        let queryExtraGroup = "";
        let queryExtraJoin = "";

        const paramsExtra = [];
        const paramsWhere = [];

        try {
            const condiciones = [];

            for (const item of arrContenido) {
                let atributo = item.ATRIBUTO;
                const operador = item.OPERADOR;
                let value = item.VALUE;
                let value2 = item.VALUE2;

                if (atributo === "FECHA CARGA") {
                    atributo = "FechaCarga";
                }

                const filtroTipoDocumento = await getAllTD(json);

                if (operador === "Contiene") {
                    condiciones.push(`
                    (
                        MDV.ATRIBUTO = ?
                        AND UPPER(MDV.VALUE) LIKE UPPER(?)
                        ${filtroTipoDocumento}
                    )
                `);

                    paramsWhere.push(atributo, `%${value}%`);
                }

                if (operador === "Es Igual") {
                    condiciones.push(`
                    (
                        MDV.ATRIBUTO = ?
                        AND UPPER(MDV.VALUE) = UPPER(?)
                        ${filtroTipoDocumento}
                    )
                `);

                    paramsWhere.push(atributo, value);
                }

                if (operador === "Entre") {
                    value = orderFecha(value);
                    value2 = orderFecha(value2);

                    condiciones.push(`
                    (
                        MDV.ATRIBUTO = ?
                        AND MDV.VALUE BETWEEN ? AND ?
                        ${filtroTipoDocumento}
                    )
                `);

                    paramsWhere.push(atributo, value, value2);
                }

                await insertCriterio(idPortal, atributo, fecha, hora);
            }

            queryWhere = condiciones.length > 0
                ? ` WHERE ${condiciones.join(" OR ")}`
                : "";

            let indexExtra = 0;

            for (const item of arrContenidoExtra) {
                queryExtraSelect += `, MDVBTD${indexExtra}.VALUE AS VALUE${indexExtra}`;
                queryExtraGroup += `, MDVBTD${indexExtra}.VALUE`;

                queryExtraJoin += `
                LEFT JOIN (
                    SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
                    FROM DB_METADATA_VALUE
                    WHERE ATRIBUTO = ?
                ) AS MDVBTD${indexExtra}
                  ON MDVBTD${indexExtra}.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
                 AND MDVBTD${indexExtra}.ID_DETALLE = DET.ID_DETALLE
            `;

                paramsExtra.push(item);
                indexExtra++;
            }

            sql = `
            SELECT DISTINCT
                CAT.ID_CATEGORIA AS ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR AS ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE AS ID_PADRE,
                CAT.TITULO AS TITULO,
                DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION AS DESCRIPCION,
                DOC.UFH_CREAR AS UFH_CREAR,
                COUNT(FAV.ID_FAVORITOS) AS TOTAL_FAVORITOS,
                COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS TOTAL_WF,
                COUNT(DISTINCT DET2.ID_DETALLE) AS TOTAL_URL,
                COUNT(ROL3.IDTD3) AS TOTAL_ROL3,
                COUNT(ROL4.IDTD4) AS TOTAL_ROL4,
                DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
                TD.NOMBRE AS NOMBRE_TIPO_DOCUMENTO
                ${queryExtraSelect}
            FROM DB_METADATA_VALUE AS MDV
            INNER JOIN DB_DETALLE AS DET
                ON DET.ID_DETALLE = MDV.ID_DETALLE
            INNER JOIN DB_CATEGORIA AS CAT
                ON CAT.ID_CATEGORIA = DET.NODO_HIJO
            INNER JOIN DB_DOCUMENTO AS DOC
                ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
            INNER JOIN DB_TIPO_DOCUMENTO AS TD
                ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN DB_FAVORITOS AS FAV
                ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA
               AND FAV.ID_USUARIO = ?
               AND FAV.ID_PORTAL = ?
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 3
            ) AS ROL3
                ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 4
            ) AS ROL4
                ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
            ${queryExtraJoin}
            LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
                ON EL.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            INNER JOIN (
                SELECT ID_DETALLE, NODO_HIJO
                FROM DB_DETALLE
            ) AS DET2
                ON DET2.NODO_HIJO = CAT.ID_CATEGORIA
            ${queryWhere}
            GROUP BY
                CAT.ID_CATEGORIA,
                TD.NOMBRE,
                CAT.ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE,
                CAT.TITULO,
                DET.ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION,
                DOC.UFH_CREAR,
                DOC.ID_DOCUMENTO
                ${queryExtraGroup}
            ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC
        `;

            const params = [
                idUsuario,
                idPortal,
                idUsuario,
                idUsuario,
                ...paramsExtra,
                ...paramsWhere
            ];

            const rset = await cds.run(sql, params);
            outPut.TOTAL_REGISTROS = rset.length;

            const queryFinal = sql + queryPag;
            outPut.query = queryFinal;

            const result = await cds.run(queryFinal, params);

            for (const rs of result) {
                let record = {};

                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.ID_DOCUMENTO = rs.ID_DOCUMENTO;
                record.DOCUMENTO = true;
                record.TIPO = "Documento";
                record.FAVORITO = Number(rs.TOTAL_FAVORITOS) > 0;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = Number(rs.TOTAL_WF) > 0;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(String(rs.UFH_CREAR));
                record.ICONO = "sap-icon://document";
                record.URL = rs.TOTAL_URL;
                record.DESCARGA = Number(rs.TOTAL_ROL4) > 0;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;

                const guiaDespacho = await getGuiaDespacho(record.ID_DOCUMENTO);

                if (record.ID_TIPO_DOCUMENTO !== 2800) {
                    record.TITULO = rs.TITULO;
                } else {
                    record.TITULO = "Documento_GD_" + guiaDespacho;
                }

                const rolVisualiza = Number(rs.TOTAL_ROL3) > 0;

                let indexMetadata = 0;

                for (const item of arrContenidoExtra) {
                    const valueExtra = rs[`VALUE${indexMetadata}`];

                    record[item] = valueExtra == null
                        ? "—"
                        : item.toUpperCase().includes("FECHA")
                            ? orderFecha(String(valueExtra))
                            : String(valueExtra);

                    indexMetadata++;
                }

                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }

        } catch (e) {
            return {
                error: e.message,
                accion: "getBusquedaAvanzadaXFecha",
                query: sql
            };
        }

        return outPut;
    }

    async function getBusquedaAvanzadaXEstructura(json) {
        let sql;
        let outPut = [];

        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;

        const arrContenidoExtra = typeof json.CONTENIDO_EXTRA === "string"
            ? JSON.parse(json.CONTENIDO_EXTRA)
            : json.CONTENIDO_EXTRA || [];

        const arrContenido = typeof json.CONTENIDO === "string"
            ? JSON.parse(json.CONTENIDO)
            : json.CONTENIDO || [];

        let queryWhere = "";
        let queryExtraSelect = "";
        let queryExtraGroup = "";
        let queryExtraJoin = "";

        const paramsExtra = [];
        const paramsWhere = [];

        try {
            const condiciones = [];

            let ultimoAtributo = "";
            let ultimoValue = "";

            for (const item of arrContenido) {
                let atributo = item.ATRIBUTO;

                if (atributo === "FECHA CARGA") {
                    atributo = "FechaCarga";
                }

                const value = atributo;
                const filtroTipoDocumento = await getAllTD(json);

                condiciones.push(`
                (
                    MDV.ATRIBUTO = ?
                    AND UPPER(MDV.VALUE) = UPPER(?)
                    ${filtroTipoDocumento}
                )
            `);

                paramsWhere.push(atributo, value);

                ultimoAtributo = atributo;
                ultimoValue = value;
            }

            queryWhere = condiciones.length > 0
                ? ` WHERE ${condiciones.join(" OR ")}`
                : "";

            let indexExtra = 0;

            for (const item of arrContenidoExtra) {
                queryExtraSelect += `, MDVBTD${indexExtra}.VALUE AS VALUE${indexExtra}`;
                queryExtraGroup += `, MDVBTD${indexExtra}.VALUE`;

                queryExtraJoin += `
                LEFT JOIN (
                    SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
                    FROM DB_METADATA_VALUE
                    WHERE ATRIBUTO = ?
                ) AS MDVBTD${indexExtra}
                  ON MDVBTD${indexExtra}.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
                 AND MDVBTD${indexExtra}.ID_DETALLE = DET.ID_DETALLE
            `;

                paramsExtra.push(item);

                if (item === ultimoAtributo) {
                    queryExtraJoin += ` AND MDVBTD${indexExtra}.VALUE = ? `;
                    paramsExtra.push(ultimoValue);
                }

                indexExtra++;
            }

            sql = `
            SELECT DISTINCT
                CAT.ID_CATEGORIA AS ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR AS ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE AS ID_PADRE,
                CAT.TITULO AS TITULO,
                DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION AS DESCRIPCION,
                DOC.UFH_CREAR AS UFH_CREAR,
                COUNT(FAV.ID_FAVORITOS) AS TOTAL_FAVORITOS,
                COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS TOTAL_WF,
                COUNT(DISTINCT DET2.ID_DETALLE) AS TOTAL_URL,
                COUNT(ROL3.IDTD3) AS TOTAL_ROL3,
                COUNT(ROL4.IDTD4) AS TOTAL_ROL4,
                DOC.ID_DOCUMENTO AS ID_DOCUMENTO
                ${queryExtraSelect}
            FROM DB_METADATA_VALUE AS MDV
            INNER JOIN DB_DETALLE AS DET
                ON DET.ID_DETALLE = MDV.ID_DETALLE
            INNER JOIN DB_CATEGORIA AS CAT
                ON CAT.ID_CATEGORIA = DET.NODO_HIJO
            INNER JOIN DB_DOCUMENTO AS DOC
                ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
            LEFT JOIN DB_FAVORITOS AS FAV
                ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA
               AND FAV.ID_USUARIO = ?
               AND FAV.ID_PORTAL = ?
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 3
            ) AS ROL3
                ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 4
            ) AS ROL4
                ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
            ${queryExtraJoin}
            LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
                ON EL.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            INNER JOIN (
                SELECT ID_DETALLE, NODO_HIJO
                FROM DB_DETALLE
            ) AS DET2
                ON DET2.NODO_HIJO = CAT.ID_CATEGORIA
            ${queryWhere}
            GROUP BY
                CAT.ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR,
                CAT.ID_PADRE,
                CAT.TITULO,
                DET.ID_TIPO_DOCUMENTO,
                CAT.DESCRIPCION,
                DOC.UFH_CREAR,
                DOC.ID_DOCUMENTO
                ${queryExtraGroup}
        `;

            const params = [
                idUsuario,
                idPortal,
                idUsuario,
                idUsuario,
                ...paramsExtra,
                ...paramsWhere
            ];

            const result = await cds.run(sql, params);

            for (const rs of result) {
                let record = {};

                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.ID_DOCUMENTO = rs.ID_DOCUMENTO;
                record.DOCUMENTO = true;
                record.TIPO = "Documento";
                record.FAVORITO = Number(rs.TOTAL_FAVORITOS) > 0;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = Number(rs.TOTAL_WF) > 0;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(String(rs.UFH_CREAR));
                record.ICONO = "sap-icon://document";
                record.URL = rs.TOTAL_URL;
                record.DESCARGA = Number(rs.TOTAL_ROL4) > 0;

                const guiaDespacho = await getGuiaDespacho(record.ID_DOCUMENTO);

                if (record.ID_TIPO_DOCUMENTO !== 2800) {
                    record.TITULO = rs.TITULO;
                } else {
                    record.TITULO = "Documento_GD_" + guiaDespacho;
                }

                const rolVisualiza = Number(rs.TOTAL_ROL3) > 0;

                let indexMetadata = 0;

                for (const item of arrContenidoExtra) {
                    const valueExtra = rs[`VALUE${indexMetadata}`];

                    record[item] = valueExtra == null
                        ? "—"
                        : String(valueExtra);

                    indexMetadata++;
                }

                if (rolVisualiza) {
                    outPut.push(record);
                }
            }

        } catch (e) {
            return {
                error: e.message,
                accion: "getBusquedaAvanzadaXEstructura",
                query: sql
            };
        }

        return outPut;
    }

    this.on("getBusquedaTipoDocumento", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: [],
            QUERY: "",
        };

        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const arrContenidoExtra = JSON.parse(json.CONTENIDO_EXTRA);
        const arrContenido = JSON.parse(json.CONTENIDO);
        const tipo = json.TIPO_BUSQUEDA;

        try {
            switch (tipo) {
                case "Valores de Metadata":
                    outPut = await getBusquedaAvanzadaAll(json);
                    break;
                case "Tipo de Documentos":
                    outPut = await getBusquedaAvanzadaXTipoDocumento(json);
                    break;
                case "Metadata":
                    outPut = await getBusquedaAvanzadaXMetadata(json);
                    break;
                case "Fecha Creación":
                    outPut = await getBusquedaAvanzadaXFecha(json);
                    break;
                case "Estructura":
                    outPut = await getBusquedaAvanzadaXEstructura(json);
                    break;
            }
        } catch (e) {
            return { error: e.message, accion: "getBusquedaTipoDocumento", query: sql };
        }
        return outPut;
    });

    this.on("getSuggestionTipoDocumento", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];

        const id_tipo_documento = json.ID_TIPO_DOCUMENTO;
        const atributoMD = json.ATRIBUTO;

        let date = false;
        if (atributoMD.indexOf("Fecha") > -1) {
            date = true;
        };

        try {
            sql = `SELECT DISTINCT UPPER(MDV.VALUE) AS VALUE
          FROM DB_METADATA_VALUE AS MDV
            WHERE MDV.ID_TIPO_DOCUMENTO = ? AND UPPER(MDV.ATRIBUTO) = ? 
          ORDER BY UPPER(MDV.VALUE) ASC`;

            const result = await cds.run(sql, [id_tipo_documento, atributoMD]);
            for (const rs of result) {
                let record = {};
                if (date) {
                    record.TITULO = orderFecha(rs.VALUE);
                } else {
                    record.TITULO = rs.VALUE;
                }
                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getSuggestionTipoDocumento", query: sql };
        }
        return outPut;
    });

    this.on("getListTD", async () => {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                           TD.NOMBRE            AS NOMBRE,
                           TD.ID_NODO           AS ID_NODO,
                           CAT.TITULO           AS TITULO
                  FROM DB_TIPO_DOCUMENTO AS TD
                   INNER JOIN DB_METADATA AS MD
                    ON MD.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                   INNER JOIN DB_CATEGORIA AS CAT
                    ON CAT.ID_CATEGORIA = TD.ID_NODO WHERE MD.ORIGEN = 'Lista' ORDER BY TD.NOMBRE ASC`;
            const result = await cds.run(sql);
            for (const rs of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.NOMBRE = rs.NOMBRE;
                record.ID_NODO = rs.ID_NODO;
                record.NOMBRE_NODO = rs.TITULO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListTD", query: sql };
        }
        return outPut;
    });

    this.on("getListTDAtributo", async (req) => {
        const { idTD } = req.data;

        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT ATRIBUTO FROM DB_METADATA WHERE ORIGEN = 'Lista' AND ID_TIPO_DOCUMENTO = ?
            ORDER BY ATRIBUTO ASC`;
            const result = await cds.run(sql, [idTD]);
            for (const rs of result) {
                let record = {};
                record.NOMBRE = rs.ATRIBUTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListTDAtributo", query: sql };
        }
        return outPut;
    });

    this.on("getListAlert", async (req) => {
        const { json } = req.data;

        const id_tipo_doc = json.ID_TIPO_DOCUMENTO;
        const id_act = json.ACCION;

        let outPut = [];
        let sql;
        let record = {
            success: false
        }

        try {
            sql = `SELECT COUNT(*) AS TOTAL,
                            CAT.TITULO AS TITULO,
                            ALE.ALE_DESTINATARIO AS ALE_DESTINATARIO,
                            ALE.ALE_ASUNTO AS ALE_ASUNTO
                  FROM DB_TIPODOCUMENTOXALERTA AS TDXA
                   INNER JOIN DB_PORTALXALERTA AS PXA
                    ON PXA.ALE_ID = TDXA.ALE_ID 
                   INNER JOIN DB_ACTIVIDADXALERTA AS AXA
                    ON AXA.ALE_ID = TDXA.ALE_ID 
                   INNER JOIN DB_ACTIVIDADES AS ACT
                    ON ACT.ID_ACTIVIDADES = AXA.ID_ACTIVIDADES 
                   INNER JOIN DB_VINCULACION AS VIN
                    ON VIN.ID_TIPO_DOCUMENTO = TDXA.ID_TIPO_DOCUMENTO
                   INNER JOIN DB_CATEGORIA AS CAT
                    ON CAT.ID_CATEGORIA = PXA.ID_PORTAL
                   INNER JOIN DB_ALERTAS AS ALE
                    ON ALE.ALE_ID = TDXA.ALE_ID
                  WHERE TDXA.ID_TIPO_DOCUMENTO = ? AND ACT.ID_ACTIVIDADES = ? AND PXA.ID_PORTAL = VIN.NODO_PORTAL
                   GROUP BY CAT.TITULO, ALE.ALE_DESTINATARIO, ALE.ALE_ASUNTO;`

            const result = await cds.run(sql, [id_tipo_doc, id_act]);
            console.log("resultado", result)
            for (const rs of result) {
                record = {};

                if (rs.TOTAL > 0) {
                    record = {
                        success: true,
                        nombre_portal: rs.TITULO,
                        destinatario: rs.ALE_DESTINATARIO,
                        asunto: rs.ALE_ASUNTO
                    };
                } else {
                    outPut, push(record);
                    return outPut;
                }
            }

        } catch (e) {
            return { error: e.message, accion: "getListAlert", query: sql };
        }
        outPut.push(record)
        return outPut;
    });

    this.on("getPermisoCargaArchivoContenido", async (req) => {
        const { idCat } = req.data;

        let sql;
        let outPut = [];

        try {
            sql = `SELECT ID_TIPO_DOCUMENTO, NOMBRE
           FROM DB_TIPO_DOCUMENTO WHERE ID_NODO = ?`;
            const result = await cds.run(sql, [idCat]);
            for (const rs of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.NOMBRE = rs.NOMBRE;
                record.METADATA = await getMetadata(rs.ID_TIPO_DOCUMENTO);

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getPermisoCargaArchivoContenido", query: sql };
        }
        return outPut;
    });

    this.on("getListColumnTable", async (req) => {
        const { table } = req.data;
        let sql;
        let outPut = [];

        try {
            sql = `SELECT COLUMN_NAME FROM TABLE_COLUMNS WHERE SCHEMA_NAME = 'DB_' AND TABLE_NAME = ? 
           ORDER BY COLUMN_NAME ASC`;
            const result = await cds.run(sql, [table]);
            for (const rs of result) {
                let record = {};
                record.COLUMN_NAME = rs.COLUMN_NAME;
                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListColumnTable", query: sql };
        }
        return outPut;
    });

    this.on("getListTable", async () => {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT TABLE_NAME FROM TABLES WHERE SCHEMA_NAME = 'DB_' ORDER BY TABLE_NAME ASC`;
            const result = await cds.run(sql);
            for (const rs of result) {
                let record = {};
                record.TABLE_NAME = rs.TABLE_NAME;
                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListTable", query: sql };
        }
        return outPut;
    });

    async function getListaObj(idTD) {

        let sql;
        let outPut = [];

        try {
            sql = `SELECT OBJID FROM DB_CATEGORIA WHERE ID_PADRE = ?`;
            const result = await cds.run(sql, [idTD]);
            for (const rs of result) {
                let record = {};
                record.OBJID = rs.OBJID;

                if (rs.OBJID !== null && rs.OBJID != "") {
                    outPut.push(record)
                }
            }

        } catch (e) {
            return { error: e.message, accion: "getListaObj", query: sql };;
        }
        return outPut;
    };

    this.on("getObjID", async (req) => {
        const { idTD } = req.data;

        let sql;
        let outPut = [];

        try {
            sql = `SELECT OBJID FROM DB_CATEGORIA WHERE ID_CATEGORIA = ?`;
            const result = await cds.run(sql, [idTD]);
            for (const rs of result) {
                let record = {};
                record.OBJID = rs.OBJID;
                record.LISTAOBJ = await getListaObj(idTD);

                outPut.push(record);
            }
        } catch (e) {
            return null;
        }
        return outPut;
    });

    this.on("getSuggestionNB", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];
        const idNodo = json.ID_CATEGORIA;

        try {
            sql = `SELECT DISTINCT UPPER(MDV.VALUE) AS VALUE FROM DB_NODOBUSQUEDA AS NB
                          INNER JOIN DB_METADATA_VALUE AS MDV
                           ON MDV.ID_TIPO_DOCUMENTO = NB.ID_TIPO_DOCUMENTO AND MDV.ATRIBUTO = NB.ATRIBUTO
                        WHERE NB.ID_NODO = ? ORDER BY UPPER (MDV.VALUE) ASC`;
            const result = await cds.run(sql, [idNodo]);
            for (const rs of result) {
                let record = {};
                record.TITULO = rs.VALUE;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getSuggestionNB", query: sql };
        }
        return outPut;
    });

    this.on("getMetadataTipoDocumento", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];

        const idTipoDocumento = json.ID_TIPO_DOCUMENTO;

        try {
            sql = `SELECT DISTINCT ID_METADATA, ATRIBUTO, TIPO_ATRIBUTO FROM DB_METADATA
           WHERE ID_TIPO_DOCUMENTO = ? 
           AND (ORIGEN = 'Manual' 
                OR ORIGEN = 'SAP'
                OR ORIGEN = 'Estructura'
                OR ORIGEN = 'Estructura Lista')`;

            const result = await cds.run(sql, [idTipoDocumento]);
            for (const rs of result) {
                let record = {};
                record.ID_METADATA_VALUE = rs.ID_METADATA;
                record.ATRIBUTO = rs.ATRIBUTO;
                record.TIPO_ATRIBUTO = rs.TIPO_ATRIBUTO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getMetadataTipoDocumento", query: sql };
        }
        record = {};
        record.ATRIBUTO = "FechaCarga";
        record.TIPO_ATRIBUTO = "date";
        record.ID_METADATA_VALUE = -1;
        outPut.push(record);
        return outPut;
    });

    this.on("getFavoritos", async (req) => {
        const { json } = req.data;

        let sql;
        let sql3 = "";
        let sql4 = "";
        let sql5 = "";
        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: []
        };

        const arrContenidoExtra = typeof json.CONTENIDO_EXTRA === "string"
            ? JSON.parse(json.CONTENIDO_EXTRA)
            : json.CONTENIDO_EXTRA || [];

        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const rInicio = Number(json.INICIO_PAGINA);
        const rFin = Number(json.FIN_PAGINA);
        const diff = rFin - rInicio;
        const queryPag = ` LIMIT ${diff} OFFSET ${rInicio}`;

        const paramsMetadata = [];

        if (arrContenidoExtra.length > 0) {
            for (let u = 0; u < arrContenidoExtra.length; u++) {
                sql3 += `, MDV_${u}.VALUE AS VALUE${u}`;
                sql4 += `, MDV_${u}.VALUE`;
                sql5 += `
                LEFT JOIN (
                    SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE
                    FROM DB_METADATA_VALUE
                    WHERE ATRIBUTO = ?
                ) AS MDV_${u}
                  ON MDV_${u}.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
                 AND MDV_${u}.ID_DETALLE = DET.ID_DETALLE
            `;

                paramsMetadata.push(arrContenidoExtra[u]);
            }
        }

        try {
            sql = `
            SELECT DISTINCT
                CAT.TITULO AS TITULO,
                CAT.DESCRIPCION AS DESCRIPCION,
                CAT.ID_CATEGORIA AS ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR AS ID_TIPO_VISUALIZADOR,
                DOC.UFH_CREAR AS UFH_CREAR,
                COUNT(DISTINCT DET.URL) AS CONTEO_URL,
                TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
                COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS CONTEO_TIPO_DOCUMENTO,
                COUNT(ROL3.IDTD3) AS CONTEO_IDTD3,
                COUNT(ROL4.IDTD4) AS CONTEO_IDTD4,
                TD.NOMBRE AS NOMBRE_TIPO_DOCUMENTO
                ${sql3}
            FROM DB_FAVORITOS AS FAV
            INNER JOIN DB_CATEGORIA AS CAT
                ON CAT.ID_CATEGORIA = FAV.ID_CATEGORIA
            INNER JOIN DB_DETALLE AS DET
                ON DET.NODO_HIJO = CAT.ID_CATEGORIA
               AND DET.ID_TIPO_DOCUMENTO = FAV.ID_TIPO_DOCUMENTO
            INNER JOIN DB_DOCUMENTO AS DOC
                ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
            INNER JOIN DB_TIPO_DOCUMENTO AS TD
                ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
            LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
                ON EL.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 3
            ) AS ROL3
                ON ROL3.IDTD3 = TD.ID_TIPO_DOCUMENTO
            LEFT JOIN (
                SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
                FROM DB_ROLESXTD AS ROLXTD
                INNER JOIN DB_ROLES AS ROL
                    ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                    ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                    ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                WHERE ROLXUSU.ID_USUARIO = ?
                  AND ROLXACC.ID_ACCION = 4
            ) AS ROL4
                ON ROL4.IDTD4 = TD.ID_TIPO_DOCUMENTO
            ${sql5}
            WHERE FAV.ID_PORTAL = ?
              AND FAV.ID_USUARIO = ?
            GROUP BY
                TD.NOMBRE,
                CAT.TITULO,
                CAT.DESCRIPCION,
                CAT.ID_CATEGORIA,
                CAT.ID_TIPO_VISUALIZADOR,
                DOC.UFH_CREAR,
                TD.ID_TIPO_DOCUMENTO,
                DOC.ID_DOCUMENTO
                ${sql4}
            ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC
        `;

            const params = [
                ...paramsMetadata,
                idUsuario,
                idUsuario,
                idPortal,
                idUsuario
            ];

            const rset = await cds.run(sql, params);
            outPut.TOTAL_REGISTROS = rset.length;

            const queryFinal = sql + queryPag;
            const result = await cds.run(queryFinal, params);

            for (const rs of result) {
                let record = {};

                record.TITULO = rs.TITULO;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = rs.ID_TIPO_VISUALIZADOR === 3 ? orderFecha(rs.UFH_CREAR) : "-";
                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ICONO = rs.ID_TIPO_VISUALIZADOR === 3 ? "sap-icon://document" : await iconoSegunTipoNodo(rs.ID_TIPO_VISUALIZADOR);
                record.TIPO = rs.ID_TIPO_VISUALIZADOR === 3 ? "Documento" : "Carpeta";
                record.FAVORITO = true;
                record.URL = rs.CONTEO_URL;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.WF = Number(rs.CONTEO_TIPO_DOCUMENTO) > 0;
                record.ID_DOCUMENTO = rs.ID_DOCUMENTO;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.DESCARGA = Number(rs.CONTEO_IDTD4) > 0;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;

                for (let t = 0; t < arrContenidoExtra.length; t++) {
                    const value = rs[`VALUE${t}`];

                    record[arrContenidoExtra[t]] =
                        value == null
                            ? "-"
                            : arrContenidoExtra[t].toUpperCase().includes("FECHA")
                                ? orderFecha(String(value))
                                : String(value);
                }

                const rolVisualiza = Number(rs.CONTEO_IDTD3) > 0;

                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }

        } catch (e) {
            return {
                error: e.message,
                accion: "getFavoritos",
                query: sql
            };
        }

        return outPut;
    });

    this.on("getContacto", async (req) => {
        const { json } = req.data;

        let sql;
        const idEmpresa = json.EMPRESA;
        let record = {};

        try {
            sql = `SELECT NOMBRE,
                          CORREO,
                          CONTACTO,
                          RESPONSBLE,
                          ALMACENAMIENTO
                     FROM DB_PROVEEDORES_ALMACENAMIENTO WHERE ID_PROVEEDORES_ALMACENAMIENTO = ?`;
            const result = await cds.run(sql, [idEmpresa]);
            for (const rs of result) {
                record = {};
                record.NOMBRE = rs.NOMBRE;
                record.CORREO = rs.CORREO;
                record.CONTACTO = rs.CONTACTO;
                record.RESPONSABLE = rs.RESPONSABLE;
            }
        } catch (e) {
            return { error: e.message, accion: "getContacto", query: sql };
        }
        return record;
    });

    async function getEstLib(nodo) {
        let sql;
        let des = -1;

        try {
            sql = `SELECT ID_EST_LIB FROM DB_ESTRATEGIA_LIBERACION WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                des = rs.ID_EST_LIB;
            }
        } catch (e) {
            return sql;
        }
        return des;
    }

    async function getDocbaseCargado(idDocbase, idNodo) {
        let sql;

        try {
            sql = `SELECT COUNT(DISTINCT DET.ID_DETALLE AS ID_DETALLE) FROM DB_DOC_OBL AS DO
            LEFT JOIN DB_DOCOBLXDET AS DOCOBL
             ON DOCOBL.ID_DOC_OBL = DO.ID_DOC_OBL
            INNER JOIN DB_DETALLE AS DET
             ON DOCOBL.ID_DETALLE = DET.ID_DETALLE
            WHERE DO.ID_DOC_OBL = ?
             AND DET.ID_DETALLE IN (SELECT ID_DETALLE FROM DB_DETALLE WHERE NODO_HIJO = ?) 
             GROUP BY DO.NOMBRE_DOCUMENTO`;
            const result = await cds.run(sql, [idDocbase, idNodo]);
            for (const rs of result) {

                return (rs.ID_DETALLE > 0) ? true : false;
            }
        } catch (e) {
            return false;
        }
        return false;
    };

    async function getFormatosLista(nodo) {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT FORMATO, PESO FROM DB_PROP_TIPO_DOC WHERE TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                let record = {};
                record.FORMATO = rs.FORMATO;
                record.PESO = rs.PESO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getFormatosLista", query: sql };
        }
        return outPut;
    };

    async function getAlmFisico(nodo) {
        let sql;
        let record = {};

        try {
            sql = `SELECT EMPRESA_RESPONSABLE, G_FISICA, TEMPORABILIDAD, CARDINALIDAD, DESCRIPCION, OBLIGATORIEDAD, PA.NOMBRE AS NOMBRE 
               FROM DB_TIPO_DOCUMENTO_FISICO
               INNER JOIN DB_PROVEEDORES_ALMACENAMIENTO AS PA 
                ON PA.ID_PROVEEDORES_ALMACENAMIENTO = EMPRESA_RESPONSABLE
               WHERE ID_TIPO_DOCUMENTO = ?`;

            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                record.EMPRESA_RESPONSABLE = rs.NOMBRE;
                record.ID_EMPRESA_RESPONSABLE = rs.EMPRESA_RESPONSABLE;
                record.RUTA_FISICA = rs.G_FISICA;
                record.OBLIGATORIEDAD = rs.OBLIGATORIEDAD;
                record.OBSERVACION = rs.DESCRIPCION;
                record.TEMPORABILIDAD = rs.TEMPORABILIDAD + " " + rs.CARDINALIDAD;
            }
        } catch (e) {
            return { error: e.message, accion: "getAlmFisico", query: sql };
        }

        return record;
    }

    async function getAlmDigital(nodo) {
        let sql;
        let record = {};

        try {
            sql = `SELECT EMPRESA_RESPONSABLE, G_FISICA, TEMPORABILIDAD, CARDINALIDAD, DESCRIPCION, OBLIGATORIEDAD, PA.NOMBRE AS NOMBRE
               FROM DB_TIPO_DOCUMENTO_DIGITAL 
               INNER JOIN DB_PROVEEDORES_ALMACENAMIENTO AS PA
                ON PA.ID_PROVEEDORES_ALMACENAMIENTO = EMPRESA_RESPONSABLE
               WHERE ID_TIPO_DOCUMENTO = ?`;

            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                record.EMPRESA_RESPONSABLE = rs.NOMBRE;
                record.ID_EMPRESA_RESPONSABLE = rs.EMPRESA_RESPONSABLE;
                record.RUTA_DIGITAL = rs.G_FISICA;
                record.OBLIGATORIEDAD = rs.OBLIGATORIEDAD;
                record.OBSERVACION = rs.DESCRIPCION;
                record.TEMPORABILIDAD = rs.TEMPORABILIDAD + " " + rs.CARDINALIDAD;
            }
        } catch (e) {
            return { error: e.message, accion: "getAlmDigital", query: sql };
        }

        return record;
    }

    async function getWorkflow(nodo) {
        let sql;
        let output = [];

        const estLib = await getEstLib(nodo);

        try {
            sql = `SELECT NIVEL, NOMBREAPROBADOR, ESTADO FROM DB_NIVELES WHERE ID_EST_LIB = ? ORDER BY NIVEL ASC`;
            const result = await cds.run(sql, [estLib]);

            for (const rs of result) {
                let record = {};
                record.NIVEL = rs.NIVEL;
                record.NOMBREAPROBADOR = rs.NOMBREAPROBADOR;
                rs.ESTADO = await getEstado(rs.ESTADO);

                output.push(record);
            }
        } catch (e) {
            return sql;
        }
        return output;
    };

    async function getNombreTipoDocumento(nodo) {
        let sql;
        let record = "";

        try {
            sql = `SELECT NOMBRE FROM DB_TIPO_DOCUMENTO WHERE ID_TIPO_DOCUMENTO = ?`;
            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                record = rs.NOMBRE;
            }
        } catch (e) {
            return sql;
        }
        return record;
    };

    async function getMDListaManual(idTipoDocumento, idDocumento, origen) {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT ATRIBUTO, TIPO_ATRIBUTO, VALUE, ID_METADATA, ORIGEN 
             FROM DB_METADATA_VALUE 
             WHERE ID_TIPO_DOCUMENTO = ?
             AND ID_DOCUMENTO = ? 
             AND (ORIGEN = ? OR ORIGEN = 'Lista'
             OR ORIGEN = 'Estructura'
             OR ORIGEN = 'Estructura Lista')
             ORDER BY ID_METADATA ASC`;

            const result = await cds.run(sql, [
                idTipoDocumento,
                idDocumento,
                origen
            ]);

            for (const rs of result) {
                let record = {};
                record.ATRIBUTO = rs.ATRIBUTO;
                record.TIPO_ATRIBUTO = rs.TIPO_ATRIBUTO;
                record.VALUE = rs.VALUE;
                record.ID_METADATA = rs.ID_METADATA;
                record.ORIGEN = rs.ORIGEN;

                outPut.push(record);
            }

        } catch (e) {
            return {
                error: e.message,
                accion: "getMDListaManual",
                query: sql
            };
        }

        return eliminaDuplicado(outPut, "ATRIBUTO");
    };

    async function getRuta(nodo) {
        let sql;
        let output = [];

        try {
            sql = `SELECT PATHSP, NOMBRE, DESCRIPCION, APP_DATOS FROM DB_CATEGORIA 
          WHERE ID_CATEGORIA = (SELECT ID_CATEGORIA_ESPEJO FROM DB_CATEGORIA WHERE ID_CATEGORIA = ?)`;
            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                let record = {};
                const resp = rs.PATHSP.replace("/_api/web/folders/add('", "");
                record = {};
                record.RUTA = resp;
                record.RESPONSABLE = rs.NOMBRE;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.APP_DATOS = rs.APP_DATOS;

                output.push(record);
            }
        } catch (e) {
            return sql;
        }
        return output;
    };

    async function getProceso(nodo) {
        let sql;
        let record = {};

        record.DESCRIPCION_PROCESO = "";
        record.RUTA = "";
        record.RESPONSABLE = "";
        record.DESCRIPCION = "";
        record.APP_DATOS = "";

        try {
            sql = `SELECT DESCRIPCION_PROCESO, ID_NODO 
               FROM DB_PROCESOS 
               WHERE TIPO_DOCUMENTO = ?`;

            const result = await cds.run(sql, [nodo]);

            for (const rs of result) {
                const resp = await getRuta(rs.ID_NODO);

                record.DESCRIPCION_PROCESO = rs.DESCRIPCION_PROCESO;

                if (resp.length > 0) {
                    record.RUTA = resp[0].RUTA;
                    record.RESPONSABLE = resp[0].RESPONSABLE;
                    record.DESCRIPCION = resp[0].DESCRIPCION;
                    record.APP_DATOS = resp[0].APP_DATOS;
                }
            }
        } catch (e) {
            return e.message;
        }

        return record;
    }

    async function getDocbase(nodo, idNodo) {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT DO.NOMBRE_DOCUMENTO AS NOMBRE_DOCUMENTO,
                           DO.ID_DOC_OBL AS ID_DOC_OBL,
                           DO.OBLIGATORIO AS OBLIGATORIO,
                           DO.DESCRIPCION AS DESCRIPCION
                FROM DB_DOC_OBL AS DO
                  WHERE DO.ID_TIPO_DOCUMENTO = ?`;

            const result = await cds.run(sql, [nodo]);

            let record = {};
            record.NOMBRE_DOCUMENTO = "";

            for (const rs of result) {
                let record = {};
                record.NOMBRE_DOCUMENTO = rs.NOMBRE_DOCUMENTO;
                record.DESCRIPCION = rs.DESCRIPCION === null ? "" : rs.DESCRIPCION;

                if (rs.OBLIGATORIO === "SI") {

                    record.DOC_CARGADO = await getDocbaseCargado(rs.ID_DOC_OBL, idNodo);
                } else {

                    if (await getDocbaseCargado(rs.ID_DOC_OBL, idNodo)) {
                        record.DOC_CARGADO = await getDocbaseCargado(rs.ID_DOC_OBL, idNodo);
                    } else {
                        record.DOC_CARGADO = "null";
                    }
                }

                outPut.push(record);
            }
        } catch (e) {
            return e.message;
        }
        return outPut;
    };

    this.on("propiedadesLista", async (req) => {
        const { json } = req.data;

        const idCategoria = json.ID_CATEGORIA;
        let sql;
        let record = {};

        try {
            sql = `SELECT DISTINCT CAT.ID_PADRE AS ID_PADRE,
                       CAT.TITULO   AS TITULO,
                       DET.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                       DET.ID_CATEGORIA_HOJA AS ID_CATEGORIA_HOJA,
                       DET.ID_DETALLE AS ID_DETALLE,
                       DET.NODO_HIJO AS NODO_HIJO
              FROM DB_CATEGORIA AS CAT
              JOIN DB_DETALLE AS DET
                ON DET.NODO_HIJO = CAT.ID_CATEGORIA
              WHERE CAT.ID_CATEGORIA = ?`;

            const result = await cds.run(sql, [idCategoria]);

            for (const rs of result) {
                record.TITULO = rs.TITULO;
                record.IDPADRE = rs.ID_TIPO_DOCUMENTO;
                record.PROPIEDADES = await getFormatosLista(rs.ID_TIPO_DOCUMENTO);
                record.ALMFISICO = await getAlmFisico(rs.ID_TIPO_DOCUMENTO);
                record.ALMDIGITAL = await getAlmDigital(rs.ID_TIPO_DOCUMENTO);
                record.METADATA = await getMDListaManual(rs.ID_TIPO_DOCUMENTO, rs.ID_CATEGORIA_HOJA, "Manual");
                record.WORKFLOW = await getWorkflow(rs.ID_TIPO_DOCUMENTO);
                record.NOMBRETD = await getNombreTipoDocumento(rs.ID_TIPO_DOCUMENTO);
                record.METADATASAP = await getMDListaManual(rs.ID_TIPO_DOCUMENTO, rs.ID_CATEGORIA_HOJA, "SAP");
                record.PROCESO = await getProceso(rs.ID_TIPO_DOCUMENTO);
                record.DOCBASE = await getDocbase(rs.ID_TIPO_DOCUMENTO, rs.NODO_HIJO);
            }
        } catch (e) {
            return { error: e.message, accion: "propiedadesLista", query: sql };
        }

        return record;
    });

    this.on("updateFavoritos", async (req) => {
        const { json } = req.data;

        let sql;
        let body = "FALLO";

        const marca = json.MARCA;
        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const idCategoria = json.ID_CATEGORIA;
        const idTipoDoc = json.ID_TIPO_DOCUMENTO;

        try {

            switch (marca) {

                case "X":
                    try {
                        const querySequence = await getIdSequence("ID_FAVORITOS");
                        console.log("siguiente id", querySequence);
                        sql = `INSERT INTO DB_FAVORITOS VALUES ( ?, ?, ?, ?, ?)`;
                        await cds.run(sql, [querySequence, idUsuario, idPortal, idCategoria, idTipoDoc]);
                        body = "OK";
                        break;

                    } catch (e) {
                        return e.message
                    }

                case "":
                    sql = `DELETE FROM DB_FAVORITOS WHERE ID_USUARIO = ? AND ID_PORTAL = ? 
                AND ID_CATEGORIA = ? AND ID_TIPO_DOCUMENTO = ?`;
                    await cds.run(sql, [idUsuario, idPortal, idCategoria, idTipoDoc]);

                    body = "OK";
                    break;
            }
        } catch (e) {
            return { error: e.message, accion: "updateFavoritos", query: sql };
        }
        return body;
    });

    async function getBusquedaDocumentos(arr, idPortal, texto, idUsuario, rInicio, rFin) {
        let sql;
        let body = "";
        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: []
        };

        const diff = rFin - rInicio;
        const queryPag = `limit ${diff} offset ${rInicio}`;

        try {
            sql = `SELECT DISTINCT CAT.ID_CATEGORIA AS ID_CATEGORIA,
                         CAT.ID_TIPO_VISUALIZADOR AS ID_TIPO_VISUALIZADOR,
                         CAT.ID_PADRE AS ID_PADRE,
                         CAT.TITULO AS TITULO,
                         TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                         CAT.DESCRIPCION AS DESCRIPCION,
                         DOC.UFH_CREAR AS UFH_CREAR,
                         COUNT(DISTINCT DET2.ID_DETALLE) AS ID_DETALLE2,
                         COUNT(ROL3.IDTD3) AS ROL3,
                         COUNT(ROL4.IDTD4) AS ROL4,
                         TD.NOMBRE AS NOMBRE
          FROM DB_VINCULACION AS VIN
          INNER JOIN DB_TIPO_DOCUMENTO AS TD
            ON TD.ID_TIPO_DOCUMENTO = VIN.ID_TIPO_DOCUMENTO
           AND VIN.ID_NODO = TD.ID_NODO
          INNER JOIN DB_DETALLE AS DET
            ON DET.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
          INNER JOIN DB_CATEGORIA AS CAT
            ON CAT.ID_CATEGORIA = DET.NODO_HIJO
          INNER JOIN DB_DOCUMENTO AS DOC
            ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
          LEFT JOIN (
            SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3
              FROM DB_ROLESXTD AS ROLXTD
              INNER JOIN DB_ROLES AS ROL
                ON ROL.ID_ROLES = ROLXTD.ID_ROLES
              INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
              INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
             WHERE ROLXUSU.ID_USUARIO = ?
               AND ROLXACC.ID_ACCION = 3
          ) AS ROL3
            ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO
          LEFT JOIN (
            SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4
              FROM DB_ROLESXTD AS ROLXTD
              INNER JOIN DB_ROLES AS ROL
                ON ROL.ID_ROLES = ROLXTD.ID_ROLES
              INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
              INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
             WHERE ROLXUSU.ID_USUARIO = ?
               AND ROLXACC.ID_ACCION = 4
          ) AS ROL4
            ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO
          JOIN (
            SELECT ID_DETALLE, NODO_HIJO
              FROM DB_DETALLE
          ) AS DET2
            ON DET2.NODO_HIJO = CAT.ID_CATEGORIA
         WHERE VIN.NODO_PORTAL = ?
           AND UPPER(CAT.TITULO) LIKE UPPER(?)
         GROUP BY CAT.ID_CATEGORIA,
                  CAT.ID_TIPO_VISUALIZADOR,
                  CAT.ID_PADRE,
                  CAT.TITULO,
                  TD.ID_TIPO_DOCUMENTO,
                  CAT.DESCRIPCION,
                  DOC.UFH_CREAR,
                  TD.NOMBRE`;
            const rset = await cds.run(sql, [idUsuario, idUsuario, idPortal, texto]);

            const rowCount = rset.length;
            outPut.TOTAL_REGISTROS = rowCount;
            const queryFinal = sql + queryPag;
            const result = await cds.run(queryFinal, [idUsuario, idUsuario, idPortal, texto]);

            for (const rs of result) {
                let record = {};

                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.RESULTADO = rs.TITULO;

                record.DOCUMENTO = true;
                record.TIPO = "Documento";

                record.TD = rs.ID_TIPO_DOCUMENTO;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.FECHA_CARGA = orderFecha(rs.UFH_CREAR);
                record.URL = rs.ID_DETALLE2;
                record.DESCARGA = (rs.ROL4 > 0) ? true : false;

                const rolVisualiza = (rs.ROL3 > 0) ? true : false;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE;

                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getBusquedaDocumentos", query: sql };
        }
        return outPut;

    };

    async function getDataFondoArbol(nodos, inicio, hijos) {
        let hijosDelPadre = hijos;
        let queryNodo;
        let isNodos;

        let functionRecorrer = async function (nodo, i) {
            if (nodo.length === i) {
                if (inicio) {
                    return nodos;
                }
            } else {
                queryNodo = await getQuery(nodo[i].ID_CATEGORIA);
                isNodos = await ejecutaTX(queryNodo);

                if (isNodos.length === 0) {
                    delete nodo[i].NODOS;
                }

                if (inicio) {
                    arbol.push(nodo[i]);
                    hijosDelPadre = nodo[i].NODOS;
                    await getDataNodo(isNodos, false, hijosDelPadre);
                }
            }
        }

    }

    async function getFondoArbol(idPadre) {

        idPadre = Number(idPadre);

        const queryNodo = await getQuery(idPadre);
        const nodos = await ejecutaTX(queryNodo);

        for (const element of nodos) {
            let nod = {};
            nod.NODOS = [];

            await getDataFondoArbol([element], true, nod);
        }

        return nodos;

    }

    async function getBusquedaNodo(arr, idPortal, texto) {
        let outPut = [];

        try {
            const arbolPortal = await getFondoArbol(idPortal);

            let exe = function (key, value, data) {
                if (key === "TITULO") {
                    if (value.toUpperCase().indexOf(texto.toUpperCase()) > -1) {
                        if (data.ID_TIPO_VISUALIZADOR === 4 || data.ID_TIPO_VISUALIZADOR === 7 || data.ID_TIPO_VISUALIZADOR === 8) {
                            outPut.push(data);
                        }
                    }
                }
            }.bind(this);

            let buscarEnArray = function (o, func) {
                for (let i in o) {
                    func.apply(this, [i, o[i], o]);
                    if (o[i] !== null && typeof (o[i]) === "object") {
                        buscarEnArray(o[i], func);
                    }
                }
            }.bind(this);
            buscarEnArray(arbolPortal, exe);

            outPut.forEach(function (element) {
                let record = {};
                record.ID_CATEGORIA = element.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = element.ID_TIPO_VISUALIZADOR;
                record.RESULTADO = element.TITULO;
                record.DOCUMENTO = false;
                record.TIPO = "Carpeta";
                record.DESCRIPCION = "";
                record.FECHA_CARGA = "";
                record.DESCARGAR = "";

                arr.push(record);
            })
            return arr;
        } catch (e) {
            return { error: e, accion: "getBusquedaNodo", data: [] };
        }

    };

    async function getBusquedaTag(arr, idPortal, texto, idUsuario, arrContenidoExtra, rInicio, rFin) {
        let sql;
        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: []
        };

        const diff = rFin - rInicio;
        const queryPag = ` limit ${diff} offset ${rInicio}`;

        const arrIdTag = JSON.parse(texto);
        let str = "(";

        try {
            for (let i = 0; i < arrIdTag.length; i++) {
                str = str + arrIdTag[i] + ",";
            }

            str = str.slice(0, str.length - 1);
            str = str + ")";

            let query3 = "";
            let query4 = "";
            let query5 = "";

            if (arrContenidoExtra.length > 0) {
                for (let u = 0; u < arrContenidoExtra.length; u++) {
                    query3 += `,MDV ${u} .VALUE as VALUE ${u}`;
                    query4 += `,MDV ${u} .VALUE`;
                    query5 += ` LEFT JOIN (SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE FROM DB_METADATA_VALUE WHERE ATRIBUTO = '${arrContenidoExtra[u]}') AS MDV
                    ${u} ON MDV ${u} .ID_TIPO_DOCUMENTO = TAGXTD.ID_TIPO_DOCUMENTO AND MDV ${u} .ID_DETALLE = DET.ID_DETALLE`;
                }
            }

            query = `SELECT DISTINCT CAT.ID_CATEGORIA AS ID_CATEGORIA,
                                 ID_TIPO_VISUALIZADOR,
                             CAT.ID_PADRE AS ID_PADRE,
                             CAT.TITULO AS TITULO,
                             TAGXTD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                             CAT.DESCRIPCION AS DESCRIPCION,
                             DOC.UFH_CREAR AS UFH_CREAR,
                             COUNT(FAV.ID_FAVORITOS) AS ID_FAV,
                             COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS ID_TIPDOC,
                             COUNT(DISTINCT VER.ID_DETALLE) AS ID_DETALLE,
                             COUNT(ROL3.IDTD3) AS ROL3,
                             COUNT(ROL4.IDTD4) AS ROL4,
                             DOC.ID_DOCUMENTO AS ID_DOCUMENTO,
                             TD.NOMBRE AS NOMBRE
                    FROM DB_TAGXTD AS TAGXTD
             INNER JOIN DB_DETALLE AS DET
              ON DET.ID_TIPO_DOCUMENTO = TAGXTD.ID_TIPO_DOCUMENTO
             INNER JOIN DB_CATEGORIA AS CAT
              ON CAT.ID_CATEGORIA = DET.NODO_HIJO
             INNER JOIN DB_DOCUMENTO AS DOC
              ON DET.ID_CATEGORIA_HOJA = DOC.ID_DOCUMENTO
             INNER JOIN DB_TIPO_DOCUMENTO AS TD
              ON TD.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
             LEFT JOIN DB_FAVORITOS AS FAV
              ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA AND (FAV.ID_USUARIO = ${idUsuario} AND FAV.ID_PORTAL = ${idPortal})
              
            LEFT JOIN (SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3 FROM DB_ROLESXTD AS ROLXTD
             INNER JOIN DB_ROLES AS ROL 
              ON ROL.ID_ROLES = ROLXTD.ID_ROLES
             INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU 
              ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
             INNER JOIN DB_ROLESXACCIONES AS ROLXACC
              ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
            WHERE ROLXUSU.ID_USUARIO = ${idUsuario} AND ROLXACC.ID_ACCION = 3) AS ROL3 ON ROL3.IDTD3 = DET.ID_TIPO_DOCUMENTO 
             LEFT JOIN (SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4 FROM DB_ROLESXTD AS ROLXTD
             INNER JOIN DB_ROLES AS ROL
              ON ROL.ID_ROLES = ROLXTD.ID_ROLES
             INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
              ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
             INNER JOIN DB_ROLESXACCIONES AS ROLXACC
              ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
            WHERE ROLXUSU.ID_USUARIO = ${idUsuario} AND ROLXACC.ID_ACCION = 4) AS ROL4
             ON ROL4.IDTD4 = DET.ID_TIPO_DOCUMENTO ${query5}
             LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
              ON EL.ID_TIPO_DOCUMENTO = DET.ID_TIPO_DOCUMENTO
             JOIN DB_VERSIONAMIENTO AS VER
              ON VER.ID_DETALLE = DET.ID_DETALLE
            WHERE TAGXTD.ID_TAG IN ${str} 
            GROUP BY TD.NOMBRE, CAT.ID_CATEGORIA, ID_TIPO_VISUALIZADOR, CAT.ID_PADRE, CAT.TITULO, TAGXTD.ID_TIPO_DOCUMENTO, CAT.DESCRIPCION, DOC.UFH_CREAR, DOC.UFH_CREAR, DOC.ID_DOCUMENTO ${query4}`;

            const rset = cds.run(query);
            let rowCount = rset.length;

            outPut.TOTAL_REGISTROS = rowCount;
            let queryFinal = query + queryPag;

            const result = await cds.run(queryFinal);

            for (const rs of result) {
                let record = {};
                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.DOCUMENTO = rs.ID_DOCUMENTO;
                record.TITULO = rs.TITULO;
                record.DOCUMENTO = true;
                record.TIPO = "Documento";
                record.FAVORITO = (rs.ID_FAV > 0) ? true : false;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = (rs.ID_TIPDOC > 0) ? true : false;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(rs.UFH_CREAR);
                record.ICONO = "sap-icon://document";
                record.URL = rs.ID_DETALLE;
                record.DESCARGA = (rs.ROL4 > 0) ? true : false;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE;

                const recordMeta = {};
                let ind = 0;
                for (let t = 0; t < arrContenidoExtra.length; t++) {

                    if (rs.getNString(15 + t) === null) {
                        ind++
                    }
                }

                const rolVisualiza = (rs.ROL3 > 0) ? true : false;
                const flag = false;

                if (rolVisualiza) {

                    if (arrContenidoExtra.length === 0) {
                        outPut.DATA.push(record);
                    } else {
                        if (ind !== arrContenidoExtra.length) {
                            flag = true;
                            for (let t = 0; t < arrContenidoExtra.length; t++) {
                                record[arrContenidoExtra[t]] = (rs.getNString(15 + t) === null) ? "-" : (arrContenidoExtra[t].toUpperCase().indexOf("FECHA") > -1) ?
                                    orderFecha(rs.getNString(15 + t)) : rs.getNString(15 + t);
                            }
                            outPut.DATA.push(record);
                        }
                    }
                }
            }
        } catch (e) {
            return {
                error: e.message,
                accion: "getBusquedaTag"
            };
        }
        return outPut;

    };

    async function insertTag(idPortal, idTag, fecha, hora) {

        let sql;

        try {
            const querySequence = await getIdSequence("ID_BUSQUEDA_TAG");

            sql = `INSERT INTO DB_BUSQUEDA_TAG VALUES ( ${querySequence} , ${idPortal}, ${idTag}, ${fecha}, ${hora})`;
            await cds.run(sql);

        } catch (e) {
            return { error: e, accion: "insertTag", query: sql };
        }
        return "OK";
    };

    this.on("busquedaHeader", async (req) => {
        const { json } = req.data;

        const texto = json.TEXTO;
        const marca = json.MARCA;
        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const fecha = json.FECHA;
        const hora = json.HORA;
        const rInicio = json.INICIO_PAGINA;
        const rFin = json.FIN_PAGINA;
        const arrContenidoExtra = JSON.parse(json.CONTENIDO_EXTRA);
        let outPut = {
            TOTAL_REGISTROS: 0,
            DATA: []
        };

        try {

            switch (marca) {
                case "X":
                    outPut = await getBusquedaDocumentos(outPut, idPortal, texto, idUsuario);
                    outPut = await getBusquedaNodo(outPut, idPortal, texto);
                    break;

                case "":
                    outPut = await getBusquedaTag(outPut, idPortal, texto, idUsuario, arrContenidoExtra, rInicio, rFin);
                    const arrIdTag = JSON.parse(texto);

                    for (let k = 0; k < arrIdTag.length; k++) {
                        const resp = await insertTag(idPortal, arrIdTag[k], fecha, hora);
                    }
                    break;
            }
        } catch (e) {
            return { error: e.message, accion: "getBusquedaHeader" };
        }
        return outPut;

    });

    function orderFechaPunto(fecha) {
        const newFecha = fecha.split("."[2] + "-" + fecha.split(".")[1] + "-" + fecha.split(".")[0]);
        return newFecha;
    };

    async function getGuiaDespacho(id_documento) {
        let sql;

        try {
            sql = `SELECT VALUE FROM DB_METADATA_VALUE WHERE ID_DOCUMENTO = ?
           AND ID_TIPO_DOCUMENTO = 2800
           AND ATRIBUTO = 'ORDEN COMPRA'`;
            const result = await cds.run(sql, [id_documento]);

            for (const rs of result) {
                return rs.VALUE;
            }
        } catch (e) {
            return { error: e.message, accion: "getGuiaDespacho", query: sql };
        }
    };

    this.on("getBusquedaFiltros", async (req) => {
        const { json } = req.data;

        let sql, sql2;
        let body;
        const outPut = {
            TOTAL_REGISTROS: 0,
            DATA: [],
            query: ""
        };

        const nodoTD = json.ID_CATEGORIA;
        const texto = json.TEXTO;
        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;
        const rangoFecha = json.RANGO_FECHA;
        const rInicio = json.INICIO_PAGINA;
        const rFin = json.FIN_PAGINA;
        const diff = rFin - rInicio;
        const queryPag = " limit " + diff + " offset " + rInicio;
        const arrContenidoExtra = JSON.parse(json.CONTENIDO_EXTRA);

        if (texto.length > 0) {
            const sValue = texto.toUpperCase();
            sql2 = " AND UPPER(MDV.VALUE) LIKE '%" + sValue + "%'";
        }

        try {
            let sql3 = '';
            let sql4 = '';
            let sql5 = '';
            let sql6 = '';

            if (arrContenidoExtra.length > 0) {
                for (let u = 0; u < arrContenidoExtra.length; u++) {
                    if (arrContenidoExtra[u] == "GERENCIASUBGERENCIAAREA") {
                        arrContenidoExtra[u] = "GERENCIA/SUBGERENCIA/AREA";
                    }

                    sql3 += ",MDVBF" + u + ".VALUE as value" + u;
                    sql4 += ".MDVBF" + u + ".VALUE";
                    sql5 += " LEFT JOIN (SELECT VALUE, ID_TIPO_DOCUMENTO, ID_DETALLE FROM DB_METADATA_VALUE WHERE ATRIBUTO = '" + arrContenidoExtra[u] + "') AS MDVBF" + u + "ON MDVBF" + u + ".ID_TIPO_DOCUMENTO = NB.ID_TIPO_DOCUMENTO AND MDVBF" + u + ".ID_DETALLE = DET.ID_DETALLE";

                }
            }

            if (rangoFecha != "X") {
                const fInicial = orderFechaPunto(rangoFecha.split(".")[0]);
                const fFinal = orderFechaPunto(rangoFecha.split(".")[1]);

                sql6 += " AND  DOC.UFH_CREAR BETWEEN '" + fInicial + "' AND '" + fFinal + "'";
            }

            sql = `SELECT DISTINCT CAT.ID_CATEGORIA,
                          CAT.ID_TIPO_VISUALIZADOR,
                          CAT.ID_PADRE,
                          CAT.TITULO,
                          NB.ID_TIPO_DOCUMENTO,
                          CAT.DESCRIPCION,
                          DOC.UFH_CREAR,
                          COUNT(FAV.ID_FAVORITOS) AS FAV1,
                          COUNT(DISTINCT EL.ID_TIPO_DOCUMENTO) AS EL_TIPO_DOCUMENTO,
                          COUNT(DISTINCT DET1.ID_DETALLE) AS TOTALES,
                          COUNT(ROL3.IDTD3) AS ROLES3,
                          COUNT(ROL4.IDTD4) AS DESCARGA,
                          DOC.ID_DOCUMENTO AS DOCC,
                          TD.NOMBRE AS TIPO_DOC ${sql3}
                    FROM DB_NODOBUSQUEDA AS NB
                    INNER JOIN DB_METADATA_VALUE AS MDV
                      ON MDV.ID_TIPO_DOCUMENTO = NB.ID_TIPO_DOCUMENTO
                    INNER JOIN DB_DETALLE AS DET
                      ON DET.ID_DETALLE = MDV.ID_DETALLE
                    LEFT JOIN DB_CATEGORIA AS CAT
                      ON CAT.ID_CATEGORIA = DET.NODO_HIJO
                    INNER JOIN DB_DOCUMENTO AS DOC
                      ON DOC.ID_DOCUMENTO = MDV.ID_DOCUMENTO
                    INNER JOIN DB_TIPO_DOCUMENTO AS TD
                      ON TD.ID_TIPO_DOCUMENTO = MDV.ID_TIPO_DOCUMENTO
                    LEFT JOIN DB_FAVORITOS AS FAV
                      ON FAV.ID_CATEGORIA = CAT.ID_CATEGORIA AND (FAV.ID_USUARIO = 21 AND FAV.ID_PORTAL = ${idPortal})
                    INNER JOIN (SELECT ID_DETALLE, NODO_HIJO FROM DB_DETALLE) AS DET1
                      ON DET1.NODO_HIJO = CAT.ID_CATEGORIA
                    LEFT JOIN DB_ESTRATEGIA_LIBERACION AS EL
                      ON EL.ID_TIPO_DOCUMENTO = NB.ID_TIPO_DOCUMENTO
                    LEFT JOIN (SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD3 FROM DB_ROLESXTD AS ROLXTD
                          INNER JOIN DB_ROLES AS ROL
                            ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                          INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                            ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                          INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                            ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                          WHERE ROLXUSU.ID_USUARIO = ${idUsuario} AND ROLXACC.ID_ACCION = 3) AS ROL3
                      ON ROL3.IDTD3 = NB.ID_TIPO_DOCUMENTO
                    LEFT JOIN (SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD4 FROM DB_ROLESXTD AS ROLXTD
                          INNER JOIN DB_ROLES AS ROL
                            ON ROL.ID_ROLES = ROLXTD.ID_ROLES
                          INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
                            ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
                          INNER JOIN DB_ROLESXACCIONES AS ROLXACC
                            ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
                          WHERE ROLXUSU.ID_USUARIO = ${idUsuario} AND ROLXACC.ID_ACCION = 4) AS ROL4
                      ON ROL4.IDTD4 = NB.ID_TIPO_DOCUMENTO ${sql5}

                    WHERE NB.ID_NODO = ${nodoTD} AND MDV.ATRIBUTO = NB.ATRIBUTO ${sql2} AND MDV.VALUE <> '' ${sql6}
                    GROUP BY CAT.ID_CATEGORIA, TD.NOMBRE, ID_TIPO_VISUALIZADOR, CAT.ID_PADRE, CAT.TITULO, NB.ID_TIPO_DOCUMENTO,
                    CAT.DESCRIPCION, DOC.UFH_CREAR, DOC.ID_DOCUMENTO ${sql4} ORDER BY DOC.UFH_CREAR DESC, CAT.ID_CATEGORIA DESC`;

            const rset = await cds.run(sql);
            const rowCount = rset.length;
            outPut.TOTAL_REGISTROS = rowCount;
            const queryFinal = sql + queryPag;
            outPut.query = queryFinal;

            const result = await cds.run(queryFinal);

            for (const rs of result) {
                let record = {};
                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.ID_TIPO_VISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                record.DOCUMENTO = true;
                record.FAVORITO = (rs.FAV1 > 0) ? true : false;
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.WF = (rs.EL_TIPO_DOCUMENTO > 0) ? true : false;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.UFH_CARGA = orderFecha(rs.UFH_CREAR);
                record.ICONO = "sap-icon://document";
                record.URL = (idPortal === "283") ? 1 : rs.TOTALES;
                record.DESCARGA = (rs.DESCARGA > 0) ? true : false;
                record.ID_DOCUMENTO = rs.DOCC;
                record.NOMBRE_TIPO_DOCUMENTO = rs.TIPO_DOC;
                const guiaDespacho = await getGuiaDespacho(record.ID_DOCUMENTO, record.ID_TIPO_DOCUMENTO);

                if (record.ID_TIPO_DOCUMENTO != 2800) {
                    record.TITULO = rs.TITULO;
                } else {
                    record.TITULO = "Documento_GD_" + guiaDespacho;
                }

                // record.query = sql;
                const rolVisualiza = (rs.ROLES3 > 0) ? true : false;
                for (let t = 0; t < arrContenidoExtra.length; t++) {
                    record[arrContenidoExtra[t]] = (rs.getNString(15 + t) === null) ? "-" : (arrContenidoExtra[t].toUpperCase().indexOf("FECHA") > -1) ? orderFecha(rs.getNString(15 + t)) : rs.getNString(15 + t);
                }

                if (rolVisualiza) {
                    outPut.DATA.push(record);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getBusquedaFiltros", query: sql }
        }
        return outPut;
    });

    async function getMensajeEmail(idUsuario, idPortal, strNombreTD) {
        let sql;
        let msj = "";

        try {
            sql = `SELECT USUP.USERNAME,
                  CAT.TITULO
            FROM DB_USUARIO_PORTAL AS USUP
            INNER JOIN DB_CATEGORIA AS CAT
              ON CAT.ID_CATEGORIA = USUP.ID_PORTAL
            WHERE USUP.ID_USUARIO = ? AND USUP.ID_PORTAL = ?`;

            const result = await cds.run(sql, [idUsuario, idPortal]);

            for (const rs of result) {
                msj = rs.USERNAME + ". tipo de documento: " + strNombreTD + " y portal: " + rs.TITULO;
                return msj;
            }
        } catch (e) {
            return { error: e.message, accion: "getMensajeEmail", query: sql };
        }
        return msj;
    };

    this.on("getAlertas", async (req) => {
        const { json } = req.data;

        let sql;
        let sValue, asunto, mensaje;
        let outPut = [];
        let outPutReceptores = [];

        const idAlerta = json.ID_ACTIVIDAD;
        const accion = json.ACCION;
        const idUsuario = json.ID_USUARIO;
        const idPortal = json.ID_PORTAL;
        const nombreTD = json.NOMBRETD;

        try {
            sql = `SELECT ALE.ALE_ASUNTO,
                    ALE.ALE_DESTINATARIO,
                            ALE.ALE_BODY,
                               US.NOMBRE,
                             US.APELLIDO,
                            US.ID_USUARIO
                    FROM DB_ALERTAS AS ALE
              INNER JOIN DB_ACTIVIDADXALERTA AS ALEXACT
                ON ALEXACT.ALE_ID = ALE.ALE_ID
              INNER JOIN DB_USUARIO AS US
                ON US.CORREO = ALE.ALE_DESTINATARIO
              WHERE ALEXACT.ID_ACTIVIDADES = ? AND ALE.ESTADO = 1`;

            const result = await cds.run(sql, [idAlerta]);
            for (const rs of result) {
                asunto = rs.ALE_ASUNTO;
                let recordReceptores = {};
                recordReceptores.NOMBRE = rs.NOMBRE + " " + rs.APELLIDO;
                recordReceptores.MAIL = rs.ALE_DESTINATARIO;

                outPutReceptores.push(recordReceptores);
                mensaje = rs.ALE_BODY;
            }
        } catch (e) {
            return { error: e, accion: "getAlertas", query: sql };
        }
        let record = {};
        record.SUCCESS = true;
        record.ASUNTO = asunto;
        record.ADJUNTOS = [];
        record.RECEPTORES = outPutReceptores;
        record.COPIADOS = [];
        record.MENSAJE = mensaje + " " + accion + " para el usuario: " + await getMensajeEmail(idUsuario, idPortal, nombreTD);

        return record;
    });

    this.on("getTagxPortal", async (req) => {
        const { json } = req.data;

        let sql;
        let outPut = [];

        const idPortal = json.ID_PORTAL;

        try {
            sql = `SELECT DISTINCT TAG.ID_TAG, TAG.NOMBRE_TAG FROM DB_TAG AS TAG
                  INNER JOIN DB_TAGXPORTAL AS TAGXPORTAL
                    ON TAGXPORTAL.ID_TAG = TAG.ID_TAG
                  WHERE TAGXPORTAL.ID_CATEGORIA = ? AND TAG.ESTADO = 'Activo' ORDER BY TAG.NOMBRE_TAG ASC`;

            const result = await cds.run(sql, [idPortal]);
            for (const rs of result) {
                let record = {};
                record.ID_TAG = rs.ID_TAG;
                record.NOMBRE_TAG = rs.NOMBRE_TAG;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getTagxPortal", query: sql };
        }

        return outPut;
    });

    async function getQueryJerarquico(idPadre) {
        const sql = `
        SELECT 
            CAT.ID_CATEGORIA,
            CAT.TITULO
        FROM DB_CATEGORIA AS CAT
        WHERE CAT.ESTADO = 'Activo'
          AND CAT.ID_PADRE = ?
          AND CAT.ID_TIPO_VISUALIZADOR = 1
        ORDER BY CAT.TITULO ASC
    `;

        return sql;
    }

    async function ejecutaTXJerarquico(sql, idPadre) {
        let hijos = [];

        try {
            const result = await cds.run(sql, [idPadre]);

            for (const rs of result) {
                let json = {};
                json.ID_CATEGORIA = rs.ID_CATEGORIA;
                json.TITULO = rs.TITULO;
                json.NODOS = [];

                hijos.push(json);
            }

            return hijos;
        } catch (e) {
            return hijos;
        }
    }

    async function getDataNodoJerarquico(nodos, inicio, hijos, arbol) {
        let hijosDelPadre = hijos;

        try {
            for (const nodo of nodos) {
                const queryNodo = await getQueryJerarquico(nodo.ID_CATEGORIA);
                const isNodos = await ejecutaTXJerarquico(queryNodo, nodo.ID_CATEGORIA);

                if (inicio) {
                    arbol.push(nodo);
                    hijosDelPadre = nodo.NODOS;
                    await getDataNodoJerarquico(isNodos, false, hijosDelPadre, arbol);
                } else {
                    hijosDelPadre.push(nodo);
                    await getDataNodoJerarquico(isNodos, false, nodo.NODOS, arbol);
                }
            }

            return arbol;
        } catch (e) {
            return { error: e.message, accion: "getDataNodoJerarquico" };
        }
    }

    function recursivaJerarquico(arr, resultsJerarquico) {
        for (const nodo of arr) {
            let record = {};
            record.ID_CATEGORIA = nodo.ID_CATEGORIA;
            record.TITULO = nodo.TITULO;

            resultsJerarquico.push(record);

            if (nodo.NODOS && nodo.NODOS.length > 0) {
                recursivaJerarquico(nodo.NODOS, resultsJerarquico);
            }
        }
    }

    this.on("getNodoJerarquico", async (req) => {
        const { json } = req.data;

        let sql;

        try {
            const idPadre = Number(json.ID_PORTAL);
            console.log(idPadre)

            sql = await getQueryJerarquico(idPadre);
            const nodos = await ejecutaTXJerarquico(sql, idPadre);

            let arbol = [];
            let resultsJerarquico = [];

            for (const element of nodos) {
                let nod = {};
                nod.NODOS = [];

                await getDataNodoJerarquico([element], true, nod.NODOS, arbol);
            }

            for (const nodo of arbol) {
                let record = {};
                record.ID_CATEGORIA = nodo.ID_CATEGORIA;
                record.TITULO = nodo.TITULO;

                resultsJerarquico.push(record);

                if (nodo.NODOS && nodo.NODOS.length > 0) {
                    recursivaJerarquico(nodo.NODOS, resultsJerarquico);
                }
            }

            return resultsJerarquico;
        } catch (e) {
            return { error: e.message, accion: "getNodoJerarquico", query: sql };
        }
    });

    this.on("datosUserPortal", async (req) => {
        const { json } = req.data;

        const CORREO = json.CORREO;

        let sql;
        let outPut = [];

        try {
            sql = `SELECT USU.NOMBRE,
                  USU.USERNAME,
                  USU.CORREO,
                  USU.ID_USUARIO,
                  USU.APELLIDO
                FROM DB_USUARIO AS USU
                WHERE USU.CORREO = ?`;

            const result = await cds.run(sql, [CORREO]);

            for (const rs of result) {
                let record = {};
                record.NOMBRE = rs.NOMBRE + " " + rs.APELLIDO;
                record.USERNAME = rs.USERNAME;
                record.CORREO = rs.CORREO;
                record.ID_USUARIO = rs.ID_USUARIO;

                outPut.push(record);
            }

            return outPut;
        } catch (e) {
            return { error: e.message, accion: "datosUserPortal", query: sql };
        }

    });

    async function getPermisoCargaArchivoQuery(texto, idCategoria, idPortal, idUsuario) {
        let sql;
        let params = [];

        switch (texto) {
            case "listaArchivo":
                sql = `
        SELECT DISTINCT
          TD.ID_TIPO_DOCUMENTO,
          TD.NOMBRE,
          COUNT(ROL2.IDTD2) AS TOTALROL
        FROM DB_VINCULACION AS VIN
        INNER JOIN DB_TIPO_DOCUMENTO AS TD
          ON VIN.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
        LEFT JOIN (
          SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
          FROM DB_ROLESXTD AS ROLXTD
          INNER JOIN DB_ROLES AS ROL
            ON ROL.ID_ROLES = ROLXTD.ID_ROLES
          INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
            ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
          INNER JOIN DB_ROLESXACCIONES AS ROLXACC
            ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
          WHERE ROLXUSU.ID_USUARIO = ?
            AND ROLXACC.ID_ACCION = 2
        ) AS ROL2
          ON ROL2.IDTD2 = VIN.ID_TIPO_DOCUMENTO
        WHERE VIN.ID_NODO_VINCULA = ?
          AND VIN.NODO_PORTAL = ?
        GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        ORDER BY TD.NOMBRE ASC
      `;
                params = [idUsuario, idCategoria, idPortal];
                break;

            case "nodoBusqueda":
                sql = `
        SELECT DISTINCT
          TD.ID_TIPO_DOCUMENTO,
          TD.NOMBRE,
          COUNT(ROL2.IDTD2) AS TOTALROL
        FROM DB_NODOBUSQUEDA AS NB
        INNER JOIN DB_TIPO_DOCUMENTO AS TD
          ON NB.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
        LEFT JOIN (
          SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
          FROM DB_ROLESXTD AS ROLXTD
          INNER JOIN DB_ROLES AS ROL
            ON ROL.ID_ROLES = ROLXTD.ID_ROLES
          INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
            ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
          INNER JOIN DB_ROLESXACCIONES AS ROLXACC
            ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
          WHERE ROLXUSU.ID_USUARIO = ?
            AND ROLXACC.ID_ACCION = 2
        ) AS ROL2
          ON ROL2.IDTD2 = NB.ID_TIPO_DOCUMENTO
        WHERE NB.ID_NODO = ?
        GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        ORDER BY TD.NOMBRE ASC
      `;
                params = [idUsuario, idCategoria];
                break;

            case "nodoContenido":
                console.log("entro por nodoCotenido")
                sql = `SELECT DISTINCT TD.ID_TIPO_DOCUMENTO,
                                                  TD.NOMBRE,
                               COUNT(ROL2.IDTD2) AS TOTALROL
                               FROM DB_PORTALES AS POR
                                INNER JOIN DB_TIPO_DOCUMENTO AS TD
                                 ON POR.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
                        LEFT JOIN (SELECT ROLXTD.ID_TIPO_DOCUMENTO AS IDTD2
                         FROM DB_ROLESXTD AS ROLXTD
                          INNER JOIN DB_ROLES AS ROL
            ON ROL.ID_ROLES = ROLXTD.ID_ROLES
          INNER JOIN DB_ROLESXUSUARIOS AS ROLXUSU
            ON ROLXUSU.ID_ROLES = ROL.ID_ROLES
          INNER JOIN DB_ROLESXACCIONES AS ROLXACC
            ON ROLXACC.ID_ROLES = ROLXUSU.ID_ROLES
          WHERE ROLXUSU.ID_USUARIO = ?
            AND ROLXACC.ID_ACCION = 2
        ) AS ROL2
          ON ROL2.IDTD2 = POR.ID_TIPO_DOCUMENTO
        WHERE POR.ID_PORTAL = ?
        GROUP BY TD.ID_TIPO_DOCUMENTO, TD.NOMBRE
        ORDER BY TD.NOMBRE ASC
      `;
                params = [idUsuario, idPortal];
                break;

            default:
                return [];
        }

        return await cds.run(sql, params);
    };

    this.on("getPermisoCargaArchivo", async (req) => {
        const { json } = req.data;

        let outPut = [];

        const idCategoria = json.ID_CATEGORIA;
        const texto = json.TEXTO;
        const idPortal = json.ID_PORTAL;
        const idUsuario = json.ID_USUARIO;

        try {
            const result = await getPermisoCargaArchivoQuery(texto, idCategoria, idPortal, idUsuario);

            for (const rs of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.NOMBRE = rs.NOMBRE;
                record.METADATA = await getMetadata(rs.ID_TIPO_DOCUMENTO);

                const rolCrea = Number(rs.TOTALROL) > 0;

                if (rolCrea) {
                    outPut.push(record);
                }
            }

            return outPut;
        } catch (e) {
            return {
                error: e.message,
                accion: "getPermisoCargaArchivo"
            };
        }
    });

    this.on("updateDocument", async (req) => {
        const { json } = req.data;

        const idTd = json.ID_TIPO_DOCUMENTO;
        const idCat = json.ID_CATEGORIA;
        let sql;

        const response = {
            success: false,
            data: []
        };

        let outPut = [];

        try {
            sql = `SELECT DISTINCT MDV.ATRIBUTO,
                           MDV.VALUE,
                           MDV.ORIGEN
                  FROM DB_DETALLE AS DET
                  INNER JOIN DB_CATEGORIA AS CAT
                   ON CAT.ID_CATEGORIA = DET.NODO_HIJO
                  INNER JOIN DB_METADATA_VALUE AS MDV
                   ON MDV.ID_DETALLE = DET.ID_DETALLE
                  WHERE DET.ID_TIPO_DOCUMENTO = ? AND CAT.ID_CATEGORIA = ? AND MDV.ORIGEN <> 'Nodo Jerárquico'`;
            const result = await cds.run(sql, [idTd, idCat]);

            for (const rs of result) {
                let record = {};
                record.ATRIBUTO = rs.ATRIBUTO;
                record.VALUE = rs.VALUE;
                record.ORIGEN = rs.ORIGEN;
                outPut.push(record);
            }
            response.success = true;
        } catch (e) {
            return { error: e.message, accion: "updateDocument", query: sql };
        }
        response.data = outPut;
        return response;
    });

    this.on('updateMetadata', async (req) => {
        const { json } = req.data;

        const idDocumento = json.ID_DOCUMENTO;
        const arrMetadata = json.METADATA;

        let response = {
            success: false,
            data: []
        };

        let query;

        try {
            for (const item of arrMetadata) {
                query = `UPDATE DB_METADATA_VALUE SET VALUE = ? WHERE ATRIBUTO = ? AND ID_DOCUMENTO = ?`;
                await cds.run(query, [item.VALUE, item.ATRIBUTO, idDocumento]);

                if (item.ATRIBUTO === "FechaCarga") {
                    query = `UPDATE DB_DOCUMENTO SET UFH_CREAR = ?, UFH_CARGA = ? WHERE ID_DOCUMENTO = ?`;
                    await cds.run(query, [item.VALUE, item.VALUE, idDocumento]);
                }
            }

            response.success = true;
        } catch (e) {
            response.razon = e.message;
        }

        return response;
    });

    async function getNombreUsuario(idUsuario) {

        let sql;
        let record;

        try {
            sql = `SELECT USERNAME FROM DB_USUARIO WHERE ID_USUARIO = ?`;
            const result = await cds.run(sql, [idUsuario]);
            for (const rs of result) {
                return rs.USERNAME;
            }
        } catch (e) {
            return sql;
        }
        record = "";
        return record;
    };

    async function getMaxVersion(idDetalle) {

        let sql;
        let response = {
            success: false,
            results: "No encontro una ruta del archivo"
        };

        try {
            sql = `SELECT MAX(VERSION) AS MAX FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ?`;
            const result = await cds.run(sql, [idDetalle]);

            for (const rs of result) {
                return rs.MAX;
            }
        } catch (e) {
            return e.message;
        }
    };

    async function getRutaArchivo(idDetalle) {

        let sql;
        let response = {
            success: false,
            results: "No encontro una ruta del archivo"
        };

        try {
            sql = `SELECT URL, TITULO FROM DB_DETALLE WHERE ID_DETALLE = ?`;
            const result = await cds.run(sql, [idDetalle]);

            for (const rs of result) {
                let record = {};
                let ruta = rs.URL.replace("https://gascoglp.sharepoint.com/sites/GDG/", "");

                const rutaLength = ruta.length;
                const rutaTitulo = rs.TITULO.length - 1;
                let resta = ruta.length - rs.TITULO.length - 1;
                const div2 = ruta.split("/");
                const ext = "/" + div2[(div2.length - 1)];

                resta = ruta.length - ext.length;
                ruta = ruta.slice(0, resta);

                record.RUTA = decodeURI(ruta.replace("/_api/web/folders/add('", ""));
                record.VERSION = await getMaxVersion(idDetalle) + 1;

                response.success = true;
                response.results = record;
            }
        } catch (e) {
            response.results = e.message + sql;
            return response;
        }
        return response;
    }

    async function getFormatoPermitido(idDetalle, extension) {

        let sql;
        let response = {
            success: false,
            results: ""
        };

        try {

            sql = `SELECT URL FROM DB_DETALLE WHERE ID_DETALLE = ?`;
            const result = await cds.run(sql, [idDetalle]);

            for (const rs of result) {
                const div = rs.URL.split(".");
                const ext = "." + div[(div.length - 1)];
                if (ext.toLowerCase() === extension) {
                    response.success = true;
                } else {
                    response.success = false;
                    response.results = "Formato no permitido," + ext;
                }
            }
        } catch (e) {
            response.results = e.message + ",";
            return response;
        }
        return response;
    };

    async function getUrlActiva(idDetalle) {

        let sql;

        try {
            sql = `SELECT URL_DETALLE, URL_BEFORE, ID_VERSIONAMIENTO FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ? AND ACTIVO = 'X'`;
            const result = await cds.run(sql, [idDetalle]);

            for (const rs of result) {
                let record = {};
                record.URL_DETALLE = rs.URL_DETALLE;
                record.URL_BEFORE = rs.URL_BEFORE;
                record.ID_VERSIONAMIENTO = rs.ID_VERSIONAMIENTO;

                return record;
            }
        } catch (e) {
            return "prueba";
        }
        return "prueba2";
    };

    async function AddVersion(base64, arc, carpet) {
        let definition2;
        let json = {};

        try {
            json = {
                base64: base64
            };

            const dest = await cds.connect.to('GESTOR_DOCUMENTAL');

            const carpeta = encodeURI(carpet);
            arc = encodeURI(arc);

            definition2 = `?accion=uploadFileToSharePoint&rutaSharePoint=${carpeta}&nombreArchivo=${arc}`;

            const result = await dest.send({
                method: 'POST',
                path: definition2,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                data: json
            });

            const resp = typeof result === 'string' ? JSON.parse(result) : result;

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
                    size: resp.Length,
                    total: resp
                }];
            }

        } catch (e) {
            return [{
                success: false,
                archivo: arc,
                link: e.message,
                url: definition2,
                json: JSON.stringify(json)
            }];
        }
    };

    async function getTokenValue() {
        let token;
        let body = [];

        const details = {
            grant_type: "client_credentials",
            resource: "00000003-0000-0ff1-ce00-000000000000/gascoglp.sharepoint.com@8510dd4d-19ec-4aea-8708-bc6a0ed235c3",
            client_id: "bd143cf5-f8b3-40d8-9d73-e65ba672e25e@8510dd4d-19ec-4aea-8708-bc6a0ed235c3",
            client_secret: "RWFVOFF+ZFdVUFhTSWdlVXhSUVd1fkl1VDIuc3BOREFKMDVnYWNEWg=="
        };

        for (const property in details) {
            const encodedKey = encodeURIComponent(property);
            const encodedValue = encodeURIComponent(details[property]);
            body.push(encodedKey + "=" + encodedValue);
        }

        try {
            const dest = await cds.connect.to("GESTOR_DOCUMENTAL_destiny");

            const result = await dest.send({
                method: "POST",
                path: "",
                headers: {
                    Accept: "application/x-www-form-urlencoded",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: body.join("&")
            });

            if (!result) {
                return false;
            }

            const response = typeof result === "string" ? JSON.parse(result) : result;
            token = response.access_token;

            return token;

        } catch (e) {
            return false;
        }
    }

    async function getIdItems(uri) {
        let path;

        try {
            const dest = await cds.connect.to("GESTOR_DOCUMENTAL");
            const sToken = await getTokenValue();

            path = `${uri}')/ListItemAllFields`;

            const result = await dest.send({
                method: "GET",
                path: path,
                headers: {
                    Authorization: `Bearer ${sToken}`,
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            });

            const resp = typeof result === "string" ? JSON.parse(result) : result;

            return resp.ID;

        } catch (e) {
            return e.message;
        }
    }

    async function updateUrlVersion(uri, newName) {
        let path;

        try {
            const items = await getIdItems(uri);
            const sToken = await getTokenValue();

            const dest = await cds.connect.to("GESTOR_DOCUMENTAL");

            path = `${items})`;

            const body = {
                "__metadata": {
                    "type": "SP.Data.GASCOItem"
                },
                "Title": newName,
                "FileLeafRef": newName
            };

            await dest.send({
                method: "POST",
                path: path,
                headers: {
                    Authorization: `Bearer ${sToken}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "If-Match": "*",
                    "X-HTTP-Method": "MERGE"
                },
                data: body
            });

            return newName;

        } catch (e) {
            return e.message;
        }
    }

    async function updateUrlVersion2(uri, newName) {

        try {

            const items = Number(await getIdItems(uri));
            return items;

        } catch (e) {
            return { error: e.message, accion: "updateUrlVersion2" };
        }
    };

    async function insertVersionArchivo(idDetalle, arr, arrcambios) {

        let sql, sql2;
        let outPutResponse = [];
        let response = {
            success: false,
            results: "FALLOS"
        };

        try {
            let idSequence = await getIdSequence("ID_VERSIONAMIENTO");

            sql = `UPDATE DB_VERSIONAMIENTO SET ACTIVO = '', URL_DETALLE = ${arrCambios.urlBefore} WHERE ID_DETALLE = ${idDetalle} AND ACTIVO = 'X'`;
            const uri = arrCambios.uriPrimera.replace("https://gascoglp.sharepoint.com/sites/GDG/", "");

            outPutResponse.push(uri);

            const resp1 = await updateUrlVersion(uri, arrCambios.nombrePrimera);

            outPutResponse.push(resp1);

            sql2 = `INSERT INTO DB_VERSIONAMIENTO VALUES ( ${idSequence}, ${arr.VERSION}, ${idDetalle}, ${arrCambios.uriPrimera}, ${arr.FECHA_CARGA}, ${arr.SIZE}, ${arr.USUARIO}, ${arrCambios.uriSegunda}, 'X')`;
            const uri2 = arrCambios.uriSegunda.replace("https://gascoglp.sharepoint.com/sites/GDG/", "");

            outPutResponse.push(uri2);

            const resp2 = await updateUrlVersion2(uri2, arrCambios.nombreSegunda);

            outPutResponse.push(resp2);
            response.success = true;
            response.results = "OK";
            return response;

        } catch (e) {
            response.results = e.message;
            return response;
        }

    }

    this.on('generaVersion', async (req) => {
        const json = req.data.input || req.data.json || req.data;

        const idDetalle = json.ID_DETALLE;
        const fechaCarga = json.FECHA_CARGA;
        const usuario = await getNombreUsuario(json.ID_USUARIO);
        const base64 = json.BASE64;
        let nombreArchivo = json.NOMBRE_ARCHIVO;

        let body;

        const div = nombreArchivo.split(".");
        const extension = "." + div[(div.length - 1)];

        try {
            const respFormato = await getFormatoPermitido(idDetalle, extension.toLowerCase());

            if (respFormato.success) {
                const recordRuta = await getRutaArchivo(idDetalle);

                if (!recordRuta.success) {
                    return recordRuta.results;
                } else {
                    const arrUrlActiva = await getUrlActiva(idDetalle);

                    const urlActiva = arrUrlActiva.URL_DETALLE;
                    const urlBefore = arrUrlActiva.URL_BEFORE;

                    const splitNombreArchivoActivo = urlActiva.split("/");
                    const nombreArchivoActivo = splitNombreArchivoActivo[splitNombreArchivoActivo.length - 1];
                    const nombreActivoF = nombreArchivoActivo;

                    const div2 = nombreArchivoActivo.split(".");
                    const ext = "." + div2[(div2.length - 1)];
                    const res = nombreArchivoActivo.slice(0, nombreArchivoActivo.length - ext.length);

                    nombreArchivo = res + "_" + arrUrlActiva.ID_VERSIONAMIENTO + "_Copia" + recordRuta.results.VERSION + ext;

                    const splitNombreArchivoActivoO = urlBefore.split("/");
                    const nombreArchivoActivoO = splitNombreArchivoActivoO[splitNombreArchivoActivoO.length - 1];

                    const respURL = await AddVersion(base64, nombreArchivo, recordRuta.results.RUTA);

                    const arrCambios = {
                        uriPrimera: urlActiva,
                        nombrePrimera: decodeURI(nombreArchivoActivoO),
                        uriSegunda: encodeURI(respURL[0].link),
                        nombreSegunda: decodeURI(nombreActivoF),
                        urlBefore: urlBefore,
                        ruta: recordRuta.results.RUTA.replace("%C3%AD", "í"),
                        nomArc: nombreArchivo
                    };

                    if (!respURL[0].success) {
                        body = respURL[0].link;
                    } else {
                        recordRuta.results.FECHA_CARGA = fechaCarga;
                        recordRuta.results.USUARIO = usuario;
                        recordRuta.results.SIZE = respURL[0].size;
                        recordRuta.results.URL_BEFORE = respURL[0].link;
                        recordRuta.results.URL_DETALLE = urlActiva;

                        const recordInsert = await insertVersionArchivo(idDetalle, recordRuta.results, arrCambios);

                        if (recordInsert.results === "FALLO") {
                            return recordInsert.results;
                        } else {
                            const response = {};
                            response.success = respURL[0].success;
                            response.archivo = respURL[0].archivo;
                            response.link = respURL[0].link;
                            response.message = recordInsert;

                            body = response;
                        }
                    }
                }
            } else {
                body = respFormato.results;
                return body;
            }

        } catch (e) {
            return e.message;
        }

        return body;
    });

    async function getActiva(idDetalle) {

        let sql;

        try {
            sql = `SELECT COUNT(VER.VERSION) AS VERSION FROM DB_DETALLE AS DET
                    INNER JOIN DB_DOCUMENTO AS DOC
                      ON DOC.ID_DOCUMENTO = DET.ID_CATEGORIA_HOJA
                    INNER JOIN DB_VERSIONAMIENTO AS VER
                      ON VER.ID_DETALLE = DET.ID_DETALLE
                    WHERE DET.ID_DETALLE = ? AND DOC.UFH_CARGA = '2020-07-31'`;

            const result = await cds.run(sql, [idDetalle]);
            for (const rs of result) {
                return (rs.VERSION === 0) ? true : false;
            }
        } catch (e) {
            return false;
        }
    };

    async function getUrlActivaUpdate(idDetalle) {

        let sql;

        try {
            sql = `SELECT URL_DETALLE,
                          URL_BEFORE,
                          VERSION
                          FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ? AND ACTIVO = 'X'`;

            const result = await cds.run(sql, [idDetalle]);
            for (const rs of result) {
                let record = {};
                record.URL_DETALLE = rs.URL_DETALLE;
                record.URL_BEFORE = rs.URL_BEFORE;
                record.VERSION = rs.VERSION;

                return record;
            }
        } catch (e) {
            return "prueba";
        }
        return "prueba2";
    };

    async function setActivo(idDetalle, activo, urlDetalle, version, nombre, uri, flah) {

        let sql, sql2;
        let response = {
            success: false,
            results: "FALLOS"
        };

        try {
            if (activo === "") {
                sql = " ACTIVO = ''";
            } else {
                sql = " ACTIVO = 'X'";
            }

            sql2 = `UPDATE DB_VERSIONAMIENTO SET ${sql}, URL_DETALLE = ? WHERE ID_DETALLE = ? AND VERSION = ?`;
            await cds.run(sql2, [urlDetalle, idDetalle, version]);

            const resp1 = await updateUrlVersion(uri, nombre);

            response.success = true;
            response.results = resp1;
            response.nombre = nombre;
            return response;

        } catch (e) {
            response.results = e.message;
            return response;
        }

    };

    async function getUrlActivaNuevaUpdate(idDetalle, version) {

        let sql;

        try {
            sql = `SELECT URL_DETALLE, URL_BEFORE, VERSION FROM DB_VERSIONAMIENTO WHERE ID_DETALLE = ? AND VERSION = ?`;
            const result = await cds.run(sql, [idDetalle, version]);

            for (const rs of result) {
                let record = {};
                record.URL_DETALLE = rs.URL_DETALLE;
                record.URL_BEFORE = rs.URL_BEFORE;
                record.VERSION = rs.VERSION;

                return record;
            }
        } catch (e) {
            return "prueba";
        }

        return "prueba2"

    };

    this.on('activaVersion', async (req) => {
        const json = req.data.input || req.data.json || req.data;

        const idDetalle = json.ID_DETALLE;
        const idVersionActiva = json.VERSION;

        let outputResponse = [];

        try {
            const flag = await getActiva(idDetalle);

            const arrUrlActiva = await getUrlActivaUpdate(idDetalle);
            const urlDetalle = arrUrlActiva.URL_DETALLE;
            const urlBefore = arrUrlActiva.URL_BEFORE;

            const uriActiva = encodeURI(
                arrUrlActiva.URL_DETALLE.replace("https://gascoglp.sharepoint.com/sites/GDG/", "")
            ).split("%25").join("%");

            const uriDesActiva = encodeURI(
                arrUrlActiva.URL_BEFORE.replace("https://gascoglp.sharepoint.com/sites/GDG/", "")
            ).split("%25").join("%");

            const splitNombreArchivoInactivo = urlBefore.split("/");
            const archivoInactivo = decodeURI(splitNombreArchivoInactivo[splitNombreArchivoInactivo.length - 1]);

            const splitNombreArchivoActivo = urlDetalle.split("/");
            const archivoActivo = decodeURI(splitNombreArchivoActivo[splitNombreArchivoActivo.length - 1]);

            const response1 = await setActivo(
                idDetalle,
                '',
                urlBefore,
                arrUrlActiva.VERSION,
                archivoInactivo,
                uriActiva
            );

            const arrUrlActivaNueva = await getUrlActivaNuevaUpdate(idDetalle, idVersionActiva);
            const urlDetalleNueva = arrUrlActivaNueva.URL_DETALLE;
            const urlBeforeNueva = arrUrlActivaNueva.URL_BEFORE;

            const uriActivaNueva = encodeURI(
                urlDetalleNueva.replace("https://gascoglp.sharepoint.com/sites/GDG/", "")
            ).split("%25").join("%");

            const response2 = await setActivo(
                idDetalle,
                'X',
                urlDetalle,
                idVersionActiva,
                archivoActivo,
                uriActivaNueva
            );

            outputResponse = [{
                urlBefore: urlDetalle,
                VERSION: idVersionActiva,
                archivoInactivo: archivoActivo,
                uriActiva: uriActivaNueva,
                urlDetalleNueva: urlDetalleNueva,
                urlBeforeNueva: urlBeforeNueva,
                response: response1,
                response2: response2
            }];

        } catch (e) {
            return e.message;
        }

        return outputResponse;
    });

    this.on("sendMailMasivo", async (req) => {
        const json = req.data.input || req.data.json || req.data;

        const subject = json.ASUNTO;
        const rs = json.RECEPTORES;
        const cs = json.COPIADOS;
        const adj = json.ADJUNTOS;
        const msg = json.MENSAJE;

        const response = {};

        try {
            const receptors = [];
            for (const item of rs) {
                receptors.push({
                    name: item.NOMBRE,
                    address: item.MAIL
                });
            }

            const copias = [];
            for (const item of cs) {
                copias.push({
                    name: item.NOMBRE,
                    address: item.MAIL
                });
            }

            const adjuntos = [];
            for (const item of adj) {
                adjuntos.push({
                    filename: item.NOMBRE_ARCHIVO,
                    content: Buffer.from(item.BASE64, "base64"),
                    contentType: item.MIMETYPE
                });
            }

            console.log("MAIL_HOST:", process.env.MAIL_HOST);
            console.log("MAIL_PORT:", process.env.MAIL_PORT);
            console.log("MAIL_USER:", process.env.MAIL_USER);

            const transporter = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: Number(process.env.MAIL_PORT),
                secure: false,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            });

            const info = await transporter.sendMail({
                from: "admin@sapnet.cl",
                to: receptors,
                cc: copias,
                subject: subject,
                html: msg,
                attachments: adjuntos
            });

            response.success = true;
            response.results = `Correo enviado con exito. MessageId: ${info.messageId}`;

        } catch (e) {
            console.error("ERROR sendMailMasivo:", e.message);
            response.success = false;
            response.results = e.message;
        }

        return response;
    });

    async function getInfoNodoCopiado(idNodo) {

        let sql;
        let response = {
            success: false
        }

        try {
            sql = `SELECT PATHSP, ID_PADRE, OBJID FROM DB_CATEGORIA WHERE ID_CATEGORIA = ?`;

            const result = await cds.run(sql, [idNodo]);
            for (const rs of result) {
                response.success = true;
                response.pathsp = rs.PATHSP;
                response.idPadre = rs.ID_PADRE;
                response.objId = (rs.OBJID === null) ? rs.OBJID : "'" + rs.OBJID + "'";

                return response;
            }
        } catch (e) {
            response.success = false;
            response.idNodo = e.message;
            return response;
        }

    };

    async function insertCategoriaBase(arrBase, arrNodo) {
        let sql;
        let response = {
            success: false
        };

        try {
            const carpet = arrNodo.pathsp + "/" + arrBase.TITULO;
            const pathSharepoint = await createFolder(carpet);

            if (pathSharepoint) {
                const idSequence = await getIdSequence("ID_CATEGORIA");

                sql = `INSERT INTO DB_CATEGORIA VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

                await cds.run(sql, [
                    idSequence,
                    arrBase.ID_NODO,
                    arrBase.ID_TIPO,
                    arrBase.TITULO,
                    arrBase.USERNAME,
                    arrBase.NOMBRE,
                    arrBase.MAIL,
                    arrBase.DESCRIPCION,
                    arrBase.ID_TIPO_VISUALIZACION,
                    null,
                    null,
                    'Estático',
                    'Estructura',
                    carpet,
                    null,
                    arrBase.APP_DATOS,
                    null,
                    null,
                    null,
                    'Activo',
                    arrNodo.objId
                ]);

                const idPadreE = arrBase.ID_NODO + 1;
                const idSequenceD = await getIdSequence("ID_CATEGORIA");

                sql = `INSERT INTO DB_CATEGORIA VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

                await cds.run(sql, [
                    idSequenceD,
                    idPadreE,
                    arrBase.ID_TIPO,
                    arrBase.TITULO,
                    arrBase.USERNAME,
                    arrBase.NOMBRE,
                    arrBase.MAIL,
                    arrBase.DESCRIPCION,
                    arrBase.ID_TIPO_VISUALIZACION,
                    null,
                    null,
                    'Dinámico',
                    'Contenido',
                    carpet,
                    null,
                    arrBase.APP_DATOS,
                    idSequence,
                    null,
                    null,
                    'Activo',
                    arrNodo.objId
                ]);

                if (arrBase.ORIGEN === 'Dinámico') {
                    const idSeqDinamico = await getIdSequence("ID_CATEGORIA");

                    sql = `INSERT INTO DB_CATEGORIA VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

                    await cds.run(sql, [
                        idSeqDinamico,
                        idSequenceD,
                        arrBase.ID_TIPO,
                        arrBase.TITULO,
                        arrBase.USERNAME,
                        arrBase.NOMBRE,
                        arrBase.MAIL,
                        arrBase.DESCRIPCION,
                        arrBase.ID_TIPO_VISUALIZACION,
                        null,
                        null,
                        'Dinámico',
                        'Contenido',
                        carpet,
                        null,
                        arrBase.APP_DATOS,
                        idSequence,
                        null,
                        null,
                        'Activo',
                        arrNodo.objId
                    ]);

                    response.idNodoCreadoContenidoDinamico = idSeqDinamico;
                }

                response.success = true;
                response.idNodoCreadoContenido = idSequenceD;
                response.idNodoCreadoEstructura = idSequence;
                response.pathSPBase = carpet;

                return response;

            } else {
                response.results = "Falla en generar la carpeta " + arrBase.TITULO;
                return response;
            }

        } catch (e) {
            response.results = e.message;
            response.query = sql;
            return response;
        }
    }

    async function getQueryZTD(idPadre) {
        let sql;

        sql = `SELECT * FROM DB_CATEGORIA AS CAT
                JOIN DB_TIPO_VISUALIZADOR AS TV
                  ON TV.ID_TIPO_VISUALIZADOR = CAT.ID_TIPO_VISUALIZADOR
                WHERE CAT.ESTADO = 'Activo' AND CAT.ID_PADRE = ${idPadre}`;

        return sql;

    }

    async function ejecutaTXZTD(sql, idPadre, spath) {

        let hijos = [];

        try {
            const result = await cds.run(sql);
            for (const rs of result) {

                let json = {};
                json.ID_CATEGORIA = rs.ID_CATEGORIA;
                json.TITULO = rs.TITULO;
                json.ID_TIPO = rs.ID_TIPO;
                json.USERNAME = rs.USERNAME;
                json.NOMBRE = rs.NOMBRE;
                json.MAIL = rs.MAIL;
                json.DESCRIPCION = rs.DESCRIPCION;
                json.ID_TIPO_vISUALIZADOR = rs.ID_TIPO_VISUALIZADOR;
                json.ORIGEN = rs.ORIGEN;
                json.APP = rs.APP;
                json.PATHSP = spath + "/" + rs.PATHSP;
                json.APP_DATOS = rs.APP_DATOS;
                json.ID_CATEGORIA_ESPEJO = rs.ID_CATEGORIA_ESPEJO;
                json.ID_VINCULANTE = rs.ID_VINCULANTE;
                json.GRUPO = rs.GRUPO;
                json.ESTADO = rs.ESTADO;
                json.OBJID = (rs.OBJID === null) ? rs.OBJID : "'" + rs.OBJID + "'";
                json.ID_PADRE = idPadre;
                json.NIVEL = 0;

                json.NODOS = [];
                hijos.push(json);

            }
            return hijos;

        } catch (e) {
            return hijos;
        }

    }

    async function getArbolCopiarCategoria(idPadre, spath, idPadreNew) {
        idPadre = Number(idPadre);

        let arrayNiveles = [];

        try {
            const queryNodo = await getQueryZTD(idPadre);
            const nodos = await ejecutaTXZTD(queryNodo, idPadreNew, spath);

            for (const element of nodos) {
                let nod = {};
                nod.NODOS = [];

                await getDataNodo([element], true, nod, 0);

                arrayNiveles.push(niveles);
                niveles = 0;
            }

            arrayNiveles.sort(function (a, b) {
                return b - a;
            });

            const estructura = {
                NIVELES: arrayNiveles[0],
                ARBOL: arbol
            };

            return true;

        } catch (e) {
            return false;
        }
    }

    this.on('copyCategoria', async (req) => {
        const json = req.data.input || req.data.json || req.data;
        let body;

        try {
            const responseNodo = await getInfoNodoCopiado(json.ID_NODO);

            if (responseNodo.success) {
                const resp = await insertCategoriaBase(json, responseNodo);

                if (resp.success) {
                    const idPadreNew = resp.idNodoCreadoEstructura;

                    const resultArbol = await getArbolCopiarCategoria(
                        json.ID_CATEGORIA_COPIADO,
                        resp.pathSPBase,
                        idPadreNew
                    );

                    body = resultArbol;

                } else {
                    return "No se pudo crear la carpeta " + json.TITULO;
                }

            } else {
                return responseNodo.idNodo;
            }

        } catch (e) {
            return e.message;
        }

        return body;
    });

    this.on('verificaArchivo', async (req) => {
        const { json } = req.data;

        let sql;
        const idCat = json.ID_CATEGORIA;
        const texto = json.NOMBRE_ARCHIVO.toUpperCase();

        try {
            sql = `SELECT COUNT(*) AS TOTAL FROM DB_DFTALLE WHERE NODO_HIJO = ${idCat}
                   AND UPPER(TITULO) LIKE '${texto}'`;
            const result = await cds.run(sql);

            for (const rs of result) {
                response = (rs.TOTAL === 0) ? false : true;
            }

        } catch (e) {
            return { error: e.message, accion: "verificaArchivo", query: sql };
        }
        return response;
    });

});