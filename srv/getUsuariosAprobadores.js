const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    async function getUserAprobador() {
        let sql;
        let outPut = [];

        try {
            sql = `SELECT DISTINCT USU.ID_USUARIO, USU.NOMBRE, USU.USERNAME, USU.CORREO, USU.APELLIDO FROM DB_ROLESXUSUARIOS RXU
               INNER JOIN DB_ROLESXACCIONES RXA ON RXU.ID_ROLES = RXA.ID_ROLES
               INNER JOIN DB_USUARIO USU ON USU.ID_USUARIO = RXU.ID_USUARIO
               INNER JOIN DB_ACCION ACC ON ACC.ID_ACCION = RXA.ID_ACCION
               WHERE ACC.ID_ACCION = 1 ORDER BY USU.NOMBRE ASC, USU.APELLIDO ASC`;

            const result = await cds.run(sql);
            for (const gapro of result) {
                let record = {};
                record.ID_USUARIO = Number(gapro.ID_USUARIO);
                record.NOMBRE = gapro.NOMBRE;
                record.USERNAME = gapro.USERNAME;
                record.EMAIL = gapro.CORREO;
                record.APELLIDO = gapro.APELLIDO;

                outPut.push(record);
            }
        } catch (e) {
            return { error: e.message, accion: "getUserAprobador", query: sql };
        }
        return outPut;
    };

    function orderFecha(fecha) {
        if (!fecha) return fecha;

        const value = String(fecha).split("T")[0];

        if (!value.includes("-")) return value;

        const [year, month, day] = value.split("-");
        return `${day}-${month}-${year}`;
    }

    async function getSuplentes() {
        let sql;
        const outPut = [];

        try {
            sql = `SELECT
            ID_SUPLENTE,
            USUARIO_TITULAR,
            USUARIO_REEMPLAZO,
            FECHA_INICIO,
            FECHA_TERMINO,
            ID_USUARIO_SUPLENTE,
            ID_EST_LIB,
            ID_USUARIO_TITULAR FROM DB_SUPLENTE WHERE ESTADO = 1`;

            const result = await cds.run(sql);

            for (const rs of result) {
                const fechaActual = new Date();
                const fechaTermino = new Date(rs.FECHA_TERMINO);
                const resultado = fechaActual.getTime() < fechaTermino.getTime();

                if (resultado) {
                    const record = {};

                    record.USUARIO_TITULAR = rs.USUARIO_TITULAR;
                    record.USUARIO_REEMPLAZO = rs.USUARIO_REEMPLAZO;
                    record.FECHA_INICIO = orderFecha(rs.FECHA_INICIO);
                    record.FECHA_TERMINO = orderFecha(rs.FECHA_TERMINO);
                    record.ID_USUARIO_SUPLENTE = rs.ID_USUARIO_SUPLENTE;
                    record.ID_EST_LIB = rs.ID_EST_LIB;
                    record.ID_USUARIO_TITULAR = rs.ID_USUARIO_TITULAR;
                    record.ID_SUPLENTE = rs.ID_SUPLENTE;

                    outPut.push(record);
                } else {
                    const sqlUpdate = `UPDATE DB_SUPLENTE SET ESTADO = 2 WHERE ID_SUPLENTE = ?`;
                    await cds.run(sqlUpdate, [rs.ID_SUPLENTE]);
                }
            }

            return outPut;

        } catch (e) {
            return {error: e.message, accion: "getSuplentes", query: sql};
        }
    }

    this.on("getSuplentes", async () => {
        return await getSuplentes();
    });

    this.on('getTD', async () => {
        let sql;
        let outPut = [];
        try {
            sql = `
        SELECT DISTINCT TD.ID_TIPO_DOCUMENTO, TD.NOMBRE, ESTLIB.ID_EST_LIB
        FROM DB_ESTRATEGIA_LIBERACION AS ESTLIB
        INNER JOIN DB_TIPO_DOCUMENTO  AS TD
          ON ESTLIB.ID_TIPO_DOCUMENTO = TD.ID_TIPO_DOCUMENTO
        WHERE ESTLIB.ESTADO = 1
        ORDER BY TD.NOMBRE ASC`;

            const result = await cds.run(sql);
            for (const gtd of result) {
                let record = {};
                record.ID_TIPO_DOCUMENTO = gtd.ID_TIPO_DOCUMENTO,
                    record.NOMBRE = gtd.NOMBRE,
                    record.ID_EST_LIB = gtd.ID_EST_LIB,

                    outPut.push(record);

            }
        } catch (e) {
            return { error: e.message, accion: "getTD", query: sql };
        }
        return outPut;
    });

    this.on('getNivel', async (req) => {
        const { id } = req.data;
        let sql;
        let outPut = [];

        try {
            sql = `SELECT NIV.NIVEL AS NIVEL,
                          NIV.NOMBREAPROBADOR AS NOMBRE_APROBADOR,
                          NIV.ID_USUARIO AS ID_USUARIO,
                          SUP.ID_SUPLENTE AS ID_SUPLENTE
                    FROM DB_NIVELES AS NIV
                LEFT JOIN DB_SUPLENTE AS SUP
                    ON SUP.ID_USUARIO_TITULAR = NIV.ID_USUARIO
                    AND SUP.ESTADO = 1
                    AND SUP.ID_EST_LIB = NIV.ID_EST_LIB
                WHERE NIV.ID_EST_LIB = ? ORDER BY NIV.NIVEL ASC`;

            const result = await cds.run(sql, [id]);

            for (const rs of result) {
                if (rs.ID_SUPLENTE == null) {
                    let record = {};
                    record.NIVEL = rs.NIVEL;
                    record.TEXTO = ' Nivel: ';
                    record.USUARIO = rs.NOMBRE_APROBADOR;
                    record.ID_USUARIO = rs.ID_USUARIO;

                    outPut.push(record);
                }
            }
        } catch (e) {
            return { error: e.message, accion: "getNivel", query: sql };
        }

        return outPut;
    });

    this.on('get', async () => {
        const visualizadores = await getUserAprobador();
        return visualizadores;
    });

});