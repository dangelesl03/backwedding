# 💍 WeddingGift - Backend API

API REST para el sistema de gestión de regalos de boda. Permite a los invitados contribuir parcial o totalmente a los regalos seleccionados por la pareja.

## 🛠️ Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **PostgreSQL** - Base de datos (compatible con Neon, Supabase)
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas

## 📋 Requisitos Previos

- Node.js 16+ y npm
- PostgreSQL (recomendado Neon para producción)
- Cuenta en Vercel (para deployment)

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Crear archivo .env con las variables de entorno necesarias
```

## ⚙️ Configuración

Crea un archivo `.env` en la raíz del backend con:

```env
DATABASE_URL=postgresql://usuario:password@host/database?sslmode=require
JWT_SECRET=tu_secreto_jwt_aqui
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Variables de entorno necesarias:
- `DATABASE_URL` o `POSTGRES_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Secreto para firmar tokens JWT
- `FRONTEND_URL`: URL del frontend para CORS
- `PORT`: Puerto del servidor (opcional, default: 5000)

## 🚀 Ejecución

### Desarrollo
```bash
npm run dev
# O usar nodemon para auto-reload
```

### Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:5000`

## 📦 Scripts Disponibles

- `npm start` - Inicia el servidor
- `npm run dev` - Inicia con nodemon (auto-reload)
- `npm run seed` - Ejecuta el seed de la base de datos

### Scripts de Utilidad

- `node check-db.js` - Verifica conexión y crea usuario admin si no existe
- `node create-event.js` - Crea un evento por defecto
- `node create-gifts.js` - Crea regalos de ejemplo
- `node reset-gifts.js` - Resetea regalos a disponibles
- `node seed.js` - Ejecuta seed completo

## 🌐 Deployment en Vercel

1. Conecta tu repositorio a Vercel
2. Configura **Root Directory**: `backend`
3. Agrega variables de entorno:
   - `DATABASE_URL` o `POSTGRES_URL`: URL de conexión a PostgreSQL
   - `JWT_SECRET`: Secreto para firmar tokens JWT
   - `FRONTEND_URL`: URL del frontend desplegado
   - `NODE_ENV=production`
4. Deploy

## 🎯 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/setup` - Crear usuario admin

### Eventos
- `GET /api/events` - Obtener evento
- `POST /api/events` - Crear evento (admin)
- `PUT /api/events/:id` - Actualizar evento (admin)

### Regalos
- `GET /api/gifts` - Listar regalos (público)
- `GET /api/gifts/:id` - Obtener regalo
- `POST /api/gifts/:id/contribute` - Contribuir a regalo (requiere auth)
- `POST /api/gifts` - Crear regalo (admin)
- `PUT /api/gifts/:id` - Actualizar regalo (admin)
- `DELETE /api/gifts/:id` - Eliminar regalo (admin)

### Pagos
- `POST /api/payments/confirm` - Confirmar pago

### Reportes
- `GET /api/reports/contributions` - Reporte de contribuciones (admin)
- `GET /api/reports/summary` - Resumen de contribuciones (admin)

### Health Check
- `GET /health` - Estado del servidor

## 📁 Estructura del Proyecto

```
backend/
├── api/              # Wrapper para Vercel serverless
├── db/               # Schema y migraciones
│   ├── init.js       # Inicialización de BD
│   └── schema.sql    # Esquema SQL
├── models/           # Modelos de datos
│   ├── User.js
│   ├── Event.js
│   └── Gift.js
├── routes/           # Rutas de la API
│   ├── auth.js
│   ├── events.js
│   ├── gifts.js
│   ├── payments.js
│   └── reports.js
├── middleware/       # Middleware
│   └── auth.js       # Autenticación JWT
├── config.js         # Configuración
├── db.js             # Conexión a PostgreSQL
└── server.js         # Servidor principal
```

## 🔐 Autenticación

El backend usa JWT (JSON Web Tokens) para autenticación. Los tokens se envían en el header:

```
Authorization: Bearer <token>
```

## 📝 Variables de Entorno

Variables principales:
- `DATABASE_URL` o `POSTGRES_URL`: URL de conexión a PostgreSQL (prioridad: POSTGRES_URL)
- `JWT_SECRET`: Secreto para firmar tokens JWT
- `FRONTEND_URL`: URL del frontend para configuración CORS
- `PORT`: Puerto del servidor (opcional, default: 5000)
- `NODE_ENV`: Entorno de ejecución (development/production)

## 🐛 Solución de Problemas

- **Error de conexión a BD**: Verifica `DATABASE_URL` o `POSTGRES_URL` en `.env`
- **Error 500 en login**: Verifica que el usuario admin exista (ejecuta `node check-db.js`)
- **Error de CORS**: Asegúrate de que `FRONTEND_URL` esté configurado correctamente

## 📝 Licencia

Este proyecto es privado y está destinado para uso personal.

## 👥 Autores

Natalia & Daniel - Boda 28 de Marzo 2026


