# Plataforma SENA — Registro, Credencial QR 3D y Control de Asistencia

Aplicación completa para gestión de eventos SENA: registro público de asistentes,
credencial digital con QR y una animación 3D, y control de entrada/salida mediante
escaneo QR con reglas de negocio protegidas en PostgreSQL.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **QR:** `qrcode` (generación) + `html5-qrcode` (lectura por cámara)
- **Correo:** proveedor transaccional vía Edge Function (por defecto: Resend)

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Elige región y una contraseña fuerte para la base de datos (no la necesitarás en el código).
3. Espera a que el proyecto termine de aprovisionarse.

## 2. Ejecutar el schema SQL

1. Abre **SQL Editor** en el dashboard de Supabase.
2. Pega el contenido completo de `supabase/schema.sql` y ejecútalo.
3. Verifica en **Table Editor** que se crearon: `profiles`, `attendees`, `events`,
   `event_registrations`, `event_delegates`, `attendance`, `qr_resend_log`.
4. Verifica en **Storage** que existe el bucket `avatars` (el script lo crea automáticamente).
5. Verifica en **Database → Replication** que la tabla `attendance` aparece marcada
   dentro de la publicación `supabase_realtime` (el script la agrega automáticamente
   en la sección 16 — sin esto, el Dashboard y el contador en vivo del scanner nunca
   reciben las entradas/salidas en tiempo real, aunque el registro en la base de
   datos sí ocurra correctamente).

> Si ya ejecutaste una versión anterior de este `schema.sql` y el Dashboard no
> refleja las entradas/salidas en vivo, corre esto una sola vez en el SQL Editor:
> ```sql
> alter publication supabase_realtime add table attendance;
> ```
>
> Si además tu cuenta es `event_admin` y no puedes crear eventos desde
> `/admin/eventos`, corre también:
> ```sql
> create policy events_insert_admins on events
>   for insert with check (current_role_is(array['super_admin','event_admin']::user_role[]));
> ```
>
> Y para que desactivar a un delegado (`/admin/usuarios`) le revoque el acceso
> al scanner de inmediato:
> ```sql
> create or replace function is_delegate_for_event(p_event_id uuid)
> returns boolean
> language sql
> security definer
> stable
> set search_path = public
> as $$
>   select exists (
>     select 1 from event_delegates ed
>     join profiles p on p.id = ed.delegate_id
>     where ed.event_id = p_event_id
>       and ed.delegate_id = auth.uid()
>       and ed.active = true
>       and p.active = true
>   );
> $$;
> ```

## 3. Configurar Auth

1. En **Authentication → Providers**, deja habilitado **Email**.
2. En **Authentication → Users**, crea el Super Administrador:
   - Ve a **Add user → Create new user**.
   - Email: `julianmateocuy@gmail.com`
   - Password: defínela ahí mismo (nunca la escribas en código ni en el repo).
   - El trigger `handle_new_auth_user` le asignará automáticamente el rol `super_admin`
     en la tabla `profiles`.

## 4. Configurar variables y Secrets

**Frontend** — copia `.env.example` a `.env` y completa:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
(Ambos valores están en **Project Settings → API**.)

**Edge Functions** — en **Project Settings → Edge Functions → Secrets** (o con
`supabase secrets set`), agrega:
```
EMAIL_API_KEY=...   (API key de tu proveedor de correo, ej. Resend)
APP_URL=...          (la URL pública real del frontend, ej. https://tu-dominio.com)
```
> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` **no los configures tú** — Supabase
> los inyecta automáticamente en cada Edge Function (son nombres reservados;
> intentar fijarlos a mano con `supabase secrets set` da error).
>
> `APP_URL` es importante y fácil de saltarse: es la URL a la que `create-staff-user`
> manda el correo de "define tu contraseña" cuando creas un `event_admin` o
> `delegate` desde `/admin/usuarios` o `/admin/delegados`. Si no la configuras,
> el enlace del correo apunta a `http://localhost:5173/reset-password` — funciona
> en tu propia PC mientras corres `npm run dev`, pero le llega roto a cualquier
> delegado real que lo abra desde su propio celular o computador.

