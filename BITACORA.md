# Bitácora de orquestación

Registro de prompts relevantes, delegaciones a agentes y errores diagnosticados con su causa raíz.

---

## 2026-08-30 — Capa de datos: perfil, esquema SQL y carga a Neon

### Prompt del usuario
> Usa el agente guardian-datos para: perfilar data/seed.json, derivar el esquema SQL a partir de ese perfil, crear la tabla en Neon vía MCP y cargar los 10 registros. Las credenciales van en .env.local y .env.local debe estar en .gitignore. Nunca escribas la cadena de conexión en el código.

### Delegación → `guardian-datos`
Encargo: perfilar `data/seed.json` (10 registros reales), separar campos agrupados,
derivar el esquema SQL del perfil, generar el script de carga parametrizado e
idempotente, la plantilla `.env.local.example` y el `.gitignore`. Sin llamadas de red.

Entregado por el agente:

| Archivo | Función |
|---|---|
| `db/schema.sql` | `CREATE TABLE registros_clinicos`; cada decisión de tipo comentada con la anomalía del perfil que la origina. |
| `db/load.mjs` | Carga `data/seed.json` → Postgres. Lee `DATABASE_URL` solo de `process.env`. Normaliza tipos, separa `sede` y `nombre_completo`, upsert parametrizado `ON CONFLICT (id) DO UPDATE`, transacción. Requiere `npm i pg`. |
| `db/.env.local.example` | Plantilla sin credencial; pasos para obtener la cadena pooled en Neon. |
| `.gitignore` | Ignora `.env.local`, `.env*.local`, `node_modules/`, `.vercel/`, `dist/`, `.next/`. |

Anomalías reportadas por el agente que el resto del equipo debe conocer:

1. `edad` y `presion_sistolica` son numéricos aunque 1 de cada uno llega como string (`"52"`, `"148"`) → INTEGER.
2. `seguro_activo` son palabras con casing mixto (`"si"`/`"SI"`/`"no"`) → BOOLEAN; ausente → NULL, no `false`.
3. `ultima_visita` en el dato real es 100 % ISO `YYYY-MM-DD`; no hay formatos mixtos pese al enunciado.
4. `notas` ausente en el 30 % (contando el `""` de HC-1003, que se guarda como NULL).
5. HC-1010 es un registro fantasma (solo `id` y `notas`): excluir de métricas.
6. HC-1008 (`"Ricardo"`) no tiene apellido en origen → `apellidos` NULL (dato real, no error de parseo).
7. `sede_pais` es siempre `"CO"`: hoy no discrimina como filtro.
8. En BD los ausentes son NULL reales; la etiqueta legible y la exclusión de métricas viven en la normalización de frontend.

Campos agrupados separados:
- `sede` `"Bogota, CO"` → `sede_ciudad` + `sede_pais` (se conserva `sede`).
- `nombre_completo` → `nombre_pila` + `apellidos` (se conserva `nombre_completo`).

Validación con datos hostiles (ejecutada por el agente): HC-1010 y `sede` malformada
(`"Bogota"` sin coma, `", CO"` sin ciudad) sobreviven sin excepción; coacción de
basura (`"abc"`, `"quiza"`) → NULL con aviso; `normalizarRegistro` es idempotente;
los 10 registros del seed normalizan sin un solo aviso.

### Bloqueo diagnosticado — MCP de Neon ausente
Causa raíz: la instrucción asume un servidor MCP de Neon disponible, pero
`claude mcp list` solo reporta Google Drive, Calendar y Gmail. Sin MCP de Neon
(ni credenciales) no se puede crear la tabla ni cargar los registros "vía MCP".
Decisión del usuario: **añadir el MCP de Neon**. La creación de tabla + carga
quedan pendientes hasta que el servidor esté conectado.

---

## 2026-08-30 — Re-perfilado y SQL listo para Neon (MCP lo ejecuta el orquestador)

### Prompt del orquestador → `guardian-datos`
> El orquestador se encarga del MCP contra Neon. El agente NO tiene MCP: re-perfilar
> `data/seed.json` campo a campo, revisar `db/schema.sql` y `db/load.mjs` de la iteración
> previa (no asumir que están bien), dejar el esquema sin `DROP TABLE` y con
> `CREATE TABLE/INDEX IF NOT EXISTS`, y generar `db/seed.inserts.sql` con 10 UPSERT ya
> normalizados como literales Postgres para pegar tal cual en Neon. Verificar `.gitignore`
> y que no haya cadenas de conexión en el código. Registrar en bitácora.

