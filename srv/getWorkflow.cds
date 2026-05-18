@protocol: 'rest'
@path: '/getWorkflow'
service getWorkflow {
    @open
    type object {};
    
    function get(idTD: Integer)      returns array of object;

}