/**
 * lib/normalizar.ts
 *
 * Capa de normalizacion UNICA entre la fuente de datos en runtime
 * (tabla `registros_clinicos` en Neon, leida con `@neondatabase/serverless`)
 * y cualquier vista de React.
 *
 * Contrato con el resto del sistema:
 *  - Los componentes reciben SIEMPRE `RegistroNormalizado`. Nunca ven `null`
 *    ni `undefined` en los campos de display; nunca la cadena `"null"` ni `NaN`.
 *  - Para calculo (metricas / graficas) los campos numericos, de fecha y el
 *    booleano exponen ademas una variante `| null`. `null` = "excluir del calculo".
 *  - Cada campo con valor de respaldo queda marcado en `esRespaldo` para que
 *    las metricas y las graficas puedan excluirlo de forma uniforme.
 *  - Campos agrupados (`nombre_completo`, `sede`) se separan conservando el original.
 *  - `normalizarRegistro` es idempotente: re-alimentar su salida como entrada
 *    (o normalizar dos veces) produce el mismo resultado. Las etiquetas de
 *    respaldo se detectan y se vuelven a tratar como ausencia.
 *
 * Sin dependencias externas. ESM + TypeScript.
 */

/* ------------------------------------------------------------------ */
/* Etiquetas de respaldo (legibles, nunca "null" / NaN)              */
/* ------------------------------------------------------------------ */

export const RESPALDO = {
  nombreCompleto: "Sin nombre",
  texto: "—", // guion largo "—"
  sinDato: "Sin dato",
  especialidad: "Sin especialidad",
  sinSede: "Sin sede",
  sinVisita: "Sin visita registrada",
  conSeguro: "Con seguro",
  sinSeguro: "Sin seguro",
  /** clave de agrupacion para el filtro cuando el campo falta */
  clave: "__sin_dato__",
} as const;

/* ------------------------------------------------------------------ */
/* Tipos                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fila cruda tal como la devuelve `@neondatabase/serverless` para
 * `SELECT * FROM registros_clinicos`.
 *
 * Tipos declarados segun el perfil real (ver db/PERFIL.md), con tolerancia
 * defensiva a formas que el perfil documenta como anomalias historicas:
 *  - `edad` / `presion_sistolica` pueden llegar como string numerico ("52", "148").
 *  - `seguro_activo` puede llegar como palabra ("si" / "SI" / "no").
 *  - `ultima_visita` puede llegar como string ISO 'YYYY-MM-DD', como `Date` o `null`.
 */
export type RegistroCrudo = {
  id: string;
  nombre_completo?: string | null;
  nombre_pila?: string | null;
  apellidos?: string | null;
  edad?: number | string | null;
  especialidad?: string | null;
  sede?: string | null;
  sede_ciudad?: string | null;
  sede_pais?: string | null;
  ultima_visita?: string | Date | null;
  presion_sistolica?: number | string | null;
  seguro_activo?: boolean | string | null;
  notas?: string | null;
};

/** Marca, campo a campo, si el valor mostrado es un respaldo (ausencia). */
export interface MarcasRespaldo {
  nombreCompleto: boolean;
  nombrePila: boolean;
  apellidos: boolean;
  edad: boolean;
  especialidad: boolean;
  sede: boolean;
  sedeCiudad: boolean;
  sedePais: boolean;
  ultimaVisita: boolean;
  presionSistolica: boolean;
  seguroActivo: boolean;
  notas: boolean;
}

export interface RegistroNormalizado {
  id: string;

  nombreCompleto: string;
  nombrePila: string;
  apellidos: string;

  /** edad para calculo; `null` = ausente (excluir de metricas) */
  edad: number | null;
  edadTexto: string;

  /** display */
  especialidad: string;
  /** clave estable para agrupar el filtro; `"__sin_dato__"` cuando falta */
  especialidadClave: string;

  /** valor original de `sede` (agrupado) */
  sede: string;
  sedeCiudad: string;
  sedeCiudadClave: string;
  sedePais: string;

  /** ISO 'YYYY-MM-DD' normalizado para calculo; `null` = sin visita */
  ultimaVisita: string | null;
  ultimaVisitaTexto: string;

  presionSistolica: number | null;
  presionSistolicaTexto: string;

  seguroActivo: boolean | null;
  seguroActivoTexto: string;

  notas: string;
  tieneNotas: boolean;

  /** concatenacion en minusculas y sin acentos, lista para `includes()` */
  textoBusqueda: string;

