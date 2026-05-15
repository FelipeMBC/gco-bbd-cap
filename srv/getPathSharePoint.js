//////////////////////
///////SETIMGPORTAL////
///////////////////////

const cds = require("@sap/cds");
const req = require("express/lib/request");
const res = require("express/lib/response");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  async function getImgBanner(nombreArchivo, idPadre) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT URL_IMAGEN, URL_ICONO FROM DB_CATEGORIA
               WHERE TITULO = ? AND ID_PADRE = ?`;
      const result = await cds.run(sql, [nombreArchivo, idPadre]);

      for (const gi of result) {
        let record = {};
        record.URL_ADJUNTO = gi.URL_IMAGEN;
        record.TITULO = "IMAGEN BANNER PORTAL";

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getImgBanner", query: sql }
    }
    return outPut;
  };

  async function getImgIcono(nombreArchivo, idPadre) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT URL_IMAGEN, URL_ICONO FROM DB_CATEGORIA
               WHERE TITULO = ? AND ID_PADRE = ?`;
      const result = await cds.run(sql, [nombreArchivo, idPadre]);

      for (const gi of result) {
        let record = {};
        record.URL_ADJUNTO = gi.URL_ADJUNTO;
        record.TITULO = "IMAGEN ICONO PORTAL";

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getImgIcono", query: sql }
    }
    return outPut;
  };

  async function getImg(nombreArchivo, idPadre) {
    let sql;
    let outPut = [];

    try {
      sql = `SELECT URL_IMAGEN, URL_ICONO FROM DB_CATEGORIA
               WHERE TITULO = ? AND ID_PADRE = ?`;
      const result = await cds.run(sql, [nombreArchivo, idPadre]);

      for (const gi of result) {
        let record = {};
        record.BANNER = await getImgBanner(nombreArchivo, idPadre);
        record.ICONO = await getImgIcono(nombreArchivo, idPadre);

        outPut.push(record);
      }
    } catch (e) {
      return { error: e.message, accion: "getImg", query: sql }
    }
    return outPut;
  };

  this.on('get', async (req) => {
    const { nombreArchivo, idPadre } = req.data.input;
    const visualizadores = await getImg(nombreArchivo, idPadre);
    return visualizadores;
  });

  this.on('getBreadCrumbs', async (req) => {
    const { idPadre } = req.data;
    let sql, record;
    let outPut = [];

    try{
      sql = "SELECT BREADCRUMS FROM DB_CATEGORIA WHERE ID_CATEGORIA = ?";
      const result = await cds.run(sql, [idPadre]); 
      for (const rs of result){
        let record;
        record = rs.BREADCRUMS;

        outPut.push(record);
      }
      
    }catch(e){
      return { error: e.message, accion: "getBreadCrumbs", query: sql }
    }
    return outPut;;

  });

});
