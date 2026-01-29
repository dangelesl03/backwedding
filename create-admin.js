require('dotenv').config();
const User = require('./models/User');

(async () => {
  try {
    console.log('🔐 Creando usuario administrador...\n');

    const username = 'admin';
    const password = '123';

    // Verificar si el usuario ya existe
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      console.log(`⚠️  El usuario "${username}" ya existe.`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}`);
      
      // Preguntar si quiere actualizar el password
      console.log('\n💡 Si quieres cambiar la contraseña, elimina el usuario primero o usa otro nombre de usuario.');
      process.exit(0);
    }

    // Crear usuario admin
    const newUser = await User.create({
      username,
      password,
      role: 'admin'
    });

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log(`\n📋 Credenciales:`);
    console.log(`   Usuario: ${newUser.username}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   ID: ${newUser.id}`);
    console.log(`\n🔑 Puedes iniciar sesión con estas credenciales.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
})();
