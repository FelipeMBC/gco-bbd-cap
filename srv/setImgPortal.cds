@protocol: 'rest'
@path: '/setImgPortal'
service setImgPortal {
    @open
    type object {};

    function get(nombreArchivo: String, idPadre: Integer)    returns array of object;  
    function getUrlArchivo(idDocumento: Integer)             returns array of object;



}