@protocol: 'rest'
@path: '/getModelDocumentos'
service getModelDocumentos {
    @open
    type object {};
    

    function getModelDocumento(idUsuario: Integer, idPortal: Integer)         returns object;
    function getInstancia(tipoDocumento: Integer, nameUser: String)           returns object;
    function getModelTipoDocumento(tipoDocumento: Integer, idDoc: Integer)    returns object;

    action updateDocumento(input: object)   returns object;
    
}