### Archivos creados / modificados
| Archivo | Cambio |
|---|---|
| `db/PERFIL.md` | **Nuevo.** Perfil real campo a campo: presencia, `null` vs `""` por separado, tipos crudos, cardinalidad, rango, anomalías por id y contradicciones con lo asumido. |
| `db/schema.sql` | **Corregido.** Eliminado `DROP TABLE IF EXISTS`; `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`; los 3 índices → `CREATE INDEX IF NOT EXISTS`. Tipos y comentarios sin cambio de fondo. |
| `db/seed.inserts.sql` | **Nuevo.** 10 `INSERT ... ON CONFLICT (id) DO UPDATE SET` idempotentes, valores normalizados como literales Postgres. Para ejecutar tal cual vía MCP. |
| `db/load.mjs` | Sin cambios. Revisado: lee `DATABASE_URL` solo de `process.env`, sin credenciales, upsert parametrizado. |
| `.gitignore` | Sin cambios. Confirmado: `.env.local` y `.env*.local` (sin `/` inicial ⇒ también cubren `db/.env.local`). |

### Perfil resumido — causa raíz de cada coacción de tipo
| Campo | Tipo elegido | Causa raíz (anomalía observada) |
|---|---|---|
| `edad` | `INTEGER` | 7 registros `number` pero `HC-1002` llega como string `"52"`. |
| `presion_sistolica` | `INTEGER` | 7 registros `number` pero `HC-1008` llega como string `"148"`. |
| `seguro_activo` | `BOOLEAN` | Palabra con casing mixto: `"si"` (5), `"no"` (2), `"SI"` (1, `HC-1005`). Ausente → `NULL`, no `FALSE` (`HC-1006`). |
| `ultima_visita` | `DATE` | 100 % ISO `YYYY-MM-DD` en el dato real (el enunciado hablaba de formatos mixtos que no existen). |
| `notas` | `TEXT`, `""` → `NULL` | `HC-1003` trae `""`; se distingue "sin nota" de "nota vacía". Ausente en 30 % (2 `null` + 1 `""`). |
| `nombre_completo` | agrupado → `nombre_pila` + `apellidos` | `HC-1008` `"Ricardo"`: un solo token ⇒ `apellidos` `NULL` (dato real, no fallo de parseo). |
| `sede` | agrupado → `sede_ciudad` + `sede_pais` | `"Ciudad, PAIS"`; `sede_pais` siempre `"CO"` (hoy no discrimina como filtro). |

### Anomalías para el resto del equipo
1. `HC-1010` es un registro fantasma: solo `id` y `notas`; los otros 7 campos `NULL`. Excluir de métricas.
2. `edad` y `presion_sistolica` ausentes en el 20 %: promedios solo sobre presentes.
3. `sede_pais` constante `"CO"`: no aporta como filtro todavía.
4. En BD los ausentes son `NULL` reales; la etiqueta legible y la exclusión de métricas viven en la normalización de frontend.
5. Discrepancia con la iteración previa: `db/schema.sql` traía `DROP TABLE` y `CREATE` sin `IF NOT EXISTS`; incompatible con "ejecutar tal cual sobre proyecto Neon recién creado". Corregido.

### Validación con datos hostiles (sobre `normalizarRegistro` de `db/load.mjs`)
- Registro con todos los opcionales `""` / `"   "` / `null` → todas las columnas `NULL`, sin excepción.
- Registro con agrupados malformados (`nombre_completo` `"   Solo   "`, `sede` `", CO"`) → `nombre_pila="Solo"`/`apellidos=NULL`; `sede_ciudad=NULL`/`sede_pais="CO"`. Sobrevive.
- Basura de tipo (`edad="abc"`, `seguro_activo="quiza"`) → `NULL` con aviso explícito.
- `normalizarRegistro` idempotente: re-normalizar el resultado da el mismo objeto.
- Los 10 registros del seed normalizan sin un solo aviso y coinciden exactamente con `db/seed.inserts.sql`.

---

## 2026-08-30 — Creación de tabla y carga en Neon vía MCP (orquestador)

