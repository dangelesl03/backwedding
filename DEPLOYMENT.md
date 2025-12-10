# Guía de Deployment en Vercel

Esta guía te ayudará a desplegar tanto el backend como el frontend en Vercel.

## 📋 Requisitos Previos

1. Cuenta en Vercel (gratuita): https://vercel.com
2. Cuenta en Neon (PostgreSQL): https://neon.tech
3. Git instalado y repositorio configurado

## 🔧 Paso 1: Preparar el Backend

### 1.1 Variables de Entorno Necesarias

En Vercel, necesitarás configurar estas variables de entorno para el backend:

- `DATABASE_URL` o `POSTGRES_URL`: URL de conexión a PostgreSQL (Neon)
- `JWT_SECRET`: Clave secreta para JWT (puede ser cualquier string aleatorio)
- `NODE_ENV`: `production`

### 1.2 Desplegar el Backend

1. Ve a https://vercel.com y haz login
2. Click en "Add New Project"
3. Importa tu repositorio de Git
4. Configura el proyecto:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (dejar vacío o `npm install`)
   - **Output Directory**: (dejar vacío)
   - **Install Command**: `npm install`

5. En "Environment Variables", agrega:
   ```
   DATABASE_URL=tu_url_de_neon_aqui
   JWT_SECRET=tu_secreto_jwt_aqui
   NODE_ENV=production
   ```

6. Click en "Deploy"

7. Una vez desplegado, copia la URL del proyecto (ejemplo: `https://weddinggift-backend.vercel.app`)

## 🎨 Paso 2: Preparar el Frontend

### 2.1 Actualizar la URL del Backend

Antes de desplegar, actualiza `frontend/vercel.json` con la URL real de tu backend:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://TU-BACKEND-URL.vercel.app/api/$1"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "https://TU-BACKEND-URL.vercel.app/api"
  }
}
```

También actualiza `frontend/src/config.ts` si es necesario.

### 2.2 Desplegar el Frontend

1. En Vercel, click en "Add New Project" nuevamente
2. Importa el mismo repositorio
3. Configura el proyecto:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

4. En "Environment Variables", agrega:
   ```
   REACT_APP_API_URL=https://TU-BACKEND-URL.vercel.app/api
   ```

5. Click en "Deploy"

## 🔐 Paso 3: Configurar Variables de Entorno en Vercel

### Backend (Variables Requeridas):

1. Ve al proyecto del backend en Vercel
2. Settings → Environment Variables
3. Agrega:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `DATABASE_URL` | Tu URL de Neon PostgreSQL | Production, Preview, Development |
| `JWT_SECRET` | Un string aleatorio seguro (ej: `mi_secreto_super_seguro_2024`) | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

### Frontend (Variables Requeridas):

1. Ve al proyecto del frontend en Vercel
2. Settings → Environment Variables
3. Agrega:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `REACT_APP_API_URL` | `https://TU-BACKEND-URL.vercel.app/api` | Production, Preview, Development |

## 📝 Paso 4: Verificar el Deployment

### Backend:
- Visita: `https://TU-BACKEND-URL.vercel.app/health`
- Deberías ver: `{"status":"ok","timestamp":"..."}`

### Frontend:
- Visita la URL de tu frontend
- Deberías ver la aplicación funcionando

## 🐛 Solución de Problemas

### Error: "Cannot find module"
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que `npm install` se ejecute correctamente

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la URL de Neon incluya `?sslmode=require`

### Error: "CORS error"
- Verifica que el backend tenga `cors()` habilitado (ya está configurado)
- Verifica que `REACT_APP_API_URL` apunte a la URL correcta del backend

### El frontend no puede conectarse al backend
- Verifica que `REACT_APP_API_URL` esté configurada correctamente
- Verifica que el backend esté desplegado y funcionando
- Revisa los logs de Vercel para ver errores

## 🔄 Actualizar el Deployment

Cada vez que hagas cambios:

1. Haz commit y push a tu repositorio
2. Vercel detectará los cambios automáticamente
3. Se iniciará un nuevo deployment
4. Una vez completado, los cambios estarán en producción

## 📚 Recursos Adicionales

- Documentación de Vercel: https://vercel.com/docs
- Documentación de Neon: https://neon.tech/docs

## ✅ Checklist Final

- [ ] Backend desplegado en Vercel
- [ ] Variables de entorno del backend configuradas
- [ ] Backend responde en `/health`
- [ ] Frontend desplegado en Vercel
- [ ] Variable `REACT_APP_API_URL` configurada en frontend
- [ ] Frontend puede conectarse al backend
- [ ] Login funciona correctamente
- [ ] Regalos se cargan correctamente

