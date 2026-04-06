# Mechanic App - Setup Instructions

Este proyecto utiliza una arquitectura de 3 capas (Directivas, Orquestación y Ejecución). Sigue estos pasos para completar la configuración:

## 1. Variables de Entorno

1. Copia el archivo `.env.example` y cámbialo a `.env`.
2. Agrega tu `GEMINI_API_KEY` o cualquier otro token necesario.

## 2. Google Cloud Platform (Opcional - Para Google Sheets/Slides)

Si planeas enviar los reportes a servicios de Google:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto y habilita las APIs de **Google Sheets** y **Google Drive**.
3. Crea una **Cuenta de Servicio** o **Credenciales OAuth 2.0**.
4. Descarga el archivo JSON de credenciales y guárdalo como `credentials.json` en la raíz de este proyecto.
5. El archivo `token.json` se generará automáticamente la primera vez que ejecutes un script que requiera autenticación.

## 3. Instalación de Dependencias

Asegúrate de tener instalado Python y las librerías necesarias:

```bash
pip install python-dotenv google-auth google-auth-oauthlib google-api-python-client
```

## Arquitectura de Referencia

Consulta [gemini.md](gemini.md) para entender cómo opera el sistema entre las directivas y los scripts de ejecución.

## Ejecución del Prototipo Web

El prototipo de la aplicación se encuentra en la carpeta `web`. Para visualizar el avance:

1. Abre una terminal y navega a la carpeta `web`:
   ```bash
   cd web
   ```
2. Instala las dependencias (solo la primera vez):
   ```bash
   npm install
   ```
3. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre tu navegador en [http://localhost:3000](http://localhost:3000)

## Flujo de Usuario (Demo)

Para probar la plataforma completa SGA, sigue este flujo natural de trabajo:

1. **Recepción (`/reception`)**: Registra un nuevo vehículo completando los datos del cliente, auditoría de fluidos y firma el ingreso. Esto creará un Trabajo ("Job").
2. **Técnico (`/technician`)**: Abre el panel del mecánico. Selecciona el trabajo recién ingresado. Registra fallas y revisiones dando clic a "Log Item". Al finalizar toda su inspección, dale "Submit Diagnosis" para mandarla a cotizar.
3. **Asesor / Cotizador (`/advisor`)**: El asesor verá la orden pendiente, revisará las fallas del técnico y le pondrá el precio por repuesto. Luego sumará una mano de obra global, para presionar "Generar Cotización".
4. **Vista Cliente / Firma (`/client`)**: El cliente verá su vehículo y la cotización de forma interactiva. Podrá apagar o encender las reparaciones (viendo el total ajustarse en tiempo real) y finalmente "Aceptar Cotización y Firmar Electrónicamente".
