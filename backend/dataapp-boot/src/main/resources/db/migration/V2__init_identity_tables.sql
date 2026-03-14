create table if not exists iam_user (
  id bigint primary key,
  username varchar(64) not null,
  display_name varchar(128) not null,
  password_hash varchar(255) not null,
  status varchar(32) not null,
  created_at timestamptz not null default now()
);

create table if not exists iam_role (
  id bigint primary key,
  role_code varchar(64) not null,
  role_name varchar(128) not null,
  created_at timestamptz not null default now()
);

create table if not exists iam_user_role (
  id bigint primary key,
  user_id bigint not null,
  role_id bigint not null,
  created_at timestamptz not null default now()
);
