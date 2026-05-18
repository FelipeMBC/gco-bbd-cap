@protocol: 'rest'
@path: '/updateNombreDocumento'
service updateNombreDocumento {
    @open
    type object {};
    
    action updateCarpeta(input: object)       returns String;
    action update(input: object)              returns String;


}