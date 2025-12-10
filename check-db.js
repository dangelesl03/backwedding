require('dotenv').config();
const { query } = require('./db');
const User = require('./models/User');

(async () => {
  try {
    console.log('🔍 Verificando base de datos...\n');

    // Verificar si la tabla users existe
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ La tabla users no existe. Necesitas ejecutar el schema SQL primero.');
      console.log('📝 Ve a tu dashboard de Neon y ejecuta el contenido de db/schema.sql\n');
      process.exit(1);
    }
    console.log('✅ Tabla users existe\n');

    // Verificar si el usuario existe
    const user = await User.findByUsername('natalia_daniel');
    if (!user) {
      console.log('⚠️  El usuario natalia_daniel no existe.');
      console.log('🔧 Creando usuario administrador...\n');
      
      try {
        const newUser = await User.create({
          username: 'natalia_daniel',
          password: 'boda2026',
          role: 'admin'
        });
        console.log('✅ Usuario creado exitosamente:', newUser.username);
      } catch (error) {
        console.error('❌ Error creando usuario:', error.message);
        process.exit(1);
      }
    } else {
      console.log('✅ Usuario natalia_daniel existe');
      console.log('   ID:', user.id);
      console.log('   Role:', user.role);
    }

    console.log('\n✅ Base de datos lista para usar!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
})();
