
///////////////////
///////ROLES///////
///////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    async function getSequence(nombreSequence) {
        let sValue = false;
        try {
            const sql = `SELECT ${nombreSequence}.NEXTVAL AS ID FROM DUMMY`;
            const result = await cds.run(sql);

            for (const rs of result) {
                sValue = rs.ID
            }

            return sValue;
        } catch (e) {
            return false;
        }
    };

    async function getAccionesDisponibles(idRol) {
        let sql;
        let outPut = []

        try {
            sql = `SELECT ID_ACCION,
                      NOMBRE FROM DB_ACCION
               WHERE ID_ACCION NOT IN (SELECT ID_ACCION FROM DB_ROLESXACCIONES WHERE ID_ROLES = ?)`;

            const result = await cds.run(sql, [idRol]);

            for (const rs of result) {
                let record = {};
                record.IDROL = idRol;
                record.IDACCION = rs.ID_ACCION;
                record.NOMBREACCION = rs.NOMBRE;

                outPut.push(record);
            }
            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getAccionesDisponibles", query: sql }
        }
    };

    this.on('getAccionesDisponibles', async (req) => {
        const { idRol } = req.data;
        const visualizadores = await getAccionesDisponibles(idRol);
        return visualizadores;
    }); //getAccionesDisponibles

    async function getSelectedRolesUser(idRoles, idRol) {
        try {
            const sql = `SELECT COUNT(*) AS ID FROM DB_ROLESXUSUARIOS
                    WHERE ID_ROLES = ? AND ID_USUARIO = ?`;
            const result = await cds.run(sql, [idRoles, idRol]);

            for (const rs of result) {
                if (rs.ID > 0) {
                    return true;
                } else {
                    return false;
                }
            }
        } catch (e) {
            return false;
        }

    };

    async function getListRolesDisponibles() {
        let sql;
        let str = "";
        let output = [];
        try {
            sql = `
      SELECT ID_ROLES, DESCRIPCION, NOMBRE, NOMBRE_TIPO_DOCUMENTO
      FROM DB_ROLES
      WHERE ESTADO = 'Activo'
      ORDER BY ID_ROLES ASC`;

            const result = await cds.run(sql);

            for (const rs of result) {
                let record = {};
                record.ID_ROLES = rs.ID_ROLES;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.SELECTED = await getSelectedRolesUser(rs.ID_ROLES);
                record.NOMBRE = rs.NOMBRE;
                record.NOMBRE_TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;
                if (record.SELECTED) {
                    str = str + rs.NOMBRE + ",";
                }
                record.STR = str;

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getListRolesDisponibles", query: sql }
        }
    };

    async function getSelectedUser(idUser) {
        try {
            const sql = `SELECT COUNT(*) AS ID FROM DB_ROLESXUSUARIOS
                                                                                                                                                                                                                                                                                                                                                                                                                                                                           WHERE ID_ROLES = ? AND ID_USUARIO = ?`;
            const result = await cds.run(sql, [idRol, idUser]);

            for (const rs of result) {
                if (rs.ID > 0) {
                    return true;
                } else {
                    return false;
                }
            }
        } catch (e) {
            return false;
        }
    };

    async function getListUserDisponibles() {
        let outPut = []
        try {
            const sql = `SELECT USU.USERNAME, USU.NOMBRE, USU.ID_USUARIO
        FROM DB_USUARIO USU`;
            const result = await cds.run(sql)

            for (const rs of result) {
                let record = {};
                record.USERNAME = rs.USERNAME;
                record.NOMBRE = rs.NOMBRE;
                record.SELECTED = await getSelectedUser(rs.ID_USUARIO);
                record.ID_USUARIO = rs.ID_USUARIO;
                record.ID_ROL = rs.ID_ROL;

                outPut.push(record);
            }
            return outPut;
        } catch (e) {
            return { error: e.message, accion: "getListUserDisponibles" }
        }
    };

    this.on('getListUser', async () => {
        const visualizadores = await getListUserDisponibles();
        return visualizadores;
    }); //getListUser

    async function getAcciones(idRol) {
        let sql;
        let output = [];
        try {
            sql = `SELECT ROL.NOMBRE AS NOMBREROL,
                    ACC.NOMBRE AS NOMBREACCION,
                    ROLACC.ID_ROLESXACCIONES AS ID_ROLESXACCIONES
                    FROM DB_ACCION AS ACC
                INNER JOIN DB_ROLESXACCIONES ROLACC
                 ON ROLACC.ID_ACCION = ACC.ID_ACCION
                INNER JOIN DB_ROLES ROL
                 ON ROLACC.ID_ROLES = ROL.ID_ROLES
                WHERE ROLACC.ID_ROLES = ?`;

            const result = await cds.run(sql, [idRol]);

            for (const rs of result) {
                let record = {};
                record.ID = rs.ID_ROLESXACCIONES;
                record.NOMBREROL = rs.NOMBREROL;
                record.NOMBREACCION = rs.NOMBREACCION;

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getAcciones", query: sql }
        }

    };

    this.on('getAcciones', async (req) => {
        const { idRol } = req.data;
        const visualizadores = await getAcciones(idRol);
        return visualizadores;

    }); //getAcciones

    this.on('getListNodos', async (req) => {
        const { idRol } = req.data;
        let output = [];

        let sql;
        try {
            sql = `SELECT TD.ID_TIPO_DOCUMENTO AS ID_TIPO_DOCUMENTO,
                            TD.NOMBRE AS NOMBRE
                            FROM DB_ROLESXTD AS ROLESXTD
                     INNER JOIN DB_TIPO_DOCUMENTO TD 
                      ON TD.ID_TIPO_DOCUMENTO = ROLESXTD.ID_TIPO_DOCUMENTO
                     WHERE ROLESXTD.ID_ROLES = ?`;
            const result = await cds.run(sql, [idRol]);

            for (const rs of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = rs.ID_TIPO_DOCUMENTO;
                record.SELECTED = true;
                record.NOMBRE = rs.NOMBRE;

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getListNodos" }
        }
    }); //getListNodos

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
        const { json, idRol } = req.data.input;

        let cant = json.length;
        let sql;

        let resp = await deleteRolesTD(idRol);

        for (let t = 0; t < cant; t++){
            const id_TipoDoc = json[t].ID_TIPO_DOCUMENTO;
            const idRolesTD = await getSequence("ID_ROLESXTD");

            sql = `INSERT INTO DB_ROLESXTD VALUES (?, ?, ?)`;
            await cds.run(sql, [idRolesTD, idRol, id_TipoDoc]);
        }

        return resp;
    }); //updateTD

    async function deleteRoles(idRol) {
        let sql;
        try {
            sql = `DELETE FROM DB_ROLESXUSUARIOS WHERE ID_ROLES = ?`;
            await cds.run(sql, [idRol]);

            return "OK";
        } catch (e) {
            return { error: e.message, accion: "deleteRoles", query: sql }
        }
    };

    this.on('update', async (req) => {
        const { json, idRol } = req.data.input;

        let cant = json.length
        let sql;

        let resp = await deleteRoles();

        for (let j = 0; j < cant; j++) {
            let id_usuario = json[j].ID_USUARIO;
            let idRolesUsu = await getSequence("ID_ROLESXUSUARIO");

            sql = `INSERT INTO DB_ROLESXUSUARIOS VALUES (?, ?, ?)`;
            await cds.run(sql, [idRolesUsu, idRol, id_usuario]);
        }

        return resp;

    }); //update

});