-- Audit targets may be profiles or beta_users, so target_user_id must not
-- require every UUID to exist in profiles.
do $migration$
declare
  audit_table regclass := pg_catalog.to_regclass('public.admin_audit_events');
  target_fk record;
begin
  if audit_table is null then
    raise exception 'Expected public.admin_audit_events table was not found';
  end if;

  select
    constraint_row.conname,
    constraint_row.contype,
    constraint_row.confrelid,
    constraint_row.conkey,
    constraint_row.confkey,
    referenced_relation.relname as referenced_table,
    target_column.attnum as target_attnum,
    referenced_column.attnum as referenced_attnum
  into target_fk
  from pg_catalog.pg_constraint as constraint_row
  left join pg_catalog.pg_class as referenced_relation
    on referenced_relation.oid = constraint_row.confrelid
  left join pg_catalog.pg_attribute as target_column
    on target_column.attrelid = constraint_row.conrelid
    and target_column.attname = 'target_user_id'
    and target_column.attnum > 0
    and not target_column.attisdropped
  left join pg_catalog.pg_attribute as referenced_column
    on referenced_column.attrelid = constraint_row.confrelid
    and referenced_column.attname = 'id'
    and referenced_column.attnum > 0
    and not referenced_column.attisdropped
  where constraint_row.conrelid = audit_table
    and constraint_row.conname = 'admin_audit_events_target_user_id_fkey';

  if found then
    if target_fk.contype is distinct from 'f'
      or target_fk.referenced_table is distinct from 'profiles'
      or pg_catalog.cardinality(target_fk.conkey) is distinct from 1
      or target_fk.conkey[1] is distinct from target_fk.target_attnum
      or pg_catalog.cardinality(target_fk.confkey) is distinct from 1
      or target_fk.confkey[1] is distinct from target_fk.referenced_attnum then
      raise exception
        'Constraint admin_audit_events_target_user_id_fkey has an unexpected definition; refusing to drop it';
    end if;

    execute pg_catalog.format(
      'alter table public.admin_audit_events drop constraint %I',
      target_fk.conname
    );
  end if;
end;
$migration$;
