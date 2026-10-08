import { supabase } from "@/integrations/supabase/client";

/*
 * PDF-Dokumente pro Immobilie: Datei im privaten Bucket "property-documents"
 * ({user_id}/{property_id}/{filename}), Metadaten in public.property_documents.
 * Zugriff nur auf eigene Dateien (RLS + Storage-Policies, siehe Migration 20261007180100).
 */

export const DOCUMENTS_BUCKET = "property-documents";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export type StoredDocument = {
  id: string;
  property_id: string;
  filename: string;
  storage_path: string;
  file_size: number;
  created_at: string;
};

const COLS = "id, property_id, filename, storage_path, file_size, created_at";

export async function listDocuments(propertyId: string): Promise<StoredDocument[]> {
  const { data, error } = await supabase
    .from("property_documents")
    .select(COLS)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoredDocument[];
}

/** Prüft eine Datei vor dem Upload; gibt eine Fehlermeldung oder null zurück. */
export function validateDocument(file: File): string | null {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) return `„${file.name}“ ist kein PDF.`;
  if (file.size > MAX_DOCUMENT_BYTES) return `„${file.name}“ ist größer als 10 MB.`;
  if (file.size === 0) return `„${file.name}“ ist leer.`;
  return null;
}

/** Storage-taugliche Variante des Dateinamens (keine Umlaute, Leer- oder Sonderzeichen). */
function storageSafe(name: string): string {
  const base = name.replace(/\.pdf$/i, "")
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return `${base || "dokument"}.pdf`;
}

/** Bei gleichem Namen: Zeitstempel anhängen ("kaufvertrag.pdf" → "kaufvertrag_1728300000.pdf"). */
function withTimestamp(name: string): string {
  return name.replace(/(\.pdf)?$/i, `_${Math.floor(Date.now() / 1000)}.pdf`);
}

export async function uploadDocument(propertyId: string, file: File, existing: StoredDocument[]): Promise<StoredDocument> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Nicht angemeldet.");

  const original = /\.pdf$/i.test(file.name) ? file.name : `${file.name}.pdf`;
  const duplicate = existing.some((d) => d.filename.toLowerCase() === original.toLowerCase());
  let filename = duplicate ? withTimestamp(original) : original;
  let storagePath = `${userId}/${propertyId}/${storageSafe(filename)}`;

  let { error: upErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
  // Namen, die sich nur in Umlauten/Sonderzeichen unterscheiden, landen auf demselben Pfad → mit Zeitstempel erneut.
  if (upErr && /exist|duplicate/i.test(upErr.message) && !duplicate) {
    filename = withTimestamp(original);
    storagePath = `${userId}/${propertyId}/${storageSafe(filename)}`;
    ({ error: upErr } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, { contentType: "application/pdf", upsert: false }));
  }
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("property_documents")
    .insert({ property_id: propertyId, filename, storage_path: storagePath, file_size: file.size })
    .select(COLS)
    .single();
  if (error) {
    // Metadaten fehlgeschlagen → Datei nicht verwaist zurücklassen.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw error;
  }
  return data as StoredDocument;
}

/** Kurzlebiger Download-Link (60 s), lädt mit dem Originalnamen herunter. */
export async function documentDownloadUrl(doc: StoredDocument): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 60, { download: doc.filename });
  if (error || !data?.signedUrl) throw error ?? new Error("Kein Download-Link");
  return data.signedUrl;
}

export async function deleteDocument(doc: StoredDocument): Promise<void> {
  const { error: stErr } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
  if (stErr) throw stErr;
  const { error } = await supabase.from("property_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

export const fmtFileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
