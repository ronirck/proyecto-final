# Registros clínicos — vista de tarjetas

Página web interactiva construida por orquestación de agentes de IA (cero código manual).
La vista es una **rejilla de tarjetas** con filtros combinables, búsqueda de texto y
métricas resumen, **derivada del esquema real** de la tabla `registros_clinicos`.

## Arquitectura

```
data/seed.json            Contrato del esquema y semilla de carga (NO se lee en runtime)
      │  db/load.mjs / db/seed.inserts.sql
      ▼
Neon Postgres  ──►  registros_clinicos        Fuente de verdad en producción
      │  lib/db.ts   (SELECT parametrizado, @neondatabase/serverless)
      ▼
lib/normalizar.ts         Capa de normalización única: respaldos legibles, separa
      │                   campos agrupados, coacciona tipos, excluye respaldos de métricas
      ▼
app/page.tsx (Server)  ──►  components/VistaTarjetas.tsx (Client)
                             filtros combinables + búsqueda + métricas + estado vacío
```

- **Filtros destacados:** `especialidad` y `sede`. Secundario: `seguro`.
- **Búsqueda:** por nombre, id o notas, insensible a mayúsculas y acentos.
- **Métricas:** edad promedio, presión sistólica media, % con seguro activo y visitas
  en una **ventana móvil de 30 días** calculada en tiempo de ejecución.
- Los valores ausentes se muestran con etiqueta legible («Sin dato», «—») y se
  excluyen del cálculo de métricas.

## Desarrollo local

```bash
npm install
cp .env.example .env.local     # y pega la cadena de conexión de Neon en DATABASE_URL
npm run dev                    # http://localhost:3000
```

`.env.local` está en `.gitignore` y **nunca** debe subirse. La cadena de conexión
solo vive en variables de entorno; no hay ninguna credencial en el código.

### Cargar / recargar los datos en Neon

```bash
npm run cargar-datos           # aplica data/seed.json a registros_clinicos (idempotente)
```

Requiere el esquema aplicado una vez (`db/schema.sql`) y `npm i pg`.

## Despliegue en Vercel

1. `git init && git add . && git commit -m "..."` y sube el repo a GitHub.
2. En Vercel: **New Project → Import** el repositorio. El framework (Next.js) se
   detecta solo.
3. **Project Settings → Environment Variables**: añade `DATABASE_URL` con la cadena
   *pooled* de Neon (`...-pooler...?sslmode=require`) para Production, Preview y Development.
4. **Deploy**. La página consulta `registros_clinicos` en cada request
   (`dynamic = 'force-dynamic'`), así que refleja siempre el estado de la tabla.
