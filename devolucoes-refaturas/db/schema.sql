-- Esquema D1 da próxima etapa (API). Ainda não é usado pelo painel.

create table if not exists casos (
  id text primary key,
  codigo text not null,
  etapa text not null,
  etapa_desde text not null,
  finalizado integer not null default 0,
  finalizado_em text,
  finalizado_por text,
  desfecho text,
  logistica text not null default '{}',
  comercial text not null default '{}',
  ocorrencia text not null default '{}',
  processos text not null default '{}',
  etapas text not null default '{}',
  criado_em text,
  criado_por text,
  atualizado_em text,
  atualizado_por text,
  excluido integer not null default 0
);

create index if not exists casos_etapa on casos (etapa, etapa_desde);
create index if not exists casos_fim on casos (finalizado, finalizado_em);

create table if not exists eventos (
  id text primary key,
  caso_id text not null,
  seq integer not null,
  em text not null,
  por text not null,
  setor text,
  codigo text,
  acao text,
  antes text,
  depois text,
  hash_prev text,
  hash text
);

create index if not exists eventos_caso on eventos (caso_id, seq);
create index if not exists eventos_em on eventos (em);

create table if not exists acessos (
  email text primary key,
  nome text,
  setores text not null default '[]',
  papel text not null default 'membro',
  status text not null default 'pendente',
  em text,
  por text
);

create table if not exists anexos (
  id text primary key,
  caso_id text not null,
  tipo text not null,
  nome text,
  content_type text,
  tamanho integer,
  em text,
  por text
);

create table if not exists prazos (
  setor text primary key,
  dias integer not null
);