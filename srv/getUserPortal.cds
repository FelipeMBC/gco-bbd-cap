@protocol: 'rest'
@path    : '/getUserPortal'
service getUserPortal {
    @open
    type object {};

    function getUserName(user: Integer)             returns object;
  
}
