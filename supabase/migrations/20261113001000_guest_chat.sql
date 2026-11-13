begin;
create function public.careplus_guest_chat(p_message text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare message text:=trim(p_message); k public.chatbot_knowledge;
begin
 if message is null or length(message) not between 1 and 1000 then raise exception 'Enter a message of 1 to 1000 characters.'; end if;
 select * into k from public.chatbot_knowledge entry where entry.is_active=1 and entry.rule_type='restricted'
 and exists(select 1 from regexp_split_to_table(entry.keywords,',') keyword where length(trim(keyword))>2 and position(lower(trim(keyword)) in lower(message))>0)
 order by entry.knowledge_id limit 1;
 if found then return jsonb_build_object('response',k.response_text,'knowledge_id',k.knowledge_id,'is_restricted',true); end if;
 if exists(select 1 from public.chatbot_knowledge entry where entry.is_active=1 and entry.rule_type='allowed' and entry.requires_login=1
 and exists(select 1 from regexp_split_to_table(entry.keywords,',') keyword where length(trim(keyword))>2 and position(lower(trim(keyword)) in lower(message))>0)) then
 return jsonb_build_object('response','Please sign in to view or manage your appointments and personal clinic information.','requires_login',true,'is_restricted',true); end if;
 select * into k from public.chatbot_knowledge entry where entry.is_active=1 and entry.rule_type='allowed' and entry.requires_login=0
 and exists(select 1 from regexp_split_to_table(entry.keywords,',') keyword where length(trim(keyword))>2 and position(lower(trim(keyword)) in lower(message))>0)
 order by entry.knowledge_id limit 1;
 return jsonb_build_object('response',coalesce(k.response_text,'I can help with general clinic information such as opening hours, location, services and booking steps. Please sign in for personal account information.'),'knowledge_id',k.knowledge_id,'is_restricted',false);
end; $$;
revoke all on function public.careplus_guest_chat(text) from public;
grant execute on function public.careplus_guest_chat(text) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
