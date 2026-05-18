@protocol: 'rest'
@path: '/updateDocument'
service upDocument {
    @open
    type object {};
    
    function getNodo  (idCat: Integer)     returns object;
 
}