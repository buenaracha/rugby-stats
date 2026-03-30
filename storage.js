let jugadores = JSON.parse(localStorage.getItem("jugadores") || "[]")
let eventos = JSON.parse(localStorage.getItem("eventos") || "[]")

function guardarJugadores() {
    localStorage.setItem("jugadores", JSON.stringify(jugadores))
}

function guardarEventos() {
    localStorage.setItem("eventos", JSON.stringify(eventos))
}

function exportarEventos() {
    if (eventos.length === 0) {
        alert("No hay eventos para exportar")
        return
    }
    
    // Crear array de filas con encabezado
    let filas = ["Partido ID,DNI,Jugador,Acción,Tiempo"]
    
    eventos.forEach(e => {
        // Buscar nombre del jugador si existe DNI
        let nombreJugador = ""
        if (e.dni) {
            const jugador = jugadores.find(j => j.dni == e.dni)
            nombreJugador = jugador ? jugador.apodo : e.dni
        }
        
        // Usar e.partido (no e.partidoID) que es como se guarda
        const partidoId = e.partido || ""
        
        filas.push(`"${partidoId}",${e.dni || ""},"${nombreJugador}","${e.accion}","${e.tiempo}"`)
    })
    
    let csv = "\uFEFF" + filas.join("\n")
    
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    let a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    
    // Nombre de archivo con fecha
    const fecha = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    a.download = `eventos_${fecha}.csv`
    
    a.click()
    URL.revokeObjectURL(a.href)
}

function exportarPartido(partidoId) {
    // Buscar eventos de ese partido
    const eventosPartido = eventos.filter(e => e.partido === partidoId)
    
    if (eventosPartido.length === 0) {
        alert("No hay eventos en este partido")
        return
    }
    
    // Buscar datos del partido en historial (si está guardado)
    let nombreEquipo = ""
    let nombreRival = ""
    let fechaPartido = ""
    
    try {
        const historial = JSON.parse(localStorage.getItem("historialPartidos") || "[]")
        const partido = historial.find(p => p.id === partidoId)
        if (partido) {
            nombreEquipo = partido.equipo
            nombreRival = partido.rival
            fechaPartido = partido.fechaLegible || partido.fecha
        }
    } catch(e) {}
    
    // Crear array de filas con encabezado
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
    
    const nombreArchivo = `partido_${partidoId.replace(/_/g, '-')}_eventos.csv`
    a.download = nombreArchivo
    
    a.click()
    URL.revokeObjectURL(a.href)
}