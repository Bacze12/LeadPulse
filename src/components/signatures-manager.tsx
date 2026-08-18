"use client";

import { useRef, useState } from "react";
import {
  createSignature,
  deleteSignature,
  listUserSignatures,
  setDefaultSignature,
  updateSignature,
} from "@/actions/signatures";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { sanitizeSignatureHtml } from "@/lib/sanitize";

export type SavedSignature = {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function SignatureImageButton({ onInsert }: { onInsert: (html: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Insertar imagen
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              const dataUrl = await readFileAsDataUrl(file);
              onInsert(`\n<img src="${dataUrl}" style="max-width:220px;height:auto;" alt="firma"/>\n`);
            } catch {
              // ignore read errors
            }
          }
          e.target.value = "";
        }}
      />
    </>
  );
}

function SignaturePreview({ content }: { content: string }) {
  if (!content.trim()) return null;
  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
      dangerouslySetInnerHTML={{ __html: sanitizeSignatureHtml(content) }}
    />
  );
}

export function SignaturesManager({
  initial,
}: {
  initial: SavedSignature[];
}) {
  const [signatures, setSignatures] = useState<SavedSignature[]>(initial);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");

  async function runCreate(formData: FormData) {
    setCreateError(null);
    setPending(true);
    try {
      const result = await createSignature(formData);
      if (result?.error) {
        setCreateError(result.error);
      } else {
        setSignatures(await loadSignatures());
        setCreateName("");
        setCreateContent("");
      }
    } finally {
      setPending(false);
    }
  }

  async function runUpdate(formData: FormData) {
    const result = await updateSignature(formData);
    if (result?.ok) {
      setEditingId(null);
      setSignatures(await loadSignatures());
    }
  }

  async function runDelete(formData: FormData) {
    const result = await deleteSignature(formData);
    if (result?.ok) {
      setSignatures(await loadSignatures());
    }
  }

  async function runSetDefault(formData: FormData) {
    const result = await setDefaultSignature(formData);
    if (result?.ok) {
      setSignatures(await loadSignatures());
    }
  }

  function startEdit(s: SavedSignature) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditContent(s.content);
  }

  return (
    <div className="space-y-5">
      <form action={runCreate} className="space-y-3">
        {createError ? (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {createError}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
          <div>
            <Label htmlFor="sig-name">Nombre</Label>
            <Input
              id="sig-name"
              name="name"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ej: Firma estándar"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="sig-content">Contenido de la firma</Label>
              <SignatureImageButton
                onInsert={(html) => setCreateContent((v) => v + html)}
              />
            </div>
            <Textarea
              id="sig-content"
              name="content"
              rows={2}
              required
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              placeholder={"Atentamente,\nTu nombre\nArkon Security"}
            />
            <SignaturePreview content={createContent} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando..." : "Guardar firma"}
          </Button>
        </div>
      </form>

      {signatures.length === 0 ? (
        <p className="text-sm text-gray-500">
          Todavía no tienes firmas guardadas. Crea una y aparecerá disponible
          al redactar correos.
        </p>
      ) : (
        <ul className="space-y-3">
          {signatures.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              {editingId === s.id ? (
                <form
                  action={runUpdate}
                  className="grid w-full gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      name="name"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>Contenido</Label>
                      <SignatureImageButton
                        onInsert={(html) => setEditContent((v) => v + html)}
                      />
                    </div>
                    <Textarea
                      name="content"
                      required
                      rows={2}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <SignaturePreview content={editContent} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary">
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {s.name}
                      </span>
                      {s.isDefault ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          Predeterminada
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="mt-1 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeSignatureHtml(s.content),
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!s.isDefault ? (
                      <form action={runSetDefault}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" variant="secondary">
                          Usar por defecto
                        </Button>
                      </form>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => startEdit(s)}
                    >
                      Editar
                    </Button>
                    <form action={runDelete}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" variant="danger">
                        Eliminar
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function loadSignatures(): Promise<SavedSignature[]> {
  const sigs = await listUserSignatures();
  return sigs.map((s) => ({
    id: s.id,
    name: s.name,
    content: s.content,
    isDefault: s.isDefault,
  }));
}