// Wrapper para Vercel serverless functions
// Este archivo permite que Express funcione como serverless function en Vercel

const app = require('../server');

// Exportar el handler para Vercel
module.exports = app;
