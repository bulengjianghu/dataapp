create table if not exists form_definition (
  id bigint primary key,
  tenant_id bigint not null default 0,
  form_code varchar(64) not null,
  name varchar(128) not null,
  status varchar(32) not null,
  current_version_id bigint,
  created_by bigint not null,
  created_at timestamptz not null default now(),
  updated_by bigint not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create unique index if not exists uk_form_definition_code
  on form_definition (tenant_id, form_code);

create table if not exists form_draft (
  id bigint primary key,
  tenant_id bigint not null default 0,
  form_id bigint not null,
  schema_json jsonb not null,
  version integer not null default 0,
  updated_by bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists form_version (
  id bigint primary key,
  tenant_id bigint not null default 0,
  form_id bigint not null,
  version_no integer not null,
  schema_json jsonb not null,
  published_by bigint not null,
  published_at timestamptz not null default now()
);
