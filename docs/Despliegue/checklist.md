# Checklist de Despliegue — SGA

## Pre-Deploy

### Variables de Entorno
- [ ] `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` configurada con tu email real
- [ ] `GEMINI_API_KEY` — puede estar vacía en producción (motor local se usa como fallback)
- [ ] Firebase config keys correctas en `.env.local`

### Seguridad
- [ ] Registro público cerrado (solo login)
- [ ] Cuentas demo solo visibles en desarrollo (`NODE_ENV !== 'production'`)
- [ ] Firestore rules actualizadas y desplegadas
- [ ] Storage rules desplegadas (deny all)
- [ ] Firebase Auth: solo email/password habilitado
- [ ] Dominios autorizados configurados en Firebase Auth

### Build
- [ ] `npm run build` exitoso (genera `out/`)
- [ ] Sin errores de TypeScript
- [ ] Sin warnings críticos de lint

## Deploy

### Vercel (Frontend)
El despliegue de la aplicación web se realiza de forma automática al hacer push a la rama `main` en GitHub. Vercel detecta los cambios, compila y despliega de manera nativa.

```bash
git add -A
git commit -m "feat: nuevos cambios"
git push origin main
```

### Firebase (Reglas de Seguridad e Índices)
Solo cuando se modifiquen reglas de Firestore, almacenamiento o índices, ejecuta:

```bash
# Deploy de reglas de base de datos e índices
firebase deploy --only firestore --project mechanic-app-7d459

# Deploy de reglas de almacenamiento
firebase deploy --only storage --project mechanic-app-7d459
```

## Post-Deploy

### Verificación Manual
- [ ] Login con SuperAdmin email → obtiene rol SUPER_ADMIN
- [ ] Acceder a `/super-admin` → funciona
- [ ] Crear taller de prueba → funciona
- [ ] Login con email de tester → se auto-onboarda como ADMIN
- [ ] Tester puede crear jobs, agregar inventario
- [ ] Trial expira → tester ve página de expiración
- [ ] URL `/quote/[id]` funciona sin login
- [ ] Intento de acceso no autorizado → rechazado

### Verificación de Seguridad
- [ ] Intentar registrar cuenta nueva → no hay opción (producción)
- [ ] Acceder a `/super-admin` con cuenta regular → denegado
- [ ] Modificar workshopId en request → reglas de Firestore lo bloquean
