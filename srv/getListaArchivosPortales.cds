@protocol: 'rest'
@path    : '/getListaArchivosPortales'
service getListaArchivosPortales {
    @open
    type object {};

    
    action getData12(input: object) returns object;

}
