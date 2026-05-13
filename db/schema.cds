namespace db;

entity ACCION {
        key ID_ACCION : Integer not null;
            NOMBRE    : String(255);
};


entity ACCION_APP {
        key ID_ACCION_APP  : Integer not null;
            ID_ACCION      : Integer;
            COD_APLICACION : String(255);
};


entity ACTIVIDADES {
        key ID_ACTIVIDADES : Integer not null;
            NOMBRE         : String(255);
            ID_ACCION      : Integer;
};


entity ACTIVIDADXALERTA {
        key ID_ACTIVIDADXALERTA : Integer not null;
            ID_ACTIVIDADES      : Integer not null;
            ALE_ID              : Integer not null;
};


entity ADJUNTO_PREGUNTA {
        key ID_ADJUNTO_PREGUNTA : Integer not null;
            ID_PREGUNTA         : Integer not null;
            URL                 : String(600) not null;
            TITULO_ADJUNTO      : String(400) not null;
};


entity ADMINISTRADOR {
        key ID_ADMINISTRADOR : Integer not null;
            ID_USUARIO       : Integer not null;
            USUARIO          : String(40);
            FECHA            : Date;
};


entity ADMINISTRADOR_PORTAL {
        key ID_ADMINISTRADOR_PORTAL : Integer not null;
            ID_USUARIO              : Integer not null;
            ID_PORTAL               : Integer not null;
};


entity ADM_PORTAL {
        key ID_ADM_PORTAL  : Integer not null;
            NOMBRE_PORTAL  : String(100);
            ID_USUARIO     : Integer;
            ESTADO         : String(50);
            FECHA_CREACION : Date;
            HORA_CREACION  : Time;
};


entity ALERTAS {
        key ALE_ID                  : Integer not null;
            ALE_ASUNTO              : String(100) not null;
            ALE_DESTINATARIO        : String(100) not null;
            ALE_BODY                : String(500) not null;
            ESTADO                  : Integer;
            ID_TIPODOCUMENTOXALERTA : Integer;
            ID_PORTALXALERTA        : Integer;
            ID_ACTIVIDADXALERTA     : Integer;
};


entity ASIGNACIONES_ROL {
        key ID_ASIGNACION_ROL : Integer not null;
            ID_CARPETA        : Integer not null;
            ROL               : String(30) not null;
};


entity ASIGNACIONES_USUARIO {
        key ID_ASIGNACION : Integer not null;
            ID_USUARIO    : Integer not null;
            ID_CARPETA    : Integer not null;
};


entity AYUDA_VIDEOS {
        key ID_AYUDA_VIDEOS : Integer not null;
            TITULO          : String(100) not null;
            URL             : String(500) not null;
};


entity BACKROLL {
        key ID_BACKROLL : Integer not null;
            QUERY       : String(5000);
};


entity BUSQUEDAS {
        key ID_BUSQUEDAS     : Integer not null;
            ID_VISITAS       : Integer not null;
            ID_TIPO_BUSQUEDA : Integer not null;
            VALOR_BUSQUEDAS  : String(100) not null;
};


entity BUSQUEDA_CRITERIOS {
        key ID_BUSQUEDA_CRITERIOS : Integer not null;
            ID_PORTAL             : Integer;
            NOMBRE_CRITERIO       : String(500);
            FECHA                 : Date;
            HORA                  : Time;
};


entity BUSQUEDA_TAG {
        key ID_BUSQUEDA_TAG : Integer not null;
            ID_PORTAL       : Integer;
            ID_TAG          : Integer;
            FECHA           : Date;
            HORA            : Time;
};


entity CARGAS {
        key ID_CARGAS  : Integer not null;
            ID_VISITAS : Integer not null;
            ID_DETALLE : Integer not null;
};


