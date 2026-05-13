@protocol: 'rest'
@path: '/getContacto'
service getContacto {
    @open
    type object {};
    
    action getData3(input: object)   returns object;
}