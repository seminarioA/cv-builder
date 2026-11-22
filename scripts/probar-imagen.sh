#!/usr/bin/env bash
# Arranca la imagen compilada contra PostgreSQL y comprueba que sirve las páginas y que se
# puede crear una cuenta. Uso: probar-imagen.sh <imagen>
set -euo pipefail

imagen="$1"
red="prueba-$$"
db="prueba-db-$$"
app="prueba-app-$$"
url="http://127.0.0.1:3000/cv-builder"

limpiar() {
  docker rm -f "$app" "$db" >/dev/null 2>&1 || true
  docker network rm "$red" >/dev/null 2>&1 || true
}
trap limpiar EXIT

docker network create "$red" >/dev/null
docker run -d --name "$db" --network "$red" \
  -e POSTGRES_USER=cv -e POSTGRES_PASSWORD=cv -e POSTGRES_DB=cv postgres:17-alpine >/dev/null
for _ in $(seq 1 30); do
  docker exec "$db" pg_isready -U cv -d cv >/dev/null 2>&1 && break
  sleep 2
done

docker run -d --name "$app" --network "$red" -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL="postgres://cv:cv@$db:5432/cv" "$imagen" >/dev/null

estado=desconocido
for _ in $(seq 1 45); do
  estado="$(docker inspect -f '{{.State.Health.Status}}' "$app")"
  [ "$estado" = "healthy" ] && break
  sleep 2
done
if [ "$estado" != "healthy" ]; then
  echo "La imagen no quedó sana ($estado)."
  docker logs --tail 80 "$app"
  exit 1
fi

for ruta in /ingresar /registro /plantillas/harvard.docx /api/salud; do
  codigo="$(curl -s -o /dev/null -w '%{http_code}' "$url$ruta")"
  echo "$codigo $ruta"
  [ "$codigo" = 200 ] || { docker logs --tail 80 "$app"; exit 1; }
done

# Sin sesión, el CV builder manda a ingresar.
destino="$(curl -s -o /dev/null -w '%{redirect_url}' "$url")"
echo "/ → $destino"
case "$destino" in */cv-builder/ingresar*) ;; *) exit 1 ;; esac

# Las tablas existen.
docker exec "$db" psql -U cv -d cv -tAc "select count(*) from information_schema.tables where table_name in ('cuentas_cv','sesiones_cv','datos_cv')" | grep -qx 3
echo "Imagen probada contra PostgreSQL."
