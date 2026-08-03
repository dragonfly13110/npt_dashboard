create extension if not exists vector;

create table if not exists public.rice_pest_knowledge_chunks (
  id bigserial primary key,
  collection text not null,
  document_slug text not null,
  title text not null,
  section_heading text not null,
  category text not null,
  subcategory text not null,
  status text not null,
  source_year integer not null,
  source_pages text not null,
  source_pdf_pages text not null,
  source_refs_in_chunk text[] not null default '{}',
  last_reviewed date,
  text_content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists rice_pest_knowledge_chunks_document_idx
  on public.rice_pest_knowledge_chunks (document_slug);

create index if not exists rice_pest_knowledge_chunks_embedding_idx
  on public.rice_pest_knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
