@protocol: 'rest'
@path    : '/servicesArchivos'
service servicesArchivos {
    @open
    type object {};

    action insertContenido(json : object)                                   returns object;
    action insert(json : object)                                           returns object;

    function existeAlmacenamiento(idTipoDocumento : Integer)                returns array of object;
    function getUrl(nodoHijo : Integer)                                     returns array of object;

};