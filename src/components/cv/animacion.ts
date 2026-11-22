"use client";
// Animaciones de los cambios de estado del CV builder.
//  - useAlMontar: true solo para lo que aparece después de cargar la página, así lo que ya
//    estaba al entrar no se anima de golpe.
//  - useFlip: los elementos de una lista se deslizan a su nuevo lugar al reordenar, quitar o
//    agregar, en vez de saltar.
//  - useQuitarAnimado: deja salir un elemento con su animación antes de quitarlo de los datos.
// Todo respeta «reducir movimiento» del sistema.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const DURACION_SALIDA = 180;

let listo = false;
if (typeof window !== "undefined") {
  const marcar = () => setTimeout(() => (listo = true), 400);
  if (document.readyState === "complete") marcar();
  else window.addEventListener("load", marcar, { once: true });
}

export const sinMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Cuando entra un bloque entero (un paso del formulario), lo que trae adentro no se anima
// por su cuenta: ya se mueve con el bloque.
let silencioHasta = 0;
export function silenciarEntradas(ms = 120) {
  silencioHasta = performance.now() + ms;
}

export function useAlMontar(): boolean {
  // En el servidor y durante la hidratación es false, así no hay diferencias entre ambos.
  const [animar] = useState(() => typeof window !== "undefined" && listo && performance.now() > silencioHasta);
  return animar;
}

// Hijos con data-flip="<id>" dentro de `ref` se deslizan desde su posición anterior.
export function useFlip(ref: RefObject<HTMLElement | null>) {
  const antes = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const cont = ref.current;
    if (!cont) return;
    const ahora = new Map<string, number>();
    for (const n of cont.querySelectorAll<HTMLElement>(":scope > [data-flip]")) {
      const id = n.dataset.flip!;
      ahora.set(id, n.offsetTop);
      const previo = antes.current.get(id);
      if (previo !== undefined && Math.abs(previo - n.offsetTop) > 1 && !sinMovimiento()) {
        n.animate([{ transform: `translateY(${previo - n.offsetTop}px)` }, { transform: "none" }], {
          duration: 240,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
      }
    }
    antes.current = ahora;
  });
}

// quitar(id, hecho): marca el id como «saliendo» y llama a hecho() cuando terminó la animación.
export function useQuitarAnimado() {
  const [saliendo, setSaliendo] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const quitar = (id: string, hecho: () => void) => {
    if (sinMovimiento()) return hecho();
    setSaliendo((s) => new Set(s).add(id));
    timers.current.push(
      setTimeout(() => {
        hecho();
        setSaliendo((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }, DURACION_SALIDA),
    );
  };
  return { saliendo, quitar };
}
