@protocol: 'rest'
@path    : '/getUsuariosAprobadores'
service getUsuariosAprobadores {
    @open
    type object {};

    function get()                        returns array of object;
    function getTD()                      returns array of object;
    function getNivel(id: Integer)        returns object;
    function getSuplentes()               returns array of object;
  
}
