"use client";

import { useEffect, useRef, useState } from "react";

type RichTextEditorProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
};

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "Escribe el mensaje...",
  rows = 8,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = defaultValue.replace(/\n/g, "<br/>");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    const value = ref.current?.innerHTML ?? "";
    setHtml(value);
  }

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    sync();
    ref.current?.focus();
  }

  function onToolbarMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  const sizes = [
    { v: "2", label: "Pequeño" },
    { v: "3", label: "Normal" },
    { v: "4", label: "Grande" },
    { v: "5", label: "Muy grande" },
  ];
  const colors = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#9333ea"];

  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40";

  return (
    <div>
      <input type="hidden" name={name} value={html} />
      <div className="overflow-hidden rounded-lg border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          <button
            type="button"
            className={btn + " font-bold"}
            title="Negrita"
            onMouseDown={onToolbarMouseDown}
            onClick={() => exec("bold")}
          >
            B
          </button>
          <button
            type="button"
            className={btn + " italic"}
            title="Cursiva"
            onMouseDown={onToolbarMouseDown}
            onClick={() => exec("italic")}
          >
            I
          </button>
          <button
            type="button"
            className={btn + " underline"}
            title="Subrayado"
            onMouseDown={onToolbarMouseDown}
            onClick={() => exec("underline")}
          >
            U
          </button>

          <span className="mx-1 h-5 w-px bg-gray-300" />

          <select
            title="Tamaño de texto"
            className="h-8 rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-700 hover:bg-gray-100"
            onMouseDown={onToolbarMouseDown}
            onChange={(e) => {
              if (e.target.value) {
                exec("fontSize", e.target.value);
                e.target.value = "";
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Tamaño
            </option>
            {sizes.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={btn}
            title="Resaltar texto"
            onMouseDown={onToolbarMouseDown}
            onClick={() => exec("hiliteColor", "#ffe58f")}
          >
            <span className="rounded bg-yellow-200 px-1">AB</span>
          </button>

          <select
            title="Color de texto"
            className="h-8 rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-700 hover:bg-gray-100"
            onMouseDown={onToolbarMouseDown}
            onChange={(e) => {
              if (e.target.value) {
                exec("foreColor", e.target.value);
                e.target.value = "";
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Color
            </option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span className="mx-1 h-5 w-px bg-gray-300" />

          <button
            type="button"
            className={btn}
            title="Lista con viñetas"
            onMouseDown={onToolbarMouseDown}
            onClick={() => exec("insertUnorderedList")}
          >
            •
          </button>
          <button
            type="button"
            className={btn}
            title="Lista numerada"
            onMouseDown={onToolbarMouseDown}
            onClick={() => exec("insertOrderedList")}
          >
            1.
          </button>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          data-placeholder={placeholder}
          className="prose min-h-[200px] max-w-none overflow-y-auto px-3 py-2 text-sm text-gray-800 focus:outline-none [&:empty:before]:text-gray-400 [&:empty:before]:content-[attr(data-placeholder)]"
          style={{ minHeight: rows * 24 }}
        />
      </div>
    </div>
  );
}