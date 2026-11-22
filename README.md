# CV Builder · Los Andes Labs

Arma tu CV con plantillas profesionales: cargas tus datos una vez (o los importas desde tu CV en Word) y ves la vista previa en vivo. Se descarga en Word (.docx) o PDF.

En producción: **https://losandeslabs.com/cv-builder**

## Qué hace

- **Cuentas:** cada persona tiene su cuenta y sus datos guardados.
- **Mis datos:** formulario por pasos que se guarda solo; se puede dejar en cualquier momento y retomar donde se quedó. También se rellena subiendo un CV en Word (.docx).
- **Plantillas:** la primera es el **Formato Harvard**. El .docx se arma sobre el documento original (estilos, viñetas, secciones de dos columnas y fuentes incrustadas), así que Word lo abre igual que el original. La vista previa reproduce las mismas medidas, incluido cómo Word justifica y corta las líneas.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # DATABASE_URL de un PostgreSQL local
npm run dev                  # http://localhost:3000/cv-builder
npm test
```

Las tablas se crean solas al arrancar (`src/lib/servidor/esquema.sql`).

## Despliegue

Cada push a `main` valida, compila la imagen, la prueba contra PostgreSQL y la publica en GHCR:

- `ghcr.io/seminarioa/cv-builder:main`
- `ghcr.io/seminarioa/cv-builder:sha-<commit>`

En el VPS corre como un contenedor más, junto a su propia base PostgreSQL; Caddy le manda la ruta `/cv-builder` del dominio. La configuración del VPS vive en el repositorio de infraestructura de Los Andes Labs. Si este repo tiene el secreto `DESPLIEGUE_TOKEN`, al publicar una imagen se pide el despliegue automáticamente.

Variables del contenedor: `DATABASE_URL` (obligatoria).

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/app` | Páginas: CV builder, Mis datos, ingresar, registro y `/api/salud` |
| `src/components/cv` | Editor, formulario por pasos, vista previa de la plantilla y animaciones |
| `src/lib/cv` | Datos del CV, generador .docx, importador .docx, ZIP, fechas, lugares, habilidades e instituciones |
| `public/plantillas` | Base .docx de cada plantilla |
