@protocol: 'rest'
@path: '/getBusquedaByMetadata'
service getBusquedaByMetadata {
    @open
    type object {};
    
    action update(input: object)   returns object;
}