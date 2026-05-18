@protocol: 'rest'
@path: '/obtenerToken'
service obtenerToken {
    @open
    type object {};

    function getTokenValue()         returns object;
    

}