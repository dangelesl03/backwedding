# ✅ Migración a PostgreSQL Completada

## Resumen de Cambios

Se ha completado la migración de MongoDB a PostgreSQL (Neon/Vercel). Todos los archivos han sido refactorizados.

### Cambios Realizados:

1. ✅ **Backend migrado a PostgreSQL**
   - Eliminado Mongoose
   - Instalado `pg` (node-postgres)
   - Modelos refactorizados (User, Event, Gift)
   - Rutas actualizadas para PostgreSQL
   - Esquema de base de datos creado (`db/schema.sql`)

2. ✅ **Configuración para Vercel**
   - `vercel.json` creado para backend
   - Variables de entorno configuradas
   - SSL configurado para Neon

3. ✅ **Frontend preparado**
   - `vercel.json` creado
   - Configuración lista para despliegue

## Credenciales Configuradas

Las credenciales de PostgreSQL Neon ya están en el archivo `.env`:
- **URL**: `postgresql://neondb_owner:npg_Puhv1C0NSoga@ep-little-dawn-a4n48z0d-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`

## Próximos Pasos

### 1. Ejecutar Seed Manualmente (si es necesario)

Si el seed automático no funciona, puedes ejecutar el schema SQL manualmente en tu base de datos Neon:

1. Ve a tu dashboard de Neon: https://console.neon.tech
2. Abre el SQL Editor
3. Copia y pega el contenido de `backend/db/schema.sql`
4. Ejecuta el script

Luego ejecuta solo la parte de datos:

```bash
cd backend
node -e "
const User = require('./models/User');
const Event = require('./models/Event');
const Gift = require('./models/Gift');
require('dotenv').config();

(async () => {
  // Crear usuario admin
  const admin = await User.create({
    username: 'natalia_daniel',
    password: 'boda2026',
    role: 'admin'
  });
  console.log('Usuario creado:', admin.username);
  
  // Crear evento
  const event = await Event.create({
    title: '¡Acompañanos a celebrar!',
    coupleNames: 'Natalia & Daniel',
    weddingDate: '2026-11-28',
    location: 'Lima, Perú',
    address: 'Por definir - Próximamente',
    dressCode: 'Elegante',
    dressCodeDescription: 'Te invitamos a vestir en armonía con nuestros colores...',
    additionalInfo: 'Será una celebración llena de amor...'
  });
  console.log('Evento creado');
  
  process.exit(0);
})();
"
```

### 2. Desplegar en Vercel

#### Backend:
1. Conecta tu repo a Vercel
2. Selecciona la carpeta `backend`
3. Agrega variables de entorno:
   - `POSTGRES_URL`: Tu URL de Neon
   - `JWT_SECRET`: Un secreto seguro
   - `NODE_ENV`: `production`

#### Frontend:
1. Crea nuevo proyecto en Vercel
2. Selecciona carpeta `frontend`
3. Agrega variable:
   - `REACT_APP_API_URL`: URL de tu backend desplegado

## Credenciales de Acceso

- **Usuario**: `natalia_daniel`
- **Contraseña**: `boda2026`

## Archivos Importantes

- `backend/db/schema.sql` - Esquema de la base de datos
- `backend/vercel.json` - Configuración de Vercel para backend
- `frontend/vercel.json` - Configuración de Vercel para frontend
- `backend/.env` - Variables de entorno (ya configurado con tus credenciales)

## Notas

- El seed puede fallar si hay problemas de conexión, pero el schema SQL puede ejecutarse manualmente
- Una vez desplegado en Vercel, las conexiones deberían funcionar mejor
- Asegúrate de cambiar `JWT_SECRET` por un valor seguro antes de producción

