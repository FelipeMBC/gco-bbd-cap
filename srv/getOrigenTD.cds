@protocol: 'rest'
@path    : '/getOrigenTD'
service getOrigenTD {
    @open
    type object {};

    function get(tipoDocumento: Integer)       returns String;
  
}