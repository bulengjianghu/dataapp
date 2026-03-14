alter table if exists iam_user
    add column if not exists password_hash varchar(255);

update iam_user
set password_hash = '{noop}admin123'
where username = 'admin' and (password_hash is null or password_hash = '');
