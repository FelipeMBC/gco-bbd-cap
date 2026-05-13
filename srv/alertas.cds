@protocol: 'rest'
@path    : '/alertas'
service alertas {
    @open
    type object {};

    action update(input: object)                          returns object;
    action updateActividades(input: object)               returns object;
    action updateTipDoc(input: object)                    returns object;
    
    function getListPortales(idAlertas: Integer)          returns array of object;
    function getListCantPortales(idAlertas: Integer)      returns object;
    function getListActividades(idAlertas: Integer)       returns array of object;
    function getListTipDoc(idAlertas: Integer)            returns array of object;

   
};