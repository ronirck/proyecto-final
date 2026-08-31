import { neon } from '@neondatabase/serverless';
import type { RegistroCrudo } from './normalizar';

// La cadena de conexion vive EXCLUSIVAMENTE en process.env (.env.local en local,
// panel de Vercel en produccion). Nunca se escribe literal en el codigo ni se sube al repo.
function obtenerSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'Falta la variable de entorno DATABASE_URL. Definela en .env.local para desarrollo ' +
        'local o en Project Settings -> Environment Variables de Vercel para produccion.',
    );
  }
  return neon(connectionString);
}

// Lectura unica de la fuente de verdad en runtime: la tabla registros_clinicos en Neon.
// El SELECT no interpola datos externos; el tag `sql` de @neondatabase/serverless
// parametriza cualquier valor que se le pase.
export async function obtenerRegistrosClinicos(): Promise<RegistroCrudo[]> {
  const sql = obtenerSql();
  const filas = await sql`
    SELECT id,
           nombre_completo,
           nombre_pila,
           apellidos,
           edad,
           especialidad,
           sede,
           sede_ciudad,
           sede_pais,
           ultima_visita,
           presion_sistolica,
           seguro_activo,
           notas
    FROM registros_clinicos
    ORDER BY id
  `;
  return filas as RegistroCrudo[];
}
