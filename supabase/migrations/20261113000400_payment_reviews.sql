begin;
create function public.careplus_save_review(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid bigint:=public.careplus_patient_id(); a public.appointments; r public.reviews;
 score int; body text:=coalesce(p_data->>'review_text',''); editing boolean:=coalesce(p_data->>'update_review','0')='1';
begin
 if public.careplus_role() is distinct from 'patient' or pid is null then raise exception 'Active patient account required.'; end if;
 score:=(p_data->>'rating')::int;
 if score is null or score not between 1 and 5 or length(body)>500 then raise exception 'Choose a rating from 1 to 5 and a review of at most 500 characters.'; end if;
 select * into a from public.appointments where appointment_id=(p_data->>'appointment_id')::bigint for update;
 if not found or a.patient_id is distinct from pid or a.status<>'completed' then raise exception 'You can only review your own completed appointment.'; end if;
 if nullif(p_data->>'doctor_id','') is not null and a.doctor_id is distinct from (p_data->>'doctor_id')::bigint then raise exception 'The doctor does not match this appointment.'; end if;
 select * into r from public.reviews where appointment_id=a.appointment_id and patient_id=pid order by review_id limit 1;
 if editing then
  if r.review_id is null then raise exception 'Review not found.'; end if;
  update public.reviews set rating=score,review_text=body,updated_at=now() where review_id=r.review_id;
 else
  if r.review_id is not null then raise exception 'This appointment already has a review. Use Edit Review.'; end if;
  insert into public.reviews(doctor_id,patient_id,appointment_id,rating,review_text) values(a.doctor_id,pid,a.appointment_id,score,body) returning * into r;
 end if;
 return jsonb_build_object('review_id',r.review_id,'appointment_id',a.appointment_id,'rating',score,'review_text',body);
end;
$$;
revoke all on function public.careplus_save_review(jsonb) from public,anon;
grant execute on function public.careplus_save_review(jsonb) to authenticated;
commit;
