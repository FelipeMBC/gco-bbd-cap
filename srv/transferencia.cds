@protocol: 'rest'
@path: '/transferencia'
service transferencia {
    @open
    type object {};
    
    action createTransferencia(json: object)       returns object;


}