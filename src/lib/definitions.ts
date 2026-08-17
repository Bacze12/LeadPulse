import * as z from "zod";
import { INTERACTION_TYPES, TASK_ACTION_TYPES } from "@/lib/constants";

const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

export const loginSchema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const leadFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  company: optionalString,
  email: z
    .union([z.string().email("Email inválido"), z.literal(""), z.undefined()])
    .optional(),
  phone: optionalString,
  website: optionalString,
  source: optionalString,
  notes: optionalString,
  tags: optionalString,
});

export const visitFormSchema = z.object({
  leadId: z.string().min(1, "Selecciona un lead"),
  scheduledFor: z.string().min(1, "La fecha es requerida"),
  address: optionalString,
  technicianName: optionalString,
  notes: optionalString,
});

export const quoteFormSchema = z.object({
  leadId: z.string().min(1, "Selecciona un lead"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: z.string().min(1).default("USD"),
  description: optionalString,
});

export const interactionFormSchema = z.object({
  leadId: z.string().min(1),
  type: z.enum(INTERACTION_TYPES).default("NOTA"),
  content: z.string().min(1, "Escribe la nota o el detalle"),
});

export const userFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z
    .string()
    .email("Ingresa un email válido")
    .refine(
      (e) => e.toLowerCase().endsWith("@arkonsecurity.cl"),
      "Solo se permiten correos @arkonsecurity.cl"
    ),
  role: z.enum(["VENDEDOR", "TECNICO", "ADMIN"]).default("VENDEDOR"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export type UserFormData = z.infer<typeof userFormSchema>;

export const taskFormSchema = z.object({
  leadId: z.string().min(1, "Selecciona un lead"),
  title: z.string().min(1, "El título es requerido"),
  actionType: z.enum(TASK_ACTION_TYPES).default("SEGUIMIENTO"),
  dueDate: z.string().min(1, "La fecha es requerida"),
  notes: optionalString,
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
export type VisitFormData = z.infer<typeof visitFormSchema>;
export type QuoteFormData = z.infer<typeof quoteFormSchema>;
export type InteractionFormData = z.infer<typeof interactionFormSchema>;
export type TaskFormData = z.infer<typeof taskFormSchema>;

export const mailboxFormSchema = z.object({
  name: optionalString,
  email: z.string().email("Ingresa el correo de la casilla"),
  password: z.string().min(1, "La contraseña es requerida"),
  signature: optionalString,
  imapHost: z.string().min(1).default("imap.titan.email"),
  imapPort: z.coerce.number().int().positive().default(993),
  smtpHost: z.string().min(1).default("smtp.titan.email"),
  smtpPort: z.coerce.number().int().positive().default(465),
});

export const sendEmailSchema = z.object({
  to: z.string().min(1, "El destinatario es requerido"),
  cc: optionalString,
  bcc: optionalString,
  subject: z.string().min(1, "El asunto es requerido"),
  message: z.string().min(1, "Escribe el mensaje"),
  inReplyTo: optionalString,
  references: optionalString,
});

export type MailboxFormData = z.infer<typeof mailboxFormSchema>;
export type SendEmailData = z.infer<typeof sendEmailSchema>;