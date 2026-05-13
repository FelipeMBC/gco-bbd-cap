@protocol: 'rest'
@path    : '/getPathSharePoint'
service getPathSharePoint {
    @open
    type object {};

    action getData31(input: object)      returns object;
    action getDataUrlImen(input: object) returns object;

}
