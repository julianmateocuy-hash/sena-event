-- =====================================================================
-- PLATAFORMA SENA — REGISTRO, CREDENCIAL QR 3D Y CONTROL DE ASISTENCIA
-- schema.sql
-- Ejecutar completo en el SQL Editor de Supabase (proyecto nuevo, vacío)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid(), gen_random_bytes()

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('super_admin', 'event_admin', 'delegate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('draft', 'upcoming', 'active', 'finished', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type registration_status as enum ('registered', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. FUNCIÓN GENÉRICA updated_at
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 3. TABLA profiles  (usuarios internos: super_admin / event_admin / delegate)
--    1:1 con auth.users
-- =====================================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  role        user_role not null default 'delegate',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create index if not exists idx_profiles_role on profiles(role);

-- Trigger: al crearse un usuario en auth.users, crear su profile automáticamente.
-- El correo semilla julianmateocuy@gmail.com queda como super_admin; el resto
-- entra como 'delegate' por defecto y un super_admin puede reasignar el rol.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case
      when lower(new.email) = 'julianmateocuy@gmail.com' then 'super_admin'::user_role
      else 'delegate'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- =====================================================================
-- 4. TABLA attendees (perfil único de cada persona, público, sin cuenta)
-- =====================================================================
create table if not exists attendees (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  document_type    text not null,
  document_number  text not null unique,
  email            text not null,
  phone            text not null,
  program          text,
  institution      text,
  city             text,
  avatar_url       text,
  qr_token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_attendees_updated_at
  before update on attendees
  for each row execute function set_updated_at();

create index if not exists idx_attendees_document on attendees(document_number);
create index if not exists idx_attendees_qr_token on attendees(qr_token);
create index if not exists idx_attendees_email on attendees(email);

-- =====================================================================
-- 5. TABLA events
-- =====================================================================
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  event_code   text not null unique default upper(substr(encode(gen_random_bytes(4),'hex'),1,8)),
  description  text,
  banner_url   text,
  location     text,
  start_date   date not null,
  end_date     date not null,
  start_time   time,
  end_time     time,
  capacity     integer,
  status       event_status not null default 'draft',
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint chk_event_dates check (end_date >= start_date)
);

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

create index if not exists idx_events_slug on events(slug);
create index if not exists idx_events_status on events(status);

-- =====================================================================
-- 6. TABLA event_registrations (inscripción de un attendee a un event)
-- =====================================================================
create table if not exists event_registrations (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references events(id) on delete cascade,
  attendee_id        uuid not null references attendees(id) on delete cascade,
  registration_date  timestamptz not null default now(),
  status             registration_status not null default 'registered',
  created_at         timestamptz not null default now(),
  unique (event_id, attendee_id)
);

create index if not exists idx_registrations_event on event_registrations(event_id);
create index if not exists idx_registrations_attendee on event_registrations(attendee_id);

-- =====================================================================
-- 7. TABLA event_delegates (delegado asignado a un evento)
-- =====================================================================
create table if not exists event_delegates (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  delegate_id  uuid not null references profiles(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  active       boolean not null default true,
  unique (event_id, delegate_id)
);

create index if not exists idx_event_delegates_event on event_delegates(event_id);
create index if not exists idx_event_delegates_delegate on event_delegates(delegate_id);

-- =====================================================================
-- 8. TABLA attendance (una entrada + una salida por evento/día/attendee)
-- =====================================================================
create table if not exists attendance (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references events(id) on delete cascade,
  attendee_id        uuid not null references attendees(id) on delete cascade,
  attendance_date    date not null,
  entry_time         timestamptz,
  entry_delegate_id  uuid references profiles(id),
  exit_time          timestamptz,
  exit_delegate_id   uuid references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (event_id, attendee_id, attendance_date),
  constraint chk_exit_requires_entry check (exit_time is null or entry_time is not null),
  constraint chk_exit_after_entry check (exit_time is null or exit_time >= entry_time)
);

create trigger trg_attendance_updated_at
  before update on attendance
  for each row execute function set_updated_at();

create index if not exists idx_attendance_event_date on attendance(event_id, attendance_date);
create index if not exists idx_attendance_attendee on attendance(attendee_id);

-- =====================================================================
-- 9. TABLA qr_resend_log (rate limiting del reenvío de QR)
-- =====================================================================
create table if not exists qr_resend_log (
  id            uuid primary key default gen_random_uuid(),
  attendee_id   uuid not null references attendees(id) on delete cascade,
  requested_at  timestamptz not null default now()
);

create index if not exists idx_qr_resend_attendee_time on qr_resend_log(attendee_id, requested_at);

-- =====================================================================
-- 10. FUNCIONES DE APOYO (roles / helpers para RLS)
-- =====================================================================
create or replace function current_role_is(p_roles user_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and active = true
      and role = any(p_roles)
  );
$$;

create or replace function is_delegate_for_event(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  -- También exige profiles.active = true: si un super_admin desactiva a un
  -- delegado (AdminUsers → "Desactivar"), su acceso al scanner debe revocarse
  -- de inmediato aunque su sesión siga viva y su fila en event_delegates
  -- siga marcada como activa.
  select exists (
    select 1 from event_delegates ed
    join profiles p on p.id = ed.delegate_id
    where ed.event_id = p_event_id
      and ed.delegate_id = auth.uid()
      and ed.active = true
      and p.active = true
  );
$$;

-- =====================================================================
-- 11. RPC — find_or_create_attendee
--     Usada por la Edge Function register-attendee (con service role)
--     o directamente vía RPC si se llama con anon key + validaciones.
-- =====================================================================
create or replace function find_or_create_attendee(
  p_full_name        text,
  p_document_type    text,
  p_document_number  text,
  p_email            text,
  p_phone            text,
  p_program          text,
  p_institution       text,
  p_city             text,
  p_avatar_url       text
)
returns attendees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee attendees;
begin
  select * into v_attendee from attendees where document_number = p_document_number;

  if found then
    -- Actualizar datos de contacto por si cambiaron, conservar avatar si no se envía uno nuevo
    update attendees
      set full_name = p_full_name,
          email = p_email,
          phone = p_phone,
          program = coalesce(p_program, program),
          institution = coalesce(p_institution, institution),
          city = coalesce(p_city, city),
          avatar_url = coalesce(p_avatar_url, avatar_url)
      where id = v_attendee.id
      returning * into v_attendee;
  else
    insert into attendees (full_name, document_type, document_number, email, phone, program, institution, city, avatar_url)
    values (p_full_name, p_document_type, p_document_number, p_email, p_phone, p_program, p_institution, p_city, p_avatar_url)
    returning * into v_attendee;
  end if;

  return v_attendee;
end;
$$;

-- =====================================================================
-- 12. RPC — register_for_event
--     Crea la inscripción si no existe (respeta capacidad del evento).
-- =====================================================================
create or replace function register_for_event(
  p_event_id     uuid,
  p_attendee_id  uuid
)
returns table (registration event_registrations, already_registered boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events;
  v_count integer;
  v_reg event_registrations;
begin
  select * into v_event from events where id = p_event_id for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.status not in ('upcoming', 'active') then
    raise exception 'EVENT_NOT_OPEN';
  end if;

  select * into v_reg from event_registrations
    where event_id = p_event_id and attendee_id = p_attendee_id;

  if found then
    return query select v_reg, true;
    return;
  end if;

  if v_event.capacity is not null then
    select count(*) into v_count from event_registrations
      where event_id = p_event_id and status = 'registered';
    if v_count >= v_event.capacity then
      raise exception 'EVENT_FULL';
    end if;
  end if;

  insert into event_registrations (event_id, attendee_id)
  values (p_event_id, p_attendee_id)
  returning * into v_reg;

  return query select v_reg, false;
end;
$$;

-- =====================================================================
-- 13. RPC — process_attendance  (núcleo del scanner, operación atómica)
--     Determina automáticamente si corresponde ENTRADA, SALIDA o RECHAZO.
-- =====================================================================
create or replace function process_attendance(
  p_qr_token   text,
  p_event_id   uuid,
  p_delegate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee   attendees;
  v_event      events;
  v_reg        event_registrations;
  v_attendance attendance;
  v_today      date := (now() at time zone 'America/Bogota')::date;
  v_result     jsonb;
begin
  -- 1. Validar que quien llama sea delegado asignado, event_admin o super_admin
  if not (
    current_role_is(array['super_admin','event_admin']::user_role[])
    or is_delegate_for_event(p_event_id)
  ) then
    return jsonb_build_object('ok', false, 'code', 'NOT_AUTHORIZED');
  end if;

  -- 2. Buscar attendee por token
  select * into v_attendee from attendees where qr_token = p_qr_token;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'QR_INVALID');
  end if;

  -- 3. Validar evento
  select * into v_event from events where id = p_event_id;
  if not found or v_event.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'EVENT_NOT_ACTIVE');
  end if;

  -- 4. Validar inscripción
  select * into v_reg from event_registrations
    where event_id = p_event_id and attendee_id = v_attendee.id and status = 'registered';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_REGISTERED');
  end if;

  -- 5. Bloquear (o crear) la fila de asistencia del día para evitar carreras
  insert into attendance (event_id, attendee_id, attendance_date)
  values (p_event_id, v_attendee.id, v_today)
  on conflict (event_id, attendee_id, attendance_date) do nothing;

  select * into v_attendance from attendance
    where event_id = p_event_id and attendee_id = v_attendee.id and attendance_date = v_today
    for update;

  -- 6. CASO A: sin entrada -> registrar entrada
  if v_attendance.entry_time is null then
    update attendance
      set entry_time = now(), entry_delegate_id = p_delegate_id
      where id = v_attendance.id
      returning * into v_attendance;

    v_result := jsonb_build_object(
      'ok', true, 'action', 'entry',
      'attendee', jsonb_build_object('id', v_attendee.id, 'full_name', v_attendee.full_name, 'avatar_url', v_attendee.avatar_url),
      'event_name', v_event.name,
      'time', v_attendance.entry_time
    );
    return v_result;
  end if;

  -- 7. CASO B: entrada sin salida -> registrar salida
  if v_attendance.exit_time is null then
    update attendance
      set exit_time = now(), exit_delegate_id = p_delegate_id
      where id = v_attendance.id
      returning * into v_attendance;

    v_result := jsonb_build_object(
      'ok', true, 'action', 'exit',
      'attendee', jsonb_build_object('id', v_attendee.id, 'full_name', v_attendee.full_name, 'avatar_url', v_attendee.avatar_url),
      'event_name', v_event.name,
      'time', v_attendance.exit_time
    );
    return v_result;
  end if;

  -- 8. CASO C: entrada y salida ya registradas -> rechazar
  return jsonb_build_object('ok', false, 'code', 'ATTENDANCE_COMPLETE');
end;
$$;

-- =====================================================================
-- 14. RPC — request_qr_resend (con rate limiting: máx 3 por hora)
-- =====================================================================
create or replace function request_qr_resend(p_attendee_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from qr_resend_log
    where attendee_id = p_attendee_id
      and requested_at > now() - interval '1 hour';

  if v_count >= 3 then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;

  insert into qr_resend_log (attendee_id) values (p_attendee_id);
  return jsonb_build_object('ok', true);
end;
$$;

-- =====================================================================
-- 15. ROW LEVEL SECURITY
-- =====================================================================
alter table profiles enable row level security;
alter table attendees enable row level security;
alter table events enable row level security;
alter table event_registrations enable row level security;
alter table event_delegates enable row level security;
alter table attendance enable row level security;
alter table qr_resend_log enable row level security;

-- ---- profiles ----
drop policy if exists profiles_select_self_or_admin on profiles;
create policy profiles_select_self_or_admin on profiles
  for select using (id = auth.uid() or current_role_is(array['super_admin','event_admin']::user_role[]));

drop policy if exists profiles_update_super_admin on profiles;
create policy profiles_update_super_admin on profiles
  for update using (current_role_is(array['super_admin']::user_role[]));

drop policy if exists profiles_insert_super_admin on profiles;
create policy profiles_insert_super_admin on profiles
  for insert with check (current_role_is(array['super_admin']::user_role[]));

-- ---- events ----
drop policy if exists events_select_public on events;
create policy events_select_public on events
  for select using (true);  -- necesario para la página pública de registro

drop policy if exists events_insert_admins on events;
create policy events_insert_admins on events
  -- event_admin también puede crear (queda como dueño vía created_by, que la
  -- app siempre setea al id del usuario autenticado): si solo super_admin
  -- pudiera insertar, la rama "event_admin and created_by = auth.uid()" de
  -- events_update_admins nunca podría cumplirse, porque un event_admin jamás
  -- llegaría a ser dueño de ningún evento.
  for insert with check (current_role_is(array['super_admin','event_admin']::user_role[]));

drop policy if exists events_update_admins on events;
create policy events_update_admins on events
  for update using (
    current_role_is(array['super_admin']::user_role[])
    or (current_role_is(array['event_admin']::user_role[]) and created_by = auth.uid())
  );

-- ---- attendees ----
-- Sin acceso directo desde el cliente anónimo: todo pasa por RPC/Edge Functions
-- con security definer. super_admin/event_admin ven todo; un delegate solo ve
-- attendees que tengan una inscripción en un evento al que esté asignado (antes
-- cualquier delegate podía leer la tabla completa de asistentes de TODOS los
-- eventos, no solo del suyo).
drop policy if exists attendees_select_staff on attendees;
create policy attendees_select_staff on attendees
  for select using (
    current_role_is(array['super_admin','event_admin']::user_role[])
    or exists (
      select 1 from event_registrations er
      where er.attendee_id = attendees.id
        and is_delegate_for_event(er.event_id)
    )
  );

-- ---- event_registrations ----
drop policy if exists registrations_select_staff on event_registrations;
create policy registrations_select_staff on event_registrations
  for select using (
    current_role_is(array['super_admin','event_admin']::user_role[])
    or is_delegate_for_event(event_id)
  );

-- ---- event_delegates ----
drop policy if exists delegates_select_involved on event_delegates;
create policy delegates_select_involved on event_delegates
  for select using (
    current_role_is(array['super_admin','event_admin']::user_role[])
    or delegate_id = auth.uid()
  );

drop policy if exists delegates_write_admins on event_delegates;
create policy delegates_write_admins on event_delegates
  for insert with check (current_role_is(array['super_admin','event_admin']::user_role[]));

drop policy if exists delegates_update_admins on event_delegates;
create policy delegates_update_admins on event_delegates
  for update using (current_role_is(array['super_admin','event_admin']::user_role[]));

-- ---- attendance ----
drop policy if exists attendance_select_staff on attendance;
create policy attendance_select_staff on attendance
  for select using (
    current_role_is(array['super_admin','event_admin']::user_role[])
    or is_delegate_for_event(event_id)
  );
-- Nota: no se crean policies de INSERT/UPDATE directas para attendance;
-- toda escritura ocurre exclusivamente a través de process_attendance()
-- (security definer), nunca desde el cliente.

-- ---- qr_resend_log ----
drop policy if exists qr_resend_select_staff on qr_resend_log;
create policy qr_resend_select_staff on qr_resend_log
  for select using (current_role_is(array['super_admin','event_admin']::user_role[]));

-- =====================================================================
-- 16. REALTIME
--     Sin este paso, `postgres_changes` en el cliente (dashboard admin y
--     el scanner en vivo) nunca recibe eventos, aunque la suscripción en
--     React esté bien hecha: Supabase Realtime solo retransmite cambios
--     de tablas explícitamente agregadas a esta publicación.
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table attendance;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- 17. STORAGE — bucket de avatares (crear también desde el Dashboard)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_service_write on storage.objects;
create policy avatars_service_write on storage.objects
  for insert with check (bucket_id = 'avatars');

-- =====================================================================
-- FIN DEL SCHEMA
-- Siguiente paso: crear el usuario julianmateocuy@gmail.com desde
-- Supabase Auth (Dashboard o supabase.auth.admin.createUser) — el
-- trigger handle_new_auth_user() le asignará automáticamente super_admin.
-- =====================================================================
