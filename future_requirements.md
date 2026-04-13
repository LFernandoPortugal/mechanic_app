A continuación se presentan los requerimientos estratégicos de la aplicación, analizados y ordenados por prioridad de desarrollo (Fase de Cierre de Brecha con 'Tuul App' y sugerencias futuras).

🔴 1. Alta Prioridad (Cierre de Gap Operativo y Financiero)
Facturación y Pagos (Caja) - GAP TUUL:
Actualmente el sistema genera "Cotizaciones", pero los talleres necesitan registrar cuando el cliente paga.
Qué falta: Un módulo donde el Asesor o Recepción pueda marcar la cotización como "Pagada" (total o en cuotas/abonos), registrar el método de pago (Efectivo, Tarjeta, Transferencia) y emitir un recibo o factura simplificada.

Gestión Visual y Evidencia Fotográfica (DVX) - GAP TUUL:
Qué falta: En la vista del Técnico, permitir la carga de fotografías para documentar el estado de cada componente inspeccionado ("Falla", "Crítico"). También es crítico agregar en Recepción la toma de fotos exteriores del auto para evitar responsabilidad por daños preexistentes (blindaje legal). Utilizaremos Firebase Storage (ya incluido, tier gratuito) para almacenar las imágenes.

🟠 2. Prioridad Media (Operaciones Fluidas y Control Médico)
Checklist de Control de Calidad (QC) y Configuración del Taller (Settings):
Qué falta:
- Obligar a marcar checks básicos (Ej. Limpieza, Torque) antes de que un auto pueda ser "Entregado".
- Configuración de Taller (ADMIN) para subir logotipo, nombre, dirección y NIT, alimentando PDFs y correos dinámicamente.

Gestión de Citas (Scheduling) e Inventario Interno del Vehículo:
Qué falta: 
- Inventario rápido del interior en la recepción (gata, radio, tarjetas de circulación).
- Calendario simple de fechas y horas para recepciones programadas.

🟡 3. Prioridad Baja (Business Intelligence y Automatizaciones de Lujo)
Analíticas Reales e Indicadores de Rendimiento (KPIs) - GAP TUUL:
Qué falta: Medir la exactitud estadística (Tiempos Muertos, Horas Rentables vs Disponibles por técnico). Completar gráficas con Recharts.

Módulo de Clientes e Historial, Post-Venta (NPS):
Qué falta: Historial clínico buscando por placa. Encuestas simples de satisfacción tras la entrega. Exportar todo a CSV/Excel.

📘 4. Tareas Post-Desarrollo y Pruebas
Tutorial de Usuario Final:
Armar flujos / tooltips explicando a Asesores y Técnicos qué significa cada etapa para no atascarse.

🟢 Notas de Estabilidad y Multi-Tenant (Infra)
Para vender a muchos talleres a la vez (SaaS), agregar workshopId a cada doc (users, jobs, inventory) asegurando aislamiento de datos.

🔥 Sugerencia Inmediata:
Implementar 🔴 Alta Prioridad usando Firebase Storage y Firestore. Revisar la propuesta Técnica y comenzar desarrollo interactivo.
