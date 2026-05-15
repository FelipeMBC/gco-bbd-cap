@protocol: 'rest'
@path: '/updateTipoDocumento'
service updateTipoDocumento {
    @open
    type object {};

    action deleteDocumento(input: object)          returns String;
    action updateDocumento(input: object)          returns String;
    action update(input: object)                   returns String;
    action updateAFisico(input: object)            returns String;
    action updateADigital(input: object)           returns String;
    action updateMetadata(input: object)           returns String;
    action updateNiveles(input: object)            returns String;
    action updateElib(input: object)               returns object;
    action updateFormato(input: object)            returns String;
  
}