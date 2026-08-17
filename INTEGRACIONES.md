# Integraciones y funcionamiento del CRM

Este documento explica **qué APIs expone el CRM para integrarse con n8n**, **cómo funciona cada apartado de la app** y **cómo se conectaría n8n** en la práctica.

> El CRM corre por defecto en **http://localhost:3001** (el puerto 3000 lo usa Open WebUI).

---

## 1. Las APIs para n8n

Hay **tres** superficies de integración: escritura (n8n → CRM), lectura (n8n ← CRM) y eventos (CRM → n8n).

### 1.1 Escritura: n8n → CRM (n8n crea/actualiza leads)

| Dato | Valor |
| --- | --- |
| Método | `POST` |
| Ruta | `/api/webhooks/n8n` |
| URL local | `http://localhost:3001/api/webhooks/n8n` |
| Auth | Header `x-api-key: <clave>` — acepta el `N8N_INBOUND_SECRET` de `.env` o cualquier **API key activa** creada en *Ajustes* → *API keys* (ver §1.4) |
| Respuesta | El lead resultante en JSON (status 200/201), o error |

**Acciones soportadas** (se envían en el body):

| `action` | Comportamiento |
| --- | --- |
| `upsert` *(default)* | Si ya existe un lead con el mismo `n8nId`, `email` o `phone`, lo actualiza; si no, lo crea |
| `create` | Crea un lead nuevo; responde `409` si ya existe |
| `update` | Actualiza un lead existente (por `id`, `n8nId`, `email` o `phone`) |
| `delete` | Elimina un lead existente |

**Ejemplos de payload:**

```json
// Crear o actualizar un lead (el más usado)
{
  "action": "upsert",
  "data": {
    "name": "Juan Pérez",
    "email": "juan@correo.com",
    "phone": "+56 9 1234 5678",
    "company": "ACME Spa",
    "website": "https://acme.cl",
    "source": "WhatsApp",
    "notes": "Pide cotización de panel solar",
    "status": "NUEVO",
    "tags": ["Scraped", "WhatsApp"],
    "messageId": "titan:msg_123"           // opcional: ID de Titan/email
  }
}

// Teléfonos/emails adicionales (se guardan como contactos extra)
{
  "action": "upsert",
  "data": { "name": "María", "email": "maria@correo.com", "phones": ["+56 9 5555 1111"], "emails": ["maria@alterno.com"] }
}

// Crear con ID propio de n8n (evita duplicados)
{ "action": "create", "data": { "n8nId": "fb-001", "name": "María", "email": "maria@correo.com" } }

// Cambiar estado desde n8n
{ "action": "update", "data": { "email": "juan@correo.com", "status": "CONTACTADO" } }
```

Campos válidos en `data`: `n8nId`, `name`, `company`, `email`, `phone`, `website`, `source`, `notes`, `status`, `tags`, `extraContacts` (arreglo de `{ type, value }`), `phones` (arreglo de strings), `emails` (arreglo de strings) y `messageId`.

Estados de `status`: `NUEVO`, `CONTACTADO`, `EN_SEGUIMIENTO`, `VISITA_AGENDADA`, `COTIZADO`, `GANADO`, `PERDIDO`, `NO_CONTESTA`.

**Probar manualmente (curl):**

```bash
curl -X POST http://localhost:3001/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -d '{"action":"upsert","data":{"name":"Lead de prueba","email":"test@correo.com","source":"curl","tags":["Scraped"]}}'
```

> Código: `src/app/api/webhooks/n8n/route.ts`

### 1.2 Lectura: n8n ← CRM (n8n consulta leads)

| Dato | Valor |
| --- | --- |
| Método | `GET` |
| Ruta | `/api/leads` |
| URL local | `http://localhost:3001/api/leads` |
| Auth | Header `x-api-key: <clave>` — acepta el `N8N_INBOUND_SECRET` de `.env` o cualquier **API key activa** (ver §1.4) |
| Respuesta | `{ total, page, limit, leads: [...] }` |

**Parámetros de búsqueda y paginación (query string):**

| Parámetro | Filtro |
| --- | --- |
| `q` | Busca en nombre, empresa, email, teléfono y sitio web (contiene) |
| `email` | Coincidencia exacta (case-insensitive) |
| `phone` | Teléfono contiene el texto |
| `status` | Filtra por estado (`NUEVO`, `CONTACTADO`, ...) |
| `tag` | Filtra por etiqueta |
| `assignedTo` | Filtra por id de usuario asignado |
| `page` | Número de página (default `1`) |
| `limit` | Resultados por página (default `50`, máx `100`) |

```bash
curl "http://localhost:3001/api/leads?q=juan&status=CONTACTADO&page=1&limit=20" \
  -H "x-api-key: mi-clave"
```

