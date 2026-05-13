@protocol: 'rest'
@path: '/servicesTubo'
service servicesTubo {
    @open
    type object {};

    function getFile()                                             returns object;
    function getTD(ID_TIPO_DOCUMENTO: Integer)                     returns object;
    function getAplicaciones()                            returns array of object;
    function getProcesos(idApp: Integer)                           returns object;
    function getTDocs(idApp: Integer, idProceso: Integer)          returns object;
    function getNodos( idTipoDoc: Integer)                         returns object;
    function getTDBiblioteca(ID_TIPO_DOCUMENTO: Integer)           returns object;
    function getEstructuraMD(ID_APP: Integer, ID_PROCESO: Integer) returns object;

}