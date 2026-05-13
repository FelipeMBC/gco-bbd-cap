@protocol: 'rest'
@path: '/getRolUser'
service getRolUser {
    @open
    type object {};
    
    function get (userId: Integer, idTD: Integer)            returns object;


}