> Código: `src/app/api/leads/route.ts`

### 1.3 Salida: CRM → n8n (el CRM notifica cada evento a n8n)

Configura en `.env` la URL del webhook de tu n8n:

```
N8N_WEBHOOK_URL=http://localhost:5678/webhook/crm-events
N8N_WEBHOOK_SECRET=mi-clave   # opcional, se envía como header x-webhook-secret
```

Cada vez que ocurre un evento, el CRM hace `POST` a esa URL con:

```json
{
  "event": "lead.created",
  "entity": "lead",
  "data": { "id": "...", "name": "Juan", "status": "NUEVO" }
}
```

**Todos los eventos que emite el CRM:**

| Módulo | Evento | Cuándo |
| --- | --- | --- |
| Leads | `lead.created` | Se crea un lead (manual o por webhook) |
| Leads | `lead.updated` | Se edita un lead |
| Leads | `lead.status_changed` | Cambia el estado del lead |
| Leads | `lead.deleted` | Se elimina un lead |
| Leads | `lead.assigned` | Se asigna un vendedor al lead (incluye `assignee` con `id` y `name`) |
| Visitas | `visit.scheduled` | Se agenda una visita |
| Visitas | `visit.status_changed` | Cambia el estado de la visita |
| Visitas | `visit.deleted` | Se elimina una visita |
| Cotizaciones | `quote.created` | Se crea una cotización |
| Cotizaciones | `quote.status_changed` | Cambia el estado (ej. aprobada/rechazada) |
| Cotizaciones | `quote.deleted` | Se elimina una cotización |
| Notas | `note.created` | Se registra una interacción en un lead |
| Notas | `note.deleted` | Se elimina una interacción |
| Tareas | `task.created` | Se crea una tarea/follow-up |
| Tareas | `task.completed` | Se completa una tarea |
| Tareas | `task.deleted` | Se elimina una tarea |

**En n8n:** un nodo **Webhook** (ruta `crm-events`) con "Respond" desactivado recibe estos eventos y puede disparar el flujo que quieras.

> Código: `src/lib/n8n.ts` (función `emitN8n`) y se llama desde `src/actions/*.ts`.

### 1.4 Gestión de API keys (página *Ajustes*)

- Ruta: **`/settings`** (solo **ADMIN**). Cada usuario ve su acceso; la gestión de claves es del administrador.
- Se pueden crear **API keys** (formato `crm_<64 hex>`). Al crear, la clave completa se muestra **una sola vez**.
- La clave se guarda **hashada (sha256)** en la BD; solo se muestra el prefijo `crm_xxxx…`.
- **Revocar** una clave la inutiliza de inmediato (no se borra: queda en la lista *Revocadas*).
- Autenticación: cada petición envía `x-api-key: <clave>`. Vale el `N8N_INBOUND_SECRET` de `.env` **o** cualquier API key activa.
- Código: `src/lib/api-auth.ts`, `src/actions/api-keys.ts`, `src/components/api-keys-panel.tsx`.

---

## 2. Cómo funciona cada apartado

### Dashboard (`/dashboard`)
Resumen con métricas en vivo:
- **Total de leads**, **leads ganados**, **visitas próximas**, **cotizaciones por aprobar** y **tareas pendientes**.
- **Pipeline de leads**: distribución por estado con porcentajes.
- **Próximas visitas** (programadas/confirmadas de hoy en adelante).
- **Leads recientes**, **cotizaciones recientes** y **tareas pendientes** (top 5).

### Leads (`/leads`)
- **Listado** de prospectos con estado, contacto y fecha.
- **Crear / editar / eliminar** lead; **etiquetas** separadas por coma.
- **Pipeline de estados** editable desde el detalle: `NUEVO → CONTACTADO → EN_SEGUIMIENTO → VISITA_AGENDADA → COTIZADO → GANADO/PERDIDO/NO_CONTESTA`.
- **Asignación de vendedor** desde el detalle (dispara el evento `lead.assigned`).
- En el detalle se ven: **información de contacto** (empresa, email, teléfono, **sitio web** clicable, `messageId` y **contactos adicionales**), **historial de interacciones** (con formulario para registrar notas/llamadas/WhatsApp/email), **correos del lead** (si la casilla está conectada), **tareas** del lead, **visitas** y **cotizaciones**, y botones para **agendar visita**, **crear cotización** o **nueva tarea** directamente para ese lead.

### Visitas técnicas (`/visits`)
- **Agendar visita** para un lead: fecha/hora, técnico asignado, dirección y notas.
- **Próximas visitas** y **historial** con estados editables: `PROGRAMADA → CONFIRMADA → REALIZADA / CANCELADA / NO_ASISTIO`.
- Al agendar una visita, el lead pasa automáticamente a `VISITA_AGENDADA`.

