const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {

  ////////////////////////
  //////TRANSFERENCIA/////
  ////////////////////////

  async function getNextVal(sequenceName) {
    const sql = `SELECT "${sequenceName}".NEXTVAL AS ID FROM DUMMY`;

    try {
      const result = await cds.run(sql);

      if (result.length > 0 && result[0].ID != null) {
        return result[0].ID;
      }

      throw new Error(`La secuencia ${sequenceName} no retornó ID`);
    } catch (e) {
      throw new Error(`Error obteniendo secuencia ${sequenceName}: ${e.message}`);
    }
  }
  async function getIdCondicion() {
    return await getNextVal("ID_CONDICION_CONSULTA_TRANSFERENCIA");
  }

  async function getIdZJoin() {
    return await getNextVal("ID_JOIN_CONSULTA_TRANSFERENCIA");
  }

  async function getIdField() {
    return await getNextVal("ID_FIELD_CONSULTA_TRANSFERENCIA");
  }

  async function getIdMCondicion() {
    return await getNextVal("ID_METADATA_CONDICION");
  }

  async function getIdMJoin() {
    return await getNextVal("ID_METADATA_JOIN");
  }

  async function getIdObjetoTransferencia() {
    return await getNextVal("ID_OBJETO_TRANSFERENCIA");
  }

  async function getIdFiltro() {
    return await getNextVal("ID_FILTRO");
  }

  async function getIdConsulta() {
    return await getNextVal("ID_CONSULTA_TRANSFERENCIA");
  }

  async function getIdMetadata() {
    return await getNextVal("ID_METADATA_TRANSFERENCIA");
  }

  async function createFiltros(transferencia, filtros) {
    let query;

    try {
      for (const f of filtros) {
        const id = await getIdFiltro();

        query = `
          INSERT INTO DB_FILTRO
            (ID_FILTRO, CAMPO, VALOR, OPERADOR, VALOR2, TRANSFERENCIA)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await cds.run(query, [
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
      return {
        RESULT: false,
        REASON: e.message,
        QUERY: query
      };
    }
  }

  async function crearObjetosTransferencia(t, j) {
    let query;

    try {
      for (const item of j) {
        const id = await getIdObjetoTransferencia();

        query = `
          INSERT INTO DB_OBJETO_TRANSFERENCIA
            (ID_OBJETO_TRANSFERENCIA, CAMPO, TRANSFERENCIA)
          VALUES (?, ?, ?)
        `;

        await cds.run(query, [
          id,
          item.OBJETO,
          t
        ]);
      }

      return { RESULT: true };
    } catch (e) {
      return {
        RESULT: false,
        REASON: e.message,
        QUERY: query
      };
    }
  }

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

    let query;

    try {
      query = `
        INSERT INTO DB_TRANSFERENCIA
          (ID_TRANSFERENCIA, BUS, TABLA, ID_REPROCESO, ESTADO, FECHA, HORA, APLICACION, PROCESO, TIPO_DOCUMENTO)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await cds.run(query, [
        id,
        bus,
        tabla,
        repro,
        estado,
        fecha,
        hora,
        app,
        proceso,
        tipoDocumento
      ]);

      const os = await crearObjetosTransferencia(id, objetos);

      if (os.RESULT) {
        return { RESULT: true };
      }

      return os;
    } catch (e) {
      return {
        RESULT: false,
        REASON: e.message,
        QUERY: query
      };
    }
  }

  async function deleteTransferencia(id) {
    let query;

    try {
      query = `
        DELETE FROM DB_TRANSFERENCIA
        WHERE ID_TRANSFERENCIA = ?
      `;

      await cds.run(query, [id]);

      return "OK";
    } catch (e) {
      return {
        RESULT: false,
        REASON: e.message,
        QUERY: query
      };
    }
  }

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

  async function createFields(fields, idConsulta) {
    let query;

    try {
      for (const f of fields) {
        const id = await getIdField();

        query = `
          INSERT INTO DB_FIELD_CONSULTA_TRANSFERENCIA
            (ID_FIELD_CONSULTA_TRANSFERENCIA, FIELD_NAME, CONSULTA_TRANSFERENCIA)
          VALUES (?, ?, ?)
        `;

        await cds.run(query, [
          id,
          f.OBJETO,
          idConsulta
        ]);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  async function createZJoin(zjoin, idConsulta) {
    let query;

    try {
      for (const item of zjoin) {
        const id = await getIdZJoin();
        const zjoinText = `${item.TIPO} JOIN ${item.TABLA} ON ${item.CAMPOI} ${item.CONDICION} ${item.CAMPOD}`;

        query = `
          INSERT INTO DB_JOIN_CONSULTA_TRANSFERENCIA
            (ID_JOIN_CONSULTA_TRANSFERENCIA, ZJOIN, CONSULTA_TRANSFERENCIA)
          VALUES (?, ?, ?)
        `;

        await cds.run(query, [
          id,
          zjoinText,
          idConsulta
        ]);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  async function createCondiciones(condicion, idConsulta) {
    let query;

    try {
      for (const item of condicion) {
        const id = await getIdCondicion();

        query = `
          INSERT INTO DB_CONDICION_CONSULTA_TRANSFERENCIA
            (ID_CONDICION_CONSULTA_TRANSFERENCIA, CAMPO, CONDICION, VALOR, VALOR2, CONSULTA_TRANSFERENCIA)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await cds.run(query, [
          id,
          item.CAMPO,
          item.CONDICION,
          item.VALOR,
          item.VALOR2,
          idConsulta
        ]);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  async function createConsultas(transferencia, consultas) {
    let query;

    try {
      for (const c of consultas) {
        let origen = 0;
        let td = "";
        let ld = "";

        const id = await getIdConsulta();

        if (c.ORIGEN === "Dinámico") {
          origen = 1;

          const val = c.VALIDACION;

          if (val.length > 0) {
            td = c.VALIDACION[0].TIPO_DATO;
            ld = c.VALIDACION[0].LARGO_DATO;
          }
        }

        query = `
          INSERT INTO DB_CONSULTA_TRANSFERENCIA
            (ID_CONSULTA_TRANSFERENCIA, CAMPO, TABLA, DINAMICO, TIPO_DATO, FORMATO, TRANSFERENCIA)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await cds.run(query, [
          id,
          c.CAMPO,
          c.TABLA,
          origen,
          td,
          ld,
          transferencia
        ]);

        const rFields = await createFields(c.FIELDS || [], id);
        if (!rFields) throw new Error("Error insertando DB_FIELD_CONSULTA_TRANSFERENCIA");

        const rZJoin = await createZJoin(c.ZJOIN || [], id);
        if (!rZJoin) throw new Error("Error insertando DB_JOIN_CONSULTA_TRANSFERENCIA");

        const rCondiciones = await createCondiciones(c.CONDICIONES || [], id);
        if (!rCondiciones) throw new Error("Error insertando DB_CONDICION_CONSULTA_TRANSFERENCIA");
      }

      return { RESULT: true };
    } catch (e) {
      return {
        RESULT: false,
        REASON: e.message,
        QUERY: query
      };
    }
  }

  async function createMCondiciones(condicion, meta) {
    let query;

    try {
      for (const item of condicion) {
        const id = await getIdMCondicion();

        query = `
        INSERT INTO DB_METADATA_CONDICION
          (ID_METADATA_CONDICION, CAMPO, CONDICION, VALOR, VALOR2, METADATA_TRANSFERENCIA)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

        await cds.run(query, [
          id,
          item.CAMPO,
          item.CONDICION,
          item.VALOR,
          item.VALOR2,
          meta
        ]);
      }

      return { RESULT: true };
    } catch (e) {
      return {
        RESULT: false,
        REASON: e.message,
        QUERY: query,
        ACCION: "createMCondiciones",
        METADATA_TRANSFERENCIA: meta,
        CONDICIONES: condicion
      };
    }
  }

  async function createMJoin(zjoin, meta) {
    let query;

    try {
      for (const item of zjoin) {
        const id = await getIdMJoin();
        const zjoinText = `${item.TIPO} JOIN ${item.TABLA} ON ${item.CAMPOI} ${item.CONDICION} ${item.CAMPOD}`;

        query = `
          INSERT INTO DB_METADATA_JOIN
            (ID_METADATA_JOIN, ZJOIN, METADATA_TRANSFERENCIA)
          VALUES (?, ?, ?)
        `;

        await cds.run(query, [
          id,
          zjoinText,
          meta
        ]);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  async function createMFields(fields, meta) {
    let query;

    try {
      for (const f of fields) {
        const id = await getIdField();

        query = `
          INSERT INTO DB_FIELD_CONSULTA_TRANSFERENCIA
            (ID_FIELD_CONSULTA_TRANSFERENCIA, FIELD_NAME, CONSULTA_TRANSFERENCIA)
          VALUES (?, ?, ?)
        `;

        await cds.run(query, [
          id,
          f.OBJETO,
          meta
        ]);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  async function createMetadatas(transferencia, metas) {
    let query;

    try {
      for (const m of metas) {
        const id = await getIdMetadata();

        query = `
          INSERT INTO DB_METADATA_TRANSFERENCIA
            (ID_METADATA_TRANSFERENCIA, METADATA_REFERENCIA, NOMBRE, TIPO, TABLA, TRANSFERENCIA, CAMPO)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await cds.run(query, [
          id,
          m.ID_METADATA,
          m.ATTRIBUTE,
          m.TIPO_ATRIBUTO,
          m.TABLA,
          transferencia,
          m.CAMPO
        ]);

        const rMFields = await createMFields(m.FIELDS || [], id);
        if (!rMFields) throw new Error("Error insertando DB_FIELD_CONSULTA_TRANSFERENCIA desde metadata");

        const rMJoin = await createMJoin(m.JOIN || [], id);
        if (!rMJoin) throw new Error("Error insertando DB_METADATA_JOIN");

        const rMCondiciones = await createMCondiciones(m.CONDICIONES || [], id);

        if (!rMCondiciones.RESULT) {
          throw new Error(JSON.stringify(rMCondiciones));
        }
      }

      return { RESULT: true };
    } catch (e) {
      return {
        RESULT: false,
        REASON: e.message,
        QUERY: query
      };
    }
  }

  async function deleteFiltros(id) {
    try {
      const query = `
        DELETE FROM DB_FILTRO
        WHERE TRANSFERENCIA = ?
      `;

      await cds.run(query, [id]);

      return true;
    } catch (e) {
      return false;
    }
  }

  async function deleteConsultas(id) {
    try {
      const query = `
        DELETE FROM DB_CONSULTA_TRANSFERENCIA
        WHERE TRANSFERENCIA = ?
      `;

      await cds.run(query, [id]);

      return true;
    } catch (e) {
      return false;
    }
  }

  async function deleteMetas(id) {
    try {
      const query = `
        DELETE FROM DB_METADATA_TRANSFERENCIA
        WHERE TRANSFERENCIA = ?
      `;

      await cds.run(query, [id]);

      return true;
    } catch (e) {
      return false;
    }
  }

  this.on("createTransferencia", async (req) => {
    const json = req.data.json || req.data;

    const id = generateId();
    const filtros = json.FILTROS;
    const consultas = json.CONSULTA_TRANSFERENCIA;
    const metas = json.METADATA_TRANSFERENCIA;

    const ct = await creaTransferencia(json, id);

    if (!ct.RESULT) {
      return req.reject(400, "Creación transferencia  " + ct.REASON);
    }

    const cf = await createFiltros(id, filtros);

    if (!cf.RESULT) {
      await deleteTransferencia(id);
      await deleteFiltros(id);

      return req.reject(400, "Creación filtros  " + cf.REASON);
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

    return {
      RESULT: "OK",
      TRANSFERENCIA: id
    };
  });

});