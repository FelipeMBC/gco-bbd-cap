@protocol: 'rest'
@path: '/updateNombreDocumento'
service updateNombreDocumento {
    @open
    type object {};
    
    action updateCarpeta   (input: object)                     returns object;
    action updateNombreData    (input: object)              returns object;


}