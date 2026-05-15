@protocol: 'rest'
@path    : '/alertas'
service alertas {
    @open
    type object {};

    action listar(input: object) returns array of object;

    action obtener(input: object) returns array of object;

    action crear(input: object) returns array of object;

    action actualizar(input: object) returns array of object;

    action eliminar(input: object) returns array of object;

    action actividades(input: object) returns array of object;
}