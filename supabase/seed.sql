-- =====================================================================
-- DATOS DE PRUEBA — ejecutar DESPUÉS de schema.sql y de crear en Auth:
--   - julianmateocuy@gmail.com          (super_admin, ya asignado por trigger)
--   - 2 event_admin  (créalos en Auth, luego ejecuta los UPDATE de más abajo)
--   - 4 delegados    (créalos en Auth, luego ejecuta los UPDATE de más abajo)
-- Este script NO crea usuarios de Auth (requiere la Admin API / dashboard),
-- solo datos de negocio: eventos, asistentes, inscripciones.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EVENTOS (3)
-- ---------------------------------------------------------------------
insert into events (name, slug, description, location, start_date, end_date, start_time, end_time, capacity, status, created_by)
select 'Feria Tecnológica SENA', 'feria-tecnologica-sena',
       'Muestra de proyectos tecnológicos de aprendices SENA.',
       'Centro de Convenciones, Bogotá', current_date, current_date,
       '08:00', '17:00', 300, 'active', p.id
from profiles p where p.email = 'julianmateocuy@gmail.com'
on conflict (slug) do nothing;

insert into events (name, slug, description, location, start_date, end_date, start_time, end_time, capacity, status, created_by)
select 'Encuentro Regional de Innovación', 'encuentro-regional-innovacion',
       'Encuentro de innovación con centros de formación regionales.',
       'Centro de Formación, Medellín', current_date + 7, current_date + 7,
       '09:00', '16:00', 150, 'upcoming', p.id
from profiles p where p.email = 'julianmateocuy@gmail.com'
on conflict (slug) do nothing;

insert into events (name, slug, description, location, start_date, end_date, capacity, status, created_by)
select 'Jornada de Bienestar SENA', 'jornada-bienestar-sena',
       'Actividades de bienestar para aprendices.',
       'Sede Central', current_date - 3, current_date - 3, 100, 'finished', p.id
from profiles p where p.email = 'julianmateocuy@gmail.com'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 2. ASISTENTES (15) — usando find_or_create_attendee para respetar
--    perfil único por documento, tal como haría el formulario público.
-- ---------------------------------------------------------------------
do $$
declare
  v_names text[] := array[
    'Julián Mateo Cuy', 'María Fernanda Ríos', 'Carlos Andrés Gómez', 'Ana Sofía López',
    'Juan David Pérez', 'Laura Valentina Torres', 'Santiago Rodríguez', 'Camila Andrea Martínez',
    'Daniel Felipe Castro', 'Valentina Ramírez', 'Andrés Felipe Ortiz', 'Isabella Morales',
    'Sebastián Herrera', 'Mariana Vargas', 'Nicolás Jiménez'
  ];
  v_name text;
  v_doc text;
  i integer := 0;
begin
  foreach v_name in array v_names loop
    i := i + 1;
    v_doc := (1000000000 + i)::text;
    perform find_or_create_attendee(
      v_name, 'CC', v_doc,
      lower(replace(v_name, ' ', '.')) || '@ejemplo.com',
      '300' || lpad(i::text, 7, '0'),
      case when i % 3 = 0 then 'Análisis y Desarrollo de Software' else 'Gestión Empresarial' end,
      'SENA Regional', 'Bogotá', null
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. INSCRIPCIONES — todos los asistentes a "Feria Tecnológica SENA"
-- ---------------------------------------------------------------------
insert into event_registrations (event_id, attendee_id)
select e.id, a.id
from events e
cross join attendees a
where e.slug = 'feria-tecnologica-sena'
on conflict (event_id, attendee_id) do nothing;

-- =====================================================================
-- 4. ASIGNAR ROLES A USUARIOS DE STAFF YA CREADOS EN AUTH
--    Reemplaza los correos por los que realmente creaste en el dashboard.
-- =====================================================================
-- update profiles set role = 'event_admin' where email = 'admin1@ejemplo.com';
-- update profiles set role = 'event_admin' where email = 'admin2@ejemplo.com';
-- update profiles set role = 'delegate'    where email = 'delegado1@ejemplo.com';
-- update profiles set role = 'delegate'    where email = 'delegado2@ejemplo.com';
-- update profiles set role = 'delegate'    where email = 'delegado3@ejemplo.com';
-- update profiles set role = 'delegate'    where email = 'delegado4@ejemplo.com';

-- =====================================================================
-- 5. ASIGNAR DELEGADOS AL EVENTO ACTIVO
--    Ejecuta después del paso 4.
-- =====================================================================
-- insert into event_delegates (event_id, delegate_id)
-- select e.id, p.id
-- from events e, profiles p
-- where e.slug = 'feria-tecnologica-sena'
--   and p.email in ('delegado1@ejemplo.com', 'delegado2@ejemplo.com')
-- on conflict (event_id, delegate_id) do nothing;
