---
name: datos-a-interfaz
description: Convierte un archivo de datos estructurados (JSON, CSV o una tabla de Postgres/Neon) en una interfaz web funcional — tarjetas, tablas, filtros y gráficas — derivando el diseño del esquema real de los datos en lugar de inventar campos. Úsala SIEMPRE que se pida renderizar, mostrar, listar o visualizar datos en la web; que se hable de tarjetas, dashboards, paneles, catálogos, filtros o buscadores; que se conecte un seed.json o una base Neon a un frontend; o que haya que arreglar una interfaz que se rompe con valores nulos o campos mal formados. Aplícala aunque el usuario no la nombre.
---

# De datos a interfaz

Esta skill impone un orden fijo: **primero se entiende el dato, después se dibuja la interfaz.** Nunca al revés. La causa número uno de interfaces rotas en este proyecto es generar componentes contra un esquema imaginado y descubrir después que el dato real tiene nulos, tipos mezclados o campos agrupados.

## Regla no negociable del proyecto

Este repositorio se desarrolla bajo la norma de **cero código manual**. Todo el código lo genera el agente. Si detectas que el usuario está a punto de editar lógica a mano, recuérdaselo y ofrécele hacerlo tú. Los errores tampoco se parchean a mano: se diagnostican, se explica la causa y se corrige generando código.

## Flujo de trabajo

### Paso 1 — Perfilar la fuente de datos

Antes de escribir una sola línea de frontend, lee la fuente real y produce un **perfil de esquema**. No lo asumas: ábrela.

Para cada campo registra:

| Dato a extraer | Por qué importa |
| --- | --- |
| Nombre exacto y tipo predominante | Evita `undefined` por typos de nombre |
| ¿Admite null / vacío? ¿En qué % de filas? | Decide si necesita valor de respaldo |
| Cardinalidad (nº de valores distintos) | Baja (≤ 15) → sirve como filtro; alta → sirve como búsqueda de texto |
| ¿Es agrupado? | Ej. `"Ana María Pérez Soto"` o `"Bogotá, CO"` deben separarse en columnas |
| Rango si es número o fecha | Define ejes de gráficas y ventanas móviles |

Presenta el perfil en una tabla corta **antes** de generar componentes, y usa esa tabla como contrato para todo lo que venga después.

### Paso 2 — Derivar la interfaz del perfil

No elijas los componentes por gusto; dedúcelos del perfil:

- Campos de **baja cardinalidad** → chips o selectores de filtro, combinables entre sí.
- Campos de **texto libre** → una única barra de búsqueda que filtra sin distinguir mayúsculas ni acentos.
- Campos de **fecha** → si el enunciado pide tendencia, usa una **ventana móvil de N días hacia atrás desde hoy**, calculada en tiempo de ejecución. Nunca agrupes por mes fijo ni codifiques fechas literales.
- Campos **numéricos** → métricas resumen arriba, detalle abajo.
- Campos **agrupados** → sepáralos en el paso de normalización, no en la vista.

Los filtros deben operar sobre la misma vista, sin recargar la página, y su estado combinado ha de reflejarse en un contador visible de resultados.

### Paso 3 — Blindar contra nulos (obligatorio)

Toda la lectura de datos pasa por una **capa de normalización** que se ejecuta una sola vez, entre la fuente y la vista. Los componentes reciben datos ya limpios y nunca comprueban nulos por su cuenta.

Esa capa debe:

1. Sustituir `null`, `undefined` y cadena vacía por un valor de respaldo explícito y visible para el usuario (por ejemplo, un guion o la etiqueta «Sin dato»), jamás por la cadena literal `"null"` ni por `NaN`.
2. Separar los campos agrupados en sus componentes y conservar también el original.
3. Coaccionar tipos: números que llegan como texto, fechas en formatos mixtos, booleanos como `"si"` / `"no"`.
4. Excluir del cálculo de métricas y gráficas las filas cuyo valor sea de respaldo, para no contaminar promedios con ceros falsos.
5. Ordenar y filtrar de forma segura: nunca invocar métodos de texto sobre un valor que pueda faltar.

**Prueba de humo antes de dar por buena la interfaz:** añade a mano dos filas al seed — una con todos los campos opcionales vacíos y otra con un campo agrupado malformado — y recarga. Si la vista se rompe o muestra `undefined`, la normalización es incompleta y hay que corregirla antes de seguir.

### Paso 4 — Verificar

Recorre esta lista y reporta el resultado al usuario:

- [ ] La interfaz muestra el número de registros que realmente tiene la fuente.
- [ ] Cada filtro reduce el conjunto y varios filtros se combinan correctamente.
- [ ] Con todos los filtros activos y cero resultados aparece un estado vacío legible, no una pantalla en blanco.
- [ ] Las filas con campos vacíos se renderizan sin romper el diseño.
- [ ] La consola del navegador está limpia.
- [ ] La vista es usable en pantalla estrecha.

## Estilo visual

Elige una dirección deliberada y aplícala de forma consistente: una escala tipográfica clara, un color de acento y neutros de apoyo, espaciado uniforme y estados de foco visibles. Evita el aspecto de plantilla por defecto. La densidad de información debe permitir comparar registros de un vistazo.

Si el usuario pide una relación de aspecto concreta para las tarjetas, respétala con proporción intrínseca y recorte controlado del contenido, no con alturas fijas en píxeles.

## Al conectar con base de datos remota

Si los datos viven en Postgres/Neon en vez de un archivo:

- Mantén el archivo `data/seed.json` en el repositorio como fuente de verdad del esquema y como semilla de carga. Es la evidencia de que la interfaz se derivó de datos estructurados.
- Genera el esquema SQL a partir del perfil del paso 1, no al revés.
- Las credenciales van en variables de entorno. Nunca escribas una cadena de conexión dentro del código ni la subas al repositorio.
- Las consultas deben ser parametrizadas.
- La normalización del paso 3 sigue siendo obligatoria: una base de datos también devuelve nulos.

## Errores frecuentes que debes evitar

- Generar el frontend antes de leer la fuente.
- Repetir comprobaciones de nulos dentro de cada componente en lugar de normalizar una vez.
- Agrupar por meses fijos cuando se pidió una ventana móvil.
- Filtrar sin normalizar acentos ni mayúsculas y concluir que «la búsqueda no funciona».
- Silenciar un error envolviéndolo en un bloque que lo ignora, en lugar de encontrar la causa.
