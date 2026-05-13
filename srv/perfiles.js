
///////////////////
///////PERFILES////
///////////////////

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
        console.log("Esto es sValue:", sValue)
        return sValue

    };

    async function getSelectedUser(idPerfil, idUser) {
        console.log(idPerfil, idUser)
        try {
            const sql = `SELECT COUNT (*) AS ID FROM DB_PERFILESXUSUARIOS 
                     WHERE ID_PERFILES = ?
                     AND ID_USUARIO = ?`;
            const result = await cds.run(sql, [idPerfil, idUser]);

            return (result?.[0]?.ID ?? 0) > 0;

        } catch (e) {
            return false;
        }
    };

    async function getListUserDisponibles(idPerfil) {
        let sql;
        let output = [];

        try {
            sql = `SELECT USU.USERNAME, USU.NOMBRE, USU.ID_USUARIO 
               FROM DB_USUARIO USU`;

            const result = await cds.run(sql);

            for (const gl of result) {
                let record = {};
                record.USERNAME = gl.USERNAME;
                record.NOMBRE = gl.NOMBRE;
                record.SELECTED = await getSelectedUser(gl.ID_USUARIO);
                record.ID_USUARIO = gl.ID_USUARIO;
                record.ID_ROL = idPerfil;

                output.push(record)
            }
        } catch (e) {
            return { error: e.message, accion: "getListUserDisponibles", query: sql }
        }
        return output;
    };

    this.on('getListUser', async () => {
        const visualizadores = await getListUserDisponibles();
        return visualizadores;
    }); //getListUser

    async function deletePerfilesUser(idPerfil) {
        let sql;

        try {
            sql = `DELETE FROM DB_PERFILESXUSUARIOS WHERE ID_USUARIO = ?`;
            const result = await cds.run(sql, [idPerfil]);

            return "OK"

        } catch (e) {
            return { error: e, accion: "deletePerfilesUser", query: sql };
        }
    };

    this.on('updatePerfilesUsuario', async (req) => {
        const { json, idPerfil } = req.data.input;

        let cant = json.length;
        let sql;

        let resp = await deletePerfilesUser(idPerfil);

        for (let j = 0; j < cant; j++) {
            const id_perfil = json[j].ID_PERFILES;
            const id_usuario = json[j].ID_USUARIO;

            const idPerfilesUsu = await getSequence("ID_PERFILESXUSUARIO");
            sql = `INSERT INTO DB_PERFILESXUSUARIOS VALUES (?, ?, ?)`;

            await cds.run(sql, [idPerfilesUsu, id_perfil, id_usuario]);
        }

        return resp;

    }); //updatePerfilesUsuario

    async function deleteRoles(idPerfil) {
        let sql;
        try {
            sql = `DELETE FROM DB_NODOSXPERFILES
               WHERE ID_PERFILES = ?`;
            await cds.run(sql, [idPerfil]);

            return "OK";
        } catch (e) {
            return { error: e.message, accion: "deleteRoles", query: sql }
        }
    };

    this.on('update', async function (req) {
        const { json, idPerfil } = req.data.input;

        let cant = json.length;
        let sql;

        let resp = await deleteRoles(idPerfil);

        for (let j = 0; j < cant; j++) {
            const id_cat = json[j].ID_CATEGORIA;

            let idPerfilesUsu = await getSequence("ID_NODOSXPERFILES");
            sql = `INSERT INTO DB_NODOSXPERFILES VALUES (?, ?, ?)`;
            await cds.run(sql, [idPerfilesUsu, id_cat, idPerfil]);
        }

        return resp;
    }); //update

    async function getPortales(idPerfil) {
        let sql;
        let output = [];

        try {
            sql = `SELECT CAT.ID_CATEGORIA, CAT.TITULO FROM DB_NODOSXPERFILES NXP 
                INNER JOIN DB_CATEGORIA CAT
                 ON CAT.ID_CATEGORIA = NXP.ID_CATEGORIA 
                WHERE NXP.ID_PERFILES = ?`;
            const result = await cds.run(sql, [idPerfil]);

            for (const gp of result) {
                let record = {};
                record.ID_CATEGORIA = gp.ID_CATEGORIA;
                record.SELECTED = true;
                record.TITULO = gp.TITULO;

                output.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getPortales", query: sql }
        }
        return output;
    };

    this.on('getListNodos', async (req) => {
        const { idPerfil } = req.data;
        const visualizadores = await getPortales(idPerfil)
        return visualizadores
    }); //getListNodos

    this.on('getValidacion', async (req) => {
        const { idUser, idNodo } = req.data;
        let sql;
        let body = "";

        try {
            sql = `SELECT COUNT(*) AS TOTAL
            FROM DB_PERFILESXUSUARIOS AS PXU
            INNER JOIN DB_NODOSXPERFILES AS NXP
             ON NXP.ID_PERFILES = PXU.ID_PERFILES
            WHERE PXU.ID_USUARIO = ? AND NXP.ID_CATEGORIA = ?`;

            const result = await cds.run(sql, [idUser, idNodo]);

            for (const rs of result){
                if (rs.TOTAL > 0){
                    body = true;
                }else{
                    body = false;
                }
            }

        } catch (e) {
            return {error: e, accion: "getValidacion", resultado: body};
        }

        return body;
    });
});