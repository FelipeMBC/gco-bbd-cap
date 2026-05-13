@protocol: 'rest'
@path    : '/getIdUser'
service getIdUser {
    @open
    type object {};

    function get(nodo: Integer, idCategoria: Integer)        returns object;

}
