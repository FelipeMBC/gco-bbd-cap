@protocol: 'rest'
@path: '/updateMetadataTipoDocumento'
service updateMetadataTipoDocumento {
    @open
    type object {};
    
    action update(input: object)                      returns object;
 
}