entity CATEGORIA {
        key ID_CATEGORIA         : Integer not null;
            ID_PADRE             : Integer not null;
            ID_TIPO              : Integer not null;
            TITULO               : String(300) not null;
            USERNAME             : String(40);
            NOMBRE               : String(40);
            MAIL                 : String(50);
            DESCRIPCION          : String(300);
            ID_TIPO_VISUALIZADOR : Integer;
            URL_IMAGEN           : String(300);
            URL_ICONO            : String(500);
            ORIGEN               : String(100);
            APP                  : String(100);
            PATHSP               : String(500);
            BREADCRUMS           : String(255);
            APP_DATOS            : String(70);
            ID_CATEGORIA_ESPEJO  : Integer;
            ID_VINCULANTE        : Integer;
            GRUPO                : String(200);
            ESTADO               : String(20);
            OBJID                : String(50);

};


entity CONDICION_CONSULTA_TRANSFERENCIA {
        key ID_CONDICION_CONSULTA_TRANSFERENCIA : Integer not null;
            CAMPO                               : String(100);
            CONDICION                           : String(100);
            VALOR                               : String(100);
            VALOR2                              : String(100);
            CONSULTA_TRANSFERENCIA              : Integer;
};


entity CONSULTA_TRANSFERENCIA {
        key ID_CONSULTA_TRANSFERENCIA : Integer;
            CAMPO                     : String(40);
            TABLA                     : String(50);
            DINAMICO                  : Integer;
            TIPO_DATO                 : String(100);
            FORMATO                   : String(100);
            TRANSFERENCIA             : String(40);
};


entity DETALLE {
        key ID_DETALLE        : Integer not null;
            ID_CATEGORIA_HOJA : Integer not null;
            ID_SISTEMA_REF    : Integer not null;
            URL               : String(500) not null;
            NODO_HIJO         : Integer;
            ID_TIPO_DOCUMENTO : Integer;
            TITULO            : String(500);
            TYPE              : String(200);
            PROCESO           : Integer;
};


entity DETALLE_VISUALIZACION {
        key ID_DETALLE_VISUALIZACION      : Integer not null;
            ID_DETALLE                    : String(255);
            FECHA_CARGA                   : Date;
            ID_USUARIO                    : Integer;
            FECHA_VENCIMIENTO             : Date;
            ID_TIPO_DOCUMENTO             : Integer;
            TIPO_ALMACENAMIENTO           : Integer;
            ID_PROVEEDORES_ALMACENAMIENTO : Integer;
};


entity DIVISION {
        key ID_DIVISION : Integer not null;
            DESCRIPCION : String(600);
};


entity DOCOBLXDET {
        key ID_DOC_OBL_DET : Integer not null;
            ID_DOC_OBL     : Integer not null;
            ID_DETALLE     : Integer;
};


entity DOCUMENTO {
        key ID_DOCUMENTO       : Integer not null;
            ID_TIPO_DOCUMENTO  : Integer not null;
            VERSION            : Integer not null;
            NOMBRE             : String(255) not null;
            ESTADO_WF          : String(40) not null;
            UFH_CREAR          : Date not null;
            UFH_CARGA          : Date not null;
            DESCRIPCION        : String(200) not null;
            SIGUIENTELIBERADOR : String(200);
};


entity DOC_OBL {
        key ID_DOC_OBL        : Integer not null;
            ID_TIPO_DOCUMENTO : Integer not null;
            NOMBRE_DOCUMENTO  : String(100) not null;
            OBLIGATORIO       : String(10) not null;
            DESCRIPCION       : String(2000);
};


entity ESTADO {
        key ID_ESTADO   : Integer not null;
            DESCRIPCION : String(100) not null;
};


entity ESTADO_MANTENEDOR {
        key ESTADO : String(20) not null;
};


entity ESTADO_TX {
        key ID_ESTADO_TX : Integer not null;
            DESCRIPCION  : String(100);
};


entity ESTRATEGIA_LIBERACION {
        key ID_EST_LIB        : Integer not null;
            ESTADO            : Integer not null;
            ID_TIPO_DOCUMENTO : Integer not null;
};


