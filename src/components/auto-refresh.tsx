"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [last, setLast] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setLast(new Date());
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span className="text-xs text-gray-400">
      Actualizado {last.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}