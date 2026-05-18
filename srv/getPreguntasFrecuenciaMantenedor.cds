@protocol: 'rest'
@path: '/getPreguntasFrecuenciaMantenedor'
service getPreguntasFrecuenciaMantenedor {
    @open
    type object {};
    
    function get(idCategoria: Integer)        returns object;

}