entity FAVORITOS {
        key ID_FAVORITOS      : Integer not null;
            ID_USUARIO        : Integer not null;
            ID_PORTAL         : Integer not null;
            ID_CATEGORIA      : Integer not null;
            ID_TIPO_DOCUMENTO : Integer;
};


entity FIELD_CONSULTA_TRANSFERENCIA {
        key ID_FIELD_CONSULTA_TRANSFERENCIA : Integer not null;
            FIELD_NAME                      : String(100);
            CONSULTA_TRANSFERENCIA          : Integer;
};


entity FILTRO {
        key ID_FILTRO     : Integer not null;
            CAMPO         : String(100);
            VALOR         : String(100);
            OPERADOR      : String(10);
            VALOR2        : String(100);
            TRANSFERENCIA : String(40);
};


entity FORMATOS {
        key ID_FORMATOS    : Integer not null;
            NOMBRE_FORMATO : String(50);
            MYMETYPE       : String(255);
            EXTENSION      : String(50);
};


entity GRUPO_USUARIO {
        key ID_GRUPO_USUARIO : Integer not null;
            ID_USUARIO       : Integer not null;
            ESTADO           : String(20) not null;
            FECHA_CREACION   : String(15);
            NOMBRE           : String(100);
};


entity INDEX {
        key ID_INDEX          : Integer not null;
            ID_TIPO_DOCUMENTO : Integer not null;
            ID_DOCUMENTO      : Integer not null;
            ID_APP            : Integer;
            ID_PROCESO        : Integer;
            ID_NODO           : Integer;
            APP_ORIGEN        : String(50);
};


entity INSTANCIA_APROBACION {
        key ID_DOCUMENTO            : Integer not null;
        key NIVEL                   : Integer not null;
            LIBERADOR               : String(50);
            LIBERADOR_NOMBRE        : String(250);
            FECHA                   : Date;
            HORA                    : Time;
            ESTADO                  : String(10);
            MOTIVO                  : String(255);
            SIGUIENTE_LIBERADOR     : String(250);
            ID_USUARIO_REEMPLAZANTE : Integer;
};


entity JOIN_CONSULTA_TRANSFERENCIA {
        key ID_JOIN_CONSULTA_TRANSFERENCIA : Integer not null;
            ZJOIN                          : String(300);
            CONSULTA_TRANSFERENCIA         : Integer;
};


entity LEVANTAMIENTO {
        key ID_LEVANTAMIENTO       : Integer not null;
            EMPRESA                : String(100);
            GERENCIA               : String(100);
            SUBGERENCIA            : String(100);
            AREA                   : String(100);
            CARPETA                : String(100);
            FORMATO                : String(100);
            PESO_MAXIMO            : Integer;
            PROVEEDOR_FISICO       : String(100);
            LUGAR_FISICO           : String(100);
            PERIODO_FISICO         : Integer;
            FORMATO_TIEMPO_FISICO  : String(100);
            PROVEEDOR_DIGITAL      : String(100);
            DIRECCION_DIGITAL      : String(200);
            PERIODO_DIGITAL        : Integer;
            FORMATO_TIEMPO_DIGITAL : String(100);
            NOMBRE                 : String(100);
            CORREO                 : String(100);
            CARGO                  : String(100);
            TELEFONO               : String(100);
            ESTADO                 : Integer;
};


entity LEVANTAMIENTO_DOCUMENTO {
        key ID_LEVANTAMIENTO_DOCUMENTO : Integer not null;
            NOMBRE                     : String(100);
            LEVANTAMIENTO              : Integer;
};


entity LEVANTAMIENTO_METADATA {
        key ID_LEVANTAMIENTO_METADATA : Integer not null;
            DESCRIPCION               : String(100);
            TIPO                      : String(100);
            LEVANTAMIENTO             : Integer;
};


