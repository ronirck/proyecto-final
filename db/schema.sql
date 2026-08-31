-- Esquema derivado del perfil real de data/seed.json (10 registros, clave "registros").
-- Ver db/PERFIL.md. Cada tipo responde a una anomalia observada registro a registro,
-- NO a lo "razonable".
--
-- Dominio: historias clinicas (prefijo de id "HC-", campos especialidad / presion_sistolica / ultima_visita).
-- Tabla: registros_clinicos
--
-- Este script se ejecuta tal cual sobre un proyecto Neon recien creado:
--   * sin DROP TABLE (no se destruye nada preexistente),
--   * CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS (re-ejecutable sin error).

CREATE TABLE IF NOT EXISTS registros_clinicos (
    -- id: 10/10 presentes, 10 distintos, formato "HC-100X". Texto, clave primaria.
    id                  TEXT PRIMARY KEY,

    -- nombre_completo: campo AGRUPADO "Nombre [Apellidos]". 10% ausente (HC-1010 null).
    -- Se conserva el valor original y se separan sus partes.
    nombre_completo     TEXT,           -- valor original (nullable: HC-1010)
    nombre_pila         TEXT,           -- primer token
    apellidos           TEXT,           -- resto de tokens; NULL si solo hay un token (HC-1008 "Ricardo": sin apellido en origen)

    -- edad: tipo predominante number (7 registros); HC-1002 llega como string "52".
    -- 20% ausente (HC-1004, HC-1010 null). Rango real 26-61.
    -- Decision: INTEGER. El string "52" se coacciona a entero antes de insertar.
    edad                INTEGER,

    -- especialidad: texto categorico. 10% ausente (HC-1010). 4 valores distintos
    -- (Cardiologia, Neurologia, Pediatria, Dermatologia).
    especialidad        TEXT,

    -- sede: campo AGRUPADO "Ciudad, PAIS". 20% ausente (HC-1004, HC-1010 null).
    -- 4 ciudades distintas; sede_pais es siempre "CO" en el dato real.
    sede                TEXT,           -- valor original (nullable)
    sede_ciudad         TEXT,           -- parte antes de la coma
    sede_pais           TEXT,           -- parte despues de la coma

    -- ultima_visita: string ISO "YYYY-MM-DD" en el 100% de los presentes (no hay formatos mixtos en el dato real,
    -- pese a lo que sugeria el enunciado del seed). 20% ausente (HC-1006, HC-1010 null).
    -- Rango 2026-06-18 .. 2026-08-29. Decision: DATE.
    ultima_visita       DATE,

    -- presion_sistolica: tipo predominante number (7 registros); HC-1008 llega como string "148".
    -- 20% ausente (HC-1002, HC-1010 null). Rango real 110-148.
    -- Decision: INTEGER. El string "148" se coacciona a entero antes de insertar.
    presion_sistolica   INTEGER,

    -- seguro_activo: booleano escrito como palabra con casing mixto. Valores crudos: "si", "SI", "no".
    -- 20% ausente (HC-1006, HC-1010 null).
    -- Decision: BOOLEAN. "si"/"si"(tildado)/"SI" -> TRUE, "no"/"NO" -> FALSE, ausente -> NULL (no FALSE).
    seguro_activo       BOOLEAN,

    -- notas: texto libre. 30% ausente: null (HC-1002, HC-1009) + cadena vacia (HC-1003).
    -- La cadena vacia se normaliza a NULL para no confundir "sin nota" con "nota vacia".
    notas               TEXT
);

-- Indices para los filtros combinables de la rejilla de tarjetas.
CREATE INDEX IF NOT EXISTS idx_registros_clinicos_especialidad ON registros_clinicos (especialidad);
CREATE INDEX IF NOT EXISTS idx_registros_clinicos_sede_ciudad  ON registros_clinicos (sede_ciudad);
CREATE INDEX IF NOT EXISTS idx_registros_clinicos_seguro       ON registros_clinicos (seguro_activo);