### Acción del orquestador
Con el SQL entregado por `guardian-datos` (`db/schema.sql` + `db/seed.inserts.sql`),
ejecución directa contra Neon usando el servidor MCP `neon`. `guardian-datos` no
tiene acceso a MCP; la capa de datos la deriva el agente, la ejecución de red la
hace el orquestador.

### Pasos
| Paso | Herramienta MCP | Resultado |
|---|---|---|
| Localizar organización | `list_organizations` | `org-frosty-feather-94521245` (plan free). |
| Crear proyecto | `create_project` | `proyecto-final` → `square-flower-50915883`, región `aws-us-east-1`, Postgres 18, base `neondb`, rama `br-sparkling-fog-au2j4eq7`. |
| Obtener cadena de conexión | `get_connection_string` | Cadena pooled escrita **solo** en `db/.env.local` (ignorado por git). No se escribió en ningún archivo de código ni en la bitácora. |
| Aplicar esquema | `run_sql_transaction` | `CREATE TABLE IF NOT EXISTS registros_clinicos` + 3 índices + `COMMENT`. Sin `DROP`. |
| Cargar registros | `run_sql_transaction` | 10 `INSERT ... ON CONFLICT (id) DO UPDATE` en una transacción. |
| Verificar | `run_sql` | Ver comprobaciones abajo. |

### Verificación post-carga
- `count(*) = 10`.
- Nulos reales en BD: `edad` 2, `presion_sistolica` 2, `seguro_activo` 2, `notas` 3. Coincide con el perfil.
- Tipos en columna: `edad` `integer`, `ultima_visita` `date`, `seguro_activo` `boolean`.
- Coacciones confirmadas fila a fila: `HC-1002` `edad "52" → 52`, `seguro "no" → false`; `HC-1005` `seguro "SI" → true`; `HC-1008` `presion "148" → 148`, `apellidos NULL`; `HC-1010` todo `NULL` salvo `id` y `notas`.

### Convención de credenciales
- La cadena de conexión vive únicamente en `db/.env.local` (variable `DATABASE_URL`).
- `.gitignore` la cubre vía `.env.local` y `.env*.local`.
- Ningún archivo versionado (`db/schema.sql`, `db/seed.inserts.sql`, `db/load.mjs`) contiene la cadena. `db/.env.local.example` sigue con el valor vacío.
- Nota: el repositorio aún no está inicializado con git (`git init` pendiente); el `.gitignore` ya está listo para cuando se haga.

---

## 2026-08-30 — Capa de normalización TypeScript para la vista de tarjetas

### Prompt del orquestador → `guardian-datos`
> Paso 3 de la skill `datos-a-interfaz`. La fuente en runtime es la tabla `registros_clinicos`
> en Neon (no `data/seed.json`). Un Server Component hace `SELECT ... ORDER BY id` con
> `@neondatabase/serverless`, pasa las filas crudas por la capa de normalización y entrega
> registros limpios a un Client Component que filtra/busca en memoria. Generar `lib/normalizar.ts`
> (TS, ESM, sin dependencias) con `RegistroCrudo`, `RegistroNormalizado` (contrato exacto),
> `normalizarTexto`, `normalizarRegistro`, `normalizarRegistros`, `calcularMetricas`.
> Revalidar `db/PERFIL.md` contra la tabla real. No tocar `.env.local`. No instalar nada.
> El orquestador escribe los componentes React; el agente NO los toca.

### Archivos creados / modificados
| Archivo | Cambio |
|---|---|
| `lib/normalizar.ts` | **Nuevo.** Capa de normalización única. Punto de entrada: `normalizarRegistros(filas)` → `RegistroNormalizado[]`. Además `normalizarRegistro`, `normalizarTexto`, `calcularMetricas`, y las constantes `RESPALDO`. Sin dependencias externas. |
| `db/PERFIL.md` | **Ampliado.** Nuevo encabezado (aclara que el runtime lee la tabla, no el seed) + sección "Correspondencia con la tabla `registros_clinicos` (Neon)": tabla campo a campo seed-crudo vs tipo-en-reposo. Las cifras del perfil coinciden con la tabla; **no hubo que corregir ningún número**. |