entity LEVANTAMIENTO_SAP {
        key ID_LEVANTAMIENTO_SAP : Integer not null;
            TABLA                : String(100);
            CAMPO                : String(100);
            LEVANTAMIENTO        : Integer;
};


entity LEVANTAMIENTO_TAG {
        key ID_LEVANTAMIENTO_TAG : Integer not null;
            NOMBRE               : String(100);
            LEVANTAMIENTO        : Integer;
};


entity LEVANTAMIENTO_WORKFLOW {
        key ID_LEVANTAMIENTO_WORKFLOW : Integer not null;
            NIVEL_APROBACION          : String(100);
            USUARIO_APROBADOR         : String(100);
            LEVANTAMIENTO             : Integer;
};


entity METADATA {
        key ID_METADATA       : Integer not null;
            ID_TIPO_DOCUMENTO : Integer not null;
            ATRIBUTO          : String(300) not null;
            TIPO_ATRIBUTO     : String(300) not null;
            OBLIGATORIEDAD    : String(2);
            ID_DOCUMENTO      : Integer;
            ORIGEN            : String(20);
            TIPO              : String(30);
            ID_NODO           : Integer;
            NOMBRETABLA       : String(255);
            NOMBRECAMPO       : String(255);
            FORMATOFECHA      : String(255);
            ESTADO            : String(20);
};


entity METADATA_CONDICION {
        key ID_METADATA_CONDICION  : Integer not null;
            CAMPO                  : String(100);
            CONDICION              : String(100);
            VALOR                  : String(100);
            VALOR2                 : String(100);
            METADATA_TRANSFERENCIA : Integer;
};


entity METADATA_FIELD {
        key ID_METADATA_FIELD      : Integer not null;
            NOMBRE                 : String(70);
            METADATA_TRANSFERENCIA : Integer;
};


entity METADATA_JOIN {
        key ID_METADATA_JOIN       : Integer not null;
            ZJOIN                  : String(500);
            METADATA_TRANSFERENCIA : Integer;
};


entity METADATA_LISTA {
        key ID_METADATA_LISTA : Integer not null;
            NOMBRE_ATRIBUTO   : String(50);
            ID_TIPO_DOCUMENTO : Integer;
            VALUE             : String(100);
            ID_NODO           : Integer;
};


entity METADATA_TRANSFERENCIA {
        key ID_METADATA_TRANSFERENCIA : Integer not null;
            METADATA_REFERENCIA       : Integer;
            NOMBRE                    : String(100);
            TIPO                      : String(100);
            TABLA                     : String(50);
            TRANSFERENCIA             : String(40);
            CAMPO                     : String(100);
};


entity METADATA_VALUE {
        key ID_METADATA_VALUE : Integer not null;
        key PERIODO           : String(10) not null;
            ID_TIPO_DOCUMENTO : Integer not null;
            ID_METADATA       : Integer not null;
            ATRIBUTO          : String(300);
            TIPO_ATRIBUTO     : String(300);
            OBLIGATORIEDAD    : String(2);
            VALUE             : String(5000);
            VALUEDATE         : Date;
            VALUETIME         : Time;
            ID_DOCUMENTO      : Integer;
            ORIGEN            : String(20);
            ID_DETALLE        : Integer;
};


entity NIVELES {
        key NIVEL           : Integer not null;
        key ID_EST_LIB      : Integer not null;
        key NOMBREAPROBADOR : String(100) not null;
            ESTADO          : Integer;
            ID_USUARIO      : Integer;
};


entity NODOBUSQUEDA {
        key ID_BUSQUEDA       : Integer not null;
            ID_TIPO_DOCUMENTO : Integer not null;
            ATRIBUTO          : String(300) not null;
            ID_NODO           : Integer;
            LABEL             : String(255);
            ID_PORTAL         : Integer;
};


entity NODOSXPERFILES {
        key ID_NODOSXPERFILES : Integer not null;
            ID_CATEGORIA      : Integer not null;
            ID_PERFILES       : Integer not null;
};


