-- PDF-Dokumente pro Immobilie: Dateien im privaten Storage-Bucket "property-documents"
-- (Pfad {user_id}/{property_id}/{filename}), Metadaten in public.property_documents.

CREATE TABLE public.property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  file_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_documents TO authenticated;
GRANT ALL ON public.property_documents TO service_role;

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "property_documents owner all" ON public.property_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX property_documents_property_idx ON public.property_documents(user_id, property_id, created_at DESC);

-- Privater Bucket: nur PDF, max. 10 MB pro Datei.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-documents', 'property-documents', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Jede:r sieht und ändert nur Dateien im eigenen Ordner ({user_id}/…).
CREATE POLICY "property-documents owner select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "property-documents owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "property-documents owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
