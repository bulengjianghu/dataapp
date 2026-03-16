create table if not exists record_detail (
  id bigint primary key,
  tenant_id bigint not null default 0,
  record_id bigint not null,
  detail_table_key varchar(128) not null,
  row_no integer not null,
  row_data_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create unique index if not exists uk_record_detail_row
  on record_detail(record_id, detail_table_key, row_no)
  where deleted = false;