## 5. Proveedor de correo

Por defecto `send-registration-email` está integrada con **Resend**. Para usar otro
proveedor (Postmark, SES, SendGrid), edita únicamente la función `sendViaProvider()`
dentro de `supabase/functions/send-registration-email/index.ts` — el resto del sistema
no necesita cambios. Recuerda verificar tu dominio de envío en el proveedor elegido.

## 6. Desplegar las Edge Functions

Con la [Supabase CLI](https://supabase.com/docs/guides/cli) instalada:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy register-attendee
supabase functions deploy process-attendance
supabase functions deploy send-registration-email
supabase functions deploy resend-qr
supabase functions deploy create-staff-user
```

> Las 5 son necesarias — sin `create-staff-user` en particular, `/admin/usuarios`
> y `/admin/delegados` no pueden crear ningún `event_admin` ni `delegate` nuevo
> (esa función es la única forma de crear un usuario en Auth usando la
> service role key, que nunca vive en el frontend).

## 7. Ejecutar el frontend

```bash
npm install
npm run dev
```

Abre `http://localhost:5173/login` e inicia sesión con `julianmateocuy@gmail.com`.

> `package.json` ya incluye `"allowScripts": { "esbuild": true }`. Desde
> npm 11.16 (y bloqueado por defecto desde npm 12, julio 2026), npm ya no
> corre scripts `postinstall` de tus dependencias a menos que estén
> aprobados explícitamente ahí — sin esto, el `postinstall` de `esbuild`
> (una dependencia interna de Vite) queda bloqueado y el build falla con
> `Permission denied` en `node_modules/.bin/tsc` (en Vercel y en local).

## 8. Flujo de prueba

1. **Crear evento** en `/admin/eventos` → se genera la URL pública automáticamente.
2. **Copiar la URL** y abrirla en el navegador (o en el teléfono) sin iniciar sesión.
3. **Registrar un asistente**: completar el formulario, tomar/subir avatar → ver la
   animación 3D de la credencial → confirmar que llega el correo con el QR.
4. **Crear un delegado**: desde `/admin/delegados` — crea el usuario y asígnalo al
   evento sin tocar SQL directamente.
5. **Cambiar el evento a `active`** en `/admin/eventos`.
6. **Iniciar sesión como delegado** → `/scanner` → seleccionar el evento → escanear
   el QR del asistente:
   - 1er escaneo → `✓ ENTRADA AUTORIZADA`
   - 2º escaneo → `✓ SALIDA AUTORIZADA`
   - 3er escaneo → `⚠ ASISTENCIA COMPLETA`
7. **Revisar el dashboard** (`/admin`) — los contadores se actualizan en tiempo real
   vía Supabase Realtime, sin recargar la página.
8. **Exportar reportes** (pendiente de construir — ver sección "Próximos pasos").

## 9. Desplegar a producción

- Frontend: cualquier host estático (Vercel, Netlify, Cloudflare Pages) con las
  variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` configuradas ahí.
- Backend: ya vive en Supabase — no requiere servidor propio.
- Revisa que el dominio de producción esté en **Authentication → URL Configuration**.
- `vercel.json` ya incluye el rewrite que necesita una SPA con React Router
  (`BrowserRouter`): sin él, entrar directo o refrescar en una ruta como
  `/scanner` o `/admin/eventos` da 404 en vez de dejar que React Router la
  resuelva.

## Datos de prueba (opcional)

`supabase/seed.sql` crea 3 eventos y 15 asistentes de ejemplo (sección 70 del
prompt original), e inscribe a todos en "Feria Tecnológica SENA". Ejecútalo en
el SQL Editor después de `schema.sql`. Los pasos 4 y 5 del archivo (asignar
roles de staff y delegados a eventos) están comentados porque requieren que
primero crees esos usuarios en Auth — descomenta y ajusta los correos una vez
los tengas.

## Pulido de experiencia (animaciones, estados, config)

- **Toasts** (`src/components/Toast.tsx`) — notificaciones animadas para éxito/error en vez de texto plano; envuelve toda la app vía `<ToastProvider>`.
- **Skeletons** (`src/components/Skeleton.tsx`) y **estados vacíos** (`src/components/EmptyState.tsx`) — en Dashboard, Eventos y donde aplique, en vez de "cargando…" o listas en blanco.
- **Transiciones de página** (`src/components/PageTransition.tsx`) — fade/slide sutil al entrar a cada ruta.
- **Botón con microinteracción** (`src/components/Button.tsx`) — hover/tap con spring, usado en las pantallas principales.
- **Indicador de conexión en vivo** (`src/components/LiveIndicator.tsx`) — en el Scanner y el Dashboard.
- **`/admin/configuracion`** — panel informativo de parámetros del sistema (zona horaria, rate limits, proveedor de correo, etc.) y dónde ajustarlos.

## Pantallas admin incluidas

- `/admin` — Dashboard con contadores en tiempo real y gráfico de entradas/salidas por hora.
- `/admin/eventos` — Crear eventos, generar/copiar URL pública, cambiar estado.
- `/admin/asistentes` — Buscar y filtrar asistentes por evento, ver estado (registrado/dentro/completó).
- `/admin/asistentes/:id` — Perfil individual con datos de contacto e historial de asistencia por evento.
- `/admin/delegados` — Crear delegados y asignarlos/desasignarlos a eventos.
- `/admin/usuarios` — Solo `super_admin`: crear `event_admin` y `delegate` (Edge Function `create-staff-user`).
- `/admin/reportes` — Filtrar por evento/fecha/estado y exportar a CSV.

## Próximos pasos (no incluidos aún en este scaffold)

- Internacionalización de mensajes de error de Supabase (hoy se muestran tal cual).
- Paginación en `/admin/asistentes` y `/admin/reportes` (hoy limitado a 200 filas
  y sin límite, respectivamente — suficiente para el volumen actual, pero a
  vigilar si un evento crece mucho).

## Correcciones aplicadas en esta revisión

- **Build roto**: `AdminDelegates.tsx` importaba `Button` sin usarlo — con
  `noUnusedLocals` activo en `tsconfig.json`, esto hacía fallar `npm run build`.
- **QR embebido roto en el correo**: el adjunto a Resend no incluía `content_id`,
  así que `<img src="cid:qr-acceso.png">` nunca resolvía y el correo llegaba con
  la imagen rota.
- **Brecha de seguridad**: `is_delegate_for_event()` no comprobaba
  `profiles.active`, por lo que desactivar a un delegado (`/admin/usuarios`)
  no revocaba su acceso al scanner si su sesión seguía viva.
- **Login sin salida**: no existía forma de disparar "olvidé mi contraseña"
  desde `/login`, aunque `/reset-password` y el backend ya lo soportaban.
- **Escáner no abría la cámara**: `React.StrictMode` (dev) monta/desmonta cada
  componente dos veces; `QrScanner` llamaba `stop()` antes de que `start()`
  terminara de pedir la cámara, dejando `html5-qrcode` en un estado roto.
- **Dashboard no reflejaba entradas/salidas en vivo**: `schema.sql` nunca
  agregaba la tabla `attendance` a la publicación `supabase_realtime`, así que
  las suscripciones `postgres_changes` del Dashboard y del Scanner jamás
  recibían eventos (el registro en la base sí ocurría, solo no se notificaba
  en tiempo real). Si ya ejecutaste el schema antes de esta corrección, corre
  manualmente `alter publication supabase_realtime add table attendance;`.
- **Desfase de zona horaria (el bug más serio)**: el frontend calculaba "hoy"
  con `new Date().toISOString().slice(0, 10)`, que da la fecha en **UTC**.
  El backend guarda `attendance_date` en hora de **Bogotá**
  (`process_attendance()`, schema.sql §13). Colombia es UTC-5, así que entre
  las 7pm y la medianoche hora local, ambas fechas no coinciden: el registro
  se guardaba bien pero el Dashboard/Scanner lo buscaban bajo la fecha
  equivocada y no aparecía nada. Se centralizó el cálculo en
  `src/lib/date.ts` (`todayInBogota()`), usado ahora en los tres lugares que
  antes calculaban la fecha mal (`analytics.ts`, `attendance.ts`,
  `AdminDashboard.tsx`).
- **Faltaba `src/vite-env.d.ts`**: sin este archivo (estándar en cualquier
  proyecto Vite), `import.meta.env.VITE_SUPABASE_URL` no tiene tipos y
  `npm run build` falla con "Property 'env' does not exist on type
  'ImportMeta'". Se agregó con la única línea que necesita:
  `/// <reference types="vite/client" />`.
- **`event_admin` no podía crear eventos**: la política `events_write_super_admin`
  solo dejaba insertar a `super_admin`, pero `/admin/eventos` (accesible también
  para `event_admin`) muestra el formulario de creación sin distinguir el rol.
  Además, la política de actualización ya anticipaba que un `event_admin`
  fuera dueño de un evento (`created_by = auth.uid()`), algo que nunca podía
  pasar si nunca se le dejaba crear uno. Se renombró a `events_insert_admins`
  y ahora acepta ambos roles.
- **`create-staff-user` faltaba en el paso de despliegue**: el comando estaba
  huérfano varias secciones más abajo del README, desconectado de las otras 4
  Edge Functions — fácil de saltárselo, y sin esa función `/admin/usuarios` y
  `/admin/delegados` no pueden crear ningún usuario nuevo. Se movió junto a
  las demás en la sección 6.
- **No había forma de llegar al Scanner desde `/admin`**: `super_admin` y
  `event_admin` sí tienen permiso para entrar a `/scanner`, pero el menú de
  `AdminLayout.tsx` no tenía ningún enlace hacia allá — solo se podía llegar
  escribiendo la URL a mano. Se agregó "Escanear" al menú. De paso, `Login.tsx`
  redirigía siempre a `/admin` sin importar el rol, lo que causaba un rebote
  feo para las cuentas `delegate` (las rechazaba `RequireRole` y las mandaba
  de vuelta a `/login`, que recién ahí las reenviaba a `/scanner`); ahora deja
  que el redirect por rol que ya existía en el componente se encargue.
- **Un delegado podía leer asistentes de eventos ajenos**: la política
  `attendees_select_staff` le daba a cualquier `delegate` acceso de lectura a
  la tabla `attendees` completa, sin importar a qué evento estuviera
  asignado. Ahora un `delegate` solo puede leer attendees que tengan una
  inscripción en un evento donde `is_delegate_for_event()` sea verdadero.
- **`APP_URL` no estaba documentado**: sin configurarlo como secret, el
  correo de "define tu contraseña" que recibe cada `event_admin`/`delegate`
  nuevo apunta a `http://localhost:5173`, roto para cualquiera que no sea el
  desarrollador en su propia PC. Se documentó en la sección 4.
- **Las políticas RLS no eran re-ejecutables**: a diferencia de las tablas
  (`create table if not exists`), volver a correr `schema.sql` completo
  fallaba con "policy already exists" en la segunda vez. Se agregó
  `drop policy if exists` antes de cada una.
- **`README` decía configurar `SUPABASE_SERVICE_ROLE_KEY` a mano**: ese
  nombre está reservado por Supabase y se inyecta solo en cada Edge
  Function — fijarlo manualmente con `supabase secrets set` da error.
  Se corrigió la sección 4.
- **`.gitignore` no excluía `*.tsbuildinfo`**: la caché incremental de
  `tsc -b` puede quedar subida al repo y hacer que Vercel/CI reutilicen
  diagnósticos de una build vieja en vez de revisar el código real en cada
  deploy. Se agregó la regla.
- **Build roto en Vercel/npm 12**: `Error: Command "npm run build" exited
  with 126` / `node_modules/.bin/tsc: Permission denied`. npm ahora bloquea
  por defecto los scripts `postinstall` de las dependencias que no estén
  aprobadas explícitamente, y el de `esbuild` (usado internamente por Vite)
  quedaba bloqueado, corrompiendo el resto de `node_modules/.bin`. Se agregó
  `"allowScripts": { "esbuild": true }` a `package.json`.
- **El tipo `Database` no tenía la forma que exige `@supabase/supabase-js`**:
  le faltaban `Views`, `Functions` y `Enums` (solo tenía `Tables`). Sin esas
  claves, el cliente tipado no puede validar el schema y **todo** `.select()`,
  `.insert()`, `.update()` y `.rpc()` del proyecto colapsa en silencio a
  `never` — esto solo se pudo confirmar con `tsc` real corriendo en Vercel
  (con `@supabase/supabase-js` de verdad instalado; localmente, sin red, no
  hay forma de detectarlo). Causaba ~15 errores TS2339/TS2345/TS2353
  aparentemente sueltos en `AdminDashboard.tsx`, `analytics.ts`,
  `attendance.ts`, `delegates.ts`, `events.ts` y `users.ts`, todos con la
  misma raíz. Se reescribió `database.ts` completo con las 4 claves y los
  tipos de cada función RPC (`process_attendance`, `find_or_create_attendee`,
  `register_for_event`, `request_qr_resend`, etc.).
- Se agregó `.gitignore` (no existía) y se actualizó esta documentación para
  reflejar pantallas ya implementadas.

## Cómo se registran (y se limita el acceso de) los delegados

1. Un `super_admin` los crea desde `/admin/usuarios`, o directamente desde
   `/admin/delegados` con "+ Crear delegado".
2. Eso llama a la Edge Function `create-staff-user`, que crea el usuario en
   Supabase Auth y automáticamente le dispara un correo de "restablecer
   contraseña" apuntando a `APP_URL/reset-password` (ver sección 4 — sin
   `APP_URL` configurado, ese enlace queda roto para cualquiera que no sea tú
   en tu propia PC).
