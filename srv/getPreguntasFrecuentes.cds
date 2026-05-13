@protocol: 'rest'
@path: '/getpreguntasfrecuentes'
service getPreguntasFrecuentes {
    @open
    type object {};
    
    function get(idCategoria: Integer)                  returns object;

}