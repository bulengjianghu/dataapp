create table if not exists audit_log (
  id bigint primary key,
  tenant_id bigint not null default 0,
  module varchar(64) not null,
  action varchar(64) not null,
  target_id varchar(64),
  detail_json jsonb,
  operator_id bigint,
  created_at timestamptz not null default now()
);
