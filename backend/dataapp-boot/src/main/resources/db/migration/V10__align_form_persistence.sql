alter table if exists form_definition
    add column if not exists description varchar(512) not null default '';

alter table if exists form_draft
    add column if not exists fields_json jsonb;

update form_draft
set fields_json = case
    when fields_json is not null then fields_json
    when schema_json = '{"fields":[]}'::jsonb then '{}'::jsonb
    else coalesce(schema_json, '{}'::jsonb)
end;

alter table if exists form_draft
    alter column fields_json set not null;

create unique index if not exists uk_form_draft_form
    on form_draft (form_id);

alter table if exists form_version
    add column if not exists fields_json jsonb;

update form_version
set fields_json = case
    when fields_json is not null then fields_json
    when schema_json = '{"fields":[]}'::jsonb then '{}'::jsonb
    else coalesce(schema_json, '{}'::jsonb)
end;

alter table if exists form_version
    alter column fields_json set not null;

create unique index if not exists uk_form_version_form_version_no
    on form_version (form_id, version_no);

create table if not exists form_field (
    id bigint primary key,
    tenant_id bigint not null default 0,
    form_id bigint not null,
    field_key varchar(64) not null,
    field_code varchar(128),
    field_name varchar(128),
    node_type varchar(32) not null,
    component_type varchar(64),
    parent_field_key varchar(64),
    sort_no integer not null default 0,
    status varchar(32) not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uk_form_field_form_field_key
    on form_field (form_id, field_key);

create table if not exists form_version_field (
    id bigint primary key,
    tenant_id bigint not null default 0,
    form_version_id bigint not null,
    form_id bigint not null,
    field_key varchar(64) not null,
    field_code varchar(128),
    field_name varchar(128),
    node_type varchar(32) not null,
    component_type varchar(64),
    parent_field_key varchar(64),
    sort_no integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_form_version_field_version
    on form_version_field (form_version_id);