### Respaldo por campo (nunca `"null"` ni `NaN`)
| Campo | Respaldo display | Variante de cálculo | Marca de exclusión |
|---|---|---|---|
| `nombreCompleto` | `"Sin nombre"` | — | `esRespaldo.nombreCompleto` |
| `nombrePila` | `"—"` | — | `esRespaldo.nombrePila` |
| `apellidos` | `"—"` (HC-1008 "Ricardo": sin apellido real, no se inventa) | — | `esRespaldo.apellidos` |
| `edad` | `edadTexto = "Sin dato"` | `edad: number \| null` | `edad === null` |
| `especialidad` | `"Sin especialidad"` | `especialidadClave = "__sin_dato__"` | clave `__sin_dato__` |
| `sede` | `"—"` (original agrupado) | — | `esRespaldo.sede` |
| `sedeCiudad` | `"Sin sede"` | `sedeCiudadClave = "__sin_dato__"` | clave `__sin_dato__` |
| `sedePais` | `"—"` | — | `esRespaldo.sedePais` |
| `ultimaVisita` | `ultimaVisitaTexto = "Sin visita registrada"` | `ultimaVisita: string \| null` (ISO) | `ultimaVisita === null` |
| `presionSistolica` | `presionSistolicaTexto = "Sin dato"` | `presionSistolica: number \| null` | `presionSistolica === null` |
| `seguroActivo` | `seguroActivoTexto = "Sin dato"` / `"Con seguro"` / `"Sin seguro"` | `seguroActivo: boolean \| null` | `seguroActivo === null` |
| `notas` | `"—"` | `tieneNotas: boolean` | `!tieneNotas` |

Además todos los campos exponen `esRespaldo` (mapa `campo → boolean`) para exclusión uniforme.

### Qué se excluye de métricas (`calcularMetricas`)
- `edadPromedio/Min/Max`: solo filas con `edad !== null`. `null` si no hay ninguna.
- `presionPromedio/Min/Max`: solo filas con `presionSistolica !== null`.
- `conSeguroPct`: `% (seguroActivo === true)` sobre las filas con `seguroActivo !== null` — **no sobre el total**. `null` si nadie tiene dato.
- `visitaMasReciente` / `visitasUltimos30Dias`: solo filas con `ultimaVisita !== null`.
- `totalRegistros`: única métrica que cuenta TODO (incluido el fantasma HC-1010).
- Números redondeados a 1 decimal. Sin datos suficientes → `null` (los componentes muestran "Sin dato").

### Ventana móvil de 30 días
`visitasUltimos30Dias` = nº de `ultimaVisita` con `t ∈ [ahora − 30·24·60·60·1000 ms, ahora]`,
donde `ahora = Date.now()` en tiempo de ejecución. Cada visita ISO se ancla a `T00:00:00Z`
para comparar en UTC. NO hay meses fijos ni fechas literales: la ventana se desplaza en cada render.

### Campos agrupados separados
- `nombre_completo` → `nombrePila` (primer token) + `apellidos` (resto). Un solo token ⇒ `apellidos` respaldo (`esRespaldo.apellidos = true`), nunca inventado. Se conserva el original en `nombreCompleto`.
- `sede` → `sedeCiudad` (antes de la primera coma) + `sedePais` (después). Se conserva el original en `sede`. Tolera `"Bogota"` (sin coma ⇒ país respaldo) y `", CO"` (sin ciudad ⇒ ciudad respaldo).

### Anomalías / notas para el resto del equipo
1. `db/PERFIL.md` no necesitó corrección numérica: el perfil del seed y el de la tabla coinciden 1:1 (la tabla se cargó de ese seed). Lo único que se añadió es la aclaración de que **el runtime lee `registros_clinicos`, no el JSON**, y la tabla de tipos-en-reposo.
2. `textoBusqueda` concatena los valores de display (`nombreCompleto + id + notas + especialidad + sedeCiudad`) ya en minúsculas y sin acentos. Para el fantasma HC-1010 incluye `"sin nombre ... sin especialidad sin sede"`: buscar literalmente "sin" lo emparejaría. Es consecuencia de usar los campos pedidos; si molesta en la vista, filtrar por `esRespaldo` antes de indexar.
3. `sedePais` sigue siendo constante `"CO"`: no aporta como filtro.
4. La capa es idempotente **y** tolerante: detecta las propias etiquetas de respaldo (`"Sin nombre"`, `"—"`, `"Sin dato"`, `"__sin_dato__"`, …) al re-entrar y las vuelve a tratar como ausencia. También reconoce las strings `"null"`/`"undefined"`/`"nan"` como ausencia.
5. `normalizarTexto` usa `String(...).normalize('NFD').replace(/\p{Diacritic}/gu,'')` + lowercase + colapso de espacios. El buscador debe pasar la query por esta misma función.
6. La coacción de fecha soporta `Date`, ISO `'YYYY-MM-DD'` (con o sin hora) y `dd/mm/yyyy` por robustez futura, aunque hoy el 100 % es ISO. Fecha legible generada sin `Intl` (determinista servidor/cliente): `"29 de agosto de 2026"`.

