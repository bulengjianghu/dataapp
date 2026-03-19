create table if not exists rule_definition (
  id bigint primary key,
  tenant_id bigint not null default 0,
  rule_code varchar(64) not null,
  rule_name varchar(128) not null,
  rule_type varchar(32) not null,
  biz_domain varchar(64) not null default 'FORM',
  form_id bigint null,
  event_type varchar(64) not null,
  scope_type varchar(32) not null default 'FORM',
  status varchar(32) not null default 'DRAFT',
  current_version_id bigint null,
  description varchar(512) not null default '',
  created_by bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_by bigint not null default 1,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create unique index if not exists uk_rule_definition_code
  on rule_definition(tenant_id, rule_code)
  where deleted = false;

create index if not exists idx_rule_definition_form
  on rule_definition(tenant_id, form_id, rule_type)
  where deleted = false;

create table if not exists rule_draft (
  id bigint primary key,
  tenant_id bigint not null default 0,
  rule_id bigint not null,
  draft_json jsonb not null,
  graph_json jsonb not null default '{}'::jsonb,
  compiled_json jsonb not null default '{}'::jsonb,
  normalized_json jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  checksum varchar(64) not null,
  compiler_version varchar(32) not null default '',
  updated_by bigint not null default 1,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create unique index if not exists uk_rule_draft_rule
  on rule_draft(rule_id);
