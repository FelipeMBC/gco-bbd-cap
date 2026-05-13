@protocol: 'rest'
@path: '/functionIndex'
service functionIndex {
    @open
    type object {};
    
    action insertIndex(json: object)   returns object;
}