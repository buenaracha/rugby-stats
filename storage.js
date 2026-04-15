// ============================================================
//  STORAGE.JS — Única fuente de verdad: historialPartidos
// ============================================================

// --- Jugadores (sin cambios) --------------------------------
let jugadores = JSON.parse(localStorage.getItem("jugadores") || "[]")

function guardarJugadores() {
    localStorage.setItem("jugadores", JSON.stringify(jugadores))
}

// --- Historial de partidos (fuente única de verdad) ---------
let historialPartidos = []

try {
    const raw = localStorage.getItem("historialPartidos")
    if (raw) historialPartidos = JSON.parse(raw)
} catch (e) {
    console.warn("Error cargando historialPartidos:", e)
}

// --- Migración única: absorber localStorage["eventos"] ------
// Si había datos viejos en "eventos" separado, los integramos
// al historialPartidos y luego borramos la clave vieja.
;(function migrarEventosLegacy() {
    const rawEventos = localStorage.getItem("eventos")
    if (!rawEventos) return

    let eventosLegacy = []
    try { eventosLegacy = JSON.parse(rawEventos) } catch (e) { return }
    if (eventosLegacy.length === 0) {
        localStorage.removeItem("eventos")
        return
    }

    // Agrupar eventos legacy por partidoID
    const porPartido = {}
    eventosLegacy.forEach(ev => {
        const pid = ev.partido || "sin_id"
        if (!porPartido[pid]) porPartido[pid] = []
        porPartido[pid].push(ev)
    })

    // Para cada grupo, verificar si ya existe una entrada en historialPartidos
    Object.entries(porPartido).forEach(([pid, evs]) => {
        const existe = historialPartidos.find(p => p.id === pid)
        if (!existe) {
            // Crear entrada mínima para no perder los eventos
            historialPartidos.push({
                id: pid,
                fecha: evs[0]?.timestamp || new Date().toISOString(),
                fechaLegible: new Date(evs[0]?.timestamp || Date.now()).toLocaleString(),
                equipo: "",
                rival: "",
                duracion: 0,
                duracionLegible: "0:00",
                tries: evs.filter(e => e.accion === "Try").length,
                conversionesOK: evs.filter(e => e.accion === "Conversión ➕").length,
                drops: evs.filter(e => e.accion === "Drop").length,
                tacklesPos: evs.filter(e => e.accion === "Tackle ➕").length,
                eventos: evs,
                finalizado: true,
                finalizadoEn: new Date().toISOString(),
                migradoDeLegacy: true
            })
        } else if (!existe.eventos || existe.eventos.length === 0) {
            // La entrada existe pero sin eventos (puede pasar en datos viejos)
            existe.eventos = evs
        }
    })

    // Guardar el historial ya migrado y eliminar la clave vieja
    localStorage.setItem("historialPartidos", JSON.stringify(historialPartidos))
    localStorage.removeItem("eventos")
    console.log("Migración legacy completada. Eventos absorbidos:", eventosLegacy.length)
})()

// --- "eventos" como referencia al partido activo ------------
// Esta variable apunta siempre a historialPartidos[activo].eventos.
// Todo el código de app.js que hace eventos.push() o eventos.filter()
// sigue funcionando sin cambios porque opera sobre el mismo array.
let eventos = []

// --- Guardar: SIEMPRE persiste historialPartidos -------------
function guardarEventos() {
    localStorage.setItem("historialPartidos", JSON.stringify(historialPartidos))
}

// --- Exportar todos los eventos (lee de historialPartidos) ---
function exportarEventos() {
    // Recolectar todos los eventos de todos los partidos
    const todosEventos = []
    historialPartidos.forEach(p => {
        if (p.eventos) todosEventos.push(...p.eventos)
    })

    if (todosEventos.length === 0) {
        alert("No hay eventos para exportar")
        return
    }

    let filas = ["Partido ID,DNI,Jugador,Acción,Tiempo"]

    todosEventos.forEach(e => {
        let nombreJugador = ""
        if (e.dni) {
            const jugador = jugadores.find(j => j.dni == e.dni)
            nombreJugador = jugador ? jugador.apodo : e.dni
        }
        const partidoId = e.partido || ""
        filas.push(`"${partidoId}",${e.dni || ""},"${nombreJugador}","${e.accion}","${e.tiempo}"`)
    })

    let csv = "\uFEFF" + filas.join("\n")
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    let a = document.createElement("a")
    a.href = URL.createObjectURL(blob)

    const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    a.download = `eventos_${fecha}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
}

// --- Exportar un partido específico (lee de historialPartidos) ---
function exportarPartido(partidoId) {
    const partido = historialPartidos.find(p => p.id === partidoId)
    const eventosPartido = partido?.eventos || []

    if (eventosPartido.length === 0) {
        alert("No hay eventos en este partido")
        return
    }

    const nombreEquipo   = partido?.equipo        || ""
    const nombreRival    = partido?.rival         || ""
    const fechaPartido   = partido?.fechaLegible  || partido?.fecha || ""

    let filas = ["Partido ID,Fecha,Equipo,Rival,DNI,Jugador,Acción,Tiempo"]

    eventosPartido.forEach(e => {
        let nombreJugador = ""
        if (e.dni) {
            const jugador = jugadores.find(j => j.dni == e.dni)
            nombreJugador = jugador ? jugador.apodo : e.dni
        }
        filas.push(`"${partidoId}","${fechaPartido}","${nombreEquipo}","${nombreRival}",${e.dni || ""},"${nombreJugador}","${e.accion}","${e.tiempo}"`)
    })

    let csv = "\uFEFF" + filas.join("\n")
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    let a = document.createElement("a")
    a.href = URL.createObjectURL(blob)

    const nombreArchivo = `partido_${partidoId.replace(/_/g, "-")}_eventos.csv`
    a.download = nombreArchivo
    a.click()
    URL.revokeObjectURL(a.href)
}