insert into iam_role (id, role_code, role_name)
values
  (1001, 'SUPER_ADMIN', '超级管理员'),
  (1002, 'BUSINESS_ADMIN', '业务管理员'),
  (1003, 'FILLER', '填报人员')
on conflict do nothing;

insert into iam_user (id, username, display_name, password_hash, status)
values
  (1, 'admin', '系统管理员', '{noop}admin123', 'ACTIVE')
on conflict do nothing;

insert into iam_user_role (id, user_id, role_id)
values
  (10001, 1, 1001)
on conflict do nothing;