3. El delegado abre el enlace de su correo, define su contraseña en
   `/reset-password`, y desde ahí ya puede entrar en `/login`.
4. Un `super_admin` o `event_admin` lo asigna a un evento específico desde
   `/admin/delegados`. Solo puede hacer login y usar `/scanner` — no tiene
   acceso a ninguna otra ruta de `/admin` (`RequireRole` se lo bloquea).
5. Dentro de `/scanner`, solo ve los eventos activos a los que fue asignado
   (`loadAssignedEvents` en `ScannerPage.tsx`), y las políticas RLS
   (`is_delegate_for_event()`) le impiden leer o escanear asistencia de
   cualquier evento al que no esté asignado, aunque intente llamarlo
   directamente desde la consola del navegador — no es solo que la interfaz
   se lo oculte.

## Reglas de seguridad que ya están implementadas

- La Service Role Key y `EMAIL_API_KEY` solo existen como Secrets de Edge Functions.
- `attendance` no tiene policies de INSERT/UPDATE: toda escritura pasa por
  `process_attendance()` (SECURITY DEFINER), que además es atómica con `FOR UPDATE`.
- El QR codifica únicamente un token opaco (`qr_token`), nunca datos personales.
- RLS activo en todas las tablas.
- Un `delegate` solo puede leer datos (`attendees`, `event_registrations`,
  `attendance`) de eventos a los que esté asignado activamente — nunca de
  otros eventos, ni siquiera consultando la API de Supabase directamente.
