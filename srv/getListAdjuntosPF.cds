@protocol: 'rest'
@path    : '/getListAdjuntosPF'
service getListAdjuntosPF {
    @open
    type object {};

    function get(idPregunta: Integer)          returns object;

}
