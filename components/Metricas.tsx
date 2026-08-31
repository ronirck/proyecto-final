import type { Metricas } from '@/lib/normalizar';

function Celda({
  valor,
  vacia,
  label,
  detalle,
}: {
  valor: string;
  vacia?: boolean;
  label: string;
  detalle?: string;
}) {
  return (
    <div className="metrica">
      <div className={'metrica-valor' + (vacia ? ' is-empty' : '')}>{valor}</div>
      <div className="metrica-label">{label}</div>
      {detalle ? <div className="metrica-detalle">{detalle}</div> : null}
    </div>
  );
}

export function MetricasResumen({ m }: { m: Metricas }) {
  const edadVacia = m.edadPromedio === null;
  const presionVacia = m.presionPromedio === null;
  const seguroVacio = m.conSeguroPct === null;

  return (
    <section className="metricas" aria-label="Métricas resumen">
      <Celda valor={String(m.totalRegistros)} label="Registros en la tabla" />
      <Celda
        valor={edadVacia ? 'Sin dato' : `${m.edadPromedio} años`}
        vacia={edadVacia}
        label="Edad promedio"
        detalle={edadVacia ? undefined : `rango ${m.edadMin}–${m.edadMax}`}
      />
      <Celda
        valor={presionVacia ? 'Sin dato' : `${m.presionPromedio} mmHg`}
        vacia={presionVacia}
        label="Presión sistólica media"
        detalle={presionVacia ? undefined : `rango ${m.presionMin}–${m.presionMax}`}
      />
      <Celda
        valor={seguroVacio ? 'Sin dato' : `${m.conSeguroPct}%`}
        vacia={seguroVacio}
        label="Con seguro activo"
        detalle="sobre los que tienen dato"
      />
      <Celda
        valor={String(m.visitasUltimos30Dias)}
        label="Visitas últimos 30 días"
        detalle={`más reciente: ${m.visitaMasRecienteTexto}`}
      />
    </section>
  );
}
