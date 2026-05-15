@protocol: 'rest'
@path: '/deleteUserPortal'
service deleteUserPortal {
    @open
    type object {};
    
    action delete(input: object)   returns String;
}