// Logo de Los Andes Labs. Dos versiones; la que se usa en todo el sitio es VARIANTE_LOGO.
//  - "bloque": rectángulo vertical con tres crestas de montaña recortadas en curva.
//  - "trazos": cordillera de líneas rectas con las aristas de cada cara.

type Variante = "bloque" | "trazos";
export const VARIANTE_LOGO: Variante = "bloque";

// Crestas del logo de bloque (en un lienzo de 32×32; el bloque ocupa x 6–26, y 2–30).
export const CRESTAS = [
  // Ladera que baja desde la izquierda
  "M6 19.4 C10.7 19 13.9 20.7 18.6 23.5",
  // Cresta de atrás, con el pico más alto
  "M12.8 20 C16 18.1 18.6 14.5 21.3 13.8 C22.8 13.5 24.4 15 26 16.3",
  // Cresta de adelante
  "M6 29.1 C11.8 27.8 17.1 25.1 20.2 22.8 C21.8 21.8 23.9 22 26 23.8",
];

export function Logo({ tamano = 28, variante = VARIANTE_LOGO }: { tamano?: number; variante?: Variante }) {
  if (variante === "trazos") {
    return (
      <svg
        width={tamano}
        height={tamano}
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="miter"
        strokeLinecap="square"
      >
        <path d="M2 25 L15.9 7 L23.4 12.6 L30 25 Z" />
        <path d="M15.9 7 L14.9 13.3 L8.6 25" />
        <path d="M14.9 13.3 L25.3 25" />
        <path d="M23.4 12.6 L19 16.9" />
        <path d="M23.4 12.6 L25.3 25" />
      </svg>
    );
  }

  // Las crestas se recortan con una máscara: dejan ver el fondo, así funciona en tema claro y oscuro.
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <mask id="logo-lal-recorte" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect x="6" y="2" width="20" height="28" fill="#fff" />
          <g fill="none" stroke="#000" strokeWidth="1.25" strokeLinecap="round">
            {CRESTAS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </mask>
      </defs>
      <rect x="6" y="2" width="20" height="28" fill="currentColor" mask="url(#logo-lal-recorte)" />
    </svg>
  );
}
