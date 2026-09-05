-- The original policy matched the storage path's folder segment against
-- auth.uid(), coupling file access to the literal upload path forever.
-- That breaks the moment a tenant's id is ever corrected (exactly what
-- just happened for one real tenant whose row had been created under an
-- orphaned placeholder id) — the file's path keeps the old id even after
-- the tenant_documents row is correctly repointed. Make the DB row itself
-- authoritative instead: a tenant can read an object iff a tenant_documents
-- row for their own id references that exact path.

DROP POLICY IF EXISTS "tenants_read_own_document_files" ON storage.objects;

CREATE POLICY "tenants_read_own_document_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-documents' AND EXISTS (
      SELECT 1 FROM tenant_documents td
      WHERE td.storage_path = storage.objects.name AND td.tenant_id = auth.uid()
    )
  );
