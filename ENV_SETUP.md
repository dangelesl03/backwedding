# 🔧 Configuración de Variables de Entorno

Este documento explica cómo configurar las variables de entorno para conectar el backend con el frontend.

## 📋 Variables Requeridas

### Backend (`.env` en la carpeta `backend/`)

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql://usuario:password@host:5432/database?sslmode=require
POSTGRES_URL=${DATABASE_URL}
POSTGRES_PRISMA_URL=${DATABASE_URL}

# Configuración del servidor
PORT=5000
NODE_ENV=development

# JWT Secret (¡CAMBIA ESTO EN PRODUCCIÓN!)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_cambiar_en_produccion

# URL del frontend para CORS
FRONTEND_URL=http://localhost:3000

# Vercel (si se usa)
VERCEL=0
```

### Frontend (`.env.local` en la carpeta `frontend/`)

```env
# URL del backend API
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## 🚀 Configuración Rápida

### 1. Desarrollo Local

#### Backend
1. Crea un archivo `.env` en la carpeta `backend/`
2. Copia las variables del ejemplo anterior
3. Completa con tus valores reales (especialmente `DATABASE_URL` y `JWT_SECRET`)

#### Frontend
1. Crea un archivo `.env.local` en la carpeta `frontend/`
2. Configura `REACT_APP_API_URL` apuntando a tu backend local: `http://localhost:5000/api`

### 2. Producción (Vercel)

#### Backend
En el dashboard de Vercel, configura estas variables de entorno:
- `DATABASE_URL`: Tu URL de PostgreSQL (Neon, Supabase, etc.)
- `JWT_SECRET`: Un secreto seguro y aleatorio
- `NODE_ENV`: `production`
- `FRONTEND_URL`: La URL de tu frontend desplegado

#### Frontend
En el dashboard de Vercel, configura:
- `REACT_APP_API_URL`: La URL de tu backend desplegado (ej: `https://weddinggift-backend.vercel.app/api`)

## 🐳 Usando Docker Compose

Si usas `docker-compose.yml`, puedes crear un archivo `.env` en la raíz del proyecto con todas las variables. Docker Compose las leerá automáticamente.

```env
DATABASE_URL=postgresql://usuario:password@host:5432/database?sslmode=require
JWT_SECRET=tu_secreto_aqui
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000/api
FRONTEND_URL=http://localhost:3000
```

Luego ejecuta:
```bash
docker-compose up
```

## 📝 Notas Importantes

1. **NUNCA subas archivos `.env` al repositorio** - Ya están en `.gitignore`
2. **Las variables de React deben comenzar con `REACT_APP_`** para ser accesibles en el código
3. **En producción, usa secretos seguros** - No uses valores de ejemplo
4. **El `JWT_SECRET` debe ser único y seguro** - Usa un generador de secretos aleatorios

## 🔍 Verificación

### Backend
```bash
cd backend
npm start
# Debería conectarse a la base de datos y mostrar: "✅ Base de datos PostgreSQL conectada correctamente"
```

### Frontend
```bash
cd frontend
npm start
# Debería conectarse al backend en la URL configurada en REACT_APP_API_URL
```

## 🆘 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la base de datos esté accesible desde tu IP
- Verifica que el formato de la URL sea correcto

### Error: "API URL not found" en el frontend
- Verifica que `REACT_APP_API_URL` esté configurada correctamente
- Asegúrate de que el backend esté corriendo en el puerto especificado
- En producción, verifica que la URL del backend sea accesible públicamente

### Error de CORS
- Verifica que `FRONTEND_URL` en el backend coincida con la URL desde la que se accede al frontend
- En desarrollo: `http://localhost:3000`
- En producción: La URL completa de tu frontend desplegado