  /** marca de respaldo por campo, para excluir de metricas/graficas */
  esRespaldo: MarcasRespaldo;
}

export interface Metricas {
  /** todas las filas, sin excluir nada */
  totalRegistros: number;

  edadPromedio: number | null;
  edadMin: number | null;
  edadMax: number | null;

  presionPromedio: number | null;
  presionMin: number | null;
  presionMax: number | null;

  /** % con seguro sobre los que TIENEN dato booleano (no sobre el total) */
  conSeguroPct: number | null;

  /** visitas dentro de una ventana movil de 30 dias hacia atras desde ahora */
  visitasUltimos30Dias: number;

  visitaMasReciente: string | null;
  visitaMasRecienteTexto: string;
}

/* ------------------------------------------------------------------ */
/* Utilidades de texto                                               */
/* ------------------------------------------------------------------ */

/**
 * minusculas + sin diacriticos + espacios colapsados.
 * La usa el buscador para tratar la query igual que `textoBusqueda`.
 */
export function normalizarTexto(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Conjunto de etiquetas de respaldo, normalizadas, para volver a tratarlas como ausencia. */
const ETIQUETAS_RESPALDO: ReadonlySet<string> = new Set(
  [
    RESPALDO.nombreCompleto,
    RESPALDO.texto,
    "-",
    RESPALDO.sinDato,
    RESPALDO.especialidad,
    RESPALDO.sinSede,
    RESPALDO.sinVisita,
    RESPALDO.clave,
  ].map((v) => normalizarTexto(v)),
);

/**
 * Limpia un valor de texto: `null` / `undefined` / `""` / solo-espacios /
 * "null" / "undefined" / "nan" / una etiqueta de respaldo conocida  ->  `null`.
 * En cualquier otro caso devuelve el string recortado.
 */
function limpiarTexto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const low = s.toLowerCase();
  if (low === "null" || low === "undefined" || low === "nan") return null;
  if (ETIQUETAS_RESPALDO.has(normalizarTexto(s))) return null;
  return s;
}

/* ------------------------------------------------------------------ */
/* Coaccion de tipos                                                 */
/* ------------------------------------------------------------------ */

