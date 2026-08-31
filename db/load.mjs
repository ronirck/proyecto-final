// Script de carga: data/seed.json -> Postgres/Neon.
//
// Dependencia externa: `pg` (instalar con `npm i pg`). Sin nada mas.
//
// Uso:
//   1. Copia db/.env.local.example a db/.env.local y pega la cadena de Neon.
//   2. Aplica el esquema una vez:  psql "$DATABASE_URL" -f db/schema.sql
//   3. Ejecuta:  node db/load.mjs
//
// La cadena de conexion se lee EXCLUSIVAMENTE de process.env.DATABASE_URL.
// No hay ninguna credencial en este archivo. Idempotente: INSERT ... ON CONFLICT (id) DO UPDATE.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// `pg` se importa de forma diferida dentro de main() para poder reutilizar
// las funciones de normalizacion en tests sin tener el driver instalado.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(HERE, '..', 'data', 'seed.json');
const ENV_LOCAL_PATH = path.join(HERE, '.env.local');

// --- Carga minima de db/.env.local sin dependencias (no pisa variables ya definidas) ---
async function loadEnvLocal() {
  let raw;
  try {
    raw = await readFile(ENV_LOCAL_PATH, 'utf8');
  } catch {
    return; // no existe: se usa el entorno tal cual
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// --- Coacciones de tipo: la misma logica que exige el perfil del esquema ---

// null / undefined / "" / "   "  ->  true
function esAusente(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

// "52" -> 52 ; 34 -> 34 ; null/"" -> null ; basura -> null (+ aviso)
function aEnteroONull(v, campo, id, avisos) {
  if (esAusente(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : null;
  const n = Number.parseInt(String(v).trim(), 10);
  if (Number.isNaN(n)) {
    avisos.push(`${id}: ${campo} no numerico ("${v}") -> NULL`);
    return null;
  }
  return n;
}

// "si"/"SI"/" Si " -> true ; "no"/"NO" -> false ; null/"" -> null ; otro -> null (+ aviso)
function aBoolONull(v, campo, id, avisos) {
  if (esAusente(v)) return null;
  const s = String(v).trim().toLowerCase();
  if (['si', 'sí', 's', 'true', '1'].includes(s)) return true;
  if (['no', 'n', 'false', '0'].includes(s)) return false;
  avisos.push(`${id}: ${campo} booleano no reconocido ("${v}") -> NULL`);
  return null;
}

// (y, mo, d) civiles -> "YYYY-MM-DD" si es un dia real del calendario ; null si es imposible.
// Round-trip por Date.UTC: rechaza "2026-02-31", "2026-13-01", etc. antes de que
// lleguen a la columna DATE y hagan reventar la transaccion de carga.
function armarFechaISO(y, mo, d) {
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  const p2 = (n) => String(n).padStart(2, '0');
  return `${y}-${p2(mo)}-${p2(d)}`;
}

// "2026-08-21" -> "2026-08-21" ; "14/02/2026" -> "2026-02-14" ; formatos mixtos tolerados ;
// null/"" -> null ; fecha imposible o formato no reconocido -> null (+ aviso).
function aFechaONull(v, campo, id, avisos) {
  if (esAusente(v)) return null;
  const s = String(v).trim();

  let iso = null;
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    iso = armarFechaISO(Number(m[1]), Number(m[2]), Number(m[3]));
  } else if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) {
    // dd/mm/yyyy o dd-mm-yyyy
    iso = armarFechaISO(Number(m[3]), Number(m[2]), Number(m[1]));
  } else {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      const dt = new Date(t);
      iso = armarFechaISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
  }

  if (iso === null) {
    avisos.push(`${id}: ${campo} fecha no interpretable ("${v}") -> NULL`);
    return null;
  }
  return iso;
}

// null/"" -> null ; texto -> texto recortado
function aTextoONull(v) {
  if (esAusente(v)) return null;
  return String(v).trim();
}

// Campo agrupado "Ciudad, PAIS". Conserva original. Tolera malformados: "Bogota" (sin coma), ", CO" (sin ciudad).
function separarSede(v) {
  const original = esAusente(v) ? null : String(v).trim();
  if (original === null) return { original: null, ciudad: null, pais: null };
  const partes = original.split(',');
  const ciudad = (partes[0] ?? '').trim() || null;
  const pais = partes.length > 1 ? (partes.slice(1).join(',').trim() || null) : null;
  return { original, ciudad, pais };
}

// Campo agrupado "Nombre Apellidos". Conserva original. Un solo token -> apellidos NULL.
function separarNombre(v) {
  const original = esAusente(v) ? null : String(v).trim();
  if (original === null) return { original: null, nombre_pila: null, apellidos: null };
  const tokens = original.split(/\s+/);
  const nombre_pila = tokens[0] || null;
  const apellidos = tokens.length > 1 ? tokens.slice(1).join(' ') : null;
  return { original, nombre_pila, apellidos };
}

// Registro crudo -> registro seguro (idempotente: re-normalizar el resultado da lo mismo)
export function normalizarRegistro(r, avisos = []) {
  const id = aTextoONull(r.id);
  const sede = separarSede(r.sede);
  const nombre = separarNombre(r.nombre_completo);
  return {
    id,
    nombre_completo: nombre.original,
    nombre_pila: nombre.nombre_pila,
    apellidos: nombre.apellidos,
    edad: aEnteroONull(r.edad, 'edad', id, avisos),
    especialidad: aTextoONull(r.especialidad),
    sede: sede.original,
    sede_ciudad: sede.ciudad,
    sede_pais: sede.pais,
    ultima_visita: aFechaONull(r.ultima_visita, 'ultima_visita', id, avisos),
    presion_sistolica: aEnteroONull(r.presion_sistolica, 'presion_sistolica', id, avisos),
    seguro_activo: aBoolONull(r.seguro_activo, 'seguro_activo', id, avisos),
    notas: aTextoONull(r.notas),
  };
}

const COLUMNAS = [
  'id', 'nombre_completo', 'nombre_pila', 'apellidos', 'edad', 'especialidad',
  'sede', 'sede_ciudad', 'sede_pais', 'ultima_visita', 'presion_sistolica',
  'seguro_activo', 'notas',
];

const UPSERT_SQL = `
INSERT INTO registros_clinicos (${COLUMNAS.join(', ')})
VALUES (${COLUMNAS.map((_, i) => `$${i + 1}`).join(', ')})
ON CONFLICT (id) DO UPDATE SET
${COLUMNAS.filter((c) => c !== 'id').map((c) => `  ${c} = EXCLUDED.${c}`).join(',\n')}
`;

async function main() {
  await loadEnvLocal();

  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error('Falta DATABASE_URL. Copia db/.env.local.example a db/.env.local y pega la cadena de Neon.');
    process.exit(1);
  }

  const seed = JSON.parse(await readFile(SEED_PATH, 'utf8'));
  const registros = Array.isArray(seed.registros) ? seed.registros : [];
  if (registros.length === 0) {
    console.error('El seed no tiene registros bajo la clave "registros".');
    process.exit(1);
  }

  const avisos = [];
  const normalizados = registros.map((r) => normalizarRegistro(r, avisos));

  const filasSinId = normalizados.filter((r) => !r.id);
  if (filasSinId.length > 0) {
    console.error(`Hay ${filasSinId.length} registro(s) sin id: no se pueden cargar.`);
    process.exit(1);
  }

  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const r of normalizados) {
      const valores = COLUMNAS.map((c) => r[c]); // undefined nunca: normalizarRegistro llena todo con valor o null
      await client.query(UPSERT_SQL, valores);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }

  console.log(`Cargados/actualizados ${normalizados.length} registros en registros_clinicos.`);
  if (avisos.length > 0) {
    console.log('\nAvisos de normalizacion:');
    for (const a of avisos) console.log('  - ' + a);
  }
}

// Ejecutar solo si se invoca directamente (permite importar las funciones en tests).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
