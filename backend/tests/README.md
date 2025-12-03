# Pruebas del Flujo del Sistema - Academia V2

Este directorio contiene las pruebas automatizadas para verificar el flujo completo del sistema según el archivo `Flujo.txt`.

## Requisitos Previos

1. **Base de datos PostgreSQL**: Asegúrate de que la base de datos `academia_final` esté creada y las tablas estén inicializadas.
2. **Servidor corriendo**: El servidor debe estar ejecutándose en `http://localhost:4000`
3. **Variables de entorno**: Asegúrate de tener un archivo `.env` con `JWT_SECRET` configurado
4. **Dependencias**: Ejecuta `npm install` en el directorio `backend`

## Configuración Inicial

### 1. Crear el administrador

Antes de ejecutar las pruebas, necesitas crear un usuario administrador:

```bash
node scripts/createAdmin.js
```

O puedes usar el endpoint de registro (si está disponible):

```bash
POST http://localhost:4000/api/auth/register
{
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}
```

### 2. Verificar que el servidor esté corriendo

```bash
npm start
```

El servidor debería iniciarse en `http://localhost:4000`

## Ejecutar las Pruebas

Para ejecutar las pruebas del flujo completo:

```bash
npm test
```

O directamente:

```bash
node tests/flujo-test.js
```

## Flujo de Pruebas

Las pruebas siguen el flujo completo del sistema:

1. **PASO 0**: Verificar que el servidor esté funcionando
2. **PASO 1**: Admin crea ciclo
3. **PASO 2**: Admin agrega cursos y docentes
4. **PASO 3**: Admin publica ofertas
5. **PASO 4**: Admin define horarios
6. **PASO 5**: Alumno se registra
7. **PASO 6**: Alumno se matricula
8. **PASO 7**: Admin revisa matrículas
9. **PASO 8**: Admin acepta matrícula
10. **PASO 9**: Docente marca asistencias
11. **PASO 10**: Verificar dashboard admin
12. **PASO 11**: Verificar analytics

## Resultados

Las pruebas mostrarán:

- ✓ Pruebas exitosas (verde)
- ✗ Pruebas fallidas (rojo)
- ⚠ Advertencias (amarillo)
- ℹ Información (cyan)

Al final se mostrará un resumen con el número de pruebas exitosas y fallidas.

## Solución de Problemas

### Error: "Servidor no responde"

- Verifica que el servidor esté corriendo en `http://localhost:4000`
- Verifica que no haya errores en la consola del servidor

### Error: "Admin no encontrado"

- Ejecuta `node scripts/createAdmin.js` para crear el administrador
- Verifica que el usuario admin exista en la tabla `users`

### Error: "Base de datos no conectada"

- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en `db.js`
- Verifica que la base de datos `academia_final` exista

### Error: "JWT_SECRET no configurado"

- Crea un archivo `.env` en el directorio `backend`
- Agrega `JWT_SECRET=tu_secreto_aqui` al archivo `.env`

## Notas

- Las pruebas crean datos de prueba en la base de datos
- Después de las pruebas, puedes limpiar los datos de prueba manualmente
- Las pruebas usan datos específicos (DNIs, nombres, etc.) que pueden necesitar limpieza
