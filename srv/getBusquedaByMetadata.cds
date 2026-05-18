@protocol: 'rest'
@path: '/getBusquedaByMetadata'
service getBusquedaByMetadata {
    @open
    type object {};
    
    function update(ND: String)   returns object;
}