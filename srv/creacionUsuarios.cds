using {db} from '../db/schema';

service schema {

    // ─────────────────────────────────────────────────────────────────────────
    // ACCION
    // ─────────────────────────────────────────────────────────────────────────
    entity ACCION                           as
        projection on db.ACCION {
            *,
            apps        : Association to many ACCION_APP
                              on apps.ID_ACCION = $self.ID_ACCION,
            actividades : Association to many ACTIVIDADES
                              on actividades.ID_ACCION = $self.ID_ACCION,
            roles       : Association to many ROLESXACCIONES
                              on roles.ID_ACCION = $self.ID_ACCION
        }

    entity ACCION_APP                       as
        projection on db.ACCION_APP {
            *,
            accion : Association to one ACCION
                         on accion.ID_ACCION = $self.ID_ACCION
        }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTIVIDADES / ALERTAS
    // ─────────────────────────────────────────────────────────────────────────
    entity ACTIVIDADES                      as
        projection on db.ACTIVIDADES {
            *,
            accion  : Association to one ACCION
                          on accion.ID_ACCION = $self.ID_ACCION,
            alertas : Association to many ACTIVIDADXALERTA
                          on alertas.ID_ACTIVIDADES = $self.ID_ACTIVIDADES
        }

    entity ACTIVIDADXALERTA                 as
        projection on db.ACTIVIDADXALERTA {
            *,
            actividad : Association to one ACTIVIDADES
                            on actividad.ID_ACTIVIDADES = $self.ID_ACTIVIDADES,
            alertas   : Association to one ALERTAS
                            on alertas.ALE_ID = $self.ALE_ID
        }

    entity ALERTAS                          as
        projection on db.ALERTAS {
            *,
            tipoDoc     : Association to one TIPODOCUMENTOXALERTA
                              on tipoDoc.ID_TIPODOCUMENTOXALERTA = $self.ID_TIPODOCUMENTOXALERTA,
            portal      : Association to one PORTALXALERTA
                              on portal.ID_PORTALXALERTA = $self.ID_PORTALXALERTA,
            actividad   : Association to one ACTIVIDADXALERTA
                              on actividad.ID_ACTIVIDADXALERTA = $self.ID_ACTIVIDADXALERTA,
            // Navegación AlertaToEstadoTx (xsodata: ALERTAS.ESTADO → ESTADO_TX.ID_ESTADO_TX)
            estadoTx    : Association to one ESTADO_TX
                              on estadoTx.ID_ESTADO_TX = $self.ESTADO,
            tiposDoc    : Association to many TIPODOCUMENTOXALERTA
                              on tiposDoc.ALE_ID = $self.ALE_ID,
            portales    : Association to many PORTALXALERTA
                              on portales.ALE_ID = $self.ALE_ID,
            actividades : Association to many ACTIVIDADXALERTA
                              on actividades.ALE_ID = $self.ALE_ID
        }

    // ─────────────────────────────────────────────────────────────────────────
    // ADJUNTO / ADMINISTRADOR
    // ─────────────────────────────────────────────────────────────────────────
    entity ADJUNTO_PREGUNTA                 as
        projection on db.ADJUNTO_PREGUNTA {
            *,
            pregunta : Association to one PREGUNTA
                           on pregunta.ID_PREGUNTA = $self.ID_PREGUNTA
        }

    entity ADMINISTRADOR                    as
        projection on db.ADMINISTRADOR {
            *,
            usuario : Association to one USUARIO
                          on usuario.ID_USUARIO = $self.ID_USUARIO
        }

    entity ADMINISTRADOR_PORTAL             as
        projection on db.ADMINISTRADOR_PORTAL {
            *,
            usuario : Association to one USUARIO
                          on usuario.ID_USUARIO = $self.ID_USUARIO,
            portal  : Association to one PORTALES
                          on portal.ID_PORTAL = $self.ID_PORTAL
        }

    entity ADM_PORTAL                       as
        projection on db.ADM_PORTAL {
            *,
            usuario  : Association to one USUARIO
                           on usuario.ID_USUARIO = $self.ID_USUARIO,
            // Navegación PortalTOEstado_Proceso (xsodata: ADM_PORTAL.ESTADO → ESTADO_MANTENEDOR.ESTADO)
            estado   : Association to one ESTADO_MANTENEDOR
                           on estado.ESTADO = $self.ESTADO,
            procesos : Association to many PROCESOS
                           on procesos.ID_ADM_PORTAL = $self.ID_ADM_PORTAL
        }

    // ─────────────────────────────────────────────────────────────────────────
    // ASIGNACIONES
    // ─────────────────────────────────────────────────────────────────────────
    entity ASIGNACIONES_ROL                 as projection on db.ASIGNACIONES_ROL;

    entity ASIGNACIONES_USUARIO             as
        projection on db.ASIGNACIONES_USUARIO {
            *,
            usuario : Association to one USUARIO
                          on usuario.ID_USUARIO = $self.ID_USUARIO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // ENTIDADES SIN NAVEGACIÓN (simples)
    // ─────────────────────────────────────────────────────────────────────────
    entity AYUDA_VIDEOS                     as projection on db.AYUDA_VIDEOS;
    entity BACKROLL                         as projection on db.BACKROLL;
    entity FILTRO                           as projection on db.FILTRO;
    entity FORMATOS                         as projection on db.FORMATOS;
    entity PATHSP                           as projection on db.PATHSP;
    entity SAP_ESTANDAR                     as projection on db.SAP_ESTANDAR;
    entity SISTEMA_REF                      as projection on db.SISTEMA_REF;
    entity TIPO_ALMACENAMIENTO              as projection on db.TIPO_ALMACENAMIENTO;

    // ─────────────────────────────────────────────────────────────────────────
    // BUSQUEDAS
    // ─────────────────────────────────────────────────────────────────────────
    entity BUSQUEDAS                        as
        projection on db.BUSQUEDAS {
            *,
            visita : Association to one VISITAS
                         on visita.ID_VISITAS = $self.ID_VISITAS,
            tipo   : Association to one TIPO_BUSQUEDAS
                         on tipo.ID_TIPO_BUSQUEDA = $self.ID_TIPO_BUSQUEDA
        }

    entity BUSQUEDA_CRITERIOS               as projection on db.BUSQUEDA_CRITERIOS;

    entity BUSQUEDA_TAG                     as
        projection on db.BUSQUEDA_TAG {
            *,
            tag : Association to one TAG
                      on tag.ID_TAG = $self.ID_TAG
        }

    // ─────────────────────────────────────────────────────────────────────────
    // CARGAS
    // ─────────────────────────────────────────────────────────────────────────
    entity CARGAS                           as
        projection on db.CARGAS {
            *,
            visita  : Association to one VISITAS
                          on visita.ID_VISITAS = $self.ID_VISITAS,
            detalle : Association to one DETALLE
                          on detalle.ID_DETALLE = $self.ID_DETALLE
        }

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORIA
    // ─────────────────────────────────────────────────────────────────────────
    entity CATEGORIA                        as
        projection on db.CATEGORIA {
            *,
            tipo             : Association to one TIPO_CATEGORIA
                                   on tipo.ID_TIPO = $self.ID_TIPO,
            tipoVisualizador : Association to one TIPO_VISUALIZADOR
                                   on tipoVisualizador.ID_TIPO_VISUALIZADOR = $self.ID_TIPO_VISUALIZADOR,
            favoritos        : Association to many FAVORITOS
                                   on favoritos.ID_CATEGORIA = $self.ID_CATEGORIA,
            nodos            : Association to many NODOSXPERFILES
                                   on nodos.ID_CATEGORIA = $self.ID_CATEGORIA,
            preguntas        : Association to many PREGUNTA
                                   on preguntas.ID_CATEGORIA = $self.ID_CATEGORIA,
            query            : Association to many QUERY_MSAP_CATEGORIA
                                   on query.ID_CATEGORIA = $self.ID_CATEGORIA,
            tags             : Association to many TAGXPORTAL
                                   on tags.ID_CATEGORIA = $self.ID_CATEGORIA,
            validaciones     : Association to many VALIDACION
                                   on validaciones.ID_CATEGORIA = $self.ID_CATEGORIA,
            visualizadores   : Association to many VISUALIZADOR
                                   on visualizadores.ID_CATEGORIA = $self.ID_CATEGORIA
        }

    // ─────────────────────────────────────────────────────────────────────────
    // CONSULTA / TRANSFERENCIA (nuevos módulos CF)
    // ─────────────────────────────────────────────────────────────────────────
    entity CONDICION_CONSULTA_TRANSFERENCIA as projection on db.CONDICION_CONSULTA_TRANSFERENCIA;
    entity CONSULTA_TRANSFERENCIA           as projection on db.CONSULTA_TRANSFERENCIA;
    entity FIELD_CONSULTA_TRANSFERENCIA     as projection on db.FIELD_CONSULTA_TRANSFERENCIA;
    entity JOIN_CONSULTA_TRANSFERENCIA      as projection on db.JOIN_CONSULTA_TRANSFERENCIA;
    entity METADATA_TRANSFERENCIA           as projection on db.METADATA_TRANSFERENCIA;
    entity OBJETO_TRANSFERENCIA             as projection on db.OBJETO_TRANSFERENCIA;
    entity PROCESO_TRANSFERENCIA            as projection on db.PROCESO_TRANSFERENCIA;
    entity TRANSFERENCIA                    as projection on db.TRANSFERENCIA;

    // ─────────────────────────────────────────────────────────────────────────
    // DETALLE
    // ─────────────────────────────────────────────────────────────────────────
    entity DETALLE                          as
        projection on db.DETALLE {
            *,
            tipDoc    : Association to one TIPO_DOCUMENTO
                            on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            sisRef    : Association to one SISTEMA_REF
                            on sisRef.ID_SISTEMA = $self.ID_SISTEMA_REF,
            cargas    : Association to many CARGAS
                            on cargas.ID_DETALLE = $self.ID_DETALLE,
            docObl    : Association to many DOCOBLXDET
                            on docObl.ID_DETALLE = $self.ID_DETALLE,
            detVis    : Association to many DETALLE_VISUALIZACION
                            on detVis.ID_DETALLE = $self.ID_DETALLE,
            metaData  : Association to many METADATA_VALUE
                            on metaData.ID_DETALLE = $self.ID_DETALLE,
            recientes : Association to many RECIENTES
                            on recientes.ID_DETALLE = $self.ID_DETALLE,
            versiones : Association to many VERSIONAMIENTO
                            on versiones.ID_DETALLE = $self.ID_DETALLE
        }

    // ─────────────────────────────────────────────────────────────────────────
    // DETALLE_VISUALIZACION
    // CORRECCIÓN: xsodata define DetVisToAlm como TIPO_ALMACENAMIENTO (no PROVEEDORES_ALMACENAMIENTO)
    // Se mantienen ambas asociaciones para no perder funcionalidad nueva de CF
    // ─────────────────────────────────────────────────────────────────────────
    entity DETALLE_VISUALIZACION            as
        projection on db.DETALLE_VISUALIZACION {
            *,
            detalle  : Association to one DETALLE
                           on detalle.ID_DETALLE = $self.ID_DETALLE,
            usuario  : Association to one USUARIO
                           on usuario.ID_USUARIO = $self.ID_USUARIO,
            tipDoc   : Association to one TIPO_DOCUMENTO
                           on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            // Asociación original NEO: DETALLE_VISUALIZACION.TIPO_ALMACENAMIENTO → TIPO_ALMACENAMIENTO.ID_TIPO_ALMACENAMIENTO
            tipoAlm  : Association to one TIPO_ALMACENAMIENTO
                           on tipoAlm.ID_TIPO_ALMACENAMIENTO = $self.TIPO_ALMACENAMIENTO,
            // Asociación nueva CF hacia PROVEEDORES_ALMACENAMIENTO
            provDoc  : Association to one PROVEEDORES_ALMACENAMIENTO
                           on provDoc.ID_PROVEEDORES_ALMACENAMIENTO = $self.ID_PROVEEDORES_ALMACENAMIENTO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // DIVISION (nuevo en CF)
    // ─────────────────────────────────────────────────────────────────────────
    entity DIVISION                         as projection on db.DIVISION;

    // ─────────────────────────────────────────────────────────────────────────
    // DOCOBLXDET / DOC_OBL
    // ─────────────────────────────────────────────────────────────────────────
    entity DOCOBLXDET                       as
        projection on db.DOCOBLXDET {
            *,
            docObl  : Association to one DOC_OBL
                          on docObl.ID_DOC_OBL = $self.ID_DOC_OBL,
            detalle : Association to one DETALLE
                          on detalle.ID_DETALLE = $self.ID_DETALLE
        }

    entity DOC_OBL                          as
        projection on db.DOC_OBL {
            *,
            docObl : Association to many DOCOBLXDET
                         on docObl.ID_DOC_OBL = $self.ID_DOC_OBL,
            tipDoc : Association to one TIPO_DOCUMENTO
                         on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // DOCUMENTO
    // ─────────────────────────────────────────────────────────────────────────
    entity DOCUMENTO                        as
        projection on db.DOCUMENTO {
            *,
            tipDoc     : Association to one TIPO_DOCUMENTO
                             on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            index      : Association to many INDEX
                             on index.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            inst_aprob : Association to many INSTANCIA_APROBACION
                             on inst_aprob.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            metadta    : Association to many METADATA
                             on metadta.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            metadata_v : Association to many METADATA_VALUE
                             on metadata_v.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            portal     : Association to many PORTALES
                             on portal.ID_DOCUMENTO = $self.ID_DOCUMENTO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // ESTADO
    // ─────────────────────────────────────────────────────────────────────────
    entity ESTADO                           as projection on db.ESTADO;

    entity ESTADO_MANTENEDOR                as
        projection on db.ESTADO_MANTENEDOR {
            *,
            categorias      : Association to many CATEGORIA
                                  on categorias.ESTADO = $self.ESTADO,
            grupos          : Association to many GRUPO_USUARIO
                                  on grupos.ESTADO = $self.ESTADO,
            metadatos       : Association to many METADATA
                                  on metadatos.ESTADO = $self.ESTADO,
            procesos        : Association to many PROCESOS
                                  on procesos.ESTADO = $self.ESTADO,
            queryCategorias : Association to many QUERY_MSAP_CATEGORIA
                                  on queryCategorias.ESTADO = $self.ESTADO,
            tags            : Association to many TAG
                                  on tags.ESTADO = $self.ESTADO,
            usuarios        : Association to many USUARIO
                                  on usuarios.ESTADO = $self.ESTADO
        }

    entity ESTADO_TX                        as projection on db.ESTADO_TX;

    // ─────────────────────────────────────────────────────────────────────────
    // ESTRATEGIA_LIBERACION / NIVELES / SUPLENTE
    // ─────────────────────────────────────────────────────────────────────────
    entity ESTRATEGIA_LIBERACION            as
        projection on db.ESTRATEGIA_LIBERACION {
            *,
            // Navegación ELibToESTADO (xsodata: ESTRATEGIA_LIBERACION.ESTADO → ESTADO.ID_ESTADO)
            estado    : Association to one ESTADO
                            on estado.ID_ESTADO = $self.ESTADO,
            suplentes : Association to many SUPLENTE
                            on suplentes.ID_EST_LIB = $self.ID_EST_LIB,
            documento : Association to one TIPO_DOCUMENTO
                            on documento.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO
        }

    entity NIVELES                          as
        projection on db.NIVELES {
            *,
            // Navegación NivToEstLib (xsodata: NIVELES.ID_EST_LIB → ESTRATEGIA_LIBERACION.ID_EST_LIB)
            estrategia : Association to one ESTRATEGIA_LIBERACION
                             on estrategia.ID_EST_LIB = $self.ID_EST_LIB,
            suplentes  : Association to many SUPLENTE
                             on suplentes.ID_EST_LIB = $self.ID_EST_LIB,
            instancias : Association to many INSTANCIA_APROBACION
                             on instancias.NIVEL = $self.NIVEL
        }

    entity SUPLENTE                         as
        projection on db.SUPLENTE {
            *,
            est_lib : Association to one ESTRATEGIA_LIBERACION
                          on est_lib.ID_EST_LIB = $self.ID_EST_LIB
        }

    // ─────────────────────────────────────────────────────────────────────────
    // FAVORITOS
    // ─────────────────────────────────────────────────────────────────────────
    entity FAVORITOS                        as
        projection on db.FAVORITOS {
            *,
            usuario   : Association to one USUARIO
                            on usuario.ID_USUARIO = $self.ID_USUARIO,
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_CATEGORIA,
            tipDoc    : Association to one TIPO_DOCUMENTO
                            on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO
        };

    // ─────────────────────────────────────────────────────────────────────────
    // GRUPO_USUARIO
    // ─────────────────────────────────────────────────────────────────────────
    entity GRUPO_USUARIO                    as
        projection on db.GRUPO_USUARIO {
            *,
            usuario : Association to one USUARIO
                          on usuario.ID_USUARIO = $self.ID_USUARIO,
            estado  : Association to one ESTADO_MANTENEDOR
                          on estado.ESTADO = $self.ESTADO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // INDEX
    // ─────────────────────────────────────────────────────────────────────────
    entity INDEX                            as
        projection on db.INDEX {
            *,
            tipDoc  : Association to one TIPO_DOCUMENTO
                          on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            doc     : Association to one DOCUMENTO
                          on doc.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            proceso : Association to one PROCESOS
                          on proceso.ID_PROCESO = $self.ID_PROCESO,
            nodo    : Association to one TIPO_DOCUMENTO
                          on nodo.ID_NODO = $self.ID_NODO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // INSTANCIA_APROBACION
    // ─────────────────────────────────────────────────────────────────────────
    entity INSTANCIA_APROBACION             as
        projection on db.INSTANCIA_APROBACION {
            *,
            index      : Association to many INDEX
                             on index.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            meta       : Association to many METADATA
                             on meta.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            meta_Value : Association to many METADATA_VALUE
                             on meta_Value.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            portales   : Association to many PORTALES
                             on portales.ID_DOCUMENTO = $self.ID_DOCUMENTO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // LEVANTAMIENTO (nuevos módulos CF)
    // ─────────────────────────────────────────────────────────────────────────
    entity LEVANTAMIENTO                    as projection on db.LEVANTAMIENTO;
    entity LEVANTAMIENTO_DOCUMENTO          as projection on db.LEVANTAMIENTO_DOCUMENTO;
    entity LEVANTAMIENTO_METADATA           as projection on db.LEVANTAMIENTO_METADATA;
    entity LEVANTAMIENTO_SAP                as projection on db.LEVANTAMIENTO_SAP;
    entity LEVANTAMIENTO_TAG                as projection on db.LEVANTAMIENTO_TAG;
    entity LEVANTAMIENTO_WORKFLOW           as projection on db.LEVANTAMIENTO_WORKFLOW;

    // ─────────────────────────────────────────────────────────────────────────
    // METADATA
    // ─────────────────────────────────────────────────────────────────────────
    entity METADATA                         as
        projection on db.METADATA {
            *,
            metadta_v : Association to many METADATA_VALUE
                            on metadta_v.ID_METADATA = $self.ID_METADATA,
            tipDoc    : Association to one TIPO_DOCUMENTO
                            on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo      : Association to one TIPO_DOCUMENTO
                            on nodo.ID_NODO = $self.ID_NODO
        }

    entity METADATA_CONDICION               as projection on db.METADATA_CONDICION;
    entity METADATA_FIELD                   as projection on db.METADATA_FIELD;
    entity METADATA_JOIN                    as projection on db.METADATA_JOIN;

    entity METADATA_LISTA                   as
        projection on db.METADATA_LISTA {
            *,
            // xsodata: clave compuesta (ID_TIPO_DOCUMENTO, ID_NODO) → TIPO_DOCUMENTO
            tipDoc : Association to one TIPO_DOCUMENTO
                         on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo   : Association to one TIPO_DOCUMENTO
                         on nodo.ID_NODO = $self.ID_NODO
        }

    entity METADATA_VALUE                   as
        projection on db.METADATA_VALUE {
            *,
            tipDoc   : Association to one TIPO_DOCUMENTO
                           on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            metadata : Association to one METADATA
                           on metadata.ID_METADATA = $self.ID_METADATA,
            docu     : Association to one DOCUMENTO
                           on docu.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            met_val  : Association to one DETALLE
                           on met_val.ID_DETALLE = $self.ID_DETALLE
        }

    // ─────────────────────────────────────────────────────────────────────────
    // NODOBUSQUEDA
    // ─────────────────────────────────────────────────────────────────────────
    entity NODOBUSQUEDA                     as
        projection on db.NODOBUSQUEDA {
            *,
            tipDoc : Association to one TIPO_DOCUMENTO
                         on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo   : Association to one TIPO_DOCUMENTO
                         on nodo.ID_NODO = $self.ID_NODO
        }

    entity NODOSXPERFILES                   as
        projection on db.NODOSXPERFILES {
            *,
            // Navegación perfilToNodo (xsodata: NODOSXPERFILES.ID_CATEGORIA → CATEGORIA.ID_CATEGORIA)
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_CATEGORIA,
            perfil    : Association to one PERFILES
                            on perfil.ID_PERFILES = $self.ID_PERFILES
        }

    // ─────────────────────────────────────────────────────────────────────────
    // PERFILES
    // ─────────────────────────────────────────────────────────────────────────
    entity PERFILES                         as
        projection on db.PERFILES {
            *,
            perxusu  : Association to many PERFILESXUSUARIOS
                           on perxusu.ID_PERFILES = $self.ID_PERFILES,
            nodoxper : Association to many NODOSXPERFILES
                           on nodoxper.ID_PERFILES = $self.ID_PERFILES
        }

    entity PERFILESXUSUARIOS                as
        projection on db.PERFILESXUSUARIOS {
            *,
            perfiles : Association to one PERFILES
                           on perfiles.ID_PERFILES = $self.ID_PERFILES,
            // Navegación perfilToUsuario (xsodata: PERFILESXUSUARIOS.ID_USUARIO → USUARIO.ID_USUARIO)
            usuario  : Association to one USUARIO
                           on usuario.ID_USUARIO = $self.ID_USUARIO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // PORTALES / PORTALXALERTA
    // ─────────────────────────────────────────────────────────────────────────
    entity PORTALES                         as
        projection on db.PORTALES {
            *,
            doc    : Association to one DOCUMENTO
                         on doc.ID_DOCUMENTO = $self.ID_DOCUMENTO,
            tipDoc : Association to one TIPO_DOCUMENTO
                         on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            tipo   : Association to one TIPO_CATEGORIA
                         on tipo.ID_TIPO = $self.ID_TIPO
        }

    entity PORTALXALERTA                    as
        projection on db.PORTALXALERTA {
            *,
            alertas : Association to one ALERTAS
                          on alertas.ALE_ID = $self.ALE_ID
        }

    // ─────────────────────────────────────────────────────────────────────────
    // PREGUNTA
    // ─────────────────────────────────────────────────────────────────────────
    entity PREGUNTA                         as
        projection on db.PREGUNTA {
            *,
            preguntas : Association to many ADJUNTO_PREGUNTA
                            on preguntas.ID_PREGUNTA = $self.ID_PREGUNTA,
            // Navegación preguntaToCategoria (xsodata: PREGUNTA.ID_CATEGORIA → CATEGORIA.ID_CATEGORIA)
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_CATEGORIA
        }

    // ─────────────────────────────────────────────────────────────────────────
    // PROCESOS
    // CORRECCIÓN: faltaba asociación ProcesoTOTipoDocumento del xsodata
    // ─────────────────────────────────────────────────────────────────────────
    entity PROCESOS                         as
        projection on db.PROCESOS {
            *,
            index   : Association to many INDEX
                          on index.ID_PROCESO = $self.ID_PROCESO,
            adm     : Association to one ADM_PORTAL
                          on adm.ID_ADM_PORTAL = $self.ID_ADM_PORTAL,
            // Navegación ProcesoTOTipoDocumento (xsodata: PROCESOS.TIPO_DOCUMENTO → TIPO_DOCUMENTO.ID_TIPO_DOCUMENTO)
            tipDoc  : Association to one TIPO_DOCUMENTO
                          on tipDoc.ID_TIPO_DOCUMENTO = $self.TIPO_DOCUMENTO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // PROP_TIPO_DOC
    // ─────────────────────────────────────────────────────────────────────────
    entity PROP_TIPO_DOC                    as
        projection on db.PROP_TIPO_DOC {
            *,
            // Navegación PropDocumentoToTipoDoc (xsodata: PROP_TIPO_DOC.FORMATO → FORMATOS.NOMBRE_FORMATO)
            formato : Association to one FORMATOS
                          on formato.NOMBRE_FORMATO = $self.FORMATO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // PROVEEDORES_ALMACENAMIENTO
    // ─────────────────────────────────────────────────────────────────────────
entity PROVEEDORES_ALMACENAMIENTO as
    projection on db.PROVEEDORES_ALMACENAMIENTO {
        key ID_PROVEEDORES_ALMACENAMIENTO,
        NOMBRE,
        CORREO,
        CONTACTO,
        RESPONSBLE as RESPONSABLE,
        ALMACENAMIENTO,

        det_vis   : Association to many DETALLE_VISUALIZACION
                        on det_vis.ID_PROVEEDORES_ALMACENAMIENTO = $self.ID_PROVEEDORES_ALMACENAMIENTO,

        tipDocDig : Association to many TIPO_DOCUMENTO_DIGITAL
                        on tipDocDig.EMPRESA_RESPONSABLE = $self.ID_PROVEEDORES_ALMACENAMIENTO,

        tipDocFis : Association to many TIPO_DOCUMENTO_FISICO
                        on tipDocFis.EMPRESA_RESPONSABLE = $self.ID_PROVEEDORES_ALMACENAMIENTO
    };

    // ─────────────────────────────────────────────────────────────────────────
    // QUERY_MSAP_CATEGORIA
    // ─────────────────────────────────────────────────────────────────────────
    entity QUERY_MSAP_CATEGORIA             as
        projection on db.QUERY_MSAP_CATEGORIA {
            *,
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_CATEGORIA,
            tipoDoc   : Association to one TIPO_DOCUMENTO
                            on ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            estado    : Association to one ESTADO_MANTENEDOR
                            on ESTADO = $self.ESTADO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // RECIENTES / REPORTE_LOG
    // ─────────────────────────────────────────────────────────────────────────
    entity RECIENTES                        as
        projection on db.RECIENTES {
            *,
            visita  : Association to one VISITAS
                          on visita.ID_VISITAS = $self.ID_VISITAS,
            detalle : Association to one DETALLE
                          on detalle.ID_DETALLE = $self.ID_DETALLE
        }

    entity REPORTE_LOG                      as projection on db.REPORTE_LOG;

    // ─────────────────────────────────────────────────────────────────────────
    // ROLES / ROLESXACCIONES / ROLESXTD / ROLESXUSUARIOS
    // ─────────────────────────────────────────────────────────────────────────
    entity ROLES                            as
        projection on db.ROLES {
            *,
            acciones : Association to many ROLESXACCIONES
                           on acciones.ID_ROLES = $self.ID_ROLES,
            xtd      : Association to many ROLESXTD
                           on xtd.ID_ROLES = $self.ID_ROLES,
            usuario  : Association to many ROLESXUSUARIOS
                           on usuario.ID_ROLES = $self.ID_ROLES,
            tipDoc   : Association to one TIPO_DOCUMENTO
                           on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo     : Association to one TIPO_DOCUMENTO
                           on nodo.ID_NODO = $self.ID_NODO
        }

    entity ROLESXACCIONES                   as
        projection on db.ROLESXACCIONES {
            *,
            rol    : Association to one ROLES
                         on rol.ID_ROLES = $self.ID_ROLES,
            // Navegación rolesAccToAcciones (xsodata: ROLESXACCIONES.ID_ACCION → ACCION.ID_ACCION)
            accion : Association to one ACCION
                         on accion.ID_ACCION = $self.ID_ACCION
        }

    entity ROLESXTD                         as
        projection on db.ROLESXTD {
            *,
            rol    : Association to one ROLES
                         on rol.ID_ROLES = $self.ID_ROLES,
            // Navegación rolesToTipoDocumento (xsodata: ROLESXTD.ID_TIPO_DOCUMENTO → TIPO_DOCUMENTO)
            tipDoc : Association to one TIPO_DOCUMENTO
                         on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO
        }

    entity ROLESXUSUARIOS                   as
        projection on db.ROLESXUSUARIOS {
            *,
            rol     : Association to one ROLES
                          on rol.ID_ROLES = $self.ID_ROLES,
            // Navegación rolesToUsuario (xsodata: ROLESXUSUARIOS.ID_USUARIO → USUARIO.ID_USUARIO)
            usuario : Association to one USUARIO
                          on usuario.ID_USUARIO = $self.ID_USUARIO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // TAG / TAGXPORTAL / TAGXTD
    // ─────────────────────────────────────────────────────────────────────────
    entity TAG                              as
        projection on db.TAG {
            *,
            xportal : Association to many TAGXPORTAL
                          on xportal.ID_TAG = $self.ID_TAG,
            xtd     : Association to many TAGXTD
                          on xtd.ID_TAG = $self.ID_TAG,
            bus_tag : Association to many BUSQUEDA_TAG
                          on bus_tag.ID_TAG = $self.ID_TAG,
            estado  : Association to one ESTADO_MANTENEDOR
                          on estado.ESTADO = $self.ESTADO
        }

    entity TAGXPORTAL                       as
        projection on db.TAGXPORTAL {
            *,
            // Navegación TxPortalToTag (xsodata: TAGXPORTAL.ID_TAG → TAG.ID_TAG)
            tag       : Association to one TAG
                            on tag.ID_TAG = $self.ID_TAG,
            // Navegación tagPortalToPortal (xsodata: TAGXPORTAL.ID_CATEGORIA → CATEGORIA.ID_CATEGORIA)
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_CATEGORIA
        }

    entity TAGXTD                           as
        projection on db.TAGXTD {
            *,
            tag    : Association to one TAG
                         on tag.ID_TAG = $self.ID_TAG,
            // Navegación tagTipoDocToTipoDoc (xsodata: TAGXTD.ID_TIPO_DOCUMENTO → TIPO_DOCUMENTO)
            tipDoc : Association to one TIPO_DOCUMENTO
                         on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // TIPO_DOCUMENTO Y RELACIONADOS
    // ─────────────────────────────────────────────────────────────────────────
    entity TIPODOCUMENTOXALERTA             as
        projection on db.TIPODOCUMENTOXALERTA {
            *,
            tipDoc : Association to one TIPO_DOCUMENTO
                         on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            alerta : Association to one ALERTAS
                         on alerta.ID_TIPODOCUMENTOXALERTA = $self.ID_TIPODOCUMENTOXALERTA
        }

    entity TIPO_BUSQUEDAS                   as
        projection on db.TIPO_BUSQUEDAS {
            *,
            busquedas : Association to many BUSQUEDAS
                            on busquedas.ID_TIPO_BUSQUEDA = $self.ID_TIPO_BUSQUEDA
        }

    entity TIPO_CATEGORIA                   as
        projection on db.TIPO_CATEGORIA {
            *,
            cat    : Association to many CATEGORIA
                         on cat.ID_TIPO = $self.ID_TIPO,
            portal : Association to many PORTALES
                         on portal.ID_TIPO = $self.ID_TIPO
        }

    entity TIPO_DOCUMENTO                   as
        projection on db.TIPO_DOCUMENTO {
            *,
            doc_digital   : Association to many TIPO_DOCUMENTO_DIGITAL
                                on doc_digital.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            doc_fisico    : Association to many TIPO_DOCUMENTO_FISICO
                                on doc_fisico.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            tipo_usu      : Association to many TIPO_USUARIO
                                on tipo_usu.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            vinculacion   : Association to many VINCULACION
                                on vinculacion.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            detalle       : Association to many DETALLE
                                on detalle.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            detalle_vis   : Association to many DETALLE_VISUALIZACION
                                on detalle_vis.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            docum         : Association to many DOCUMENTO
                                on docum.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            doc_obl       : Association to many DOC_OBL
                                on doc_obl.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            est_lib       : Association to many ESTRATEGIA_LIBERACION
                                on est_lib.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            fav           : Association to many FAVORITOS
                                on fav.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            indx          : Association to many INDEX
                                on indx.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            metadata      : Association to many METADATA
                                on metadata.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            metadata_lis  : Association to many METADATA_LISTA
                                on metadata_lis.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            metadata_val  : Association to many METADATA_VALUE
                                on metadata_val.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo_bus      : Association to many NODOBUSQUEDA
                                on nodo_bus.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            portales      : Association to many PORTALES
                                on portales.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            query         : Association to many QUERY_MSAP_CATEGORIA
                                on query.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            roles         : Association to many ROLES
                                on roles.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            rol_xtd       : Association to many ROLESXTD
                                on rol_xtd.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            ta_xtd        : Association to many TAGXTD
                                on ta_xtd.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            tipo_docum    : Association to many TIPODOCUMENTOXALERTA
                                on tipo_docum.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            // Navegaciones por ID_NODO (TIPO_DOCUMENTO actúa también como nodo)
            index         : Association to many INDEX
                                on index.ID_NODO = $self.ID_NODO,
            metadata_n    : Association to many METADATA
                                on metadata_n.ID_NODO = $self.ID_NODO,
            metadata_l    : Association to many METADATA_LISTA
                                on metadata_l.ID_NODO = $self.ID_NODO,
            nodoBusq      : Association to many NODOBUSQUEDA
                                on nodoBusq.ID_NODO = $self.ID_NODO,
            procesos      : Association to many PROCESOS
                                on procesos.ID_NODO = $self.ID_NODO,
            roles_n       : Association to many ROLES
                                on roles_n.ID_NODO = $self.ID_NODO,
            vinculacion_n : Association to many VINCULACION
                                on vinculacion_n.ID_NODO = $self.ID_NODO,
            tipDocDigital : Association to many TIPO_DOCUMENTO_DIGITAL
                                on tipDocDigital.ID_NODO = $self.ID_NODO,
            tipDocFisico  : Association to many TIPO_DOCUMENTO_FISICO
                                on tipDocFisico.ID_NODO = $self.ID_NODO
        }

    entity TIPO_DOCUMENTO_DIGITAL           as
        projection on db.TIPO_DOCUMENTO_DIGITAL {
            *,
            // Navegación tdDigitalToTipoDocumento
            tipDoc             : Association to one TIPO_DOCUMENTO
                                     on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo               : Association to one TIPO_DOCUMENTO
                                     on nodo.ID_NODO = $self.ID_NODO,
            // Navegación tdDigitalToEmpresaResponsable (xsodata: EMPRESA_RESPONSABLE → PROVEEDORES_ALMACENAMIENTO)
            empresaResponsable : Association to one PROVEEDORES_ALMACENAMIENTO
                                     on empresaResponsable.ID_PROVEEDORES_ALMACENAMIENTO = $self.EMPRESA_RESPONSABLE
        }

    entity TIPO_DOCUMENTO_FISICO            as
        projection on db.TIPO_DOCUMENTO_FISICO {
            *,
            // Navegación tdFisicoToTipoDocumento
            tipDoc             : Association to one TIPO_DOCUMENTO
                                     on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo               : Association to one TIPO_DOCUMENTO
                                     on nodo.ID_NODO = $self.ID_NODO,
            // Navegación tdFisicoToEmpresaResponsable (xsodata: EMPRESA_RESPONSABLE → PROVEEDORES_ALMACENAMIENTO)
            empresaResponsable : Association to one PROVEEDORES_ALMACENAMIENTO
                                     on empresaResponsable.ID_PROVEEDORES_ALMACENAMIENTO = $self.EMPRESA_RESPONSABLE
        }

    entity TIPO_USUARIO                     as
        projection on db.TIPO_USUARIO {
            *,
            // Navegación TipoUsuarioToUsuario
            usuario : Association to one USUARIO
                          on usuario.ID_USUARIO = $self.ID_USUARIO,
            tipDoc  : Association to one TIPO_DOCUMENTO
                          on tipDoc.ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO
        }

    entity TIPO_VISUALIZADOR                as
        projection on db.TIPO_VISUALIZADOR {
            *,
            categ : Association to many CATEGORIA
                        on categ.ID_TIPO_VISUALIZADOR = $self.ID_TIPO_VISUALIZADOR
        }

    // ─────────────────────────────────────────────────────────────────────────
    // USUARIO Y RELACIONADOS
    // ─────────────────────────────────────────────────────────────────────────
    entity USUARIO                          as
        projection on db.USUARIO {
            *,
            usu_por      : Association to many USUARIO_PORTAL
                               on usu_por.ID_USUARIO = $self.ID_USUARIO,
            visita       : Association to many VISITAS
                               on visita.ID_USUARIO = $self.ID_USUARIO,
            visual       : Association to many VISUALIZADOR
                               on visual.ID_USUARIO = $self.ID_USUARIO,
            admin        : Association to many ADMINISTRADOR
                               on admin.ID_USUARIO = $self.ID_USUARIO,
            admin_portal : Association to many ADMINISTRADOR_PORTAL
                               on admin_portal.ID_USUARIO = $self.ID_USUARIO,
            adm_portal   : Association to many ADM_PORTAL
                               on adm_portal.ID_USUARIO = $self.ID_USUARIO,
            asig_usu     : Association to many ASIGNACIONES_USUARIO
                               on asig_usu.ID_USUARIO = $self.ID_USUARIO,
            detalle_vis  : Association to many DETALLE_VISUALIZACION
                               on detalle_vis.ID_USUARIO = $self.ID_USUARIO,
            fav          : Association to many FAVORITOS
                               on fav.ID_USUARIO = $self.ID_USUARIO,
            gru_usu      : Association to many GRUPO_USUARIO
                               on gru_usu.ID_USUARIO = $self.ID_USUARIO,
            perfilxusu   : Association to many PERFILESXUSUARIOS
                               on perfilxusu.ID_USUARIO = $self.ID_USUARIO,
            rolxusu      : Association to many ROLESXUSUARIOS
                               on rolxusu.ID_USUARIO = $self.ID_USUARIO,
            tipo_usu     : Association to many TIPO_USUARIO
                               on tipo_usu.ID_USUARIO = $self.ID_USUARIO
        }

    entity USUARIO_PORTAL                   as
        projection on db.USUARIO_PORTAL {
            *,
            // Navegación PortalToUsuario
            usuario   : Association to one USUARIO
                            on usuario.ID_USUARIO = $self.ID_USUARIO,
            // Navegación PortalToCategoria (xsodata: USUARIO_PORTAL.ID_PORTAL → CATEGORIA.ID_CATEGORIA)
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_PORTAL
        }

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDACION / VERSIONAMIENTO / VINCULACION
    // ─────────────────────────────────────────────────────────────────────────
    entity VALIDACION                       as
        projection on db.VALIDACION {
            *,
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_CATEGORIA
        }

    entity VERSIONAMIENTO                   as
        projection on db.VERSIONAMIENTO {
            *,
            detalle : Association to one DETALLE
                          on detalle.ID_DETALLE = $self.ID_DETALLE
        }

    entity VINCULACION                      as
        projection on db.VINCULACION {
            *,
            tipDoc : Association to one TIPO_DOCUMENTO
                         on ID_TIPO_DOCUMENTO = $self.ID_TIPO_DOCUMENTO,
            nodo   : Association to one TIPO_DOCUMENTO
                         on ID_NODO = $self.ID_NODO
        }

    // ─────────────────────────────────────────────────────────────────────────
    // VISITAS / VISUALIZADOR
    // ─────────────────────────────────────────────────────────────────────────
    entity VISITAS                          as
        projection on db.VISITAS {
            *,
            bus       : Association to many BUSQUEDAS
                            on bus.ID_VISITAS = $self.ID_VISITAS,
            cargas    : Association to many CARGAS
                            on cargas.ID_VISITAS = $self.ID_VISITAS,
            recientes : Association to many RECIENTES
                            on recientes.ID_VISITAS = $self.ID_VISITAS,
            usuario   : Association to one USUARIO
                            on usuario.ID_USUARIO = $self.ID_USUARIO
        }

    entity VISUALIZADOR                     as
        projection on db.VISUALIZADOR {
            *,

            usuario   : Association to one USUARIO
                            on usuario.ID_USUARIO = $self.ID_USUARIO,
            categoria : Association to one CATEGORIA
                            on categoria.ID_CATEGORIA = $self.ID_CATEGORIA
        }
}

@protocol: 'rest'
@path    : '/creacionUsuarios'
service creacionUsuarios {
    @open
    type object {};

    action roles()                                            returns array of object;
    action selectedRoles(usuario : Integer)                   returns array of object;
    action selectedPerfiles(usuario : Integer)                returns array of object;
    action portales(usuario : Integer)                        returns array of object;
    action tipoDocumento(rol : Integer)                       returns array of object;
    action usuarioReferencia(perfil : Integer)                returns array of object;
    action rolesReferencia(rol : Integer)                     returns array of object;
    action accesoFolder(perfil : Integer)                     returns array of object;
}
