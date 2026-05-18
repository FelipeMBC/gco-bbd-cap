@protocol: 'rest'
@path: '/getPadre'
service getPadre {
    @open
    type object {};

    action delete(input: object)                  returns object;
    function getEspejo(idPadre: Integer)          returns object;
    function getTD(idPadre: Integer)              returns object;
    function get(idPadre: Integer)                returns object;


}