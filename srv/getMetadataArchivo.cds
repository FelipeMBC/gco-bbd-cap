@protocol: 'rest'
@path    : '/getMetadataArchivo'
service getMetadataArchivo {
    @open
    type object {};

    function get(idDocumento: Integer)                  returns array of object;
  
}