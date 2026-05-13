@protocol: 'rest'
@path    : '/getFormato'
service getFormato {
    @open
    type object {};

    action   getNodoEstructura(input: object) returns object;

    function getData5()                       returns object;
}
