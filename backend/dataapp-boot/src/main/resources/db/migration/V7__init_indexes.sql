create index if not exists idx_record_main_form_status_created
  on record_main (form_id, status, created_at desc);

create index if not exists idx_record_main_creator_status
  on record_main (created_by, status);

create index if not exists idx_audit_log_module_action_created
  on audit_log (module, action, created_at desc);
