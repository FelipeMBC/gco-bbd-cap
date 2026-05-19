@protocol: 'rest'
@path: '/reportes'
service reportes {
    @open
    type object {};

    action getPortalXUser(json: object)                        returns array of object;
    action planillaArchivosProveedorDigital(input: object)     returns array of object;
    action planillaArchivosPorVencerDigital(input: object)     returns array of object;  
    action planillaArchivosProveedorFisico(input: object)      returns array of object;
    action planillaArchivosPorVencerFisico(input: object)      returns array of object;
    action planillaDocumentosProveedorDigital(input: object)   returns array of object;
    action planillaDocumentosPorVencerDigital(input: object)   returns array of object;     
    action planillaDocumentosProveedorFisico(input: object)    returns array of object;
    action planillaDocumentosPorVencerFisico(input: object)    returns array of object;
    action planillaWorkflows(input: object)                    returns array of object;
    action planillaCriterios(input: object)                    returns array of object;
    action planillaTags(input: object)                         returns array of object;
    action documentosPorVencerFisico(input: object)            returns array of object;
    action documentosPorVencerDigital(input: object)           returns array of object;
    action visitasPortal(input: object)                        returns array of object;   
    action documentosCargados(input: object)                   returns array of object; 
    action gigasUsados(input: object)                          returns array of object;
    action documentosPorProveedorFisico(input: object)         returns array of object;
    action documentosPorProveedorDigital(input: object)        returns array of object;
    action cincoTagsMasBuscados(input: object)                 returns array of object;  
    action topCriterios(input: object)                         returns array of object;
    action documentosCargadosWorkflow(input: object)           returns array of object; 
    action documentosAprobados(input: object)                  returns array of object;
    action documentosRechazados(input: object)                 returns array of object;
    action topUsuMayorTiempoAprobacion(input: object)          returns array of object;
    action topUsuMayorTiempoRechazo(input: object)             returns array of object;
    action topUsuMenorTiempoAprobacion(input: object)          returns array of object;
    action topUsuMenorTiempoRechazo(input: object)             returns array of object;
    action archivosPorProveedorDigital(input: object)          returns array of object;
    action archivosPorProveedorFisico(input: object)           returns array of object;
    action archivosPorVencerDigital(input: object)             returns array of object;
    action archivosPorVencerFisico(input: object)              returns array of object;
    action archivosCargados(input: object)                     returns array of object;   
}