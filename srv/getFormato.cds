@protocol: 'rest'
@path    : '/getFormato'
service getFormato {
    @open
    type object {};

    action   getNodoEstructura(input: object) returns object;
    function get()                       returns array of object;
}