### Tareas (`/tasks`)
- **Pendientes** y **completadas**, con contador de **atrasadas**.
- Cada tarea tiene tipo de acción (`LLAMADA`, `ENVIAR_CORREO`, `ENVIAR_WHATSAPP`, `HACER_SEGUIMIENTO`, `AGENDAR_VISITA`, `ENVIAR_COTIZACION`, `CIERRE`), fecha de vencimiento, notas y lead asociado.
- Se marcan completadas con un clic (dispara `task.completed`).
- Acceso rápido desde el dashboard y desde el detalle del lead.

### Cotizaciones (`/quotes`)
- **Crear cotización** para un lead: monto, moneda (**USD o CLP**) y descripción.
- **Cambio de estado** en la tabla: `BORRADOR → ENVIADA → APROBADA / RECHAZADA / VENCIDA`.
- Al crear una cotización, el lead pasa a `COTIZADO`; al **aprobar**, el lead pasa automáticamente a `GANADO`.

### Correos (`/correos`)
- **Cada usuario conecta su propia casilla Titan** (IMAP `imap.titan.email:993` + SMTP `smtp.titan.email:465`) desde `Correos > Configurar casilla`.
- La bandeja de entrada se lee **directamente por IMAP** (últimos 30 correos) y se pueden **abrir** los mensajes.
- **Responder** desde el correo abierto (respeta `Re:` y arma el hilo con `In-Reply-To`/`References`) o **enviar un correo nuevo**.
- En la **ficha de cada lead** aparece la tarjeta **"Correos del lead"**: filtra la bandeja por los correos del contacto y permite **enviarle un correo** sin salir de la ficha.
- Configuración guardada en la tabla `mailboxes` (una por usuario). Si un lead no tiene correo, la tarjeta no se muestra.

---

## 3. Cómo se integraría n8n en la práctica

### Flujo A — Captura de leads (lo más común)
1. En n8n, un trigger (formulario web, formulario de Facebook/WhatsApp, Google Sheets, scraping, Titan/email, etc.) captura los datos del prospecto.
2. Un nodo **HTTP Request** hace `POST` a `http://localhost:3001/api/webhooks/n8n` con `action: upsert` (incluye `tags`, `phones`/`emails` y `messageId` si vienen del origen).
3. El lead queda registrado en el CRM y la respuesta del webhook trae el `id` del lead para seguirlo en el flujo.
4. Opcional: n8n puede consultar `GET /api/leads` para deduplicar o enriquecer datos antes de escribir.

### Flujo B — Recordatorios de visitas
1. El CRM emite `visit.scheduled` cuando se agenda una visita.
2. n8n recibe el evento y programa un recordatorio (espera, cron o schedule) para avisar al técnico o al cliente antes de la visita.

### Flujo C — Aprobación de cotizaciones
1. Cuando una cotización pasa a `APROBADA`, el CRM emite `quote.status_changed` (con `status: APROBADA`).
2. n8n puede generar la orden de trabajo, crear la factura (en un sistema contable) o notificar al equipo.

### Flujo D — Cierre de negocio
1. Cuando un lead pasa a `GANADO` (evento `lead.status_changed`), n8n puede enviar el contrato, archivar en Sheets o actualizar un CRM externo.

### Flujo E — Seguimiento de correos (Titan)
1. n8n lee bandejas de Titan/email y escribe leads con `messageId`, `emails[]` y `website`.
2. **En el CRM (interfaz)**: cada usuario conecta su casilla en `/correos`, ve el historial de mensajes por cliente (tarjeta "Correos del lead") y responde manualmente desde la ficha.
3. **En n8n (motor de automatización)**: con nodos de email (IMAP/SMTP de Titan) hace envíos automáticos en segundo plano (bienvenidas, secuencias outbound, detectar respuestas y pasar el lead a `CONTACTADO`).

---

## 4. Variables de entorno de integración

| Variable | Para qué sirve |
| --- | --- |
| `N8N_WEBHOOK_URL` | URL del webhook de n8n donde el CRM enviará los eventos (salida) |
| `N8N_WEBHOOK_SECRET` | Header `x-webhook-secret` que acompaña los eventos (opcional) |
| `N8N_INBOUND_SECRET` | Clave que n8n debe enviar en `x-api-key` para leer/escribir en el CRM (opcional en dev) |

> **Nota:** tienes n8n corriendo localmente en `http://localhost:5678` (contenedor Docker). Para probar la integración completa, crea en n8n un webhook en esa ruta y apunta `N8N_WEBHOOK_URL` hacia él, y usa `http://localhost:3001/api/webhooks/n8n` y `http://localhost:3001/api/leads` desde los nodos HTTP Request de n8n.