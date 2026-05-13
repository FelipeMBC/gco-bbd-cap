@protocol: 'rest'
@path: '/getBusquedaAll'
service getBusquedaAll {
    @open
    type object {};
    
    function get(texto: String, nodo: Integer)     returns array of object;
}