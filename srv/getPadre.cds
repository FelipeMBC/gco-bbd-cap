@protocol: 'rest'
@path: '/getPadre'
service getPadre {
    @open
    type object {};
    
    action getDataEspejo    (input: object)              returns object;
    action getTD            (input: object)              returns object;
    action getData18        (input: object)              returns object;
    action deleteDetalle    (input: object)              returns object;


}