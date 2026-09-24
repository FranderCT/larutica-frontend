-- LaRutica: foto de perfil y bienvenida del primer inicio de sesión.
-- onboarding_completed_at queda en null hasta que el usuario termina u omite
-- la bienvenida; así se muestra una sola vez por cuenta.

alter table public.profiles
  add column avatar_url text
    check (avatar_url is null or char_length(avatar_url) <= 500),
  add column onboarding_completed_at timestamptz;

-- Las fotos son públicas (se muestran en el dashboard), pero solo el servidor
-- con service_role puede escribir en el bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
