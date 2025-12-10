# Solución al Error 500 en Login

## Problema Resuelto ✅

El usuario `natalia_daniel` ya fue creado en la base de datos. El login debería funcionar ahora.

## Pasos para Solucionar

### 1. Reiniciar el servidor backend

El servidor necesita reiniciarse para aplicar los cambios. 

**Opción A: Detener y reiniciar manualmente**
1. Ve a la terminal donde está corriendo el backend
2. Presiona `Ctrl+C` para detenerlo
3. Ejecuta nuevamente: `npm run dev`

**Opción B: Si el servidor está corriendo en background**
```powershell
# Detener procesos de Node en el puerto 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Reiniciar backend
cd C:\FuentesIS\WeddingGift\backend
npm run dev
```

### 2. Verificar que el usuario existe

Si necesitas verificar o crear el usuario nuevamente:

```bash
cd backend
node check-db.js
```

### 3. Probar el login

Una vez reiniciado el servidor, prueba el login:

**URL:** `POST http://localhost:5000/api/auth/login`

**Body:**
```json
{
  "username": "natalia_daniel",
  "password": "boda2026"
}
```

**Respuesta esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "natalia_daniel",
    "role": "admin"
  }
}
```

## Si el error persiste

1. Verifica los logs del servidor en la terminal
2. Asegúrate de que las tablas existan en Neon
3. Verifica que la variable `POSTGRES_URL` esté correcta en `.env`

## Credenciales

- **Usuario:** `natalia_daniel`
- **Contraseña:** `boda2026`