### Validación con datos hostiles (ejecutada, 46 comprobaciones, todas PASS)
- **Registro con todos los opcionales vacíos** (`""`, `"   "`, `"null"`): `id` recortado; todos los display con etiqueta legible (`"Sin nombre"`, `"Sin especialidad"`, `"Sin sede"`, `"—"`); `edad/presionSistolica/ultimaVisita/seguroActivo` → `null`; `notas:"null"` tratada como ausente (`tieneNotas=false`); claves de agrupación `"__sin_dato__"`; sin `"null"` ni `NaN` en el JSON; idempotente.
- **Campo agrupado malformado**: `nombre_completo:"   Solo   "` → `nombrePila:"Solo"`, `apellidos:"—"`; `sede:", CO"` → `sedeCiudad:"Sin sede"`, `sedePais:"CO"`; `sede:"Bogota"` (sin coma) → `sedeCiudad:"Bogota"`, `sedePais:"—"`; `sede:",,,"` sobrevive sin excepción; basura de tipo (`edad:"abc"`, `presion:"12x"`, `seguro:"quiza"`, `ultima_visita:"no-es-fecha"`) → `null`, nunca `NaN`.
- **Registro fantasma HC-1010**: excluido de todas las métricas numéricas/booleanas/fecha; cuenta solo en `totalRegistros`; conserva `notas` y es buscable por su texto.
- **Coacciones**: `"52"`→`52`, `"148"`→`148`, `"SI"`→`true`, `"no"`→`false`, `Date`→`"2026-08-05"`.
- **Métricas sobre los 10**: `edadPromedio 42.8` (8 presentes), `presionPromedio 127.5` (8), `conSeguroPct 75` (6/8 con dato), `visitaMasReciente 2026-08-29`. `calcularMetricas([])` no revienta.
- **Idempotencia**: `normalizar(salida→cruda)` === `salida` para los 10 registros y para todos los casos hostiles.

---

## 2026-08-30 — `/renderizar_tarjetas`: construcción de la vista de tarjetas

### Prompt del usuario
> `/renderizar_tarjetas` — Ajuste: destacar especialidad y sede como filtros, la vista debe
> consultar la tabla `registros_clinicos` en Neon, no leer el seed. Orquesta la construcción
> completa siguiendo la skill `datos-a-interfaz`, sin saltar pasos.

### Paso 1 — Perfil de la fuente (tabla `registros_clinicos` en Neon, no el seed)
Perfilado con `run_sql` (MCP) contra la tabla viva. Coincide con `db/PERFIL.md`.
Derivación de la interfaz: **filtros destacados** = `especialidad` (card. 4) + `sede_ciudad` (card. 4);
**filtro secundario** = `seguro_activo`; **búsqueda** = `nombre_completo`+`id`+`notas` (sin acentos/mayúsculas);
**métricas** = edad, presión sistólica, % con seguro, visitas en ventana móvil de 30 días;
`sede_pais` se muestra pero no filtra (cardinalidad 1, siempre `"CO"`).

### Paso 2 — Delegación de la normalización → `guardian-datos`
Entregó `lib/normalizar.ts` (ver sección anterior). El orquestador NO escribió esa capa.

