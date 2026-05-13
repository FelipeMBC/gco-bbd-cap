@protocol: 'rest'
@path    : '/getLogin'
service getLogin {
    @open
    type object {};

    action verificaPass(input: object) returns object;
    action verificaPassAprobador(input: object) returns object;
}
