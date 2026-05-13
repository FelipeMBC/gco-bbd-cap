const cds = require('@sap/cds')
const proxy = require('@sap/cds-odata-v2-adapter-proxy')
 
cds.on('bootstrap', app => {
  app.use(proxy({
    path: 'v2',               // ⚠️ Esto define la base /v2
    mountPath: '/v2',         // ⚠️ Esto fuerza la ruta limpia
    services: true            // Monta todos los servicios registrados
  }))
})
 
module.exports = cds.server