export const LEAD_STATUSES = [
  "NUEVO",
  "CONTACTADO",
  "EN_SEGUIMIENTO",
  "VISITA_AGENDADA",
  "COTIZADO",
  "GANADO",
  "PERDIDO",
  "NO_CONTESTA",
] as const;

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  EN_SEGUIMIENTO: "En seguimiento",
  VISITA_AGENDADA: "Visita agendada",
  COTIZADO: "Cotizado",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
  NO_CONTESTA: "No contesta",
};

export const LEAD_STATUS_STYLES: Record<string, string> = {
  NUEVO: "bg-sky-100 text-sky-800",
  CONTACTADO: "bg-indigo-100 text-indigo-800",
  EN_SEGUIMIENTO: "bg-amber-100 text-amber-800",
  VISITA_AGENDADA: "bg-violet-100 text-violet-800",
  COTIZADO: "bg-cyan-100 text-cyan-800",
  GANADO: "bg-emerald-100 text-emerald-800",
  PERDIDO: "bg-rose-100 text-rose-800",
  NO_CONTESTA: "bg-gray-200 text-gray-700",
};

export const VISIT_STATUSES = [
  "PROGRAMADA",
  "CONFIRMADA",
  "REALIZADA",
  "CANCELADA",
  "NO_ASISTIO",
] as const;

export const VISIT_STATUS_LABELS: Record<string, string> = {
  PROGRAMADA: "Programada",
  CONFIRMADA: "Confirmada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
  NO_ASISTIO: "No asistió",
};

export const VISIT_STATUS_STYLES: Record<string, string> = {
  PROGRAMADA: "bg-amber-100 text-amber-800",
  CONFIRMADA: "bg-blue-100 text-blue-800",
  REALIZADA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-rose-100 text-rose-800",
  NO_ASISTIO: "bg-gray-200 text-gray-700",
};

export const QUOTE_STATUSES = [
  "BORRADOR",
  "ENVIADA",
  "APROBADA",
  "RECHAZADA",
  "VENCIDA",
] as const;

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  VENCIDA: "Vencida",
};

export const QUOTE_STATUS_STYLES: Record<string, string> = {
  BORRADOR: "bg-gray-200 text-gray-700",
  ENVIADA: "bg-blue-100 text-blue-800",
  APROBADA: "bg-emerald-100 text-emerald-800",
  RECHAZADA: "bg-rose-100 text-rose-800",
  VENCIDA: "bg-orange-100 text-orange-800",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  TECNICO: "Técnico",
};

export const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-rose-100 text-rose-800",
  VENDEDOR: "bg-indigo-100 text-indigo-800",
  TECNICO: "bg-sky-100 text-sky-800",
};

export const INTERACTION_TYPES = [
  "LLAMADA",
  "WHATSAPP",
  "CORREO",
  "REUNION",
  "NOTA",
] as const;

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
  CORREO: "Correo",
  REUNION: "Reunión",
  NOTA: "Nota",
};

export const INTERACTION_TYPE_STYLES: Record<string, string> = {
  LLAMADA: "bg-sky-100 text-sky-800",
  WHATSAPP: "bg-emerald-100 text-emerald-800",
  CORREO: "bg-indigo-100 text-indigo-800",
  REUNION: "bg-violet-100 text-violet-800",
  NOTA: "bg-gray-200 text-gray-700",
};

export const TASK_ACTION_TYPES = [
  "LLAMADA",
  "WHATSAPP",
  "REUNION",
  "CORREO",
  "SEGUIMIENTO",
] as const;

export const TASK_ACTION_LABELS: Record<string, string> = {
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
  REUNION: "Reunión",
  CORREO: "Correo",
  SEGUIMIENTO: "Seguimiento",
};

export const TASK_ACTION_STYLES: Record<string, string> = {
  LLAMADA: "bg-sky-100 text-sky-800",
  WHATSAPP: "bg-emerald-100 text-emerald-800",
  REUNION: "bg-violet-100 text-violet-800",
  CORREO: "bg-indigo-100 text-indigo-800",
  SEGUIMIENTO: "bg-amber-100 text-amber-800",
};

export const TITAN_DEFAULTS = {
  imapHost: "imap.titan.email",
  imapPort: 993,
  smtpHost: "smtp.titan.email",
  smtpPort: 465,
};

export const PROVIDER_STATUSES = ["ACTIVO", "INACTIVO"] as const;

export const PROVIDER_STATUS_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
};

export const PROVIDER_STATUS_STYLES: Record<string, string> = {
  ACTIVO: "bg-emerald-100 text-emerald-800",
  INACTIVO: "bg-gray-200 text-gray-700",
};