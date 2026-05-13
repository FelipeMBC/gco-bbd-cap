@protocol: 'rest'
@path    : '/roles'
service roles {
    @open
    type object {};

    action update(input: object)                              returns object;
    action updateTD(input: object)                            returns object;

    function getListUser()                                    returns object;
    function getAccionesDisponibles(idRol : Integer)          returns object;
    function getAcciones(idRol : Integer)                     returns object;
    function getListNodos(idRol : Integer)                    returns object;

      
};
