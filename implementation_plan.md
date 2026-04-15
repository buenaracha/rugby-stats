# Rugby Stats: Unificación de la Fuente de Datos

## El problema en concreto

Hoy el código guarda y lee datos en **tres lugares distintos**, que no siempre están sincronizados:

| Variable | Dónde vive | Qué guarda |
|---|---|---|
| `eventos` (global) | `localStorage["eventos"]` | Todos los eventos de todos los partidos |
| `partidoActual.eventos` | Solo en memoria (RAM) | Copia del partido en curso |
| `historialPartidos` | `localStorage["historialPartidos"]` | Partidos finalizados con sus eventos adentro |

### El nudo real del problema

Cuando se **registra un evento** (`registrarEvento()`), se lo agrega a dos lugares a la vez:
```javascript
eventos.push(evento)                    // → localStorage["eventos"]
partidoActual.eventos.push(evento)      // → solo en RAM
```

Cuando se **finaliza el partido**, `guardarPartidoEnHistorial()` agrega el partido (con sus eventos) a `historialPartidos` en `localStorage["historialPartidos"]`.

**Resultado:** los mismos eventos terminan guardados en DOS lugares de localStorage, y el historial tiene su propia copia interna. Las estadísticas acumuladas leen del historial, las del partido actual leen de `eventos`. Si se importa desde otro dispositivo, puede haber inconsistencias.

---

## Solución propuesta: única fuente de verdad = `historialPartidos`

La solución más limpia y segura es hacer que **todo gire alrededor de `historialPartidos`**:

- **Durante el partido**: `historialPartidos` contiene una entrada para el partido actual (marcado como `finalizado: false`). Los eventos se agregan directamente ahí.
- **Al finalizar**: esa entrada se marca `finalizado: true`. No hay transformación ni copia.
- **Para estadísticas**: siempre se lee `historialPartidos`. Un partido existe o no existe ahí, sin duplicados.
- **Se elimina**: `localStorage["eventos"]` como almacenamiento permanente (se mantiene `eventos` como alias en RAM para no romper compatibilidad con funciones existentes).

```
localStorage["historialPartidos"]  ←  ÚNICA fuente de verdad
localStorage["jugadores"]          ←  sin cambios
localStorage["eventos"]            ←  SE ELIMINA (ya no se usa)
```

---

## Cambios propuestos

### `storage.js` — [MODIFY]

#### Qué cambia:
- Eliminar la carga inicial de `eventos` desde localStorage.
- La variable `eventos` pasa a ser un **getter derivado**: apunta siempre a los eventos del partido activo en `historialPartidos`. Así todo código que lea `eventos` sigue funcionando sin modificar.
- `guardarEventos()` pasa a guardar `historialPartidos` (no `eventos` separado).
- `exportarEventos()` y `exportarPartido()` leen de `historialPartidos`.

#### Lo que NO cambia:
- La API pública (`guardarEventos`, `guardarJugadores`, `exportarPartido`, etc.) mantiene los mismos nombres.
- `jugadores` y `guardarJugadores()` sin cambios.

---

### `app.js` — [MODIFY]

#### Qué cambia:
- `iniciarPartido()`: en lugar de crear `partidoActual` solo en RAM, **crea directamente la entrada en `historialPartidos`** y la persiste.
- `registrarEvento()`: agrega el evento **solo a `historialPartidos`**. La variable `eventos` es un alias que apunta a los mismos eventos, por lo que funciones como `cargarEstadisticasActual()` no necesitan cambios.
- `guardarPartidoEnHistorial()`: solo marca `finalizado: true` en la entrada existente, sin duplicar nada.
- `finalizarPartido()`: limpia el puntero al partido activo.
- `borrarPartido()` y `cargarHistorial()`: sin cambios (ya usan `historialPartidos`).
- Se elimina el bloque de carga de `historialPartidos` al inicio (pasa a `storage.js`).

#### Lo que NO cambia:
- Toda la lógica de pantallas, cronómetro, tarjetas, deshacer, etc.
- Todas las funciones de estadísticas (`cargarEstadisticasActual`, `cargarHistorial`, `cargarEstadisticasJugadores`, etc.).
- La estética y la funcionalidad para el usuario son exactamente iguales.

---

### `sheet.js` — [MODIFY]

#### Qué cambia:
- `importarJugadoresSheet()`: al combinar partidos importados, actualiza `historialPartidos` correctamente (ya lo hace casi bien, se ajusta para que también sincronice la variable en RAM).
- Se corrige el **bug de importación desde otro dispositivo**: hoy pueden llegar partidos del Sheet que ya existen en `historialPartidos` con más datos (desde la app). Se mejora la lógica de merge: si el partido importado tiene eventos y el local también, se hace un **merge por evento único** en vez de reemplazar siempre con el que tenga más eventos.

---

## Resumen del flujo unificado

```
Iniciar partido  →  crear entrada en historialPartidos (finalizado: false)
                     eventos = alias a historialPartidos[activo].eventos

Registrar evento →  push a historialPartidos[activo].eventos
                     guardar localStorage["historialPartidos"]

Finalizar        →  marcar historialPartidos[activo].finalizado = true
                     limpiar puntero activo

Estadísticas     →  siempre leer de historialPartidos
```

---

## Sobre el bug de importación

El problema al importar desde otro dispositivo ocurre porque:
1. En dispositivo B se exporta el CSV → se importa en A.
2. El Sheet puede tener eventos en un orden diferente, o con campos ligeramente distintos.
3. La lógica actual reemplaza el partido si el importado tiene más eventos, pero no detecta eventos duplicados dentro de un mismo partido.

**Fix**: al hacer merge de eventos de un partido, se compara por combinación `(dni, accion, tiempo)` para evitar duplicados.

---

## Plan de verificación

1. **Prueba manual**: iniciar partido, registrar eventos, finalizar → verificar que `localStorage["historialPartidos"]` tenga el partido con sus eventos y que `localStorage["eventos"]` ya no exista (o esté vacío).
2. **Estadísticas**: verificar que "Partido Actual", "Historial" y "Jugadores" muestren datos coherentes.
3. **Deshacer**: verificar que deshacer acciones funciona igual que antes.
4. **Importación**: probar exportar e importar desde el Sheet para verificar la ausencia de duplicados.

---

> [!IMPORTANT]
> **Compatibilidad con datos existentes**: Antes de ejecutar, el código migrará automáticamente los datos de `localStorage["eventos"]` al nuevo esquema. Los datos actuales no se perderán.

> [!NOTE]
> **Sin cambios visibles para el usuario**: La aplicación se ve y funciona exactamente igual. El cambio es solo en la arquitectura interna.
