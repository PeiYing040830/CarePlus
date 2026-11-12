begin;

-- A reference vocabulary is not a symptom-to-diagnosis rule set.
create table public.condition_catalog (
 code text not null,
 coding_system text not null default 'ICD-10-CM',
 release text not null,
 description text not null,
 source_url text not null,
 source_sha256 text not null,
 imported_at timestamptz not null default now(),
 primary key(coding_system,release,code)
);
alter table public.condition_catalog enable row level security;
revoke all on public.condition_catalog from anon,authenticated;
grant select on public.condition_catalog to authenticated;
create policy condition_catalog_active_reader on public.condition_catalog for select to authenticated
using ((select public.careplus_role()) is not null);
create index condition_catalog_search on public.condition_catalog using gin(to_tsvector('english',description));

create function public.careplus_search_conditions(p_query text)
returns table(code text,description text,release text,source_url text)
language sql stable security invoker set search_path = '' as $$
 select c.code,c.description,c.release,c.source_url from public.condition_catalog c
 where length(trim(p_query)) between 2 and 120
 and (c.code=upper(replace(trim(p_query),'.','')) or to_tsvector('english',c.description) @@ plainto_tsquery('english',left(p_query,120)))
 order by (c.code=upper(replace(trim(p_query),'.',''))) desc,c.code limit 30;
$$;
revoke all on function public.careplus_search_conditions(text) from public,anon;
grant execute on function public.careplus_search_conditions(text) to authenticated;

