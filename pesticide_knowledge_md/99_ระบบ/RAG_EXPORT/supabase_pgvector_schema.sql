-- Supabase/PostgreSQL schema for the pesticide knowledge RAG corpus
-- Choose vector dimension to match the embedding model before running.
create extension if not exists vector;

create table if not exists pesticide_documents (
  document_slug text primary key,
  title text not null,
  category text,
  plant text,
  pest_type text,
  status text,
  source_year integer,
  source_pages text,
  last_reviewed text,
  source_path text not null,
  section_count integer,
  chunk_count integer,
  char_count integer,
  sha256 text,
  risk_flags text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists pesticide_chunks (
  id text primary key,
  document_slug text not null references pesticide_documents(document_slug) on delete cascade,
  title text not null,
  category text,
  plant text,
  pest_type text,
  status text,
  source_year integer,
  source_pages text,
  last_reviewed text,
  section_heading text,
  section_index integer,
  chunk_index_in_section integer,
  source_path text not null,
  risk_flags text[] default '{}',
  text text not null,
  char_count integer,
  sha256 text,
  embedding vector(768),
  created_at timestamptz default now()
);

create index if not exists pesticide_chunks_document_slug_idx on pesticide_chunks(document_slug);
create index if not exists pesticide_chunks_category_idx on pesticide_chunks(category);
create index if not exists pesticide_chunks_plant_idx on pesticide_chunks(plant);
create index if not exists pesticide_chunks_pest_type_idx on pesticide_chunks(pest_type);
-- Create the vector index after loading embeddings and adjust lists to corpus size.
-- create index pesticide_chunks_embedding_idx on pesticide_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 40);

create or replace function match_pesticide_chunks(
  query_embedding vector(768),
  match_count int default 8,
  filter_category text default null,
  filter_plant text default null
)
returns table (
  id text,
  document_slug text,
  title text,
  category text,
  plant text,
  pest_type text,
  source_pages text,
  section_heading text,
  risk_flags text[],
  text text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.document_slug,
    c.title,
    c.category,
    c.plant,
    c.pest_type,
    c.source_pages,
    c.section_heading,
    c.risk_flags,
    c.text,
    1 - (c.embedding <=> query_embedding) as similarity
  from pesticide_chunks c
  where (filter_category is null or c.category = filter_category)
    and (filter_plant is null or c.plant = filter_plant)
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
