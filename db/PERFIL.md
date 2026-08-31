# Perfil real de `data/seed.json` y de la tabla `registros_clinicos` (Neon)

Fuente de perfilado: `data/seed.json`, clave `registros`. 10 registros (`HC-1001` .. `HC-1010`).
Perfilado sobre el dato real, campo a campo. No se infiere nada del nombre de archivo
ni de lo "razonable". Este perfil es el contrato con el resto del sistema.

**Fuente en runtime:** la vista de tarjetas NO lee `data/seed.json`. Lee la tabla
`registros_clinicos` en Neon (`SELECT ... ORDER BY id`, `@neondatabase/serverless`).
El seed queda solo como semilla/contrato. La tabla se cargó desde este mismo seed
(`db/seed.inserts.sql`), así que las cardinalidades, presencias y rangos de abajo
coinciden 1:1 con la tabla. Diferencia clave: en la tabla los tipos ya están
resueltos en reposo (ver sección "Correspondencia" al final).

## Resumen por campo

| Campo | Presentes | `null` | `""` / solo espacios | Tipos crudos observados | Cardinalidad | Rango / valores | Agrupado |
|---|---|---|---|---|---|---|---|
| `id` | 10/10 | 0 | 0 | string | 10 distintos | `HC-1001` .. `HC-1010`, formato `HC-100X` | no |
| `nombre_completo` | 9/10 | 1 (`HC-1010`) | 0 | string | 9 distintos | 1 a 4 tokens | **sí** → `nombre_pila` + `apellidos` |
| `edad` | 8/10 | 2 (`HC-1004`, `HC-1010`) | 0 | number (7), **string (1)** | 8 distintos | 26 – 61 | no |
| `especialidad` | 9/10 | 1 (`HC-1010`) | 0 | string | 4 distintos | Cardiologia (3), Neurologia (2), Pediatria (2), Dermatologia (2) | no |
| `sede` | 8/10 | 2 (`HC-1004`, `HC-1010`) | 0 | string | 4 ciudades distintas | Bogota (3), Medellin (2), Cali (2), Barranquilla (1); país siempre `CO` | **sí** → `sede_ciudad` + `sede_pais` |
| `ultima_visita` | 8/10 | 2 (`HC-1006`, `HC-1010`) | 0 | string | 8 distintos | `2026-06-18` .. `2026-08-29`, **100 % ISO `YYYY-MM-DD`** | no |
| `presion_sistolica` | 8/10 | 2 (`HC-1002`, `HC-1010`) | 0 | number (7), **string (1)** | 8 distintos | 110 – 148 | no |
| `seguro_activo` | 8/10 | 2 (`HC-1006`, `HC-1010`) | 0 | string | 3 crudos: `si` (5), `no` (2), `SI` (1) | palabra booleana con casing mixto | no |
| `notas` | 7/10 | 2 (`HC-1002`, `HC-1009`) | **1 (`HC-1003`)** | string | 7 distintos | texto libre | no |

## Anomalías concretas por id

| id | Anomalía | Coacción / tratamiento |
|---|---|---|
| `HC-1002` | `edad` llega como string `"52"` (el resto son number); `presion_sistolica` y `notas` son `null` | `"52"` → `52` (INTEGER) |
| `HC-1003` | `notas` es cadena vacía `""`, no `null` | `""` → `NULL` (no confundir "sin nota" con "nota vacía") |
| `HC-1004` | `edad` y `sede` son `null` | `edad` → `NULL`; `sede` / `sede_ciudad` / `sede_pais` → `NULL` |
| `HC-1005` | `seguro_activo` es `"SI"` en mayúsculas (inconsistente con `"si"` del resto) | `"SI"` → `TRUE` (comparación case-insensitive) |
| `HC-1006` | `ultima_visita` y `seguro_activo` son `null` | `seguro_activo` → `NULL`, **no** `FALSE` |
| `HC-1008` | `nombre_completo` es `"Ricardo"`: un solo token, sin apellido en el sistema origen; `presion_sistolica` llega como string `"148"` | `apellidos` → `NULL` (dato real, no error de parseo); `"148"` → `148` (INTEGER) |
| `HC-1009` | `notas` es `null` | `notas` → `NULL` |
| `HC-1010` | Registro fantasma: solo `id` y `notas` tienen valor; los otros 7 campos son `null` | todos los campos ausentes → `NULL`; marcar para excluir de métricas en frontend |

