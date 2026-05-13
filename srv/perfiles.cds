@protocol: 'rest'
@path    : '/perfiles'
service perfiles {
    @open
    type object {};
    
    action updatePerfilesUsuario(input: object)                returns object;
    action update(input: object)                               returns object;

    function getListUser()                                     returns object;
    function getListNodos(idPerfil : Integer)                  returns object;
    function getValidacion(idUser : Integer, idNodo : Integer) returns object;
  
};