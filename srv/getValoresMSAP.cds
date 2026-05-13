@protocol: 'rest'
@path    : '/getValoresMSAP'
service getValoresMSAP {
    @open
    type object {};

    function get(idCategoria: Integer)             returns object;
  
}