entity OBJETO_TRANSFERENCIA {
        key ID_OBJETO_TRANSFERENCIA : Integer not null;
            CAMPO                   : String(100);
            TRANSFERENCIA           : String(40);
};


entity PATHSP {
        key PATH           : String(10) not null;
            URL_APP_PIVOTE : String(500);
};


entity PERFILES {
        key ID_PERFILES   : Integer not null;
            DESCRIPCION   : String(255) not null;
            NOMBRE_PERFIL : String(100);
            ESTADO        : String(25);
};


entity PERFILESXUSUARIOS {
        key ID_PERFILESXUSUARIO : Integer not null;
            ID_PERFILES         : Integer not null;
            ID_USUARIO          : Integer;
};


entity PORTALES {
        key ID_SEQ_PORTAL     : Integer not null;
            ID_PORTAL         : Integer;
            TIPO              : String(100);
            ID_DOCUMENTO      : Integer;
            ID_NODO_DETALLE   : Integer;
            ID_TIPO_DOCUMENTO : Integer;
            ID_NODO_CONTENIDO : Integer;
            ID_TIPO           : Integer;
            TITULO            : String(200);
};


entity PORTALXALERTA {
        key ID_PORTALXALERTA : Integer not null;
            ID_PORTAL        : Integer not null;
            ALE_ID           : Integer not null;
};


entity PREGUNTA {
        key ID_PREGUNTA  : Integer not null;
            PREGUNTA     : String(400) not null;
            RESPUESTA    : String(1000) not null;
            ID_CATEGORIA : Integer;
};


entity PROCESOS {
        key ID_PROCESO          : Integer not null;
            ID_ADM_PORTAL       : Integer not null;
            DESCRIPCION_PROCESO : String(255);
            ESTADO              : String(20);
            TIPO_DOCUMENTO      : Integer;
            ID_NODO             : Integer;
};


entity PROCESO_TRANSFERENCIA {
        key ID_PROCESO_TRANSFERENCIA : Integer not null;
            FECHA                    : Date;
            HORA                     : Time;
            DETALLE                  : String(500);
            ESTADO                   : Integer;
            TRANSFERENCIA            : String(40);
};


entity PROP_TIPO_DOC {
        key ID_PROPIEDAD      : Integer not null;
            ID_CATEGORIA_NODO : Integer not null;
            FORMATO           : String(40) not null;
            PESO              : String(40) not null;
            TIPO_DOCUMENTO    : Integer;
};


entity PROVEEDORES_ALMACENAMIENTO {
        key ID_PROVEEDORES_ALMACENAMIENTO : Integer not null;
            NOMBRE                        : String(100) not null;
            CORREO                        : String(100) not null;
            CONTACTO                      : String(20) not null;
            RESPONSBLE                    : String(100) not null;
            ALMACENAMIENTO                : String(20);
};


entity QUERY_MSAP_CATEGORIA {
        key ID_QUERY          : Integer not null;
            ID_CATEGORIA      : Integer;
            ZJOIN             : String(255);
            ZFIELDNAME        : String(255);
            ZCONDICION        : String(255);
            TABNAME           : String(255);
            LARGOCAMPO        : String(150);
            ID_TIPO_DOCUMENTO : Integer;
            ESTADO            : String(20);
};


entity RECIENTES {
        key ID_RECIENTES : Integer not null;
            ID_VISITAS   : Integer not null;
            ID_DETALLE   : Integer not null;
            FECHA        : Date;
            HORA         : Time;
};


entity REPORTE_LOG {
        key ID_LOG      : Integer not null;
            USUARIO     : String(30) not null;
            ACCION      : String(200) not null;
            DESCRIPCION : String(200) not null;
            FECHA       : Date not null;
            HORA        : String(15) not null;
};


entity ROLES {
        key ID_ROLES              : Integer not null;
            DESCRIPCION           : String(255) not null;
            ID_TIPO_DOCUMENTO     : Integer;
            NOMBRE                : String(100);
            NOMBRE_TIPO_DOCUMENTO : String(255);
            ESTADO                : String(25);
            ID_NODO               : Integer;
};


