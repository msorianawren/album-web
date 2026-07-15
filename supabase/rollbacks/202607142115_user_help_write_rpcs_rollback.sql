-- Roll back only the additive user help write RPCs.

drop function if exists public.append_user_help_message(uuid, text);
drop function if exists public.create_user_help_thread(text, text, text, text);

notify pgrst, 'reload schema';