-- Conservative phrase matching, with limited English negation handling.
-- This is a prototype rule matcher, not a validated clinical triage algorithm.
create function public.careplus_has_current_phrase(p_text text,p_phrase text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare body text; phrase text; pos int; offset_pos int:=1; prefix text;
begin
 body:=' '||regexp_replace(regexp_replace(regexp_replace(lower(coalesce(p_text,'')),'[.!?;]',' | ','g'),'[^a-z0-9 |]',' ','g'),'[[:space:]]+',' ','g')||' ';
 phrase:=' '||trim(regexp_replace(regexp_replace(lower(coalesce(p_phrase,'')),'[^a-z0-9 ]',' ','g'),'[[:space:]]+',' ','g'))||' ';
 if length(trim(phrase))=0 then return false; end if;
 loop
  pos:=strpos(substr(body,offset_pos),phrase); if pos=0 then return false; end if;
  pos:=pos+offset_pos-1;
  prefix:=substr(body,greatest(1,pos-70),least(pos-1,70));
  prefix:=regexp_replace(prefix,'^.*[|]','');
  prefix:=regexp_replace(prefix,'^.*\m(but|however|although)\M','');
  if prefix !~ '\m(no|not|without|denies|denied|never)\M([[:space:]]+[a-z]+){0,3}[[:space:]]*$'
    and prefix !~ '\m(history of|previously had|used to have|family history of)\M[[:space:]]*$' then return true; end if;
  offset_pos:=pos+length(phrase)-1;
 end loop;
end;
$$;
revoke all on function public.careplus_has_current_phrase(text,text) from public,anon,authenticated;

create function public.careplus_analyse_symptoms(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid bigint:=public.careplus_user_id(); pid bigint:=public.careplus_patient_id();
 symptoms text:=trim(p_data->>'symptoms'); duration text:=trim(p_data->>'duration'); age_value int;
 scope record; keyword text; matched jsonb:='[]'; highest int:=-1; rank_value int; urgency text;
 names text:=''; flags jsonb:='[]'; response_text text; saved_id bigint; saved_at timestamptz;
begin
 if uid is null or pid is null or public.careplus_role()<>'patient' then raise exception 'An active patient account is required.'; end if;
 if length(coalesce(symptoms,'')) not between 1 and 4000 then raise exception 'Enter symptoms (maximum 4000 characters).'; end if;
 if length(coalesce(duration,'')) not between 1 and 100 then raise exception 'Enter a duration (maximum 100 characters).'; end if;
 if nullif(p_data->>'age','') is not null then
  age_value:=(p_data->>'age')::int;
  if age_value<0 or age_value>130 then raise exception 'Invalid age.'; end if;
 end if;
 for scope in select * from public.symptom_scope where is_active=1 order by scope_id loop
  if public.careplus_has_current_phrase(symptoms,scope.symptom_name) then
   rank_value:=case scope.urgency_level when 'emergency' then 2 when 'urgent' then 1 else 0 end;
   foreach keyword in array string_to_array(coalesce(scope.warning_keywords,''),',') loop
    if public.careplus_has_current_phrase(symptoms,trim(keyword)) then rank_value:=greatest(rank_value,1); end if;
   end loop;
   highest:=greatest(highest,rank_value);
   matched:=matched||jsonb_build_array(jsonb_build_object('scope_id',scope.scope_id,'symptom_name',scope.symptom_name,'urgency_level',scope.urgency_level,'rule_source','legacy clinic symptom_scope'));
   names:=names||case when names='' then '' else ', ' end||scope.symptom_name;
  end if;
 end loop;
 -- Original critical phrases, supplemented by explicit emergency symptom terms.
 -- Reference: https://www.londonambulance.nhs.uk/our-services/emergency-care/calling-999/
 foreach keyword in array array['heart attack','cardiac arrest','stroke','seizure','unconscious','not breathing','cannot breathe','can''t breathe','severe difficulty breathing','severe bleeding','heavy bleeding','overdose','poisoning','crushing chest pain','chest pain','choking','severe allergic reaction'] loop
  if public.careplus_has_current_phrase(symptoms,keyword) then
   highest:=2;flags:=flags||jsonb_build_array(keyword);
  end if;
 end loop;
 urgency:=case highest when 2 then 'emergency' when 1 then 'urgent' when 0 then 'routine' else 'unassessed' end;
 response_text:='# Rule-based symptom screening'||E'\n\n'||
  'Prototype result from clinic keyword rules. This is not a diagnosis or a clinically validated triage assessment.'||E'\n\n'||
  '## Matched symptom rules'||E'\n\n'||case when names='' then 'No matching clinic symptom rule.' else names end||E'\n\n'||
  '## Screening level'||E'\n\n'||upper(urgency)||E'\n\n'||
  case urgency
   when 'emergency' then 'A potential emergency phrase was detected. Seek immediate emergency medical help.'
   when 'urgent' then 'An urgent rule matched. Contact a healthcare professional promptly for assessment.'
   when 'routine' then 'A routine rule matched. This does not establish that your symptoms are safe or exclude serious illness. Seek clinical assessment if symptoms persist, worsen, or concern you.'
   else 'The rules cannot assess these symptoms. Contact a healthcare professional; do not interpret this result as routine care.' end||E'\n\n'||
  'If you believe this may be an emergency, seek immediate help regardless of the displayed result. English keyword matching may miss symptoms, negation, context, or other languages.';
 insert into public.symptom_checks(user_id,patient_id,symptoms,duration,age,additional_info,response,urgency_level,analysis_details)
 values(uid,pid,symptoms,duration,age_value,left(p_data->>'additional_info',4000),response_text,urgency,
 jsonb_build_object('engine','clinic-keywords-v1','matched_scopes',matched,'red_flags',flags,'clinically_validated',false))
 returning symptom_check_id,created_at into saved_id,saved_at;
 return jsonb_build_object('success',true,'response',response_text,'urgency',urgency,'symptom_check_id',saved_id,'created_at',saved_at,'detected_scopes',jsonb_array_length(matched),'matched_symptom_names',names,'analysis_details',jsonb_build_object('engine','clinic-keywords-v1','matched_scopes',matched,'red_flags',flags,'clinically_validated',false));
end;
$$;
revoke all on function public.careplus_analyse_symptoms(jsonb) from public,anon;
grant execute on function public.careplus_analyse_symptoms(jsonb) to authenticated;
commit;
