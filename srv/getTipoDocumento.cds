@protocol: 'rest'
@path: '/getTipoDocumento'
service getTipoDocumento {
    @open
    type object {};

    function getListBase(idCat: Integer)                  returns object;
    function getIdNodo(idCat: Integer)                    returns object;
    function getTag(idTD: Integer)                        returns object;
    function getList(idCat: Integer)                      returns array of object;
    function getTDSet(idCat: Integer, idUser: Integer)    returns array of object;
    function get(idCat: Integer, idUser: Integer)         returns array of object;
    function getTipoDocumentoPortal(idCat: Integer,
                                    idUser: Integer)      returns array of object;
    function getTipoDocumento(idCat: Integer,
                              idUser: Integer)            returns array of object;
    


}