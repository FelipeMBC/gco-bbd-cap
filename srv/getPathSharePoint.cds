@protocol: 'rest'
@path    : '/getPathSharePoint'
service getPathSharePoint {
    @open
    type object {};

    action get(input: object)            returns array of object;
    function getBreadCrumbs(idPadre: Integer) returns array of object;

}
