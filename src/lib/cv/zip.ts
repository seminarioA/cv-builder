// Lectura y escritura mínima de ZIP (un .docx es un ZIP). Usa CompressionStream, que existe
// en el navegador y en Node 18+, así que no hace falta ninguna dependencia.

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function transformar(datos: Uint8Array, flujo: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const salida = new Blob([datos as BlobPart]).stream().pipeThrough(flujo);
  return new Uint8Array(await new Response(salida).arrayBuffer());
}

export type Archivos = Map<string, Uint8Array>;

export async function leerZip(zip: Uint8Array): Promise<Archivos> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let fin = zip.length - 22;
  while (fin >= 0 && v.getUint32(fin, true) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error("No es un archivo ZIP");
  const total = v.getUint16(fin + 10, true);
  let p = v.getUint32(fin + 16, true);
  const archivos: Archivos = new Map();
  const dec = new TextDecoder();
  for (let i = 0; i < total; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("ZIP dañado");
    const metodo = v.getUint16(p + 10, true);
    const comprimido = v.getUint32(p + 20, true);
    const largoNombre = v.getUint16(p + 28, true);
    const largoExtra = v.getUint16(p + 30, true);
    const largoComentario = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const nombre = dec.decode(zip.subarray(p + 46, p + 46 + largoNombre));
    const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const crudo = zip.subarray(inicio, inicio + comprimido);
    if (!nombre.endsWith("/")) {
      archivos.set(nombre, metodo === 0 ? crudo.slice() : await transformar(crudo, new DecompressionStream("deflate-raw")));
    }
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return archivos;
}

// [Content_Types].xml va primero, como lo deja Word.
export async function escribirZip(archivos: Archivos): Promise<Uint8Array> {
  const nombres = [...archivos.keys()].sort((a, b) => (a === "[Content_Types].xml" ? -1 : b === "[Content_Types].xml" ? 1 : 0));
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const nombre of nombres) {
    const datos = archivos.get(nombre)!;
    const comprimido = await transformar(datos, new CompressionStream("deflate-raw"));
    const n = enc.encode(nombre);
    const crc = crc32(datos);
    const local = new Uint8Array(30 + n.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // nombres en UTF-8
    lv.setUint16(8, 8, true);
    lv.setUint16(10, 0, true); // 00:00
    lv.setUint16(12, 0x21, true); // 1980-01-01, como Word
    lv.setUint32(14, crc, true);
    lv.setUint32(18, comprimido.length, true);
    lv.setUint32(22, datos.length, true);
    lv.setUint16(26, n.length, true);
    local.set(n, 30);
    const c = new Uint8Array(46 + n.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 8, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, comprimido.length, true);
    cv.setUint32(24, datos.length, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(42, desplazamiento, true);
    c.set(n, 46);
    partes.push(local, comprimido);
    central.push(c);
    desplazamiento += local.length + comprimido.length;
  }
  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, nombres.length, true);
  ev.setUint16(10, nombres.length, true);
  ev.setUint32(12, tamCentral, true);
  ev.setUint32(16, desplazamiento, true);
  const todo = [...partes, ...central, eocd];
  const salida = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of todo) {
    salida.set(p, o);
    o += p.length;
  }
  return salida;
}