### Paso 3-4 — Vista generada por el orquestador (código, no manual del usuario)
| Archivo | Función |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.mjs` | Proyecto Next.js 15 (App Router) + React 19 + TypeScript. `@neondatabase/serverless` como único dependencia de runtime. |
| `lib/db.ts` | `obtenerRegistrosClinicos()`: `SELECT ... FROM registros_clinicos ORDER BY id` con el tag `sql` parametrizado de `@neondatabase/serverless`. Lee `DATABASE_URL` solo de `process.env`; lanza error legible si falta. **Nunca lee `data/seed.json`.** |
| `app/page.tsx` | Server Component. `export const dynamic = 'force-dynamic'` → consulta Neon en cada request. Llama a `obtenerRegistrosClinicos` → `normalizarRegistros` → `calcularMetricas` y pasa datos limpios al Client Component. |
| `components/VistaTarjetas.tsx` | `'use client'`. Estado de filtros/búsqueda. Filtros combinables (OR dentro de grupo, AND entre grupos), conteos por faceta, barra de resultados, botón "Limpiar filtros", estado vacío (distingue "tabla vacía" de "sin coincidencias"). |
| `components/Tarjeta.tsx` | Una tarjeta por registro. Título = `nombreCompleto` (alta card.); subtítulo = `id` + edad; chips `especialidad`/`sede`/`seguro`; datos `presión`/`última visita`; notas. Cada campo de respaldo se marca con clase `sin-dato`, nunca muestra `undefined`. |
| `components/Metricas.tsx` | Fila de 5 métricas; las nulas muestran "Sin dato" en vez de `NaN`/`null`. |
| `app/globals.css` | Sistema visual propio: acento teal clínico, neutros, foco visible, rejilla `auto-fill minmax(288px,1fr)`, responsive a 1 columna en móvil. |
| `.env.local` (raíz) | **Nuevo, ignorado por git.** `DATABASE_URL` para que Next lo cargue en `dev`/`build`. La cadena NO está en ningún archivo versionado. |
| `.env.example` (raíz) | Plantilla con valor vacío + instrucciones para Vercel. |

### Ajuste del usuario aplicado
- **especialidad y sede destacados**: van en una rejilla propia de dos columnas, con etiqueta en mayúsculas y badge "Filtro"; `seguro` queda en una fila secundaria separada por un divisor. Chips con conteo por faceta.
- **la vista consulta Neon, no el seed**: `lib/db.ts` es la única lectura de datos en runtime y va contra `registros_clinicos`. `data/seed.json` permanece intacto (10 registros) solo como contrato/semilla.

### Paso 5 — Prueba con datos hostiles
La skill dice "añade dos registros al seed", pero **la vista no lee el seed**; para probar la fuente real
se insertaron 2 filas hostiles en la tabla Neon vía MCP (`run_sql_transaction`), se recargó y se
verificó, y se **eliminaron** al terminar (`DELETE ... RETURNING` → `HZ-9001`, `HZ-9002`).
- `HZ-9001` (todos los opcionales `NULL`): tarjeta con "Sin nombre", "edad sin dato", "Sin especialidad", "Sin sede", "Sin dato", "Sin visita registrada", notas "—". Sin `undefined`, sin `>null<`, sin `NaN`, sin `[object Object]`, sin `, ` colgante en el chip de sede.
- `HZ-9002` (agrupado malformado): `nombre_completo:"   Solo   "` → título "Solo"; `sede:"Bogota"` (sin coma) → chip "Bogota" sin país; `especialidad:"   "` → "Sin especialidad"; `notas:"   "` → "—".
- Rejilla con 12 tarjetas sin romperse; contador "Mostrando 12 de 12 registros". Tras el `DELETE`, vuelve a 10.

### Paso 6 — Verificación (detalle en la respuesta al usuario)
`next build` limpio (tipos OK). SSR contra Neon: 10 tarjetas, contador correcto, 0 `undefined`/`null`/`NaN` en el DOM.
Lógica de filtros/búsqueda/métricas/estado-vacío probada con Node contra la tabla viva:
combinación de filtros reduce y compone; búsqueda insensible a acentos y mayúsculas y multi-término (AND);
combo sin resultados → estado vacío; métricas excluyen respaldos (`edad 42.8`, `presión 127.5`, `seguro 75 %`,
`visitas 30 d = 6`); ventana móvil anclada a `Date.now()`. Log del servidor sin errores ni warnings de hidratación.
No hubo que invocar a `depurador-web`: no falló nada.

### Pendiente para el despliegue público (regla 6 del proyecto)
`git init` + repo remoto + importar en Vercel con la variable de entorno `DATABASE_URL` (mismo valor que
`.env.local`). El `.gitignore` ya protege `.env.local` / `.env*.local` / `.next/` / `node_modules/`.
