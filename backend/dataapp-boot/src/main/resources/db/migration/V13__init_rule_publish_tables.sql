create table if not exists rule_version (
  id bigint primary key,
  tenant_id bigint not null default 0,
  rule_id bigint not null,
  version_no integer not null,
  rule_type varchar(32) not null,
  form_id bigint null,
  form_version_id bigint null,
  event_type varchar(64) not null,
  priority integer not null default 100,
  published_snapshot_json jsonb not null,
  compiled_json jsonb not null,
  normalized_json jsonb not null,
  dependency_json jsonb not null,
  failure_policy jsonb not null,
  compiler_version varchar(32) not null default '',
  published_by bigint not null default 1,
  published_at timestamptz not null default now(),
  status varchar(32) not null default 'ACTIVE'
);

create unique index if not exists uk_rule_version_rule_no
  on rule_version(rule_id, version_no);

create index if not exists idx_rule_version_event
  on rule_version(tenant_id, rule_type, event_type, status);

create index if not exists idx_rule_version_form_event
  on rule_version(tenant_id, form_id, form_version_id, event_type, status);

create table if not exists rule_trigger_binding (
  id bigint primary key,
  tenant_id bigint not null default 0,
  rule_version_id bigint not null,
  trigger_type varchar(64) not null,
  trigger_target varchar(128) null,
  trigger_scope varchar(32) not null,
  condition_expr varchar(1024) null,
  sort_no integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_rule_trigger_match
  on rule_trigger_binding(tenant_id, trigger_type, trigger_target, trigger_scope);

create index if not exists idx_rule_trigger_version
  on rule_trigger_binding(rule_version_id);

create table if not exists rule_reference_index (
  id bigint primary key,
  tenant_id bigint not null default 0,
  rule_version_id bigint not null,
  ref_type varchar(32) not null,
  ref_key varchar(128) not null,
  ref_name varchar(256) not null default '',
  scope_type varchar(32) not null,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_rule_reference_ref
  on rule_reference_index(tenant_id, ref_type, ref_key);

create index if not exists idx_rule_reference_version
  on rule_reference_index(rule_version_id);
