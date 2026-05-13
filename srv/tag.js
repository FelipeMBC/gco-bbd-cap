
///////////
////TAG////
///////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    async function getSequence(nombreSequence) {
        let sValue = false;
        try {
            const sql = `SELECT ${nombreSequence}.nextval AS ID from DUMMY`;
            const result = await cds.run(sql)

            for (const gs of result) {
                sValue = gs.ID;
            }
        } catch (e) {
            return false;
        }
        return sValue
    };

    async function getSelectedTag(idTag, idUser) {
        let sql;

        try {
            sql = `SELECT COUNT(*) AS ID FROM DB_TAGXPORTAL
               WHERE ID_TAG = ? AND ID_CATEGORIA = ?`;
            const result = await cds.run(sql, [idTag, idUser]);

            return (result?.[0]?.ID ?? 0) > 0;

        } catch (e) {
            return false;
        }
    };

    async function getListUserDisponibles() {
        let sql;
        let output = [];

        try {
            sql = `SELECT ID_CATEGORIA, TITULO FROM DB_CATEGORIA 
               WHERE APP = 'Portal' AND ESTADO <> 'Inactivo' AND ID_PADRE = 0`;
            const result = await cds.run(sql);

            for (const gl of result) {
                let record = {};
                record.ID_CATEGORIA = gl.ID_CATEGORIA;
                record.NOMBRE = gl.TITULO;
                record.SELECTED = await getSelectedTag(gl.ID_CATEGORIA);

                output.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListUserDisponibles2", query: sql }
        }
        return output;
    };

    this.on('getListUser', async () => {
        const visualizadores = await getListUserDisponibles();
        return visualizadores;
    }); //getListUser

    async function deleteRolesUser(idTag) {
        let sql;

        try {
            sql = `DELETE FROM DB_TAGXPORTAL
               WHERE ID_TAG = ?`;
            await cds.run(sql, [idTag]);

            return "OK"
        } catch (e) {
            return { error: e.message, accion: "deleteRolesUser", query: sql }
        }
    };

    this.on('updateTagPortales', async (req) => {
        const { idTag, json } = req.data.input;
        const resp = await deleteRolesUser(idTag);

        for (let j = 0; j < json.length; j++) {
            const id_Portal = json[j].ID_CATEGORIA;

            const idTagesUsu = await getSequence("ID_TAGXPORTAL");
            console.log(idTagesUsu)
            const sql = `INSERT INTO DB_TAGXPORTAL VALUES (?, ?, ?)`;

            await cds.run(sql, [idTagesUsu, idTag, id_Portal]);
        }

        return resp;
    }); //updateTagPortales

    async function deleteTagTD(idTD) {
        let sql;

        try {
            sql = `DELETE FROM DB_TAGXTD
               WHERE ID_TIPO_DOCUMENTO = ?`;
            await cds.run(sql, [idTD]);

            return "OK"
        } catch (e) {
            return { error: e.message, accion: "deleteTagTD", query: sql }
        }
    };

    this.on('updateTagTD', async (req) => {
        const { idTD, json } = req.data.input;
        const resp = await deleteTagTD(idTD);
        const cant = json.length;

        for (let j = 0; j < cant; j++) {
            const ID_TAG = json[j].ID_TAG;

            const idTagesUsu = await getSequence("ID_TAGXTD");
            console.log(idTagesUsu)
            const sql = `
      INSERT INTO DB_TAGXTD
      VALUES (?, ?, ?)`;

            await cds.run(sql, [idTagesUsu, ID_TAG, idTD]);
        }
        return resp;
    });

    async function getSelectedTagXTD(idTD, idUser) {
        let sql;

        try {
            sql = `SELECT COUNT(*) AS ID FROM DB_TAGXTD
               WHERE ID_TIPO_DOCUMENTO = ? AND ID_TAG = ?`;
            const result = await cds.run(sql, [idTD, idUser]);

            return (result?.[0]?.ID ?? 0) > 0;

        } catch (e) {
            return false;
        }
    };

    async function getListTagXTDDisponibles() {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT ID_TAG, NOMBRE_TAG FROM DB_TAG
               WHERE ESTADO <> 'Inactivo'`;
            const result = await cds.run(sql);

            for (const gl of result) {
                let record = {};
                record.ID_TAG = gl.ID_TAG;
                record.NOMBRE_TAG = gl.NOMBRE_TAG;
                record.SELECTED = await getSelectedTagXTD(gl.ID_TAG);

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getListTagXTDDisponibles", query: sql }
        }
        return outPut;
    };

    this.on('getListTagXTD', async () => {
        const visualizadores = await getListTagXTDDisponibles();
        return visualizadores;
    }); //getListTagXTD

});
