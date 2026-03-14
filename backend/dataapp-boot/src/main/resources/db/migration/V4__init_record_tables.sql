create table if not exists record_main (
  id bigint primary key,
  tenant_id bigint not null default 0,
  form_id bigint not null,
  form_version_id bigint not null,
  status varchar(32) not null,
  created_by bigint not null,
  created_at timestamptz not null default now(),
  updated_by bigint not null,
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  deleted boolean not null default false
);

create table if not exists record_data (
  id bigint primary key,
  tenant_id bigint not null default 0,
  record_id bigint not null,
  data_json jsonb not null,
  search_json jsonb
);

create table if not exists record_history (
  id bigint primary key,
  tenant_id bigint not null default 0,
  record_id bigint not null,
  op_type varchar(32) not null,
  before_json jsonb,
  after_json jsonb,
  operated_by bigint not null,
  operated_at timestamptz not null default now()
);
