 /////////////////////////////////////
  ///////UPDATEMETADATATIPODOCUMENTO////
  //////////////////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  function getFecha(fecha) {
    const fecha1 = new Date(fecha);
    fecha1.toUTCString();
    const year = fecha1.getFullYear();
    const mes = ((fecha1.getMonth() + 1) < 10) ? "0" + (fecha1.getMonth() + 1) : (fecha1.getMonth() + 1);
    const dia = (fecha1.getDate() < 10) ? "0" + fecha1.getDate() : fecha1.getDate();
    const fechaFinal1 = year + "/" + mes + "/" + dia;



    return fechaFinal1;
  };

  function getHora(text) {

    const seconds = text.slice(text.length - 2, text.length);
    const minutes = text.slice(text.length - 5, text.length - 3);
    const hour = text.slice(0, text.length - 6);
    const hora = "PT" + hour + "H" + minutes + "M" + seconds + "S";
    return hora;
  };

  async function updateTextoandNumeric(value, tipoDocumento, atributo) {
    try {
      const sql = `
      UPDATE DB_METADATA
      SET VALUE = ?
      WHERE ID_TIPO_DOCUMENTO = ?
        AND ATRIBUTO = ?
    `;

      await cds.run(sql, [value, tipoDocumento, atributo]);

      return sql;
    } catch (e) {
      return e.message;
    }
  };

  async function updateDate(value, tipoDocumento, atributo) {
    try {
      const svalueDate = getFecha(value);

      const sql = `
      UPDATE DB_METADATA
      SET VALUE = ?, VALUEDATE = ?
      WHERE ID_TIPO_DOCUMENTO = ?
        AND ATRIBUTO = ?
    `;

      await cds.run(sql, [svalueDate, svalueDate, tipoDocumento, atributo]);

      return sql;
    } catch (e) {
      return "FALLO";
    }
  };

  async function updateTime(value, tipoDocumento, atributo) {
    try {
      const svalueTime = getHora(value);   //No Existe Value, se omite
      const sql = `
      UPDATE DB_METADATA
      SET VALUE = ?, VALUETIME = ?
      WHERE ID_TIPO_DOCUMENTO = ?
        AND ATRIBUTO = ?
    `;
      await cds.run(sql, [value, svalueTime, tipoDocumento, atributo]);
      return sql;
    } catch (e) {
      return "FALLO";
    }
  };

  this.on('update', async (req) => {
    const { type, value, tipoDocumento, atributo } = req.data.input;

    if (type === "date") {
      return await updateDate(value, tipoDocumento, atributo);
    } else if (type === "time") {
      return await updateTime(value, tipoDocumento, atributo);
    } else {
      return await updateTextoandNumeric(value, tipoDocumento, atributo);
    }
  });

});