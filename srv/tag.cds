@protocol: 'rest'
@path    : '/tag'
service tag {
    @open
    type object {};

    
    action updateTagPortales(input: object)                              returns object;
    action updateTagTD(input: object)                                  returns object;

    function getListTagXTD()                                       returns array of object;
    function getListUser()                                         returns array of object;
};