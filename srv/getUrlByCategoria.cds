@protocol: 'rest'
@path: '/getUrlByCategoria'
service getUrlByCategoria {
    @open
    type object {};
    
    function get (idCategoria: Integer)                     returns array of object;

}