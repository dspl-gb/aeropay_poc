-- Allow storing AeroPay user fields at signup before confirmUser completes.

alter table public.aeropay_profiles
  alter column aeropay_user_id drop not null;

alter table public.aeropay_profiles
  drop constraint if exists aeropay_profiles_aeropay_user_id_key;

create unique index if not exists aeropay_profiles_aeropay_user_id_key
  on public.aeropay_profiles (aeropay_user_id)
  where aeropay_user_id is not null;
