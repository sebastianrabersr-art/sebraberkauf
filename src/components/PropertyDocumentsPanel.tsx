import { useCallback, useEffect, useRef, useState } from "react";
import { CircleNotch, DownloadSimple, FileText, Trash, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  deleteDocument, documentDownloadUrl, fmtFileSize, listDocuments, uploadDocument, validateDocument,
  type StoredDocument,
} from "@/lib/propertyDocuments";

/** Dokumente-Tab: PDFs hochladen (Drag & Drop oder Klick), herunterladen, löschen. */
export function PropertyDocumentsPanel({ propertyId }: { propertyId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<StoredDocument[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setDocs(await listDocuments(propertyId));
      setLoadError(false);
    } catch {
      setDocs([]);
      setLoadError(true);
    }
  }, [propertyId]);
  useEffect(() => { void reload(); }, [reload]);

  const handleFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    let current = docs ?? [];
    for (const file of list) {
      const problem = validateDocument(file);
      if (problem) { toast.error(problem); continue; }
      setUploading((n) => n + 1);
      try {
        const doc = await uploadDocument(propertyId, file, current);
        current = [doc, ...current];
        setDocs(current);
        toast.success(`„${doc.filename}“ hochgeladen.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        toast.error(/bucket|not found|relation/i.test(msg)
          ? "Dokumente sind noch nicht eingerichtet (Datenbank-Migration fehlt)."
          : `„${file.name}“ konnte nicht hochgeladen werden.`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const download = async (doc: StoredDocument) => {
    setBusyId(doc.id);
    try {
      const url = await documentDownloadUrl(doc);
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("Download nicht möglich.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (doc: StoredDocument) => {
    if (!confirm(`„${doc.filename}“ endgültig löschen?`)) return;
    setBusyId(doc.id);
    try {
      await deleteDocument(doc);
      setDocs((d) => (d ?? []).filter((x) => x.id !== doc.id));
      toast.success("Dokument gelöscht.");
    } catch {
      toast.error("Dokument konnte nicht gelöscht werden.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
        className="w-full flex flex-col items-center justify-center gap-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-[#2D6A4F]"
        style={{
          border: `1.5px dashed ${dragOver ? "#2D6A4F" : "#EAE6DF"}`,
          borderRadius: 10,
          background: dragOver ? "#E8F5EE" : "#FAFAF8",
          padding: "28px 16px",
        }}
      >
        {uploading > 0
          ? <CircleNotch className="size-6 animate-spin text-[#2D6A4F]" aria-hidden />
          : <UploadSimple className="size-6 text-[#2D6A4F]" aria-hidden />}
        <span className="text-[13px] font-medium text-[#1C1917]">
          {uploading > 0 ? "Wird hochgeladen …" : "PDF hier ablegen oder klicken zum Hochladen"}
        </span>
        <span className="text-[12px] text-ink-3">Nur PDF · max. 10 MB pro Datei</span>
      </button>

      {docs === null ? (
        <div className="flex items-center gap-2 text-[13px] text-ink-3"><CircleNotch className="size-4 animate-spin" aria-hidden /> Lade Dokumente …</div>
      ) : loadError ? (
        <div className="rounded-[8px] px-3 py-2.5 text-[12px]" style={{ background: "#FFF7ED", border: "1px solid #FED7AA", color: "#9A3412" }}>
          Dokumente konnten nicht geladen werden. Falls die Funktion gerade erst eingerichtet wurde, fehlt evtl. noch die Datenbank-Migration.
        </div>
      ) : docs.length === 0 ? (
        <div className="text-[13px] text-ink-3">Noch keine Dokumente. Lade Kaufvertrag, Grundbuchauszug, Energieausweis & Co. hier hoch.</div>
      ) : (
        <ul className="rounded-[10px] border border-[#EAE6DF] divide-y divide-[#EAE6DF] bg-white">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="size-5 shrink-0" weight="duotone" style={{ color: "#2D6A4F" }} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1C1917] truncate" title={d.filename}>{d.filename}</div>
                <div className="text-[12px] text-ink-3">
                  {new Date(d.created_at).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" })} · {fmtFileSize(d.file_size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => download(d)}
                disabled={busyId === d.id}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[#EAE6DF] px-2.5 py-1.5 text-[12px] text-[#1C1917] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-50"
              >
                <DownloadSimple className="size-3.5" aria-hidden /> Download
              </button>
              <button
                type="button"
                onClick={() => remove(d)}
                disabled={busyId === d.id}
                aria-label={`${d.filename} löschen`}
                className="rounded-full p-1.5 text-ink-3 hover:text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
              >
                <Trash className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
