-- Correct the unreleased project validator without rewriting migration 013.
begin;
create or replace function private.validate_project(p_fields jsonb) returns void language plpgsql set search_path='' as $$
declare column_value jsonb;v_role text;
begin
 if not private.project_shape(p_fields,array['title','theme','columns','limits']) or jsonb_typeof(p_fields->'title') is distinct from 'string' or jsonb_typeof(p_fields->'theme') is distinct from 'string' or not private.project_text(p_fields->>'title',160,true) or not private.project_text(p_fields->>'theme',3000) or jsonb_typeof(p_fields->'columns') is distinct from 'array' or not private.project_shape(p_fields->'limits',array['participant','mentor','advisor']) then raise exception 'Invalid project configuration';end if;
 if jsonb_array_length(p_fields->'columns') not between 2 and 8 then raise exception 'Configure 2 to 8 columns';end if;
 for column_value in select entry.value from jsonb_array_elements(p_fields->'columns') as entry(value) loop
  if not private.project_shape(column_value,array['id','title','complete']) or jsonb_typeof(column_value->'id') is distinct from 'string' or (column_value->>'id') !~ '^[a-z][a-z0-9_]{0,39}$' or column_value->>'id' in ('constructor','prototype') or jsonb_typeof(column_value->'title') is distinct from 'string' or not private.project_text(column_value->>'title',60,true) or jsonb_typeof(column_value->'complete') is distinct from 'boolean' then raise exception 'Invalid board column';end if;
 end loop;
 if (select count(*)<>count(distinct entry.value->>'id') from jsonb_array_elements(p_fields->'columns') as entry(value)) then raise exception 'Duplicate columns';end if;
 foreach v_role in array array['participant','mentor','advisor'] loop
  if jsonb_typeof(p_fields->'limits'->v_role) is distinct from 'number' or (p_fields->'limits'->>v_role) !~ '^[0-9]{1,3}$' or (p_fields->'limits'->>v_role)::integer>100 or (v_role='participant' and (p_fields->'limits'->>v_role)::integer<1) then raise exception 'Explicit capacity required';end if;
 end loop;
end;$$;
revoke all on function private.validate_project(jsonb) from public,anon,authenticated,service_role;
commit;