entity ROLESXACCIONES {
        key ID_ROLESXACCIONES : Integer not null;
            ID_ROLES          : Integer not null;
            ID_ACCION         : Integer not null;
};


entity ROLESXTD {
        key ID_ROLESXTD       : Integer not null;
            ID_ROLES          : Integer not null;
            ID_TIPO_DOCUMENTO : Integer;
};


entity ROLESXUSUARIOS {
        key ID_ROLESXUSUARIO : Integer not null;
            ID_ROLES         : Integer not null;
            ID_USUARIO       : Integer;
};


entity SAP_ESTANDAR {
        key ID_SAP_ESTANDAR : Integer not null;
            ID_PRO          : Integer;
            ID_APP          : Integer;
            TRX_SAP         : String(10);
            BUS             : String(7);
            ID_KEY          : String(50);
};


entity SISTEMA_REF {
        key ID_SISTEMA        : Integer not null;
            ID_CATEGORIA_NODO : Integer not null;
            IP                : String(40) not null;
            USUARIO           : String(40) not null;
            PASSWORD          : String(40) not null;
};


entity SUPLENTE {
        key ID_SUPLENTE         : Integer not null;
            USUARIO_TITULAR     : String(100);
            USUARIO_REEMPLAZO   : String(100);
            FECHA_INICIO        : Date;
            FECHA_TERMINO       : Date;
            ESTADO              : Integer;
            ID_USUARIO_SUPLENTE : Integer;
            ID_EST_LIB          : Integer;
            ID_USUARIO_TITULAR  : Integer;
};


entity TAG {
        key ID_TAG     : Integer not null;
            NOMBRE_TAG : String(300) not null;
            ESTADO     : String(20);
};


entity TAGXPORTAL {
        key ID_TAGXPORTAL : Integer not null;
            ID_TAG        : Integer not null;
            ID_CATEGORIA  : Integer not null;
};


entity TAGXTD {
        key ID_TAGXTD         : Integer not null;
            ID_TAG            : Integer not null;
            ID_TIPO_DOCUMENTO : Integer not null;
};


entity TIPODOCUMENTOXALERTA {
        key ID_TIPODOCUMENTOXALERTA : Integer not null;
            ID_TIPO_DOCUMENTO       : Integer not null;
            ALE_ID                  : Integer not null;
};


entity TIPO_ALMACENAMIENTO {
        key ID_TIPO_ALMACENAMIENTO : Integer not null;
            NOMBRE_ALMACENAMIENTO  : String(255);
};


entity TIPO_BUSQUEDAS {
        key ID_TIPO_BUSQUEDA     : Integer not null;
            DESCRIPCION_BUSQUEDA : String(100) not null;
};


entity TIPO_CATEGORIA {
        key ID_TIPO : Integer not null;
            NOMBRE  : String(40) not null;
};


entity TIPO_DOCUMENTO {
        key ID_TIPO_DOCUMENTO          : Integer not null;
        key ID_NODO                    : Integer not null;
            ID_WF                      : Integer not null;
            NOMBRE                     : String(300) not null;
            DESCRIPCION                : String(300) not null;
            G_DIGITAL                  : String(255);
            DESCRIPCION_DIGITAL        : String(255);
            ORIGEN                     : String(100);
            ID_TIPO_DOCUMENTO_ORIGINAL : Integer;
};


entity TIPO_DOCUMENTO_DIGITAL {
        key ID_TIPO_DOCUMENTO_DIGITAL : Integer not null;
            ID_TIPO_DOCUMENTO         : Integer not null;
            ID_NODO                   : Integer not null;
            EMPRESA_RESPONSABLE       : Integer not null;
            DESCRIPCION               : String(300) not null;
            G_FISICA                  : String(200) not null;
            TEMPORABILIDAD            : String(20);
            OBLIGATORIEDAD            : String(2);
            CARDINALIDAD              : String(20);
            RESPONSABLE               : String(255);
            FECHA_CREACION            : Date;
};


