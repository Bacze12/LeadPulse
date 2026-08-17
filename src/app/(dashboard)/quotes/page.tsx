import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { deleteQuote } from "@/actions/quotes";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { QuoteStatusSelect } from "@/components/quote-status-select";
import { formatDate, formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  await requireUser();

  const quotes = await prisma.quote.findMany({
    include: { lead: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administra las cotizaciones y su aprobación
          </p>
        </div>
        <LinkButton href="/quotes/new">+ Nueva cotización</LinkButton>
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          title="Aún no hay cotizaciones"
          description="Crea una cotización para un lead."
          action={<LinkButton href="/quotes/new">+ Nueva cotización</LinkButton>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Lead
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Monto
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Fecha
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Estado
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/leads/${quote.leadId}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {quote.lead.name}
                      </Link>
                      {quote.description ? (
                        <p className="max-w-xs truncate text-xs text-gray-500">
                          {quote.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(quote.amount, quote.currency)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <QuoteStatusSelect quoteId={quote.id} status={quote.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DeleteButton onDelete={deleteQuote.bind(null, quote.id)} label="Eliminar" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}