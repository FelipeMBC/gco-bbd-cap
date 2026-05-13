  ////////////////////////
  ///////TRANSFERENCIA////
  ////////////////////////

  const cds = require("@sap/cds");

  module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");

  async function getIdObjetoTransferencia() {
    let id;

    try {
      const sql = `SELECT ID_OBJETO_TRANSFERENCIA.NEXTVAL
                     AS ID FROM DUMMY`;
      const result = await cds.run(sql);

      for (const got of result) {
        id = got.ID;
      }
    } catch (e) {
      return null;
    }
  };

  async function getIdFiltro() {
    let id;

    try {
      const sql = `SELECT ID_FILTRO.NEXTVAL
                    AS ID FROM DUMMY`;
      const result = await cds.run(sql);

      for (const gf of result) {
        gf.ID;
      }

      return id;
    } catch (e) {
      return null;
    }
  };

  async function getIdConsulta() {
    let id;

    try {
      const sql = `SELECT ID_CONSULTA_TRANSFERENCIA.NEXTVAL
                    AS ID FROM DUMMY`;
      const result = await cds.run(sql);

      for (const gc of result) {
        id = gc.ID
      }

      return id;
    } catch (e) {
      return null;
    }
  };


  async function createFiltros(transferencia, filtros) {
    try {
      for (const f of filtros) {
        const id = await getIdFiltro();

        const sql = `
        INSERT INTO FILTRO
          (ID_FILTRO, CAMPO, VALOR, OPERADOR, VALOR2, TRANSFERENCIA)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

        await cds.run(sql, [
          id,
          f.CAMPO,
          f.VALOR,
          f.OPERADOR,
          f.VALOR2,
          transferencia
        ]);
      }

      return { RESULT: true };
    } catch (e) {
      return { RESULT: false, REASON: e.message };
    }
  };

  async function crearObjetosTransferencia(t, j) {
    try {
      for (const obj of j) {
        const id = await getIdObjetoTransferencia();

        const sql = `
        INSERT INTO OBJETO_TRANSFERENCIA
          (ID_OBJETO_TRANSFERENCIA, OBJETO, TRANSFERENCIA)
        VALUES (?, ?, ?)
      `;

        await cds.run(sql, [id, obj.OBJETO, t]);
      }

      return { RESULT: true };
    } catch (e) {
      return { RESULT: false, REASON: e.message };
    }
  };

  async function creaTransferencia(json, id) {
    const bus = json.BUS;
    const tabla = json.TABLA;
    const objetos = json.OBJETO_TRANSFERENCIA;
    const repro = "";
    const estado = 1;
    const fecha = json.FECHA;
    const hora = json.HORA;
    const app = json.APLICACION;
    const proceso = json.PROCESO;
    const tipoDocumento = json.TIPO_DOCUMENTO;

    try {
      const sql = `
      INSERT INTO TRANSFERENCIA
        (ID_TRANSFERENCIA, BUS, TABLA, REPROCESO, ESTADO, FECHA, HORA, APLICACION, PROCESO, TIPO_DOCUMENTO)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
      await cds.run(sql, [id, bus, tabla, repro, estado, fecha, hora, app, proceso, tipoDocumento]);

      const os = await crearObjetosTransferencia(id, objetos);
      if (os.RESULT) {
        return { RESULT: true };
      } else {
        return os;
      }

    } catch (e) {
      return { RESULT: false, REASON: e.message };
    }
  };

  async function deleteTransferencia(id) {
    try {
      const sql = `DELETE FROM TRANSFERENCIA
                 WHERE ID_TRANSFERENCIA = ?`;
      await cds.run(sql, [id]);

      return "OK"
    } catch (e) {
      return { error: e.message, accion: "deleteTransferencia", query: sql }
    }
  };

  function generateId() {
    const length = 5;
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    const d = new Date();
    const date = d.getDate() + "" + d.getMonth() + "" + d.getFullYear();
    const h = d.getHours() + "" + d.getMinutes();
    const rand = Math.floor(Math.random() * 1000) + 1;
    const idRandom = `${date}_${rand}_${result}_${h}`;

    return idRandom;
  };


  async function createConsultas(transferencia, consultas) {
    let query = '';
    try {
      for (const c of consultas) {
        let origen = 0;
        let td = '';
        let ld = '';

        if (c.ORIGEN === 'Dinámico') {
          origen = 1;
          const val = c.VALIDACION || [];
          if (val.length > 0) {
            td = val[0].TIPO_DATO || '';
            ld = val[0].LARGO_DATO || '';
          }
        }

        const id = await getIdConsulta();

        query = `
        INSERT INTO CONSULTA_TRANSFERENCIA
          (ID_CONSULTA, CAMPO, TABLA, ORIGEN, TIPO_DATO, LARGO_DATO, TRANSFERENCIA)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
        await cds.run(query, [id, c.CAMPO, c.TABLA, origen, td, ld, transferencia]);

        // hijos
        await createFields(c.FIELDS || [], id);
        await createZJoin(c.ZJOIN || [], id);
        await createCondiciones(c.CONDICIONES || [], id);
      }
      return { RESULT: true };
    } catch (e) {
      return { RESULT: false, REASON: e.message, QUERY: query };
    }
  };


  async function deleteFiltros(id) {
    try {
      const sql = `
      DELETE FROM FILTRO
      WHERE TRANSFERENCIA = ?`;
      await cds.run(sql, [id]);
      return true;
    } catch (e) {
      return false;
    }
  };

  async function deleteConsultas(id) {
    try {
      const sql = `
      DELETE FROM CONSULTA_TRANSFERENCIA
      WHERE TRANSFERENCIA = ?`;
      await cds.run(sql, [id]);
      return true;
    } catch (e) {
      return false;
    }
  };

  async function deleteMetas(id) {
    try {
      const sql = `
      DELETE FROM METADATA_TRANSFERENCIA
      WHERE TRANSFERENCIA = ?`;
      await cds.run(sql, [id]);
      return true;
    } catch (e) {
      return false;
    }
  };

  this.on('createTransferencia', async (req) => {

    const json = req.data;
    const id = generateId();
    const filtros = json.FILTROS;
    const consultas = json.CONSULTA_TRANSFERENCIA;
    const metas = json.METADATA_TRANSFERENCIA;

    const ct = await creaTransferencia(json, id);
    if (!ct.RESULT) {
      return req.reject(400, 'Creación transferencia  ' + ct.REASON);
    }

    const cf = await createFiltros(id, filtros);
    if (!cf.RESULT) {
      await deleteTransferencia(id);
      await deleteFiltros(id);
      return req.reject(400, 'Creación filtros  ' + cf.REASON);
    }

    const cc = await createConsultas(id, consultas);
    if (!cc.RESULT) {
      await deleteTransferencia(id);
      await deleteFiltros(id);
      await deleteConsultas(id);
      return req.reject(400, JSON.stringify(cc));
    }

    const mm = await createMetadatas(id, metas);
    if (!mm.RESULT) {
      await deleteTransferencia(id);
      await deleteFiltros(id);
      await deleteConsultas(id);
      await deleteMetas(id);
      return req.reject(400, JSON.stringify(mm));
    }

    // OK
    return { RESULT: 'OK', TRANSFERENCIA: id };
  });

});