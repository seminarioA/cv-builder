export const PATRON_CORREO = /^[^\s@,;]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function errorCorreo(correo: string): string | undefined {
  const limpio = correo.trim();
  if (!limpio) return "Escribe tu correo.";
  if ([...limpio].length > 254 || !PATRON_CORREO.test(limpio)) return "Revisa el correo: debe tener la forma nombre@dominio.com.";
}
