create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null default 'Untitled document',
  content jsonb not null default '{"type":"doc","content":[]}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);

create index idx_documents_owner on documents(owner_id);
create index idx_shares_user on document_shares(user_id);
create index idx_shares_document on document_shares(document_id);

insert into users (email, name) values
  ('alice@demo.com', 'Alice'),
  ('bob@demo.com', 'Bob'),
  ('carol@demo.com', 'Carol');
