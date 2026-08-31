# Contexto del proyecto

Proyecto final del Curso de Desarrollo con Inteligencia Artificial. Es una página web interactiva construida enteramente mediante orquestación de agentes de IA. La evaluación mide la capacidad de dirigir herramientas de IA, no la de escribir código a mano.

## Reglas que rigen este repositorio

1. **Cero código manual.** Toda la lógica, estructura e integraciones las genera el agente. Si la solución obvia parece ser «que el usuario edite esta línea», genérala tú en su lugar.
2. **La interfaz se deriva de los datos.** `data/seed.json` es la fuente de verdad del esquema. Ningún componente se diseña contra campos imaginados.
3. **Una skill y un comando propios.** La skill `datos-a-interfaz` gobierna la construcción de vistas; el comando `/renderizar_tarjetas` la orquesta.
4. **Dos agentes especializados.** `guardian-datos` es dueño de la capa de datos y del esquema SQL. `depurador-web` es dueño de todo diagnóstico de errores.
5. **Depuración delegada.** Ningún error se corrige a mano. Se delega en `depurador-web`, que debe explicar la causa raíz antes de corregir.
6. **Despliegue público.** El proyecto termina con una URL funcional y accesible en Vercel.

## Arquitectura

- Datos: `data/seed.json` como semilla y contrato del esquema; Postgres en Neon como almacén en producción, cargado desde ese mismo seed.
- Capa de normalización obligatoria entre la fuente y cualquier vista. Los componentes reciben datos limpios y no comprueban nulos por su cuenta.
- Frontend: rejilla de tarjetas con filtros combinables, búsqueda de texto y métricas resumen.

## Convenciones

- Credenciales exclusivamente en variables de entorno. Nunca una cadena de conexión en el código ni en el repositorio.
- Consultas parametrizadas siempre.
- Los valores ausentes se muestran con una etiqueta legible y se excluyen del cálculo de métricas.
- Antes de dar una vista por terminada: consola limpia, estado vacío legible, y prueba superada con registros que tienen campos vacíos.

## Bitácora

Registra en `BITACORA.md` cada prompt relevante, cada delegación a un agente y cada error diagnosticado con su causa raíz. Es la evidencia del proceso de orquestación que se entrega junto al proyecto.
