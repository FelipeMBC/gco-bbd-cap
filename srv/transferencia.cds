@protocol: 'rest'
@path: '/transferencia'
service transferencia {
    @open
    type object {};
    
    action createTransferencia (input: object)       returns object;


}