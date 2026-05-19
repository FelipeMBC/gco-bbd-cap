@protocol: 'rest'
@path: '/monitor'
service monitor {
    @open
    type object {};
    
    action getTransferencias(input: object)                     returns object;
    action reprocesarTransferencia(input: object)               returns object;

}