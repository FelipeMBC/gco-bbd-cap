
///////////////////////
///////ALERTAS/////////
///////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    async function getSequence(nombreSequence) {
        let sql;
        let sValue = false;

        try {
            sql = `SELECT ${nombreSequence}.NEXTVAL AS ID FROM DUMMY`;

            const result = await cds.run(sql)
            for (const rs of result)
                sValue = rs.ID;

        } catch (e) {
            return { msg: 'No se encontro el ID', r: false }
        }
        return sValue;
    };

    async function getSelectedPortal(idUser, idAlertas) {
        try {
            const sql = `SELECT COUNT(*) AS EXISTE FROM DB_PORTALXALERTA
            WHERE ID_PORTAL = ?
            AND ALE_ID = ?
            LIMIT 1`;

            const result = await cds.run(sql, [idUser, idAlertas])

            return result.length > 0;
        } catch (e) {
            return false;
        }
    };

    async function getListPortalesDisponibles(idAlertas) {

        let sql;
        let output = [];

        try {
            sql = `SELECT
           ID_CATEGORIA,
           TITULO
           FROM
           DB_CATEGORIA
           WHERE
           ID_PADRE = 0`; /*--ID_PADRE = 0 HAS TO EXISTS ON DB_CATEGORIA FOR SUCCESS IN THIS SERVICE, Tiene que existir en DB_CATEGORIA, ID_PADRE VALOR 0. 1019323 WORKS/FUNCIONA --*/

            const result = await cds.run(sql);

            for (const rs of result) {
                let record = {};
                record.ID_PORTAL = rs.ID_CATEGORIA;
                record.TITULO = rs.TITULO;
                record.SELECTED = await getSelectedPortal(rs.ID_CATEGORIA, idAlertas);

                record.ID_ALERTA = idAlertas;

                if (record.ID_CATEGORIA !== 1707 && record.ID_CATEGORIA !== 1708) {
                    output.push(record);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getListPortalesDisponibles", query: sql }
        }
        return output;
    };

    this.on('getListPortales', async (req) => {
        try {
            const { idAlertas } = req.data;
            return await getListPortalesDisponibles(idAlertas);
        } catch (e) {
            req.reject(500, e.message)
        }
    }); //getListPortales

    async function deletePortales(idAlertas) {
        let sql;

        try {
            sql = `
        DELETE FROM
        DB_PORTALXALERTA
        WHERE ALE_ID = ?`;

            await cds.run(sql, [idAlertas]);

            return "OK";
        } catch (e) {
            return { error: e.message, accion: "deletePortales", query: sql };
        }
    };

    this.on('update', async (req) => {
        const { idAlertas, json } = req.data.input;
        let cant = json.length;
        let sql;
        let resp = await deletePortales(idAlertas);

        try {
            console.log("deletePortales resp:", resp);
            console.log("idAlertas:", idAlertas);
            console.log("json:", json);

            for (let j = 0; j < cant; j++) {
                let id_portal = json[j].ID_PORTAL;
                let idAlertasPortal = await getSequence("ID_PORTALXALERTA");

                console.log("idAlertasPortal:", idAlertasPortal);
                console.log("id_portal:", id_portal);
                console.log("idAlertas:", idAlertas);

                sql = `INSERT INTO DB_PORTALXALERTA VALUES (?,?,?)`;
                await cds.run(sql, [idAlertasPortal, id_portal, idAlertas]);

                console.log("insert ejecutado");
            }

            return {
                ok: true,
                mensaje: "Insert realizado",
                deleteResp: resp
            };
        } catch (e) {
            console.log("ERROR updateUser:", e);
            return { error: e.message, accion: "updateUser", query: sql };
        }
    });

    this.on('getListCantPortales', async (req) => {
        const { idAlertas } = req.data;
        let sql;

        try {
            sql = `
             SELECT COUNT(*) AS TOTAL
             FROM DB_PORTALXALERTA
             WHERE ALE_ID = ?`;
            const result = await cds.run(sql, [idAlertas]);

            return result;

        } catch (e) {
            return { error: e.message, accion: "getListCantPortales", query: sql }
        }
    });//getListCantPortales

    async function getPortales(idAlertas) {
        let outPut = [];
        let sql;

        try {
            sql = `
      SELECT
        POR.ID_PORTAL AS ID_PORTAL,
        TO_VARCHAR(POR.ID_PORTAL) AS NOMBREPORTAL
      FROM
        DB_PORTALXALERTA POR
      WHERE
        POR.ALE_ID = ?`;

            const result = await cds.run(sql, [idAlertas]);

            for (const gp of result) {
                outPut.push({
                    ID_PORTAL: gp.ID_PORTAL,
                    NOMBREPORTAL: gp.NOMBREPORTAL
                });
            }
        } catch (e) {
            console.error("getPortales error:", e.message);
            return [];
        }
        return outPut;
    };

    async function getSelectedTipDoc(idTipoDocumento, idAlertas) {
        let sql;
        try {
            sql = `
      SELECT 1 AS ok
      FROM DB_TIPODOCUMENTOXALERTA
      WHERE ID_TIPO_DOCUMENTO = ? AND ALE_ID = ?
      LIMIT 1
    `;
            const result = await cds.run(sql, [idTipoDocumento, idAlertas]);
            return result;
        } catch (e) {
            return { info: false, error: e.message, accion: "getSelectedTipDoc", query: sql }
        }
    };

    async function getListTipDocDisponibles(idAlertas) {
        let output = [];
        let sql;

        try {
            const portales = await getPortales(idAlertas);
            console.log(portales)

            if (!Array.isArray(portales)) {
                throw new Error(portales.error || 'Error al obtener portales');
            }

            sql = `
            SELECT DISTINCT
            TIPDOC.ID_TIPO_DOCUMENTO   AS ID_TIPO_DOCUMENTO,
            TIPDOC.NOMBRE              AS NOMBRETIPDOC
             FROM DB_TIPO_DOCUMENTO AS TIPDOC
              INNER JOIN DB_VINCULACION AS VIN
               ON VIN.ID_TIPO_DOCUMENTO = TIPDOC.ID_TIPO_DOCUMENTO
            WHERE VIN.NODO_PORTAL = ?`;

            for (const p of portales) {
                const result = await cds.run(sql, [p.ID_PORTAL]);

                for (const gtipdoc of result) {
                    let record = {};
                    record.ID_TIPO_DOCUMENTO = gtipdoc.ID_TIPO_DOCUMENTO;
                    record.NOMBRETIPDOC = gtipdoc.NOMBRETIPDOC;
                    record.NOMBREPORTAL = p.NOMBREPORTAL;
                    record.SELECTED = await getSelectedTipDoc(gtipdoc.ID_TIPO_DOCUMENTO, idAlertas);

                    output.push(record);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getListTipDocDisponibles", query: sql }
        }
        return output;
    };

    this.on('getListTipDoc', async (req) => {
        try {
            const { idAlertas } = req.data;
            return await getListTipDocDisponibles(idAlertas);
        } catch (e) {
            req.reject(500, e.message);
        }
    }); //getListTipDoc

    async function deleteActividades(idAlertas) {
        let sql;

        try {
            sql = `DELETE FROM DB_ACTIVIDADXALERTA WHERE ALE_ID = ?`;

            await cds.run(sql, [idAlertas]);
            return "OK";
        } catch (e) {
            return { error: e.message, accion: "deleteActividades", query: sql };
        }
    };

    this.on('updateActividades', async (req) => {
        const { idAlertas, actividades } = req.data.input;
        const resp = await deleteActividades(idAlertas);

        const sql = `INSERT INTO DB_ACTIVIDADXALERTA VALUES (?,?,?)`;

        for (const item of actividades) {
            const idAlertasTipDoc = await getSequence("ID_ACTIVIDADXALERTA");
            await cds.run(sql, [idAlertasTipDoc, item.ID_ACTIVIDAD, idAlertas]);
        }
        return resp;
    });

    async function getSelectedActividades(idAct, idAlertas) {
        let sql;

        try {
            sql = `
      SELECT COUNT(*) AS TOTAL
      FROM DB_ACTIVIDADXALERTA
      WHERE ID_ACTIVIDADES = ?
        AND ALE_ID = ?`;

            const result = await cds.run(sql, [idAct, idAlertas]);
            const total = result[0].TOTAL;

            return total > 0;
        } catch (e) {
            return false;
        }
    };

    async function getListActividadesDisponibles(idAlertas) {

        let sql
        let output = [];

        try {
            sql = `SELECT
           ID_ACTIVIDADES,
           NOMBRE
           FROM
           DB_ACTIVIDADES
           ORDER BY
           NOMBRE ASC`;

            const result = await cds.run(sql);

            for (const glistact of result) {
                let record = {};
                record.ID_ACTIVIDAD = glistact.ID_ACTIVIDADES
                record.ACTIVIDAD = glistact.NOMBRE
                record.SELECTED = await getSelectedActividades(glistact.ID_ACTIVIDADES, idAlertas)
                record.ID_ALERTA = idAlertas

                output.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListActividadesDisponibles", query: sql }
        }
        return output;
    };

    this.on('getListActividades', async (req) => {
        try {
            const { idAlertas } = req.data;
            return await getListActividadesDisponibles(idAlertas);
        } catch (e) {
            req.reject(500, e.message);
        }
    }); //getListActividades

    async function deleteTipDoc(idAlertas) {
        let sql;

        try {
            sql = `
        DELETE FROM
        DB_TIPODOCUMENTOXALERTA
        WHERE ALE_ID = ?`;

            await cds.run(sql, [idAlertas]);

            return "OK";
        } catch (e) {
            return { error: e.message, accion: "deleteTipDoc", query: sql }
        }
    };

    this.on('updateTipDoc', async (req) => {
        const { idAlertas, tipDocs } = req.data.input;
        const resp = await deleteTipDoc(idAlertas);

        const sql = `
        INSERT INTO DB_TIPODOCUMENTOXALERTA VALUES (?,?,?)`;

        for (const item of tipDocs) {
            const idAlertasTipDoc = await getSequence("ID_TIPODOCUMENTOXALERTA");
            await cds.run(sql, [idAlertasTipDoc, item.ID_TIPO_DOCUMENTO, idAlertas]);
        }
        return resp;
    });

    async function deleteRolesTD(idRol) {
        let sql;
        try {
            sql = `DELETE FROM DB_ROLESXTD WHERE ID_ROLES = ?`;
            await cds.run(sql, [idRol]);

            return "OK";
        } catch (e) {
            return { error: e.message, accion: "deleteRolesTD", query: sql }
        }
    };

    this.on('updateTD', async (req) => {
        const { idRol, tipos } = req.data.input;

        const resp = await deleteRolesTD(idRol);

        const sql = `INSERT INTO DB_ROLESXTD 
        (ID_ROLESXTD, ID_ROLES, ID_TIPO_DOCUMENTO)
        VALUES (?, ?, ?)`;

        for (const t of tipos) {
            const id_tipo_doc = t.ID_TIPO_DOCUMENTO;
            const idRolesTD = await getSequence2("ID_ROLESXTD");
            await cds.run(sql, [idRolesTD, idRol, id_tipo_doc]);
        }

        return resp;
    });

});