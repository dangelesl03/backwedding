# 🚀 Configuración de Deploy Automático en Vercel - Backend

## Problema Común
Si después de hacer push a Git, el backend no se deploya automáticamente en Vercel, sigue estos pasos:

## ✅ Solución: Verificar Configuración en Vercel Dashboard

### 1. Verificar que el proyecto backend esté conectado a Git

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto backend (ej: `backwedding`)
3. Ve a **Settings** → **Git**
4. Verifica que:
   - El repositorio esté conectado correctamente
   - La rama de producción esté configurada (normalmente `main` o `master`)
   - **Auto-deploy** esté habilitado

### 2. Verificar Root Directory

1. En **Settings** → **General**
2. Busca la sección **Root Directory**
3. Debe estar configurado como: `backend`
4. Si no está configurado, haz clic en **Edit** y establece `backend`

### 3. Verificar Build Settings

En **Settings** → **General** → **Build & Development Settings**:

- **Framework Preset**: `Other`
- **Root Directory**: `backend`
- **Build Command**: (dejar vacío o `echo 'No build step required'`)
- **Output Directory**: (dejar vacío)
- **Install Command**: `npm install`

### 4. Verificar Variables de Entorno

En **Settings** → **Environment Variables**, asegúrate de tener:

- `DATABASE_URL` o `POSTGRES_URL`
- `JWT_SECRET`
- `FRONTEND_URL` (opcional)
- `NODE_ENV` = `production`

### 5. Forzar un nuevo deploy

Si todo está configurado correctamente pero aún no deploya:

1. Ve a **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**
4. O haz un commit vacío:
   ```bash
   git commit --allow-empty -m "Trigger Vercel deploy"
   git push
   ```

## 🔍 Verificar Logs de Deploy

1. Ve a **Deployments**
2. Haz clic en el último deployment
3. Revisa los **Build Logs** para ver si hay errores

## ⚠️ Problemas Comunes

### Problema: "No deployments found"
- **Solución**: Verifica que el Root Directory esté configurado como `backend`

### Problema: "Build failed"
- **Solución**: Revisa los logs y verifica que todas las dependencias estén en `package.json`

### Problema: "Function timeout"
- **Solución**: Ya está configurado `maxDuration: 30` en `vercel.json`

### Problema: Deploy manual funciona pero automático no
- **Solución**: Verifica que **Auto-deploy** esté habilitado en Settings → Git

## 📝 Checklist de Configuración

- [ ] Repositorio conectado en Vercel
- [ ] Root Directory configurado como `backend`
- [ ] Auto-deploy habilitado
- [ ] Variables de entorno configuradas
- [ ] Build Command configurado correctamente
- [ ] `vercel.json` presente en la carpeta backend

## 🆘 Si nada funciona

1. Desconecta el repositorio en Vercel
2. Vuelve a conectarlo
3. Asegúrate de seleccionar el **Root Directory** como `backend` durante la conexión
4. Configura las variables de entorno nuevamente