## Campos agrupados

- **`nombre_completo`** `"Ana Maria Perez Soto"` → `nombre_pila` (primer token) + `apellidos` (resto).
  Un solo token (`HC-1008` `"Ricardo"`) ⇒ `apellidos` `NULL`. Se conserva `nombre_completo` original.
- **`sede`** `"Bogota, CO"` → `sede_ciudad` (antes de la coma) + `sede_pais` (después).
  Se conserva `sede` original. En el dato real no hay malformados, pero la coacción los tolera.

## Contradicciones con lo que el proyecto asumía

1. **`ultima_visita` no tiene formatos mixtos.** El enunciado del seed habla de "formatos mixtos";
   en el dato real el 100 % de los presentes es ISO `YYYY-MM-DD`. La coacción a `DATE` tolera
   `dd/mm/yyyy` por si aparecen más adelante, pero hoy no es necesario.
2. **`sede_pais` es siempre `"CO"`.** No discrimina como filtro hoy; se separa igualmente por contrato.
3. **Los ausentes en BD son `NULL` reales.** La etiqueta legible ("Sin dato") y la exclusión de
   métricas viven en la normalización de frontend, no en la base.
4. **`notas` está ausente en el 30 %** (2 `null` + 1 `""`). Campo mayoritariamente presente pero
   con hueco relevante: decidir en frontend si se muestra siempre o solo cuando hay contenido.
5. **`edad` ausente en el 20 %** y **`presion_sistolica` ausente en el 20 %**: las métricas
   numéricas (promedio de edad, promedio de presión) deben calcularse sobre los presentes.

## Correspondencia con la tabla `registros_clinicos` (Neon) — verificada

Contrastado contra el perfil de la tabla real (10 filas). **Las cifras coinciden; no hubo
que corregir ningún número.** Lo que cambia respecto al seed crudo es solo el tipo en reposo:

| Campo | En `data/seed.json` (crudo) | En `registros_clinicos` (reposo) | `null` en tabla | Card. en tabla |
|---|---|---|---|---|
| `id` | string | `text` PK | 0 % | 10 |
| `nombre_completo` | string, 10 % null | `text`, 10 % null | 1 | 9 |
| `nombre_pila` | (derivado) | `text`, 10 % null | 1 | 9 |
| `apellidos` | (derivado) | `text`, 20 % null | 2 | 8 |
| `edad` | number + 1 string `"52"` | `integer` (ya coaccionado) | 2 | 8 · rango 26–61 · prom 42.8 |
| `especialidad` | string, 10 % null | `text`, 10 % null | 1 | 4 |
| `sede` | string, 20 % null | `text`, 20 % null | 2 | 4 |
| `sede_ciudad` | (derivado) | `text`, 20 % null | 2 | 4 |
| `sede_pais` | (derivado) | `text`, 20 % null | 2 | 1 (solo `CO`) |
| `ultima_visita` | string ISO, 20 % null | `date`, 20 % null | 2 | 8 · rango 2026-06-18 .. 2026-08-29 |
| `presion_sistolica` | number + 1 string `"148"` | `integer` (ya coaccionado) | 2 | 8 · rango 110–148 · prom 127.5 |
| `seguro_activo` | palabra `si`/`SI`/`no`, 20 % null | `boolean` (ya coaccionado) | 2 | 2 (`true`/`false`) |
| `notas` | string, 30 % ausente (2 null + 1 `""`) | `text`, 30 % null (el `""` se guardó como `NULL`) | 3 | 7 |

Implicación para la capa de normalización de frontend (`lib/normalizar.ts`):
el driver entrega `edad`/`presion_sistolica` como `number|null`, `seguro_activo` como
`boolean|null` y `ultima_visita` como `string`/`Date`/`null` según config del driver.
La capa **igualmente tolera** los formatos crudos del seed (string numérico, `"si"/"SI"/"no"`,
`Date`) por robustez, porque el mismo contrato se aplica si algún día se lee el seed directo.
