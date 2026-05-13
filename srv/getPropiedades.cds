@protocol: 'rest'
@path: '/getPropiedades'
service getPropiedades {
    @open
    type object {};
    
    function getPropiedadesLista(idCategoria: Integer, flag: String)       returns array of object;
    function get(idCategoria: Integer, flag: String)                       returns array of object;

}