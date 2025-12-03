# Proyecto Academia PreUniversitaria Union de Nuevos Inteligentes

Este proyecto es una aplicación web para la gestión de una academia preuniversitaria.

## Migración a PostgreSQL

El backend ha sido migrado de MySQL a PostgreSQL.

### Cambios Principales:

- Base de datos: PostgreSQL 16
- Driver: `pg` (node-postgres)
- Sintaxis SQL actualizada en modelos, controladores y tests.
- Scripts de utilidad actualizados.

## Ejecución

Para ejecutar el proyecto usando Docker:

```bash
docker-compose up --build
```

Ver `DOCKER.md` para más detalles.
