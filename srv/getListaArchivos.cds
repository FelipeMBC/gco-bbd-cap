@protocol: 'rest'
@path    : '/getListaArchivos'
service getListaArchivos {
    @open
    type object {};

    action getData12(input: object) returns object;
}
