@protocol: 'rest'
@path: '/updateEstadoProceso'
service updateEstadoProceso {
    @open
    type object {};
    
    action update(input: object)                     returns object;

}