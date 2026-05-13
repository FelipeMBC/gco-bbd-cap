@protocol: 'rest'
@path    : '/services'
service services {
    @open
    type object {};

    action getDetVis(
        Almacenamiento : String,
        fechaInicial   : String,
        fechaTope      : String
    ) returns array of {
        NOMBREARC                     : String;
        NOMBREUSU                     : String;
        FECHA_CARGA                   : String;
        NOMBRETIPDOC                  : String;
        FECHA_VENCIMIENTO             : String;
        NOMBRE_ALMACENAMIENTO         : String;
        ID_PROVEEDORES_ALMACENAMIENTO : Integer;
    }; 
    action updateRecientes(json: object)            returns object;
    action updateMetadata(json: object)              returns object;
    action updateDocument(json: object)              returns array of object;
    action getPermisoCargaArchivo(json: object)      returns array of object;
    action getNodoJerarquico( json: object)          returns object;
    action getTagxPortal(json: object)               returns array of object;
    action sendMailMasivo(input: object)             returns object;
    action getListAlert(json: object)                returns object;
    action getAlertas(json: object)                  returns object;
    action getBusquedaFiltros(json: object)          returns object;
    action validacionUsuarioCategoria(json: object)  returns object;
    action busquedaHeader(json: object)              returns object;
    action countNotificationAprob(json: object)      returns object;
    action getUserAdministrator(json: object)        returns object;
    action updateFavoritos(json: object)             returns object;
    action propiedadesLista(json: object)            returns object;
    action getContacto(json: object)                 returns object;
    action getFavoritos(json: object)                returns array of object;
    action getSuggestionNB(json: object)             returns array of object;
    action getMetadataTipoDocumento(json: object)    returns object;
    action getSuggestionTipoDocumento(json: object)  returns object;
    action getBusquedaTipoDocumento(json: object)    returns object;
    action getListaMetadata(json: object)            returns array of object;
    action getPreguntasFrecuentes(json: object)      returns object;
    action getRolesTD(json: object)                  returns array of object;
    action getTipoDocumento(json: object)            returns array of object;
    action getTipoDocumentoPorNodo(json: object)     returns array of object;
    action getUrlDocumento(json: object)             returns array of object;
    action activaVersion(json: object)               returns array of object;
    action generaVersion(json: object)               returns array of object;
    action arbolDeNavegacionPortal(json: object)     returns array of object;
    action busquedaPermiso(json: object)             returns array of object;
    action getRecientes(json: object)                returns array of object;
    action copyTD(json: object)                      returns array of object;


    function getAyuda()                                        returns array of object;
    function getAmbiente()                                     returns object;
    function portalesPorUsuario(ID_USUARIO: Integer)           returns array of object;
    function getVersionDetalle(idDetalle: Integer)             returns array of object;
    function getPermisoCargaArchivoContenido( idCat: Integer)  returns array of object;
    function getListColumnTable( table: String )               returns object;
    function getObjID( idTD: Integer )                         returns object;
    function getListTD()                                       returns array of object;
    function getListTDAtributo( idTD: Integer )                returns object;
    function datosUserPortal( CORREO: String )                 returns object;
    function getAllPermisos()                                  returns array of object;
    function getPermisosNodo()                                 returns array of object;
    









     
};