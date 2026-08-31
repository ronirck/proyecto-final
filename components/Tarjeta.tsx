import type { RegistroNormalizado } from '@/lib/normalizar';

export function Tarjeta({ r }: { r: RegistroNormalizado }) {
  const seguroClase =
    r.seguroActivo === true
      ? 'pill seguro-si'
      : r.seguroActivo === false
        ? 'pill seguro-no'
        : 'pill sin-dato';

  return (
    <article className="tarjeta">
      <header className="tarjeta-cabecera">
        <div
          className={
            'tarjeta-titulo' + (r.esRespaldo.nombreCompleto ? ' sin-dato' : '')
          }
        >
          {r.nombreCompleto}
        </div>
        <div className="tarjeta-subtitulo">
          {r.id} · {r.esRespaldo.edad ? 'edad sin dato' : `${r.edadTexto} años`}
        </div>
      </header>

      <div className="tarjeta-chips">
        <span
          className={
            'pill especialidad' + (r.esRespaldo.especialidad ? ' sin-dato' : '')
          }
        >
          {r.especialidad}
        </span>
        <span
          className={'pill sede' + (r.esRespaldo.sedeCiudad ? ' sin-dato' : '')}
        >
          {r.sedeCiudad}
          {!r.esRespaldo.sedeCiudad && !r.esRespaldo.sedePais
            ? `, ${r.sedePais}`
            : ''}
        </span>
        <span className={seguroClase}>{r.seguroActivoTexto}</span>
      </div>

      <div className="tarjeta-datos">
        <div>
          <div className="dato-label">Presión sistólica</div>
          <div
            className={
              'dato-valor' + (r.esRespaldo.presionSistolica ? ' sin-dato' : '')
            }
          >
            {r.presionSistolicaTexto}
          </div>
        </div>
        <div>
          <div className="dato-label">Última visita</div>
          <div
            className={
              'dato-valor' + (r.esRespaldo.ultimaVisita ? ' sin-dato' : '')
            }
          >
            {r.ultimaVisitaTexto}
          </div>
        </div>
      </div>

      <div className={'tarjeta-notas' + (r.tieneNotas ? '' : ' sin-dato')}>
        {r.notas}
      </div>
    </article>
  );
}
