-- Carga idempotente de los 10 registros de data/seed.json en registros_clinicos.
-- Valores YA NORMALIZADOS y escritos como literales Postgres validos.
-- Reglas aplicadas (ver db/PERFIL.md):
--   null / "" / "  "            -> NULL
--   edad, presion_sistolica str -> entero  (HC-1002 "52" -> 52 ; HC-1008 "148" -> 148)
--   "si"/"si"(tilde)/"SI"       -> TRUE      (HC-1005 "SI")
--   "no"/"NO"                   -> FALSE
--   nombre_completo             -> primer token = nombre_pila, resto = apellidos
--                                 (un solo token => apellidos NULL: HC-1008 "Ricardo")
--   sede "Ciudad, PAIS"         -> sede_ciudad / sede_pais (se conserva sede original)
--   notas ""                    -> NULL      (HC-1003)
-- Cada INSERT hace UPSERT: ON CONFLICT (id) DO UPDATE SET <todas menos id> = EXCLUDED.<col>.
-- Requiere el esquema de db/schema.sql aplicado previamente.

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1001', 'Ana Maria Perez Soto', 'Ana', 'Maria Perez Soto', 34, 'Cardiologia', 'Bogota, CO', 'Bogota', 'CO', '2026-08-21', 128, TRUE, 'Control anual sin hallazgos relevantes.')
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1002', 'Luis Fernando Gomez', 'Luis', 'Fernando Gomez', 52, 'Neurologia', 'Medellin, CO', 'Medellin', 'CO', '2026-08-14', NULL, FALSE, NULL)
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1003', 'Carla Ruiz', 'Carla', 'Ruiz', 29, 'Cardiologia', 'Cali, CO', 'Cali', 'CO', '2026-08-28', 117, TRUE, NULL)
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1004', 'Jorge Alberto Nunez Vela', 'Jorge', 'Alberto Nunez Vela', NULL, 'Pediatria', NULL, NULL, NULL, '2026-07-30', 141, TRUE, 'Requiere seguimiento en tres meses.')
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1005', 'Marta Elena Diaz Pena', 'Marta', 'Elena Diaz Pena', 61, 'Neurologia', 'Bogota, CO', 'Bogota', 'CO', '2026-08-05', 135, TRUE, 'Ajuste de tratamiento.')
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1006', 'Pedro Castillo', 'Pedro', 'Castillo', 45, 'Dermatologia', 'Barranquilla, CO', 'Barranquilla', 'CO', NULL, 122, NULL, 'Primera consulta.')
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1007', 'Sofia Herrera Lopez', 'Sofia', 'Herrera Lopez', 38, 'Pediatria', 'Medellin, CO', 'Medellin', 'CO', '2026-08-26', 119, TRUE, 'Sin novedades.')
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1008', 'Ricardo', 'Ricardo', NULL, 57, 'Cardiologia', 'Cali, CO', 'Cali', 'CO', '2026-06-18', 148, FALSE, 'Paciente con apellido no registrado en el sistema origen.')
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1009', 'Valentina Ortega Rios', 'Valentina', 'Ortega Rios', 26, 'Dermatologia', 'Bogota, CO', 'Bogota', 'CO', '2026-08-29', 110, TRUE, NULL)
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;

INSERT INTO registros_clinicos (id, nombre_completo, nombre_pila, apellidos, edad, especialidad, sede, sede_ciudad, sede_pais, ultima_visita, presion_sistolica, seguro_activo, notas)
VALUES ('HC-1010', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Registro incompleto importado desde el sistema anterior.')
ON CONFLICT (id) DO UPDATE SET
  nombre_completo = EXCLUDED.nombre_completo,
  nombre_pila = EXCLUDED.nombre_pila,
  apellidos = EXCLUDED.apellidos,
  edad = EXCLUDED.edad,
  especialidad = EXCLUDED.especialidad,
  sede = EXCLUDED.sede,
  sede_ciudad = EXCLUDED.sede_ciudad,
  sede_pais = EXCLUDED.sede_pais,
  ultima_visita = EXCLUDED.ultima_visita,
  presion_sistolica = EXCLUDED.presion_sistolica,
  seguro_activo = EXCLUDED.seguro_activo,
  notas = EXCLUDED.notas;
