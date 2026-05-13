@protocol: 'rest'
@path    : '/getInstanciaWorkflow'
service getInstanciaWorkflow {
    @open
    type object {};

    
    action getUpdateDate(input: object) returns object;

    function getData8(input: object) returns object;
}
