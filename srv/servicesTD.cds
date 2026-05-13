@protocol: 'rest'
@path    : '/servicesTD'
service servicesTD {
    @open
    type object {};

    action getListaTDFiltro(input: object)                      returns array of object;
    action insertTD(input: object)                              returns object;
    action deleteCat(input: object)                             returns object;
    action habilitaCascada(input: object)                       returns object;  
    action editTD(input: object)                                returns object;
    action getMD(input: object)                                 returns array of object;
    action insertMD(json: object)                              returns object;
    action getBusquedaArc(json: object)                         returns object;
    action getBusquedaAllArc(input: object)                     returns object;
    action getBusquedaFiltros(input: object)                    returns object;
    action getMetadata(json: object)                           returns object;

    function getLabel(nodoTD : Integer)                         returns object;
    function getNombreTD(idTD : Integer)                        returns array of object;
    function getFiltros(idTD : Integer)                         returns array of object;
    function getNodosDinamicos(nodo : Integer)                  returns array of object;
    function obtieneVinculacion(idCat : Integer)                returns array of object;
    function getTDRefencia(idTD : Integer)                      returns array of object;
    function verificaVinc(idTD : Integer, nodo : Integer)       returns object;
    function getListArc(idCat : Integer)                        returns object;
    function getNodoVisiblePadre(idCat : Integer)               returns object;
    function getNodosEstructura(idTD : Integer)                 returns array of object;
    function getListaTD()                                       returns array of object;
    function getArchivo(idTD : Integer)                         returns object;
    function getListaTDNodo(idTD : Integer)                     returns array of object;
    function getNodoVisible(idCat : Integer)                    returns object;
    function validaMD(idTD : Integer)                           returns object;
    function getListaProcesos()                                 returns object;
    function getListaArc(idCat: Integer)                        returns array of object;
   
};
