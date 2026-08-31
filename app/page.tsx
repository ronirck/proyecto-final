import { obtenerRegistrosClinicos } from '@/lib/db';
import { normalizarRegistros, calcularMetricas } from '@/lib/normalizar';
import { VistaTarjetas } from '@/components/VistaTarjetas';

// La vista consulta la tabla en cada request: nunca lee data/seed.json en runtime.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const crudos = await obtenerRegistrosClinicos();
  const registros = normalizarRegistros(crudos);
  const metricas = calcularMetricas(registros);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Registros clínicos</h1>
          <p className="page-subtitle">
            Rejilla de tarjetas derivada del esquema real · {registros.length}{' '}
            {registros.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
        <span className="source-pill">
          Fuente: tabla <code>registros_clinicos</code> en Neon
        </span>
      </header>

      <VistaTarjetas registros={registros} metricas={metricas} />
    </main>
  );
}
