@protocol: 'rest'
@path: '/getMetadataTipoDocumento'
service getetadataTipoDocumento {
    @open
    type object {};

    action getValue(input: object)         returns object;
    function get(tipoDocumento: Integer)   returns array of object;
    action getData(input: object)          returns array of object;
    function getListDocObl(tipoDocumento: Integer) returns array of object;
    function getList(tipoDocumento: Integer) returns array of object;
    action getIdMetadata(input: object) returns object;
    function update(tipoDocumento: Integer) returns array of object;
    

}