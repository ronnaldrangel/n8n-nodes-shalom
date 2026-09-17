# n8n-nodes-shalom

Nodo de [n8n](https://n8n.io) para integrar **Shalom API Perú** ([shalom-api.lat](https://shalom-api.lat)) en tus flujos de automatización: rastrea envíos de Shalom, consulta el catálogo de agencias con direcciones y coordenadas, cotiza tarifas, valida DNI y crea guías reales en Shalom Pro desde n8n — sin navegador y sin polling.

**Casos de uso típicos**: sincronizar pedidos de un ecommerce (WooCommerce, Shopify) con guías automáticas, notificar cambios de estado de envíos a Slack/WhatsApp, y descarga de comprobantes y etiquetas en PDF para tu operación.

> Proyecto independiente de integración compatible con Shalom Pro. No está afiliado a Shalom Empresarial S.A.C.

## Requisitos

- n8n **self-hosted** (para integrar un nodo custom es necesario gestionar tu propia instancia de n8n).
- Una **API key** de Shalom API Perú (solicítala en [shalom-api.lat](https://shalom-api.lat)).
- Un plan con acceso al nodo (las operaciones Pro requieren una instancia conectada).

## Instalación (para tus clientes)

### Opción A — Carpeta de nodos custom (~/.n8n/custom)

1. Compila el paquete:

   ```bash
   npm install
   npm run build
   ```

2. Copia la carpeta del paquete dentro de `~/.n8n/custom/` de tu n8n self-hosted:

   ```bash
   mkdir -p ~/.n8n/custom
   cp -r n8n-nodes-shalom ~/.n8n/custom/n8n-nodes-shalom
   ```

   En Windows (`%USERPROFILE%\.n8n\custom\`) o si n8n corre con variable `N8N_CUSTOM_EXTENSIONS`, ajusta la ruta según corresponda.

3. Reinicia n8n. El nodo **Shalom API** aparecerá en el panel (categoría *Transform*).
   Al seleccionarlo pide crear una credencial **Shalom API**:
   - **Base URL**: `https://api.shalom-api.lat`
   - **API Key**: tu clave (se envía como cabecera `x-api-key`)
   - Usa el botón **Test** de la credencial para validar tu API key contra el endpoint `GET /validate`.
   - Las operaciones Shalom Pro piden su **Instance ID** como parámetro de cada nodo (no a nivel credencial).

### Opción B — Paquete npm privado

Publica el tarball (`npm pack`) en tu registro privado y haz:

```bash
npm install -g <tu-registro>/n8n-nodes-shalom
# o instala en el custom directorio de n8n
N8N_CUSTOM_EXTENSIONS="$(npm root -g)" n8n start
```

## Operaciones

| Recurso | Operación | Endpoint |
| --- | --- | --- |
| **Agencias** | Listar agencias | `GET /agencies` |
| | Búsqueda avanzada | `GET /agencies/search` |
| **Ubicaciones** | Listar departamentos | `GET /locations/departments` |
| | Listar provincias | `GET /locations/departments/:depId/provinces` |
| | Listar distritos | `GET /locations/departments/:depId/provinces/:provId/districts` |
| **Tracking** | Rastrear envío | `POST /track` |
| | Rastrear en lote (máx. 50) | `POST /track/batch` |
| | Descargar comprobante | `GET /track/voucher` |
| | Descargar etiqueta PDF | `GET /track/label` |
| **Cuentas** | Cotizar envío | `POST /account/quote` |
| | Consultar DNI | `GET /account/dni/:dni` |
| | Registrar envío individual *(Pro)* | `POST /account/register` |
| | Registrar envíos (masivo) *(Pro)* | `POST /account/register-bulk` |
| | Envíos pendientes *(Pro)* | `POST /account/pending-shipments` |
| | Información del usuario *(Pro)* | `POST /account/get-user` |
| **Instancias** | Crear instancia *(Pro)* | `POST /instances` |
| | Listar instancias *(Pro)* | `GET /instances` |
| | Eliminar instancia *(Pro)* | `DELETE /instances` |
| | Iniciar sesión (Shalom Pro) *(Pro)* | `POST /instances/login` |
| | Estado de sesión *(Pro)* | `POST /instances/status` |
| | Cerrar sesión (Shalom Pro) *(Pro)* | `POST /instances/logout` |

Las operaciones marcadas *(Pro)* requieren `instanceId` como parámetro del nodo. Puedes usar una expresión, p. ej. `={{ $json.instanceId }}` o una variable del flujo.

## Validación de la conexión

La credencial **Shalom API** incluye un test que consulta el endpoint `GET /validate` de la API. Al pulsar **Test** en la pantalla de credenciales comprobarás que la API key es válida y activa, y verás el consumo del mes. Requiere que la API esté actualizada (con `/validate` disponible).

## Ejemplos de flujo

1. **Rastrear una guía**: Tracking → *Rastrear envío* con `orderNumber` y `orderCode`, y envía el resultado a un canal de notificación.
2. **Registrar envío**: Instancias → *Iniciar sesión (Shalom Pro)* con usuario/clave, luego Cuentas → *Registrar envío individual* o *masivo*.
3. **Descargar voucher al detectar cambio de estado**: Tracking → *Descargar comprobante* (formato imagen o PDF). La salida es binaria y se puede guardar/adjuntar.

## Desarrollo

```bash
npm run build    # compila TypeScript a dist/ y copia los recursos
npm run dev      # watch de TypeScript
npm pack         # genera el tarball distribuible
```

## Documentación de la API

- Guía de integración con n8n: [shalom-api.lat/integraciones/n8n](https://shalom-api.lat/integraciones/n8n)
- Documentación pública completa: [shalom-api.lat/docs](https://shalom-api.lat/docs)
- Directorio de agencias de Shalom: [shalom-api.lat/agencias](https://shalom-api.lat/agencias)
- Swagger de la API: `/docs` de la API (https://api.shalom-api.lat)

## Licencia

[MIT](LICENSE)