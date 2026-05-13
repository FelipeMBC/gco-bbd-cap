@protocol: 'rest'
@path: '/cutAndPaste'
service cutAndPaste {
    @open
    type object {}; 
    
    action paste(input: object)   returns object;
}