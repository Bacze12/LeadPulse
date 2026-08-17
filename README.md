# CRM de Leads

CRM web para gestionar **leads**, **visitas técnicas**, **tareas** y **cotizaciones**, integrado con **n8n** mediante webhooks bidireccionales.

## Funcionalidades

- **Leads**: alta, edición, listado y pipeline de estados (nuevo → contactado → seguimiento → visita agendada → cotizado → ganado/perdido). Incluye **etiquetas**, **contactos adicionales** (teléfonos/emails extra), **messageId** (Titan/email) y **asignación de vendedor**.
- **Historial de interacciones**: registra llamadas, WhatsApp, correos y notas por lead.
- **Tareas**: recordatorios y follow-ups por lead con tipo de acción, vencimiento y estado completada/pendiente.
- **Visitas técnicas**: agenda visitas por lead, asigna técnico, cambia el estado (programada, confirmada, realizada, cancelada, no asistió).
- **Cotizaciones**: registra montos (USD/CLP) por lead, marca como enviada/aprobada/rechazada. Al aprobar una cotización, el lead pasa automáticamente a "Ganado".
- **Dashboard**: resumen de métricas (leads totales, ganados, visitas próximas, cotizaciones pendientes, tareas) y pipeline.
- **Autenticación**: login con usuario/contraseña (Auth.js v5), roles de usuario.
- **Usuarios (solo admin)**: crea cuentas únicamente con correos `@arkonsecurity.cl`; cada cuenta recibe una **clave temporal** que el usuario debe cambiar en `/account/password`.
- **Integración n8n**: el CRM expone webhooks de escritura y lectura (`GET /api/leads`), y notifica a n8n cada evento (lead/visita/cotización/nota/tarea).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Tailwind CSS 4)
- [Prisma 7](https://prisma.io) + [Supabase](https://supabase.com) (PostgreSQL)
- [Auth.js v5](https://authjs.dev) (NextAuth) con credenciales
- [n8n](https://n8n.io) (webhooks)

## Requisitos

- Node.js 20+
- Una base de datos PostgreSQL. Este proyecto está pensado para **Supabase**: crea un proyecto en https://supabase.com y copia la *connection string* (Project Settings → Database → Connection string, modo *direct*).

> **Desarrollo local (sin Supabase):** también puedes correr Postgres en Docker:
> `docker run -d --name crm-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=crm -p 5432:5432 -v crm-postgres-data:/var/lib/postgresql/data postgres:16`
> y usar `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm"`.

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea tu archivo de entorno:

   ```bash
   cp .env.example .env
   ```

3. Edita `.env`:

   | Variable | Descripción |
   | --- | --- |
   | `DATABASE_URL` | Connection string de Supabase/PostgreSQL |
   | `AUTH_SECRET` | Secreto para firmar sesiones (`openssl rand -base64 32`) |
   | `N8N_WEBHOOK_URL` | URL del webhook de **n8n** (para enviar eventos). Opcional en dev |
   | `N8N_WEBHOOK_SECRET` | Header `x-webhook-secret` que se envía a n8n. Opcional |
   | `N8N_INBOUND_SECRET` | Header `x-api-key` que n8n debe enviar para leer/escribir en el CRM. Si está vacío, el webhook no valida (solo dev) |
   | `SEED_ADMIN_*` | Credenciales del usuario admin del seed |

4. Crea las tablas y el usuario admin:

   ```bash
   npm run db:migrate   # crea las tablas
   npm run db:seed      # crea bcastillo@arkonsecurity.cl (admin) y cperedo@arkonsecurity.cl (vendedor), con claves temporales que se imprimen en consola
   ```

5. Inicia el servidor:

   ```bash
   npm run dev -- -p 3001
   ```

   Abre http://localhost:3001 y entra con las credenciales del seed.

> Si cambias el esquema: `npx prisma generate` (regenera el cliente). Para producción: `npx prisma migrate deploy`.

## Integración con n8n

### 1. n8n → CRM (n8n crea/actualiza leads)

El CRM expone:

```
POST {BASE_URL}/api/webhooks/n8n
GET  {BASE_URL}/api/leads    # lectura con búsqueda y paginación
```

Con los headers (si definiste `N8N_INBOUND_SECRET`):

```
x-api-key: TU_CLAVE
```

En n8n, conecta un nodo **Webhook** (modo *Respond to Webhook* no necesario; el CRM responde con el lead resultante) o **HTTP Request** apuntando a la URL del CRM.

**Payloads soportados** (envía `action` + `data`):

```json
// Crear o actualizar (si ya existe por email, phone o n8nId, actualiza)
{ "action": "upsert", "data": { "name": "Juan Pérez", "email": "juan@correo.com", "phone": "+52...", "company": "ACME", "source": "WhatsApp", "status": "NUEVO", "tags": ["Scraped"], "phones": ["+52..."], "emails": ["alt@correo.com"], "messageId": "titan:msg_1" } }

// Crear (devuelve 409 si ya existe)
{ "action": "create", "data": { "n8nId": "abc-123", "name": "María", "email": "maria@correo.com" } }

// Actualizar un lead existente
{ "action": "update", "id": "ID_DEL_CRM", "data": { "status": "CONTACTADO", "notes": "Llamada realizada" } }

// Eliminar
{ "action": "delete", "data": { "n8nId": "abc-123" } }
```

Campos válidos en `data`: `n8nId`, `name`, `company`, `email`, `phone`, `source`, `notes`, `status`, `tags`, `extraContacts`, `phones`, `emails`, `messageId` (estados: `NUEVO`, `CONTACTADO`, `EN_SEGUIMIENTO`, `VISITA_AGENDADA`, `COTIZADO`, `GANADO`, `PERDIDO`, `NO_CONTESTA`).

Para consultar leads: `GET /api/leads?q=juan&status=CONTACTADO&page=1&limit=20` (ver `INTEGRACIONES.md`).

### 2. CRM → n8n (eventos)

Cada acción en el CRM envía un POST a `N8N_WEBHOOK_URL` (si está configurado) con:

```json
{
  "event": "lead.created",        // lead.updated | lead.status_changed | lead.deleted | lead.assigned
                                  // visit.scheduled | visit.status_changed | visit.deleted
                                  // quote.created | quote.status_changed | quote.deleted
                                  // note.created | note.deleted | task.created | task.completed | task.deleted
  "entity": "lead",
  "data": { "id": "...", "name": "Juan", "status": "NUEVO" }
}
```

Con header `x-webhook-secret` (si configurado).

### 3. Flujo típico en n8n

1. Formulario/WhatsApp → captura el lead → **HTTP Request** a `/api/webhooks/n8n` (action `upsert`).
2. Cuando el lead cambia a `VISITA_AGENDADA` (evento `visit.scheduled`), n8n puede enviar un recordatorio o crear un evento de calendario.
3. Cuando una cotización cambia a `APROBADA` (evento `quote.status_changed`), n8n puede generar la factura o notificar al equipo.
4. Al registrar una interacción o crear una tarea (`note.created`, `task.created`), n8n puede actualizar Titan o crear un recordatorio.

## Estructura del proyecto

```
src/
  actions/        # Server Actions (leads, visitas, cotizaciones, interacciones, tareas, auth)
  app/
    (auth)/login  # Login
    (dashboard)/  # Dashboard, leads, visitas, tareas, cotizaciones (protegidos)
    api/
      auth/[...nextauth]   # Handlers de Auth.js
      leads                # GET /api/leads (lectura para n8n)
      webhooks/n8n         # Webhook de entrada de n8n
  components/     # UI (sidebar, formularios, controles de estado)
  lib/            # db, auth, requireUser, n8n, constantes, formatos, zod
  generated/prisma # Cliente Prisma generado (no editar)
prisma/
  schema.prisma   # Esquema de datos
  seed.ts         # Usuario admin + datos de ejemplo
```

## Despliegue (Vercel)

1. Sube el repo a GitHub.
2. En Vercel, importa el proyecto y define las variables de entorno del paso 3.
3. Crea la base de datos en Supabase y corre `npx prisma migrate deploy` (desde tu máquina apuntando a la misma `DATABASE_URL`).
4. Configura `N8N_WEBHOOK_URL` apuntando a tu instancia de n8n accesible desde internet.