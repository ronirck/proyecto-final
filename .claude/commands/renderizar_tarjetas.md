---
description: Genera o regenera la vista de tarjetas con filtros a partir de la fuente de datos del proyecto
argument-hint: [campo a destacar o ajuste visual, opcional]
---

Orquesta la construcción completa de la vista de tarjetas del proyecto siguiendo la skill `datos-a-interfaz`. Ajuste solicitado por el usuario en esta invocación: $ARGUMENTS

Ejecuta en orden y no saltes pasos:

1. **Perfila la fuente.** Lee `data/seed.json` (o la tabla correspondiente si el proyecto ya está conectado a Neon) y produce la tabla de perfil de esquema: nombre, tipo, porcentaje de nulos, cardinalidad y si el campo está agrupado. Muéstramela antes de continuar.

2. **Delega la normalización.** Invoca al agente `guardian-datos` para que genere o actualice la capa de normalización a partir de ese perfil. No escribas tú esa capa; es su responsabilidad. Espera su reporte.

3. **Genera la vista.** Sobre los datos ya normalizados, construye:
   - Una rejilla de tarjetas responsiva, una tarjeta por registro.
   - Los campos de alta cardinalidad como título y subtítulo de la tarjeta.
   - Los campos de baja cardinalidad como chips visibles dentro de la tarjeta y como filtros combinables en la parte superior.
   - Una barra de búsqueda de texto insensible a mayúsculas y acentos.
   - Un contador de resultados visibles y un estado vacío legible.
   - Una fila de métricas resumen si existen campos numéricos o de fecha aprovechables.

4. **Aplica el ajuste.** Si `$ARGUMENTS` trae una petición concreta (un campo a destacar, una relación de aspecto, una paleta), incorpórala en este punto sin romper lo anterior.

5. **Prueba con datos hostiles.** Añade temporalmente dos registros al seed: uno con todos los campos opcionales vacíos y otro con un campo agrupado malformado. Recarga y confirma que nada muestra `undefined` ni rompe el diseño.

6. **Verifica y reporta.** Recorre la lista de verificación de la skill y dime en qué estado quedó cada punto. Si algo falla, invoca a `depurador-web` en lugar de arreglarlo a mano.

Recuerda la norma del proyecto: todo el código lo generas tú. Si en algún momento la solución obvia parece ser «que el usuario edite esta línea», detente y genérala en su lugar.
