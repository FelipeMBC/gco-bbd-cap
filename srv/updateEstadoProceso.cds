@protocol: 'rest'
@path: '/updateEstadoProceso'
service updateEstadoProceso {
    @open
    type object {};
    
    action updateProc    (input: object)                     returns object;

}