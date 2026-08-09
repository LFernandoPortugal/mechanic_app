# Configuración de SUPER_ADMIN — SGA

> Actualizado: 2026-08-08

## Alcance

SUPER_ADMIN es la cuenta administrativa única con acceso cross-tenant. Su perfil `users/{uid}` debe tener `roles: ["SUPER_ADMIN"]` y `workshopId: "master-control"`.

La aplicación no promueve usuarios por email ni crea este rol desde el navegador. La cuenta inicial debe provisionarse mediante un procedimiento administrativo auditado, después de comprobar el proyecto Firebase objetivo. No se usa para pruebas rutinarias.

## Crear un taller y su ADMIN

1. Iniciar sesión con la cuenta SUPER_ADMIN y abrir `/super-admin`.
2. Completar ID/nombre del taller, email del ADMIN, contraseña inicial y duración del acceso.
3. Pulsar **Crear Taller y Cuenta**.
4. `/api/admin/users` vuelve a verificar token y rol en el servidor, crea la identidad en Firebase Authentication y crea `settings/{workshopId}` + `users/{uid}` de forma coordinada.
5. Entregar la contraseña inicial (mínimo 12 caracteres) por un canal seguro y pedir al ADMIN que use **Olvidé mi contraseña** en `/login` para establecer una propia. La contraseña no se guarda en Firestore.

Si el email ya existe en Firebase Authentication, la operación responde con conflicto: no combina ni sobrescribe identidades.

## Acciones del panel

| Acción | Resultado |
|---|---|
| `Danger On/Off` | Autoriza o revoca el borrado de datos operativos por el ADMIN del taller. |
| `+7d / +30d` | Extiende la expiración vigente; si ya venció, cuenta desde el momento actual. Nunca acorta un trial activo. |
| `Revocar` | Expira el acceso inmediatamente. |
| `Borrar Datos` | Elimina jobs, inventario y movimientos del taller; requiere confirmación. |
| Eliminar usuario | Borra la cuenta objetivo en Firebase Authentication y su perfil Firestore. |
| Eliminar taller | Borra primero sus cuentas Auth y después datos/perfiles/settings del taller. |

La API protege la propia cuenta que ejecuta la operación y cualquier perfil SUPER_ADMIN frente al borrado.

## Provisionamiento excepcional de la cuenta única

`execution/seed_super_admin.py` reemplaza los scripts REST históricos. Es seguro por defecto: solo muestra una vista previa hasta usar `--apply`, exige el proyecto exacto, comprueba UID/email en Firebase Authentication y rechaza crear una segunda cuenta SUPER_ADMIN.

```powershell
py -m pip install -r execution/requirements.txt
py execution/seed_super_admin.py --project mechanic-app-7d459 --email correo-del-propietario
```

No guardar el correo/UID real, API keys ni contraseñas dentro de scripts. La ejecución efectiva requiere además `--apply` y una confirmación interactiva con el proyecto.

## Credenciales server-side

Las operaciones privilegiadas se ejecutan en Vercel mediante OIDC y Google Workload Identity Federation. Los identificadores requeridos están enumerados en `docs/AI-Handoff.md`; no se debe crear, compartir o desplegar una clave JSON de cuenta de servicio.

## Verificación antes de producción

1. Usar una cuenta/taller descartable, nunca la identidad real como sujeto de la prueba.
2. Crear el taller y comprobar que existe exactamente una identidad Auth, un perfil ADMIN y un `settings` con el mismo `workshopId`.
3. Confirmar que un ADMIN no puede llamar `/api/admin/users`.
4. Eliminar el taller desde el panel.
5. Comprobar que Auth, `users`, `settings` y datos operativos quedaron limpios.
