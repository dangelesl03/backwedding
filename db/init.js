const { query } = require('../db');
const fs = require('fs');
const path = require('path');

const initDatabase = async () => {
  try {
    console.log('Inicializando base de datos...');
    
    // Leer el archivo schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Limpiar el schema (remover comentarios y líneas vacías)
    schema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    // Dividir el schema en statements individuales (separados por ;)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Ejecutar cada statement por separado
    for (const statement of statements) {
      if (statement.trim() && !statement.trim().startsWith('--')) {
        try {
          await query(statement);
        } catch (error) {
          // Ignorar errores de "already exists" o "duplicate"
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate') &&
              !error.message.includes('does not exist')) {
            console.warn('Advertencia al ejecutar statement:', error.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
};

module.exports = { initDatabase };
