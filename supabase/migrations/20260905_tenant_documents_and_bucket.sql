-- ============================================================
-- Tenant documents: real per-tenant document storage (rental
-- agreement, ID proof, etc.), replacing SupportTab's hardcoded
-- VAULT_DOCS placeholder list. The tenant-documents bucket the
-- Vault UI already assumed (createSignedUrl) never existed, so
-- every download attempt has always failed.
-- ============================================================

CREATE TABLE tenant_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'other',
  storage_path      TEXT NOT NULL,
  uploaded_by       UUID,
  uploaded_by_name  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_documents_tenant_id ON tenant_documents (tenant_id);

ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_read_own_documents" ON tenant_documents
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "admins_all_tenant_documents" ON tenant_documents
  FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Private bucket — documents carry the resident's signed agreement /
-- ID proof, so unlike "bills" this one is private from the start;
-- access is via short-lived signed URLs only (VaultSection.tsx already
-- calls createSignedUrl, written correctly against a bucket that never
-- existed until now).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('tenant-documents', 'tenant-documents', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Objects are stored at "{tenant_id}/{filename}" — storage.foldername(name)
-- splits the path, so element [1] is the tenant_id segment.
CREATE POLICY "tenants_read_own_document_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "admins_all_document_files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'tenant-documents' AND auth_is_admin())
  WITH CHECK (bucket_id = 'tenant-documents' AND auth_is_admin());
