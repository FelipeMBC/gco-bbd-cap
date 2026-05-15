const cds = require("@sap/cds");
const crypto = require("crypto");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    const T_ALERTAS = "DB_ALERTAS";
    const T_DESTINATARIOS = "DB_ALERTAS_DESTINATARIO";
    const T_ACTIVIDADES = "DB_ACTIVIDADES";

    const C_ACT_ID = "ID_ACTIVIDADES";
    const C_ACT_NOMBRE = "NOMBRE";

    const SEQ_ALERTA = "ALE_ID";

    this.on("listar", async (req) => {
        const tx = db.tx(req);
        const input = req.data.input || {};

        const search = input.search ? String(input.search).trim() : "";
        const actividad = input.actividad !== undefined && input.actividad !== null && input.actividad !== "" ? Number(input.actividad) : null;
        const estado = input.estado !== undefined && input.estado !== null && input.estado !== "" ? Number(input.estado) : null;

        let sql = `
            SELECT
                A.ALE_ID,
                A.ALE_NOMBRE,
                A.ALE_ASUNTO,
                A.ALE_DESTINATARIO,
                A.ALE_BODY,
                A.ESTADO,
                CASE
                    WHEN A.ESTADO = 1 THEN 'Activo'
                    WHEN A.ESTADO = 2 THEN 'Inactivo'
                    ELSE 'Sin estado'
                END AS ESTADO_TEXTO,
                A.ID_ACTIVIDADXALERTA,
                ACT.${C_ACT_NOMBRE} AS ACTIVIDAD_NOMBRE,
                COUNT(D.ID_ALERTAS_DESTINATARIO) AS TOTAL_DESTINATARIOS
            FROM ${T_ALERTAS} A
            LEFT JOIN ${T_ACTIVIDADES} ACT
                ON ACT.${C_ACT_ID} = A.ID_ACTIVIDADXALERTA
            LEFT JOIN ${T_DESTINATARIOS} D
                ON D.ALE_ID = A.ALE_ID
            WHERE 1 = 1
        `;

        const params = [];

        if (search) {
            sql += `
                AND (
                    UPPER(A.ALE_NOMBRE) LIKE UPPER(?)
                    OR UPPER(A.ALE_ASUNTO) LIKE UPPER(?)
                    OR UPPER(ACT.${C_ACT_NOMBRE}) LIKE UPPER(?)
                )
            `;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (actividad !== null && !Number.isNaN(actividad)) {
            sql += ` AND A.ID_ACTIVIDADXALERTA = ? `;
            params.push(actividad);
        }

        if (estado !== null && !Number.isNaN(estado)) {
            sql += ` AND A.ESTADO = ? `;
            params.push(estado);
        }

        sql += `
            GROUP BY
                A.ALE_ID,
                A.ALE_NOMBRE,
                A.ALE_ASUNTO,
                A.ALE_DESTINATARIO,
                A.ALE_BODY,
                A.ESTADO,
                A.ID_ACTIVIDADXALERTA,
                ACT.${C_ACT_NOMBRE}
            ORDER BY A.ALE_ID DESC
        `;

        try {
            const data = await tx.run(sql, params);

            return [
                {
                    code: 200,
                    data
                }
            ];
        } catch (e) {
            console.log("ERROR listar alertas:", e);

            return [
                {
                    code: 500,
                    data: {
                        accion: "listar",
                        mensaje: e.message,
                        query: sql
                    }
                }
            ];
        }
    });

    this.on("obtener", async (req) => {
        const tx = db.tx(req);
        const input = req.data.input || {};
        const aleId = Number(input.ALE_ID || input.aleId || input.id);

        if (!aleId || Number.isNaN(aleId)) {
            return [
                {
                    code: 400,
                    data: {
                        mensaje: "Debe enviar ALE_ID válido"
                    }
                }
            ];
        }

        const sqlAlerta = `
            SELECT
                A.ALE_ID,
                A.ALE_NOMBRE,
                A.ALE_ASUNTO,
                A.ALE_DESTINATARIO,
                A.ALE_BODY,
                A.ESTADO,
                CASE
                    WHEN A.ESTADO = 1 THEN 'Activo'
                    WHEN A.ESTADO = 2 THEN 'Inactivo'
                    ELSE 'Sin estado'
                END AS ESTADO_TEXTO,
                A.ID_ACTIVIDADXALERTA,
                ACT.${C_ACT_NOMBRE} AS ACTIVIDAD_NOMBRE
            FROM ${T_ALERTAS} A
            LEFT JOIN ${T_ACTIVIDADES} ACT
                ON ACT.${C_ACT_ID} = A.ID_ACTIVIDADXALERTA
            WHERE A.ALE_ID = ?
        `;

        const sqlDestinatarios = `
            SELECT
                ID_ALERTAS_DESTINATARIO,
                ALE_ID,
                CORREO
            FROM ${T_DESTINATARIOS}
            WHERE ALE_ID = ?
            ORDER BY CORREO ASC
        `;

        try {
            const alertas = await tx.run(sqlAlerta, [aleId]);

            if (!alertas || alertas.length === 0) {
                return [
                    {
                        code: 404,
                        data: {
                            mensaje: "No se encontró la alerta"
                        }
                    }
                ];
            }

            const destinatarios = await tx.run(sqlDestinatarios, [aleId]);

            return [
                {
                    code: 200,
                    data: {
                        ...alertas[0],
                        DESTINATARIOS: destinatarios
                    }
                }
            ];
        } catch (e) {
            console.log("ERROR obtener alerta:", e);

            return [
                {
                    code: 500,
                    data: {
                        accion: "obtener",
                        mensaje: e.message
                    }
                }
            ];
        }
    });

    this.on("crear", async (req) => {
        const tx = db.tx(req);
        const input = req.data.input || {};

        const validacion = validarPayload(input, false);

        if (validacion.code !== 200) {
            return [validacion];
        }

        const aleNombre = String(input.ALE_NOMBRE).trim();
        const aleAsunto = String(input.ALE_ASUNTO).trim();
        const aleBody = String(input.ALE_BODY).trim();
        const estado = input.ESTADO !== undefined && input.ESTADO !== null && input.ESTADO !== "" ? Number(input.ESTADO) : 1;
        const idActividad = Number(input.ID_ACTIVIDADXALERTA);
        const destinatarios = normalizarDestinatarios(input.DESTINATARIOS);
        const aleDestinatario = destinatarios.length > 0 ? destinatarios[0].substring(0, 100) : "";

        let sql = "";

        try {
            const seqResp = await tx.run(`SELECT "${SEQ_ALERTA}".NEXTVAL AS ID FROM DUMMY`);
            const aleId = Number(seqResp[0].ID);

            sql = `
                INSERT INTO ${T_ALERTAS}
                (
                    ALE_ID,
                    ALE_NOMBRE,
                    ALE_ASUNTO,
                    ALE_DESTINATARIO,
                    ALE_BODY,
                    ESTADO,
                    ID_ACTIVIDADXALERTA
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
            `;

            await tx.run(sql, [
                aleId,
                aleNombre,
                aleAsunto,
                aleDestinatario,
                aleBody,
                estado,
                idActividad
            ]);

            for (const correo of destinatarios) {
                sql = `
                    INSERT INTO ${T_DESTINATARIOS}
                    (
                        ID_ALERTAS_DESTINATARIO,
                        ALE_ID,
                        CORREO
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?
                    )
                `;

                await tx.run(sql, [
                    crypto.randomUUID(),
                    aleId,
                    correo
                ]);
            }

            await tx.commit();

            return [
                {
                    code: 200,
                    data: {
                        mensaje: "Alerta creada correctamente",
                        ALE_ID: aleId
                    }
                }
            ];
        } catch (e) {
            await tx.rollback();

            console.log("ERROR crear alerta:", e);

            return [
                {
                    code: 500,
                    data: {
                        accion: "crear",
                        mensaje: e.message,
                        query: sql
                    }
                }
            ];
        }
    });

    this.on("actualizar", async (req) => {
        const tx = db.tx(req);
        const input = req.data.input || {};

        const validacion = validarPayload(input, true);

        if (validacion.code !== 200) {
            return [validacion];
        }

        const aleId = Number(input.ALE_ID || input.aleId || input.id);
        const aleNombre = String(input.ALE_NOMBRE).trim();
        const aleAsunto = String(input.ALE_ASUNTO).trim();
        const aleBody = String(input.ALE_BODY).trim();
        const estado = input.ESTADO !== undefined && input.ESTADO !== null && input.ESTADO !== "" ? Number(input.ESTADO) : 1;
        const idActividad = Number(input.ID_ACTIVIDADXALERTA);
        const destinatarios = normalizarDestinatarios(input.DESTINATARIOS);
        const aleDestinatario = destinatarios.length > 0 ? destinatarios[0].substring(0, 100) : "";

        let sql = "";

        try {
            const existe = await tx.run(
                `
                    SELECT ALE_ID
                    FROM ${T_ALERTAS}
                    WHERE ALE_ID = ?
                `,
                [aleId]
            );

            if (!existe || existe.length === 0) {
                await tx.rollback();

                return [
                    {
                        code: 404,
                        data: {
                            mensaje: "No se encontró la alerta que intenta actualizar"
                        }
                    }
                ];
            }

            sql = `
                UPDATE ${T_ALERTAS}
                SET
                    ALE_NOMBRE = ?,
                    ALE_ASUNTO = ?,
                    ALE_DESTINATARIO = ?,
                    ALE_BODY = ?,
                    ESTADO = ?,
                    ID_ACTIVIDADXALERTA = ?
                WHERE ALE_ID = ?
            `;

            await tx.run(sql, [
                aleNombre,
                aleAsunto,
                aleDestinatario,
                aleBody,
                estado,
                idActividad,
                aleId
            ]);

            sql = `
                DELETE FROM ${T_DESTINATARIOS}
                WHERE ALE_ID = ?
            `;

            await tx.run(sql, [aleId]);

            for (const correo of destinatarios) {
                sql = `
                    INSERT INTO ${T_DESTINATARIOS}
                    (
                        ID_ALERTAS_DESTINATARIO,
                        ALE_ID,
                        CORREO
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?
                    )
                `;

                await tx.run(sql, [
                    crypto.randomUUID(),
                    aleId,
                    correo
                ]);
            }

            await tx.commit();

            return [
                {
                    code: 200,
                    data: {
                        mensaje: "Alerta actualizada correctamente",
                        ALE_ID: aleId
                    }
                }
            ];
        } catch (e) {
            await tx.rollback();

            console.log("ERROR actualizar alerta:", e);

            return [
                {
                    code: 500,
                    data: {
                        accion: "actualizar",
                        mensaje: e.message,
                        query: sql
                    }
                }
            ];
        }
    });

    this.on("eliminar", async (req) => {
        const tx = db.tx(req);
        const input = req.data.input || {};
        const aleId = Number(input.ALE_ID || input.aleId || input.id);

        if (!aleId || Number.isNaN(aleId)) {
            return [
                {
                    code: 400,
                    data: {
                        mensaje: "Debe enviar ALE_ID válido"
                    }
                }
            ];
        }

        let sql = "";

        try {
            const existe = await tx.run(
                `
                    SELECT ALE_ID
                    FROM ${T_ALERTAS}
                    WHERE ALE_ID = ?
                `,
                [aleId]
            );

            if (!existe || existe.length === 0) {
                await tx.rollback();

                return [
                    {
                        code: 404,
                        data: {
                            mensaje: "No se encontró la alerta que intenta eliminar"
                        }
                    }
                ];
            }

            sql = `
                DELETE FROM ${T_DESTINATARIOS}
                WHERE ALE_ID = ?
            `;

            await tx.run(sql, [aleId]);

            sql = `
                DELETE FROM ${T_ALERTAS}
                WHERE ALE_ID = ?
            `;

            await tx.run(sql, [aleId]);

            await tx.commit();

            return [
                {
                    code: 200,
                    data: {
                        mensaje: "Alerta eliminada correctamente",
                        ALE_ID: aleId
                    }
                }
            ];
        } catch (e) {
            await tx.rollback();

            console.log("ERROR eliminar alerta:", e);

            return [
                {
                    code: 500,
                    data: {
                        accion: "eliminar",
                        mensaje: e.message,
                        query: sql
                    }
                }
            ];
        }
    });

    this.on("actividades", async (req) => {
        const tx = db.tx(req);

        const sql = `
            SELECT
                ID_ACTIVIDADES,
                NOMBRE,
                ID_ACCION
            FROM ${T_ACTIVIDADES}
            ORDER BY NOMBRE ASC
        `;

        try {
            const data = await tx.run(sql);

            return [
                {
                    code: 200,
                    data
                }
            ];
        } catch (e) {
            console.log("ERROR actividades:", e);

            return [
                {
                    code: 500,
                    data: {
                        accion: "actividades",
                        mensaje: e.message,
                        query: sql
                    }
                }
            ];
        }
    });

    function validarPayload(input, requiereId) {
        const aleId = Number(input.ALE_ID || input.aleId || input.id);
        const aleNombre = input.ALE_NOMBRE !== undefined && input.ALE_NOMBRE !== null ? String(input.ALE_NOMBRE).trim() : "";
        const aleAsunto = input.ALE_ASUNTO !== undefined && input.ALE_ASUNTO !== null ? String(input.ALE_ASUNTO).trim() : "";
        const aleBody = input.ALE_BODY !== undefined && input.ALE_BODY !== null ? String(input.ALE_BODY).trim() : "";
        const estado = input.ESTADO !== undefined && input.ESTADO !== null && input.ESTADO !== "" ? Number(input.ESTADO) : 1;
        const idActividad = Number(input.ID_ACTIVIDADXALERTA);
        const destinatarios = normalizarDestinatarios(input.DESTINATARIOS);

        if (requiereId && (!aleId || Number.isNaN(aleId))) {
            return {
                code: 400,
                data: {
                    campo: "ALE_ID",
                    mensaje: "Debe enviar ALE_ID válido"
                }
            };
        }

        if (!aleNombre) {
            return {
                code: 400,
                data: {
                    campo: "ALE_NOMBRE",
                    mensaje: "Debe ingresar el nombre de la alerta"
                }
            };
        }

        if (aleNombre.length > 100) {
            return {
                code: 400,
                data: {
                    campo: "ALE_NOMBRE",
                    mensaje: "El nombre no puede superar los 100 caracteres"
                }
            };
        }

        if (!aleAsunto) {
            return {
                code: 400,
                data: {
                    campo: "ALE_ASUNTO",
                    mensaje: "Debe ingresar el asunto"
                }
            };
        }

        if (aleAsunto.length > 100) {
            return {
                code: 400,
                data: {
                    campo: "ALE_ASUNTO",
                    mensaje: "El asunto no puede superar los 100 caracteres"
                }
            };
        }

        if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ]+$/.test(aleAsunto)) {
            return {
                code: 400,
                data: {
                    campo: "ALE_ASUNTO",
                    mensaje: "El asunto solo debe contener letras, números y espacios"
                }
            };
        }

        if (!aleBody) {
            return {
                code: 400,
                data: {
                    campo: "ALE_BODY",
                    mensaje: "Debe ingresar el mensaje"
                }
            };
        }

        if (aleBody.length > 5000) {
            return {
                code: 400,
                data: {
                    campo: "ALE_BODY",
                    mensaje: "El mensaje no puede superar los 5000 caracteres"
                }
            };
        }

        if (![1, 2].includes(estado)) {
            return {
                code: 400,
                data: {
                    campo: "ESTADO",
                    mensaje: "El estado debe ser 1 Activo o 2 Inactivo"
                }
            };
        }

        if (!idActividad || Number.isNaN(idActividad)) {
            return {
                code: 400,
                data: {
                    campo: "ID_ACTIVIDADXALERTA",
                    mensaje: "Debe seleccionar una actividad válida"
                }
            };
        }

        if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
            return {
                code: 400,
                data: {
                    campo: "DESTINATARIOS",
                    mensaje: "Debe ingresar al menos un destinatario"
                }
            };
        }

        for (const correo of destinatarios) {
            if (!validarCorreo(correo)) {
                return {
                    code: 400,
                    data: {
                        campo: "DESTINATARIOS",
                        mensaje: `El correo ${correo} no es válido`
                    }
                };
            }
        }

        return {
            code: 200,
            data: {
                mensaje: "Validación correcta"
            }
        };
    }

    function normalizarDestinatarios(destinatarios) {
        if (!Array.isArray(destinatarios)) {
            return [];
        }

        return destinatarios
            .map((item) => {
                if (typeof item === "string") {
                    return item.trim().toLowerCase();
                }

                if (item && item.CORREO) {
                    return String(item.CORREO).trim().toLowerCase();
                }

                if (item && item.correo) {
                    return String(item.correo).trim().toLowerCase();
                }

                return "";
            })
            .filter((correo, index, array) => correo && array.indexOf(correo) === index);
    }

    function validarCorreo(correo) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    }
});