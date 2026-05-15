
///////////////////////////
///////CREACIONUSUARIOS////
///////////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

    this.before("CREATE", "TAG", async (req) => {
        const rs = await cds.run(`SELECT "ID_TAG".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_TAG = rs[0].NEXT_ID;
    });

    this.before("CREATE", "USUARIO", async (req) => {
        const rs = await cds.run(`SELECT "ID_USUARIO".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_USUARIO = rs[0].NEXT_ID;
    });

    this.before("CREATE", "USUARIO_PORTAL", async (req) => {
        const rs = await cds.run(`SELECT "ID_USUARIO_PORTAL".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_USUARIO_PORTAL = rs[0].NEXT_ID;
    });

    this.before("CREATE", "ADMINISTRADOR_PORTAL", async (req) => {
        const rs = await cds.run(`SELECT "ID_ADMINISTRADOR_PORTAL".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_ADMINISTRADOR_PORTAL = rs[0].NEXT_ID;
    });

    this.before("CREATE", "PERFILESXUSUARIOS", async (req) => {
        const rs = await cds.run(`SELECT "ID_PERFILESXUSUARIO".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_PERFILESXUSUARIO = rs[0].NEXT_ID;
    });

    this.before("CREATE", "ROLESXUSUARIOS", async (req) => {
        const rs = await cds.run(`SELECT "ID_ROLESXUSUARIO".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_ROLESXUSUARIO = rs[0].NEXT_ID;
    });

    this.before("CREATE", "ROLES", async (req) => {
        const rs = await cds.run(`SELECT "ID_ROLES".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_ROLES = rs[0].NEXT_ID;
    });

    this.before("CREATE", "PERFILES", async (req) => {
        const rs = await cds.run(`SELECT "ID_PERFILES".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_PERFILES = rs[0].NEXT_ID;
    });

    this.before("CREATE", "ROLESXACCIONES", async (req) => {
        const rs = await cds.run(`SELECT "ID_ROLESXACCIONES".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_ROLESXACCIONES = rs[0].NEXT_ID;
    });

    this.before("CREATE", "ROLESXTD", async (req) => {
        const rs = await cds.run(`SELECT "ID_ROLESXTD".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_ROLESXTD = rs[0].NEXT_ID;
    });

    this.before("CREATE", "NODOSXPERFILES", async (req) => {
        const rs = await cds.run(`SELECT "ID_NODOSXPERFILES".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_NODOSXPERFILES = rs[0].NEXT_ID;
    });

    this.before("CREATE", "DETALLE_VISUALIZACION", async (req) => {
        const rs = await cds.run(`SELECT "ID_DETALLE_VISUALIZACION".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_DETALLE_VISUALIZACION = rs[0].NEXT_ID;
    });

    this.before("CREATE", "SUPLENTE", async (req) => {
        const rs = await cds.run(`SELECT "ID_SUPLENTE".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_SUPLENTE = rs[0].NEXT_ID;
    });

    this.before("CREATE", "PROCESOS", async (req) => {
        const rs = await cds.run(`SELECT "ID_PROCESO".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_PROCESO = rs[0].NEXT_ID;
    });

    this.before("CREATE", "ADM_PORTAL", async (req) => {
        const rs = await cds.run(`SELECT "ID_ADM_PORTAL".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_ADM_PORTAL = rs[0].NEXT_ID;
    });

    this.before("CREATE", "INDEX", async (req) => {
        const rs = await cds.run(`SELECT "ID_INDEX".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_INDEX = rs[0].NEXT_ID;
    });

    this.before("CREATE", "PROP_TIPO_DOC", async (req) => {
        const rs = await cds.run(`SELECT "ID_PROPIEDAD".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_PROPIEDAD = rs[0].NEXT_ID;

    });

    this.before("CREATE", "FAVORITOS", async (req) => {
        const rs = await cds.run(`SELECT "ID_FAVORITOS".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_FAVORITOS = rs[0].NEXT_ID;
    });

    this.before("CREATE", "METADATA", async (req) => {
        const rs = await cds.run(`SELECT "ID_METADATA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_METADATA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "NODOBUSQUEDA", async (req) => {
        const rs = await cds.run(`SELECT "ID_BUSQUEDA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_BUSQUEDA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "PORTALES", async (req) => {
        const rs = await cds.run(`SELECT "ID_SEQ_PORTAL".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_SEQ_PORTAL = rs[0].NEXT_ID;
    });

    this.before("CREATE", "RECIENTES", async (req) => {
        const rs = await cds.run(`SELECT "ID_RECIENTES".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_RECIENTES = rs[0].NEXT_ID;
    });

    this.before("CREATE", "VISITAS", async (req) => {
        const rs = await cds.run(`SELECT "ID_VISITAS".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_VISITAS = rs[0].NEXT_ID;
    });

    this.before("CREATE", "TIPO_DOCUMENTO", async (req) => {
        const rs = await cds.run(`SELECT "ID_TIPO_DOCUMENTO".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_TIPO_DOCUMENTO = rs[0].NEXT_ID;
    });

    this.before("CREATE", "QUERY_MSAP_CATEGORIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_QUERY".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_QUERY = rs[0].NEXT_ID;
    });

    this.before("CREATE", "DOC_OBL", async (req) => {
        const rs = await cds.run(`SELECT "ID_DOC_OBL".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_DOC_OBL = rs[0].NEXT_ID;
    });

    this.before("CREATE", "TAGXPORTAL", async (req) => {
        const rs = await cds.run(`SELECT "ID_TAGXPORTAL".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_TAGXPORTAL = rs[0].NEXT_ID;
    });

    this.before("CREATE", "TRANSFERENCIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_TRANSFERENCIA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_TRANSFERENCIA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "OBJETO_TRANSFERENCIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_OBJETO_TRANSFERENCIA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_OBJETO_TRANSFERENCIA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "FILTRO", async (req) => {
        const rs = await cds.run(`SELECT "ID_FILTRO".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_FILTRO = rs[0].NEXT_ID;
    });

    this.before("CREATE", "CONSULTA_TRANSFERENCIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_CONSULTA_TRANSFERENCIA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_CONSULTA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "FIELD_CONSULTA_TRANSFERENCIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_FIELD_CONSULTA_TRANSFERENCIA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_FIELD_CONSULTA_TRANSFERENCIA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "JOIN_CONSULTA_TRANSFERENCIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_JOIN_CONSULTA_TRANSFERENCIA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_JOIN_CONSULTA_TRANSFERENCIA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "CONDICION_CONSULTA_TRANSFERENCIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_CONDICION_CONSULTA_TRANSFERENCIA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_CONDICION_CONSULTA_TRANSFERENCIA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "METADATA_TRANSFERENCIA", async (req) => {
        const rs = await cds.run(`SELECT "ID_METADATA_TRANSFERENCIA".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_METADATA_TRANSFERENCIA = rs[0].NEXT_ID;
    });

    this.before("CREATE", "METADATA_JOIN", async (req) => {
        const rs = await cds.run(`SELECT "ID_METADATA_JOIN".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_METADATA_JOIN = rs[0].NEXT_ID;
    });

    this.before("CREATE", "METADATA_CONDICION", async (req) => {
        const rs = await cds.run(`SELECT "ID_METADATA_CONDICION".NEXTVAL AS NEXT_ID FROM DUMMY`);
        req.data.ID_METADATA_CONDICION = rs[0].NEXT_ID;
    });


    async function getAccionesRol(idRol) {
        let retorno = [];

        const sql = `SELECT DISTINCT AC.NOMBRE AS NOMBRE 
                 FROM DB_ROLESXACCIONES AS RXA
                  INNER JOIN DB_ACCION AS AC 
                   ON AC.ID_ACCION = RXA.ID_ACCION
                  WHERE RXA.ID_ROLES = ?`;
        const result = await cds.run(sql, [idRol]);

        for (const rs of result) {
            let record = {};
            record.ACCION = rs.NOMBRE;

            retorno.push(record);
        }
        return retorno;
    };

    function getTipo(sValue) {
        var text;
        switch (sValue) {
            case 1:
                text = "Raíz";
                break;
            case 2:
                text = "Nodo";
                break;
            case 3:
                text = "Documento";
                break;
            default:
                text = "N/A";
                break;
        }
        return text;
    };

    function getTipoVisualizacion(sValue) {
        var text;
        switch (sValue) {
            case 1:
                text = "Menú";
                break;
            case 2:
                text = "Menú Desplegable";
                break;
            case 3:
                text = "Archivo";
                break;
            case 4:
                text = "Lista de  Archivos";
                break;
            case 5:
                text = "Archivo con Búsqueda";
                break;
            case 7:
                text = "Nodo Busqueda";
                break;
            case 8:
                text = "Nodo Contenido";
                break;
            default:
                text = "N/A";
                break;
        }
        return text;
    };

    this.on('selectedRoles', async (req) => {
        const { usuario } = req.data;
        let output = [];
        let sql;

        try {
            sql = `SELECT DISTINCT RO.ID_ROLES AS ID_ROLES,
                                     RO.NOMBRE AS NOMBRE,
                                     RO.DESCRIPCION AS DESCRIPCION,
                                     RO.NOMBRE_TIPO_DOCUMENTO AS TIPO_DOCUMENTO,
                                     RXU.ID_ROLESXUSUARIO AS ID_ROLESXUSUARIO
                    FROM DB_ROLESXUSUARIOS AS RXU
                    INNER JOIN DB_ROLES AS RO
                     ON RO.ID_ROLES = RXU.ID_ROLES
                    WHERE RXU.ID_USUARIO = ?
                    AND RO.ESTADO = 'Activo'`;
            const result = await cds.run(sql, [usuario]);

            for (const rs of result) {
                let record = {};
                record.ID_ROL = rs.ID_ROLES;
                record.NOMBRE = rs.NOMBRE;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.TIPO_DOCUMENTO = rs.TIPO_DOCUMENTO;
                record.ACCIONES = await getAccionesRol(rs.ID_ROLES);
                record.ID_ROLESXUSUARIO = rs.ID_ROLESXUSUARIO;

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getRolesUsuario", query: sql }
        } k
    }); //selectedRoles

    this.on('selectedPerfiles', async (req) => {
        const { usuario } = req.data;

        let output = [];
        let sql;

        try {

            sql = `SELECT DISTINCT PE.NOMBRE_PERFIL AS NOMBRE_PERFIL,
                                     PE.DESCRIPCION AS DESCRIPCION,
                                     PXU.ID_PERFILES AS ID_PERFILES,
                                     PXU.ID_PERFILESXUSUARIO AS ID_PERFILESXUSUARIO
                    FROM DB_PERFILESXUSUARIOS AS PXU
                     INNER JOIN DB_PERFILES AS PE
                      ON PE.ID_PERFILES = PXU.ID_PERFILES
                     WHERE PXU.ID_USUARIO = ?
                    AND PE.ESTADO = 'Activo'`;

            const result = await cds.run(sql, [usuario]);

            for (const rs of result) {
                let record = {};
                record.NOMBRE_PERFIL = rs.NOMBRE_PERFIL;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.ID_PERFILES = rs.ID_PERFILES;
                record.ID_PERFILESXUSUARIO = rs.ID_PERFILESXUSUARIO;

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getPerfilesUsuario", query: sql };
        }
    }); //selectedPerfiles

    this.on('portales', async (req) => {
        const { usuario } = req.data;
        let output = [];
        let sql;

        try {

            sql = `SELECT DISTINCT CT.TITULO AS TITULO,
                                    AXP.ID_ADMINISTRADOR_PORTAL AS ID_ADMINISTRADOR_PORTAL,
                                    UXP.ID_USUARIO_PORTAL AS ID_USUARIO_PORTAL,
                                    CT.ID_CATEGORIA AS ID_CATEGORIA, 
                                    UXP.USERNAME AS USERNAME
                        FROM DB_USUARIO_PORTAL AS UXP
                    INNER JOIN DB_CATEGORIA AS CT
                     ON CT.ID_CATEGORIA = UXP.ID_PORTAL
                    LEFT OUTER JOIN DB_ADMINISTRADOR_PORTAL AS AXP
                     ON UXP.ID_USUARIO = AXP.ID_USUARIO AND UXP.ID_PORTAL = AXP.ID_PORTAL
                      WHERE UXP.ID_USUARIO = ?`;

            const result = await cds.run(sql, [usuario]);

            for (const rs of result) {
                let record = {};
                record.TITULO = rs.TITULO;
                record.ADMINISTRADOR = rs.ADMINISTRADOR_PORTAL === null ? false : true;
                record.ID_ADMINISTRADOR_PORTAL = rs.ID_ADMINISTRADOR_PORTAL;
                record.ID_USUARIO_PORTAL = rs.ID_USUARIO_PORTAL;
                record.ID_CATEGORIA = rs.ID_CATEGORIA;
                record.USERNAME = rs.USERNAME;

                output.push(record)
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "portales", query: sql };
        }
    }); //portales

    this.on('tipoDocumento', async (req) => {
        const { rol } = req.data;

        let sql;
        let output = [];

        try {

            sql = `SELECT DISTINCT TD.ID_NODO AS ID_NODO,
                                     TD.NOMBRE AS NOMBRE,
                                     TD.DESCRIPCION AS DESCRIPCION,
                                     TD.ORIGEN AS ORIGEN
                    FROM DB_ROLESXTD AS RXT
                     INNER JOIN DB_TIPO_DOCUMENTO AS TD
                    ON TD.ID_TIPO_DOCUMENTO = RXT.ID_TIPO_DOCUMENTO WHERE RXT.ID_ROLES = ?`;

            const result = await cds.run(sql, [rol]);

            for (const rs of result) {
                let record = {};
                record.ID_NODO = rs.ID_NODO;
                record.NOMBRE = rs.NOMBRE;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.ORIGEN = rs.ORIGEN;

                output.push(record);
            }
            return output
        } catch (e) {
            return { error: e.message, accion: "getTipoDocumento", query: sql };
        }
    }); //tipoDocumento

    this.on('roles', async () => {
        let sql;
        let output = [];

        try {
            sql = `SELECT ID_ROLES, NOMBRE, DESCRIPCION, NOMBRE_TIPO_DOCUMENTO
                    FROM DB_ROLES
                    WHERE ESTADO = 'Activo'`;

            const result = await cds.run(sql);
            console.log(result)

            for (const rs of result) {
                let record = {};
                record.ID_ROL = rs.ID_ROLES;
                record.NOMBRE = rs.NOMBRE;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.TIPO_DOCUMENTO = rs.NOMBRE_TIPO_DOCUMENTO;
                record.ACCIONES = await getAccionesRol(rs.ID_ROLES);

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getRoles", query: sql };
        }
    }); //roles

    this.on('usuarioReferencia', async (req) => {
        const { perfil } = req.data;

        let output = [];
        let sql;

        try {

            sql = `SELECT DISTINCT US.NOMBRE AS NOMBRE,
                                     US.APELLIDO AS APELLIDO,
                                     US.CORREO AS CORREO,
                                     US.USERNAME AS USERNAME
                            FROM DB_PERFILESXUSUARIOS
                      AS PXU INNER JOIN DB_USUARIO AS US
                      ON US.ID_USUARIO = PXU.ID_USUARIO WHERE PXU.ID_PERFILES = ?`;

            const result = await cds.run(sql, [perfil]);

            for (const rs of result) {
                let record = {};
                record.NOMBRE = rs.NOMBRE;
                record.APELLIDO = rs.APELLIDO;
                record.CORREO = rs.CORREO;
                record.USUARIO = rs.USERNAME;

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getUsuarioReferencia", query: sql };
        }
    }); //usuarioReferencia

    this.on('rolesReferencia', async (req) => {
        const { rol } = req.data;

        let output = [];
        let sql;

        try {

            sql = `SELECT DISTINCT US.NOMBRE AS NOMBRE,
                               US.APELLIDO AS NOMBRE,
                               US.CORREO AS CORREO,
                               US.USERNAME AS USERNAME
                     FROM DB_ROLESXUSUARIOS AS RXU
                      INNER JOIN DB_USUARIO AS US
                     ON US.ID_USUARIO = RXU.ID_USUARIO WHERE RXU.ID_ROLES = ?`;
            const result = await cds.run(sql, [rol]);

            for (const rs of result) {
                let record = {};
                record.NOMBRE = rs.NOMBRE;
                record.APELLIDO = rs.APELLIDO;
                record.CORREO = rs.CORREO;
                record.USUARIO = rs.USUARIO;

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getUsuarioReferenciaRol", query: sql };
        }
    }); //rolesReferencia

    this.on('accesoFolder', async (req) => {
        const { perfil } = req.data;

        let output = [];
        let sql;

        try {

            sql = `SELECT DISTINCT CAT.TITULO AS TITULO,
                                     CAT.DESCRIPCION AS DESCRIPCION,
                                     CAT.ID_TIPO AS ID_TIPO,
                                     CAT.ID_TIPO_VISUALIZADOR AS VISUALIZADOR
                    FROM DB_NODOSXPERFILES AS NXU
                     INNER JOIN DB_CATEGORIA AS CAT 
                      ON CAT.ID_CATEGORIA = NXU.ID_CATEGORIA
                    WHERE NXU.ID_PERFILES = ?`;

            const result = await cds.run(sql, [perfil]);

            for (const rs of result) {
                let record = {};
                record.TITULO = rs.TITULO;
                record.DESCRIPCION = rs.DESCRIPCION;
                record.TIPO = getTipo(rs.ID_TIPO);
                record.ID_TIPO = rs.ID_TIPO;
                record.VISUALIZADOR = getTipoVisualizacion(rs.VISUALIZADOR);

                output.push(record);
            }
            return output;
        } catch (e) {
            return { error: e.message, accion: "getAccesoFolder", query: sql };
        }
    }); //accesoFolder

});