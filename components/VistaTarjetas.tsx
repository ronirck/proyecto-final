'use client';

import { useMemo, useState } from 'react';
import type { RegistroNormalizado, Metricas } from '@/lib/normalizar';
import { normalizarTexto, RESPALDO } from '@/lib/normalizar';
import { Tarjeta } from './Tarjeta';
import { MetricasResumen } from './Metricas';

type ModoSeguro = 'todos' | 'si' | 'no' | 'sindato';

interface Opcion {
  clave: string;
  etiqueta: string;
}

/** Opciones de un filtro de baja cardinalidad: pares clave→etiqueta, "Sin dato" al final. */
function construirOpciones(
  registros: RegistroNormalizado[],
  clave: (r: RegistroNormalizado) => string,
  etiqueta: (r: RegistroNormalizado) => string,
): Opcion[] {
  const mapa = new Map<string, string>();
  for (const r of registros) {
    const k = clave(r);
    if (!mapa.has(k)) mapa.set(k, etiqueta(r));
  }
  return [...mapa.entries()]
    .map(([k, e]) => ({ clave: k, etiqueta: e }))
    .sort((a, b) => {
      if (a.clave === RESPALDO.clave) return 1;
      if (b.clave === RESPALDO.clave) return -1;
      return a.etiqueta.localeCompare(b.etiqueta, 'es');
    });
}

const MODOS_SEGURO: [ModoSeguro, string][] = [
  ['todos', 'Todos'],
  ['si', 'Con seguro'],
  ['no', 'Sin seguro'],
  ['sindato', 'Sin dato'],
];

export function VistaTarjetas({
  registros,
  metricas,
}: {
  registros: RegistroNormalizado[];
  metricas: Metricas;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [espSel, setEspSel] = useState<Set<string>>(new Set());
  const [sedeSel, setSedeSel] = useState<Set<string>>(new Set());
  const [modoSeguro, setModoSeguro] = useState<ModoSeguro>('todos');

  const opcionesEsp = useMemo(
    () =>
      construirOpciones(
        registros,
        (r) => r.especialidadClave,
        (r) => r.especialidad,
      ),
    [registros],
  );
  const opcionesSede = useMemo(
    () =>
      construirOpciones(
        registros,
        (r) => r.sedeCiudadClave,
        (r) => r.sedeCiudad,
      ),
    [registros],
  );

  const terminos = useMemo(
    () => normalizarTexto(busqueda).split(' ').filter(Boolean),
    [busqueda],
  );

  const pasaBusqueda = (r: RegistroNormalizado) =>
    terminos.every((t) => r.textoBusqueda.includes(t));
  const pasaEsp = (r: RegistroNormalizado) =>
    espSel.size === 0 || espSel.has(r.especialidadClave);
  const pasaSede = (r: RegistroNormalizado) =>
    sedeSel.size === 0 || sedeSel.has(r.sedeCiudadClave);
  const pasaSeguro = (r: RegistroNormalizado) => {
    switch (modoSeguro) {
      case 'si':
        return r.seguroActivo === true;
      case 'no':
        return r.seguroActivo === false;
      case 'sindato':
        return r.seguroActivo === null;
      default:
        return true;
    }
  };

  const filtrados = useMemo(
    () =>
      registros.filter(
        (r) => pasaBusqueda(r) && pasaEsp(r) && pasaSede(r) && pasaSeguro(r),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registros, terminos, espSel, sedeSel, modoSeguro],
  );

  // Conteos por faceta: cada grupo se cuenta contra los OTROS filtros activos.
  const cuentaEsp = useMemo(() => {
    const base = registros.filter(
      (r) => pasaBusqueda(r) && pasaSede(r) && pasaSeguro(r),
    );
    const c = new Map<string, number>();
    for (const r of base)
      c.set(r.especialidadClave, (c.get(r.especialidadClave) ?? 0) + 1);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, terminos, sedeSel, modoSeguro]);

  const cuentaSede = useMemo(() => {
    const base = registros.filter(
      (r) => pasaBusqueda(r) && pasaEsp(r) && pasaSeguro(r),
    );
    const c = new Map<string, number>();
    for (const r of base)
      c.set(r.sedeCiudadClave, (c.get(r.sedeCiudadClave) ?? 0) + 1);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, terminos, espSel, modoSeguro]);

  const hayFiltros =
    busqueda.trim() !== '' ||
    espSel.size > 0 ||
    sedeSel.size > 0 ||
    modoSeguro !== 'todos';

  function alternar(
    conjunto: Set<string>,
    setter: (s: Set<string>) => void,
    clave: string,
  ) {
    const siguiente = new Set(conjunto);
    if (siguiente.has(clave)) siguiente.delete(clave);
    else siguiente.add(clave);
    setter(siguiente);
  }

  function limpiar() {
    setBusqueda('');
    setEspSel(new Set());
    setSedeSel(new Set());
    setModoSeguro('todos');
  }

  return (
    <>
      <MetricasResumen m={metricas} />

      <div className="controles">
        <div className="buscador">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, id o notas…"
            aria-label="Buscar registros"
          />
        </div>

        <div className="filtros-grid">
          <div className="filtro-grupo destacado">
            <div className="filtro-titulo">
              Especialidad <span className="destacado-badge">Filtro</span>
            </div>
            <div className="chips-fila">
              {opcionesEsp.map((o) => (
                <button
                  key={o.clave}
                  type="button"
                  className="chip-toggle"
                  aria-pressed={espSel.has(o.clave)}
                  onClick={() => alternar(espSel, setEspSel, o.clave)}
                >
                  {o.etiqueta}
                  <span className="cuenta">{cuentaEsp.get(o.clave) ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filtro-grupo destacado">
            <div className="filtro-titulo">
              Sede <span className="destacado-badge">Filtro</span>
            </div>
            <div className="chips-fila">
              {opcionesSede.map((o) => (
                <button
                  key={o.clave}
                  type="button"
                  className="chip-toggle"
                  aria-pressed={sedeSel.has(o.clave)}
                  onClick={() => alternar(sedeSel, setSedeSel, o.clave)}
                >
                  {o.etiqueta}
                  <span className="cuenta">{cuentaSede.get(o.clave) ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filtro-grupo-secundario">
            <div className="filtro-titulo">Seguro</div>
            <div className="seg" role="group" aria-label="Filtrar por seguro">
              {MODOS_SEGURO.map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={modoSeguro === valor}
                  onClick={() => setModoSeguro(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="resultado-barra">
        <div className="resultado-cuenta" aria-live="polite">
          Mostrando <strong>{filtrados.length}</strong> de {registros.length}{' '}
          {registros.length === 1 ? 'registro' : 'registros'}
        </div>
        <button
          type="button"
          className="btn-limpiar"
          onClick={limpiar}
          disabled={!hayFiltros}
        >
          Limpiar filtros
        </button>
      </div>

      {filtrados.length === 0 ? (
        <div className="vacio">
          {registros.length === 0 ? (
            <>
              <h2>La tabla no tiene registros</h2>
              <p>
                No hay filas en <code>registros_clinicos</code>.
              </p>
            </>
          ) : (
            <>
              <h2>Ningún registro coincide con los filtros</h2>
              <p>Ajusta la búsqueda o quita algún filtro para volver a ver resultados.</p>
              <button type="button" className="btn-limpiar" onClick={limpiar}>
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="rejilla">
          {filtrados.map((r) => (
            <Tarjeta key={r.id} r={r} />
          ))}
        </div>
      )}
    </>
  );
}
