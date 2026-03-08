-- Migration 003: Add missing DELETE policies for proofs table and storage

-- Allow studio to delete proof records
create policy "Studio can delete proofs"
  on public.proofs for delete
  using (public.is_studio());

-- Allow studio to delete files from the proofs storage bucket
create policy "Studio deletes proofs"
  on storage.objects for delete
  using (bucket_id = 'proofs' and public.is_studio());