entity TIPO_DOCUMENTO_FISICO {
        key ID_TIPO_DOCUMENTO_FISICO : Integer not null;
            ID_TIPO_DOCUMENTO        : Integer not null;
            ID_NODO                  : Integer not null;
            EMPRESA_RESPONSABLE      : Integer not null;
            DESCRIPCION              : String(300) not null;
            G_FISICA                 : String(200) not null;
            TEMPORABILIDAD           : String(20);
            OBLIGATORIEDAD           : String(2);
            CARDINALIDAD             : String(20);
            RESPONSABLE              : String(255);
            FECHA_CREACION           : Date;
};

entity TIPO_USUARIO {
        key ID_TIPO_USUARIO   : Integer not null;
            ID_USUARIO        : Integer not null;
            ROL               : String(30) not null;
            ID_TIPO_DOCUMENTO : Integer;
};

entity TIPO_VISUALIZADOR {
        key ID_TIPO_VISUALIZADOR : Integer not null;
            NOMBRE               : String(40) not null;
            APP                  : String(30);
};


entity TRANSFERENCIA {
        key ID_TRANSFERENCIA : String(40) not null;
            BUS              : String(20);
            TABLA            : String(50);
            ID_REPROCESO     : String(40);
            ESTADO           : Integer;
            FECHA            : Date;
            HORA             : Time;
            APLICACION       : Integer;
            PROCESO          : Integer;
            TIPO_DOCUMENTO   : Integer;
};


entity USUARIO {
        key ID_USUARIO       : Integer not null;
            USERNAME         : String(30) not null;
            APELLIDO         : String(20) not null;
            CORREO           : String(70) not null;
            ESTADO           : String(20) not null;
            FECHA_CREACION   : String(15);
            NOMBRE           : String(40);
            GERENCIA         : String(100);
            SUBGERENCIA      : String(100);
            AREA             : String(100);
            OBJIDGERENCIA    : String(100);
            OBJIDSUBGERENCIA : String(100);
            OBJIDAREA        : String(100);
            TIPO             : String(20);

};


entity USUARIO_PORTAL {
        key ID_USUARIO_PORTAL : Integer not null;
            USERNAME          : String(30) not null;
            ID_USUARIO        : Integer not null;
            ID_PORTAL         : Integer not null;
};


entity VALIDACION {
        key ID_VALIDACION   : Integer not null;
            ID_CATEGORIA    : Integer not null;
            TIPO_DATO       : String(50);
            TABLA_SAP       : String(100);
            CAMPO_TABLA_SAP : String(300);
            LARGO_DATO      : String(10);
            FORMATO_FECHA   : String(40);
};


entity VERSIONAMIENTO {
        key ID_VERSIONAMIENTO : Integer not null;
            VERSION           : Integer not null;
            ID_DETALLE        : Integer not null;
            URL_DETALLE       : String(500) not null;
            FECHA_CARGA       : Date;
            SIZE              : Double;
            USUARIO           : String(500);
            URL_BEFORE        : String(500);
            ACTIVO            : String(1);
};


entity VINCULACION {
        key ID_VINCULACION    : Integer not null;
            ID_TIPO_DOCUMENTO : Integer not null;
            ID_NODO           : Integer not null;
            ID_NODO_VINCULA   : Integer;
            NODO_PORTAL       : Integer;
};


entity VISITAS {
        key ID_VISITAS : Integer not null;
            ID_USUARIO : Integer not null;
            FECHA      : Date;
            HORA       : Time;
            ID_PORTAL  : Integer;
};


entity VISUALIZADOR {
        key ID_VISUALIZADOR : Integer not null;
            ID_USUARIO      : Integer not null;
            ID_CATEGORIA    : Integer not null;
};
