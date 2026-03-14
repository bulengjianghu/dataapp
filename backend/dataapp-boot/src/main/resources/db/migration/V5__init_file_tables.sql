create table if not exists file_asset (
  id bigint primary key,
  tenant_id bigint not null default 0,
  biz_type varchar(64) not null,
  biz_id bigint,
  object_key varchar(255) not null,
  file_name varchar(255) not null,
  created_at timestamptz not null default now()
);
