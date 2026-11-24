-- 051_booking_requests_realtime.sql — live calendar refresh for booking request workflows

do $$ begin
  alter publication supabase_realtime add table public.booking_requests;
exception
  when duplicate_object then null;
end $$;
