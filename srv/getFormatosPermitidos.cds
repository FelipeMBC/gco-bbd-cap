@protocol: 'rest'
@path    : '/getformatospermitidos'
service getFormatosPermitidos {
    @open
    type object {};

    function get(idTipoDocumento: Integer)   returns array of object;

}
