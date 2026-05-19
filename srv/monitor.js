////////////////////
///////MONITOR//////
////////////////////

const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to("db");

  this.on('getTransferencias', async (req) => {
    let results = []
    const { f1, f2, estado } = req.data.input;
    try {

      const sql = `
        SELECT
          tr.ID_TRANSFERENCIA,
          tr.ID_REPROCESO,
          tr.FECHA,
          tr.HORA,
          tr.ESTADO,
          COUNT(p.ID_PROCESO_TRANSFERENCIA) AS PROCESOS_FALLADOS
        FROM DB_TRANSFERENCIA tr
        LEFT OUTER JOIN DB_PROCESO_TRANSFERENCIA p
          ON tr.ID_TRANSFERENCIA = p.TRANSFERENCIA
         AND p.ESTADO = 2
        WHERE tr.FECHA BETWEEN ? AND ?
          AND tr.ESTADO LIKE ?
        GROUP BY
          tr.ID_TRANSFERENCIA, tr.ID_REPROCESO, tr.FECHA, tr.HORA, tr.ESTADO`;

      const result = await cds.run(sql, [f1, f2, estado]);

      for (const gtfs of result) {
        let result = {};

        result.TRANSFERENCIA = gtfs.ID_TRANSFERENCIA;
        result.REPROCESO = gtfs.ID_REPROCESO;
        result.FECHA_ST = String(gtfs.FECHA);
        result.FECHA = gtfs.FECHA;
        result.HORA_ST = String(gtfs.HORA);
        result.HORA = gtfs.HORA;
        result.ESTADO = gtfs.ESTADO;
        result.PROCESOS_FALLADOS = gtfs.PROCESOS_FALLADOS;

        results.push(result);
      }

      return results;

    } catch (e) {
      return { error: e.message, accion: "getTransferencias" }
    }
  });

  function generateId() {
    const length = 5;
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    const d = new Date();
    const date = d.getDate() + "" + d.getMonth() + "" + d.getFullYear();
    const h = d.getHours() + "" + d.getMinutes();
    const rand = Math.floor(Math.random() * 1000) + 1;

    return `${date}_${rand}_${result}_${h}`;
  }

  async function crearTransferencia(id, json) {
    let sql;

    try {
      const bus = json.BUS;
      const tabla = json.TABLA;
      // const objId = json.OBJ_ID;
      const repro = json.ORIGINAL;
      const estado = 1;

      sql = `
      INSERT INTO DB_TRANSFERENCIA
        (ID_TRANSFERENCIA, BUS, TABLA, ID_REPROCESO, ESTADO)
      VALUES (?, ?, ?, ?, ?)`;

      await cds.run(sql, [
        id,
        bus,
        tabla,
        // objId,
        repro,
        estado
      ]);

      return { RESULT: true };

    } catch (e) {
      return {
        RESULT: false,
        REASON: e.message,
        accion: "crearTransferencia",
        query: sql
      };
    }
  }

  this.on("reprocesarTransferencia", async (req) => {
    try {
      const { json } = req.data.input;

      const id = generateId();
      const ct = await crearTransferencia(id, json);

      if (!ct.RESULT) {
        return req.reject(400, "Creación transferencia  " + ct.REASON);
      }

      return {
        RESULT: true,
        ID_TRANSFERENCIA: id
      };

    } catch (e) {
      return {
        error: e.message,
        accion: "reprocesarTransferencia"
      };
    }
  });

});