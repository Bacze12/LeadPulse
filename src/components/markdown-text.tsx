import { useMemo } from "react";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdownToHtml(text: string): string {
  if (!text) return "";

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const escaped = escapeHtml(normalized);
  const tokens: string[] = [];

  let out = escaped.replace(
    /(?:&lt;(https?:\/\/[^&\s<>]+?)&gt;)|(?:https?:\/\/[^\s<>)]+)|(?:[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/g,
    (match, angleUrl: string | undefined) => {
      const url = angleUrl ?? match;
      tokens.push(url);
      return `\u0000${tokens.length - 1}\u0000`;
    }
  );

  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  out = out.replace(/\u0000(\d+)\u0000/g, (_m, index: string) => {
    const url = tokens[Number(index)];
    const href = /^https?:\/\//.test(url) ? url : `mailto:${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline decoration-indigo-300 hover:text-indigo-800">${url}</a>`;
  });

  out = out.replace(/\n/g, "<br>");
  return out;
}

export function MarkdownText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const html = useMemo(() => renderMarkdownToHtml(text), [text]);
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}