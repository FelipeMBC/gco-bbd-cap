@protocol: 'rest'
@path    : '/getInstanciaWorkflow'
service getInstanciaWorkflow {
    @open
    type object {};

    action update(input: object)             returns object;
    function get(tipoDocumento: Integer)     returns object;
}