/** Numero desde number o string numerico. Nunca `NaN`: si no es finito -> `null`. */
function coaccionarNumero(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Entero (edad, presion). "52" -> 52 ; "148" -> 148 ; 34 -> 34. */
function coaccionarEntero(v: unknown): number | null {
  const n = coaccionarNumero(v);
  return n === null ? null : Math.round(n);
}

/** Booleano desde boolean o palabra ("si" / "SI" / "sí" / "no" / "true" / "0"...). */
function coaccionarBooleano(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  const s = normalizarTexto(String(v));
  if (s === "") return null;
  if (["true", "t", "si", "s", "1", "yes", "y", "verdadero"].includes(s)) return true;
  if (["false", "f", "no", "n", "0", "falso"].includes(s)) return false;
  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function fechaUTCaISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Valida y (re)formatea una fecha civil a ISO 'YYYY-MM-DD'. `null` si es imposible. */
function armarISO(y: number, mo: number, d: number): string | null {
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

/**
 * Fecha -> ISO 'YYYY-MM-DD'. Tolera:
 *  - `Date` (usa componentes UTC),
 *  - string ISO 'YYYY-MM-DD' (con o sin hora detras),
 *  - 'dd/mm/yyyy' o 'dd-mm-yyyy' (formatos mixtos, por robustez futura),
 *  - ultimo recurso: `Date.parse`.
 * `null` / `""` / sin sentido  ->  `null`.
 */
function coaccionarFechaISO(v: unknown): string | null {
  if (v === null || v === undefined) return null;

  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : fechaUTCaISO(v);
  }

  const s = String(v).trim();
  if (s === "") return null;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (iso) return armarISO(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return armarISO(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  const t = Date.parse(s);
  return Number.isNaN(t) ? null : fechaUTCaISO(new Date(t));
}

const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** ISO 'YYYY-MM-DD' -> "18 de junio de 2026" (deterministico, sin `Intl`/zona). */
function fechaLegibleES(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const nombreMes = MESES_ES[mes - 1] ?? String(mes);
  return `${dia} de ${nombreMes} de ${anio}`;
}

/* ------------------------------------------------------------------ */
/* Separacion de campos agrupados                                    */
/* ------------------------------------------------------------------ */

/** `nombre_completo` "Ana Maria Perez Soto" -> pila "Ana" + apellidos "Maria Perez Soto". */
function separarNombre(
  completoLimpio: string | null,
  pilaCol: string | null,
  apellidosCol: string | null,
): { pila: string | null; apellidos: string | null } {
  let pila = pilaCol;
  let apellidos = apellidosCol;

  if (completoLimpio && (pila === null || apellidos === null)) {
    const tokens = completoLimpio.split(/\s+/).filter(Boolean);
    if (pila === null && tokens.length > 0) pila = tokens[0];
    // un solo token (p.ej. HC-1008 "Ricardo") => sin apellidos: NO se inventa.
    if (apellidos === null && tokens.length > 1) apellidos = tokens.slice(1).join(" ");
  }

  return { pila, apellidos };
}

/** `sede` "Bogota, CO" -> ciudad "Bogota" + pais "CO". Tolera malformados. */
function separarSede(
  sedeLimpia: string | null,
  ciudadCol: string | null,
  paisCol: string | null,
): { ciudad: string | null; pais: string | null } {
  let ciudad = ciudadCol;
  let pais = paisCol;

  if (sedeLimpia && (ciudad === null || pais === null)) {
    const idx = sedeLimpia.indexOf(",");
    if (idx === -1) {
      if (ciudad === null) ciudad = limpiarTexto(sedeLimpia);
    } else {
      if (ciudad === null) ciudad = limpiarTexto(sedeLimpia.slice(0, idx));
      if (pais === null) pais = limpiarTexto(sedeLimpia.slice(idx + 1));
    }
  }

  return { ciudad, pais };
}

/* ------------------------------------------------------------------ */
/* Normalizacion de un registro                                      */
/* ------------------------------------------------------------------ */

export function normalizarRegistro(crudo: RegistroCrudo): RegistroNormalizado {
  const fila = (crudo ?? {}) as RegistroCrudo;

  const id = limpiarTexto(fila.id) ?? "sin-id";

  // --- nombre (agrupado) ---
  const nombreCompletoLimpio = limpiarTexto(fila.nombre_completo);
  const { pila, apellidos } = separarNombre(
    nombreCompletoLimpio,
    limpiarTexto(fila.nombre_pila),
    limpiarTexto(fila.apellidos),
  );

  // --- edad ---
  const edad = coaccionarEntero(fila.edad);

  // --- especialidad ---
  const especialidadLimpia = limpiarTexto(fila.especialidad);

  // --- sede (agrupado) ---
  const sedeLimpia = limpiarTexto(fila.sede);
  const { ciudad: sedeCiudadLimpia, pais: sedePaisLimpia } = separarSede(
    sedeLimpia,
    limpiarTexto(fila.sede_ciudad),
    limpiarTexto(fila.sede_pais),
  );

  // --- ultima visita ---
  const ultimaVisita = coaccionarFechaISO(fila.ultima_visita);

  // --- presion ---
  const presionSistolica = coaccionarEntero(fila.presion_sistolica);

  // --- seguro ---
  const seguroActivo = coaccionarBooleano(fila.seguro_activo);

  // --- notas ---
  const notasLimpia = limpiarTexto(fila.notas);

  // --- valores de display con respaldo ---
  const nombreCompleto = nombreCompletoLimpio ?? RESPALDO.nombreCompleto;
  const nombrePila = pila ?? RESPALDO.texto;
  const apellidosDisplay = apellidos ?? RESPALDO.texto;
  const especialidad = especialidadLimpia ?? RESPALDO.especialidad;
  const especialidadClave = especialidadLimpia
    ? normalizarTexto(especialidadLimpia)
    : RESPALDO.clave;
  const sede = sedeLimpia ?? RESPALDO.texto;
  const sedeCiudad = sedeCiudadLimpia ?? RESPALDO.sinSede;
  const sedeCiudadClave = sedeCiudadLimpia
    ? normalizarTexto(sedeCiudadLimpia)
    : RESPALDO.clave;
  const sedePais = sedePaisLimpia ?? RESPALDO.texto;
  const edadTexto = edad === null ? RESPALDO.sinDato : String(edad);
  const ultimaVisitaTexto =
    ultimaVisita === null ? RESPALDO.sinVisita : fechaLegibleES(ultimaVisita);
  const presionSistolicaTexto =
    presionSistolica === null ? RESPALDO.sinDato : `${presionSistolica} mmHg`;
  const seguroActivoTexto =
    seguroActivo === null
      ? RESPALDO.sinDato
      : seguroActivo
        ? RESPALDO.conSeguro
        : RESPALDO.sinSeguro;
  const notas = notasLimpia ?? RESPALDO.texto;
  const tieneNotas = notasLimpia !== null;

  const textoBusqueda = [nombreCompleto, id, notas, especialidad, sedeCiudad]
    .map((x) => normalizarTexto(String(x ?? "")))
    .filter((x) => x.length > 0)
    .join(" ");

  const esRespaldo: MarcasRespaldo = {
    nombreCompleto: nombreCompletoLimpio === null,
    nombrePila: pila === null,
    apellidos: apellidos === null,
    edad: edad === null,
    especialidad: especialidadLimpia === null,
    sede: sedeLimpia === null,
    sedeCiudad: sedeCiudadLimpia === null,
    sedePais: sedePaisLimpia === null,
    ultimaVisita: ultimaVisita === null,
    presionSistolica: presionSistolica === null,
    seguroActivo: seguroActivo === null,
    notas: notasLimpia === null,
  };

  return {
    id,
    nombreCompleto,
    nombrePila,
    apellidos: apellidosDisplay,
    edad,
    edadTexto,
    especialidad,
    especialidadClave,
    sede,
    sedeCiudad,
    sedeCiudadClave,
    sedePais,
    ultimaVisita,
    ultimaVisitaTexto,
    presionSistolica,
    presionSistolicaTexto,
    seguroActivo,
    seguroActivoTexto,
    notas,
    tieneNotas,
    textoBusqueda,
    esRespaldo,
  };
}

export function normalizarRegistros(
  filas: RegistroCrudo[],
): RegistroNormalizado[] {
  return (Array.isArray(filas) ? filas : []).map(normalizarRegistro);
}

/* ------------------------------------------------------------------ */
/* Metricas                                                          */
/* ------------------------------------------------------------------ */

function redondear1(n: number): number {
  return Math.round(n * 10) / 10;
}

function promedio(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return redondear1(xs.reduce((a, b) => a + b, 0) / xs.length);
}

const MS_30_DIAS = 30 * 24 * 60 * 60 * 1000;

/**
 * Metricas resumen. EXCLUYE SIEMPRE los valores de respaldo / `null`:
 *  - edades / presiones: solo filas con dato numerico presente.
 *  - conSeguroPct: sobre las filas con dato booleano, no sobre el total.
 *  - visitasUltimos30Dias: ventana movil [ahora - 30 dias, ahora] en runtime.
 */
export function calcularMetricas(
  registros: RegistroNormalizado[],
): Metricas {
  const filas = Array.isArray(registros) ? registros : [];

  const edades = filas
    .map((r) => r.edad)
    .filter((n): n is number => n !== null);

  const presiones = filas
    .map((r) => r.presionSistolica)
    .filter((n): n is number => n !== null);

  const conDatoSeguro = filas.filter((r) => r.seguroActivo !== null);
  const conSeguro = conDatoSeguro.filter((r) => r.seguroActivo === true);

  const visitas = filas
    .map((r) => r.ultimaVisita)
    .filter((s): s is string => s !== null);

  const ahora = Date.now();
  const desde = ahora - MS_30_DIAS;
  const visitasUltimos30Dias = visitas.filter((iso) => {
    const t = Date.parse(`${iso}T00:00:00Z`);
    return !Number.isNaN(t) && t >= desde && t <= ahora;
  }).length;

  // comparacion lexicografica valida para 'YYYY-MM-DD'
  const visitaMasReciente =
    visitas.length > 0 ? visitas.reduce((a, b) => (a > b ? a : b)) : null;

  return {
    totalRegistros: filas.length,
    edadPromedio: promedio(edades),
    edadMin: edades.length > 0 ? Math.min(...edades) : null,
    edadMax: edades.length > 0 ? Math.max(...edades) : null,
    presionPromedio: promedio(presiones),
    presionMin: presiones.length > 0 ? Math.min(...presiones) : null,
    presionMax: presiones.length > 0 ? Math.max(...presiones) : null,
    conSeguroPct:
      conDatoSeguro.length > 0
        ? redondear1((conSeguro.length / conDatoSeguro.length) * 100)
        : null,
    visitasUltimos30Dias,
    visitaMasReciente,
    visitaMasRecienteTexto: visitaMasReciente
      ? fechaLegibleES(visitaMasReciente)
      : RESPALDO.sinVisita,
  };
}
