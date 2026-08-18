import { useMemo } from "react";

export function EmailHtml({
  html,
  height = "55vh",
}: {
  html: string;
  height?: string;
}) {
  const srcDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;margin:0;padding:16px;word-break:break-word;}img{max-width:100%;height:auto;}a{color:#4f46e5;}</style></head><body>${html}</body></html>`,
    [html]
  );

  return (
    <iframe
      title="Contenido del correo"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      className="w-full rounded-lg border border-gray-200 bg-white"
      style={{ height }}
      srcDoc={srcDoc}
    />
  );
}