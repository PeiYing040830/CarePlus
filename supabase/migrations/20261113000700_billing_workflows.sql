begin;
create table public.payment_events(
 event_id bigint generated always as identity primary key,
 payment_id bigint not null references public.payments(payment_id),
 user_id bigint not null references public.users(user_id),
 previous_status text,new_status text not null,amount numeric not null,notes text,
 created_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
grant select on public.payment_events to authenticated;
create policy payment_events_admin on public.payment_events for select to authenticated using((select public.careplus_role())='admin');
create function public.careplus_save_payment(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare p public.payments; a public.appointments; aid bigint; pid bigint; amount numeric; method text; status text; items jsonb; total numeric; target_uid bigint;
begin
 if public.careplus_role() is distinct from 'admin' then raise exception 'Administrator required.'; end if;
 if pg_column_size(p_data)>65536 then raise exception 'Request is too large.'; end if;
 if p_action not in ('add','edit','confirm_payment') then raise exception 'Payment history cannot be deleted. Edit a pending record or record its refund instead.'; end if;
 if p_action<>'add' then
  select * into p from public.payments where payment_id=(p_data->>'payment_id')::bigint for update;
  if not found then raise exception 'Payment not found.'; end if;
 end if;
 if p_action='confirm_payment' then
  if p.payment_status<>'pending' then raise exception 'Only pending payments can be reviewed.'; end if;
  if coalesce(p_data->>'confirm_action','') not in ('approve','reject') then raise exception 'Choose approve or reject.'; end if;
  aid:=p.appointment_id;pid:=p.patient_id;amount:=p.amount;method:=p.payment_method;items:=p.payment_details;
  status:=case when p_data->>'confirm_action'='approve' then 'completed' else 'failed' end;
 else
  aid:=nullif(p_data->>'appointment_id','')::bigint;pid:=(p_data->>'patient_id')::bigint;
  amount:=(p_data->>'amount')::numeric;method:=p_data->>'payment_method';status:=coalesce(p_data->>'payment_status','pending');items:=p_data->'items';
  if p_action='edit' and (p.patient_id is distinct from pid or p.appointment_id is distinct from aid) then raise exception 'Patient and appointment cannot be changed on an existing payment.'; end if;
  if p_action='edit' and p.payment_status in ('completed','refunded') then
   if p.payment_status='refunded' or status<>'refunded' or p.amount is distinct from amount or p.payment_method is distinct from method then raise exception 'Completed payments are immutable; only a verified refund may be recorded.'; end if;
   items:=p.payment_details;
  end if;
 end if;
 if not exists(select 1 from public.patients where patient_id=pid) then raise exception 'Patient not found.'; end if;
 if amount is null or amount<=0 or amount>100000 or method is null or method not in ('cash','card','online') or status not in ('pending','completed','failed','refunded') then raise exception 'Invalid amount, payment method or status.'; end if;
 if p_action='add' and status='refunded' then raise exception 'Record the original payment before its refund.'; end if;
 if aid is not null then
  select * into a from public.appointments where appointment_id=aid for update;
  if not found or a.patient_id is distinct from pid then raise exception 'Appointment does not belong to selected patient.'; end if;
  if a.status='cancelled' and status in ('completed','pending') then raise exception 'Cannot charge a cancelled appointment.'; end if;
  if status in ('pending','completed') and exists(select 1 from public.payments where appointment_id=aid and payment_status in ('pending','completed') and payment_id is distinct from p.payment_id) then raise exception 'This appointment already has an active payment record.'; end if;
 end if;
 if items is not null and items<>'null'::jsonb then
  if jsonb_typeof(items) is distinct from 'array' then raise exception 'Invalid payment items.'; end if;
  if jsonb_array_length(items)<1 or jsonb_array_length(items)>100 then raise exception 'Enter 1–100 payment items.'; end if;
  if exists(select 1 from jsonb_array_elements(items) item where length(trim(coalesce(item->>'item',''))) not between 1 and 255 or coalesce((item->>'price')::numeric,-1)<0) then raise exception 'Invalid item description or price.'; end if;
  select sum((item->>'price')::numeric) into total from jsonb_array_elements(items) item;
  if round(total,2)<>round(amount,2) then raise exception 'Payment amount must equal the item total.'; end if;
 end if;
 if p_action='add' then
  insert into public.payments(patient_id,appointment_id,amount,payment_method,payment_status,receipt_number,transaction_id,payment_details)
  values(pid,aid,amount,method,status,'CP-'||gen_random_uuid()::text,left(p_data->>'transaction_id',100),items) returning payment_id into p.payment_id;
 else
  update public.payments set amount=amount,payment_status=status,payment_method=method,
   transaction_id=coalesce(left(p_data->>'transaction_id',100),transaction_id),payment_details=items where payment_id=p.payment_id;
 end if;
 if aid is not null then
  update public.appointments set payment_status=case when exists(select 1 from public.payments where appointment_id=aid and payment_status='completed') then 'paid' when exists(select 1 from public.payments where appointment_id=aid and payment_status='pending') then 'pending' else 'unpaid' end,updated_at=now() where appointment_id=aid;
 end if;
 insert into public.payment_events(payment_id,user_id,previous_status,new_status,amount,notes) values(p.payment_id,public.careplus_user_id(),p.payment_status,status,amount,left(p_data->>'notes',2000));
 select user_id into target_uid from public.patients where patient_id=pid;
 insert into public.notifications(user_id,notification_type,title,message) values(target_uid,'payment','Payment updated','Payment #'||p.payment_id||': '||status);
 return jsonb_build_object('id',p.payment_id,'payment_status',status);
end; $$;
revoke all on function public.careplus_save_payment(text,jsonb) from public,anon;
grant execute on function public.careplus_save_payment(text,jsonb) to authenticated;
commit;
