// Vercel: todas las rutas /api/* llegan aqui.
const { api } = require('../app');
module.exports = (req, res) => api(req, res);
