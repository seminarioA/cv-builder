-- Cuentas del CV builder, su sesión y los datos de cada persona para su CV.
-- `paso` es hasta dónde llegó en el formulario por pasos, para retomarlo.
create table if not exists cuentas_cv (
  id serial primary key,
  correo text not null unique,
  nombre text not null,
  clave_hash text not null,
  creado timestamptz not null default now()
);
create table if not exists sesiones_cv (
  token_hash text primary key,
  cuenta_id integer not null references cuentas_cv(id) on delete cascade,
  expira timestamptz not null
);
create table if not exists datos_cv (
  cuenta_id integer primary key references cuentas_cv(id) on delete cascade,
  datos jsonb not null,
  paso integer not null default 0,
  plantilla text not null default 'harvard',
  actualizado timestamptz not null default now()
);
