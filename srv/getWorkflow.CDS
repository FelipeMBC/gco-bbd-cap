@protocol: 'rest'
@path: '/getworkflow'
service getworkflow {
    @open
    type object {};
    
    action getData30     (input: object)                     returns object;

}