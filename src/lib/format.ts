import { format } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatCurrency(
  value: number | string | { toString(): string } | null | undefined,
  currency = "USD"
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value.toString());
  const locale = currency === "CLP" ? "es-CL" : "es-MX";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(num);
}