# Manuales de usuario — SGA Mechanic App

> Vigencia funcional: producción `280418a` del 2026-08-14
> Aplicación oficial: Vercel desde la rama `main`

Esta carpeta contiene la fuente práctica para usuarios humanos y para la futura ayuda integrada en `/help`. No incluye contraseñas, tokens, correos reales, claves ni valores de `.env`.

## Empieza por tu responsabilidad

| Audiencia | Documento | Alcance |
|---|---|---|
| SUPER_ADMIN | [Manual-SUPER_ADMIN.md](./Manual-SUPER_ADMIN.md) | Talleres, trials, reconciliación, accesos y bajas globales |
| Dueño o ADMIN | [Manual-ADMIN.md](./Manual-ADMIN.md) | Configuración, personal, inventario y supervisión del taller |
| RECEPTION, TECHNICIAN y ADVISOR | [Roles-Operativos.md](./Roles-Operativos.md) | Instrucciones concretas por rol |
| Todo el personal | [Flujo-Recepcion-a-Entrega.md](./Flujo-Recepcion-a-Entrega.md) | Ciclo completo de una orden y traspasos entre roles |
| Responsables de soporte | [Recuperacion-y-Operaciones-Destructivas.md](./Recuperacion-y-Operaciones-Destructivas.md) | Recuperación de acceso, errores frecuentes y diferencias entre acciones destructivas |
| English-speaking users | [User-Guide-en.md](./User-Guide-en.md) | Consolidated English guide |

## Regla operativa principal

El flujo que se debe conservar es:

```text
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

Ningún rol debe adelantar manualmente una orden para saltarse la aprobación del cliente, el control de calidad o el cobro correspondiente.

## Advertencia general

> [!CAUTION]
> Las acciones **Borrar datos**, **Eliminar usuario** y **Eliminar taller** pueden causar pérdida irreversible. Antes de confirmar, verifica el taller o la cuenta exactos, comprende qué se conservará y asegúrate de que existe autorización. No uses producción para ensayar estas acciones.

Las pruebas destructivas de ingeniería se realizan únicamente con Firebase Auth/Firestore Emulator y el proyecto `demo-mechanic-app`. La aplicación web oficial no se despliega con Firebase Hosting.

## Convenciones de los manuales

- **Orden** y **OT** significan orden de trabajo.
- **Taller** es el tenant aislado identificado por `workshopId`.
- **Perfil** es el documento operativo de Firestore; **cuenta** es la identidad de Firebase Authentication.
- Un enlace público válido tiene el formato `/quote/view?id=JOB_ID#token=TOKEN`. El token no debe copiarse a tickets, capturas públicas o documentación.
- Los textos exactos pueden variar entre español e inglés, pero la acción y sus permisos son los mismos.
