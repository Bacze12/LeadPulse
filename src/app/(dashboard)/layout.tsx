import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";

const mobileNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/visits", label: "Visitas" },
  { href: "/tasks", label: "Tareas" },
  { href: "/quotes", label: "Cotizaciones" },
  { href: "/correos", label: "Correos" },
  { href: "/account/password", label: "Contraseña" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;

  return (
    <div className="min-h-screen">
      <Sidebar
        user={{ name: user.name, email: user.email, role: user.role }}
      />

      <div className="lg:pl-64">
        {user.mustChangePassword ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
            Estás usando una clave temporal.{" "}
            <Link href="/account/password" className="font-semibold underline">
              Cámbiala aquí
            </Link>
            .
          </div>
        ) : null}

        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="text-sm font-semibold text-gray-900">
              CRM de Leads
            </span>
            <LogoutButton />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
            {mobileNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
            {user.role === "ADMIN" ? (
              <Link
                href="/users"
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Usuarios
              </Link>
            ) : null}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}