@protocol: 'rest'
@path: '/upDocument'
service upDocument {
    @open
    type object {};
    
    action getNodoData  (input: object)                     returns object;
 
}