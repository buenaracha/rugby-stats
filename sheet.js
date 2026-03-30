// Función para convertir fecha de Google Sheets a ISO
function parseGoogleDate(dateValue) {
    if (!dateValue) return { iso: "", legible: "" }
    
    if (typeof dateValue === 'string' && dateValue.startsWith('Date(')) {
        const match = dateValue.match(/Date\((\d+),(\d+),(\d+)\)/)
        if (match) {
            const year = parseInt(match[1])
            const month = parseInt(match[2])
            const day = parseInt(match[3])
            const dateObj = new Date(year, month, day)
            return {
                iso: dateObj.toISOString(),
                legible: dateObj.toLocaleString()
            }
        }
    }
    
    if (typeof dateValue === 'string' && dateValue.includes('-')) {
        return {
            iso: dateValue,
            legible: new Date(dateValue).toLocaleString()
        }
    }
    
    return { iso: "", legible: "" }
}

// Función para convertir tiempo de Google Sheets a mm:ss
function parseGoogleTime(timeValue) {
    if (!timeValue) return "00:00"
    
    if (typeof timeValue === 'string' && timeValue.startsWith('Date(')) {
        const match = timeValue.match(/Date\(\d+,\d+,\d+,(\d+),(\d+),(\d+)\)/)
        if (match) {
            const hours = parseInt(match[1])
            const minutes = parseInt(match[2])
            const seconds = parseInt(match[3])
            const totalSeconds = (hours * 3600) + (minutes * 60) + seconds
            const mins = Math.floor(totalSeconds / 60)
            const secs = totalSeconds % 60
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }
    }
    
    if (typeof timeValue === 'string') {
        const partes = timeValue.split(':')
        if (partes.length === 2) {
            return `${String(parseInt(partes[0])).padStart(2, '0')}:${String(parseInt(partes[1])).padStart(2, '0')}`
        }
        if (partes.length === 3) {
            const totalSeconds = (parseInt(partes[0]) * 3600) + (parseInt(partes[1]) * 60) + parseInt(partes[2])
            const mins = Math.floor(totalSeconds / 60)
            const secs = totalSeconds % 60
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }
    }
    
    return "00:00"
}

// Función para convertir eventos agrupados a formato de partido
function convertirEventosAPartido(partidoId, eventosAgrupados, equipo, rival, fechaRaw) {
    let fechaISO = ""
    let fechaLegible = ""
    
    const fecha = parseGoogleDate(fechaRaw)
    fechaISO = fecha.iso
    fechaLegible = fecha.legible
    
    if (!fechaISO && partidoId) {
        const fechaMatch = partidoId.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/)
        if (fechaMatch) {
            const fechaStr = fechaMatch[1]
            const horaStr = fechaMatch[2].replace(/-/g, ':')
            const dateObj = new Date(`${fechaStr}T${horaStr}:00`)
            fechaISO = dateObj.toISOString()
            fechaLegible = dateObj.toLocaleString()
        }
    }
    
    let maxSegundos = 0
    eventosAgrupados.forEach(e => {
        if (e.tiempo && e.tiempo !== "00:00") {
            const partes = e.tiempo.split(':')
            const segundos = parseInt(partes[0]) * 60 + parseInt(partes[1])
            if (segundos > maxSegundos) maxSegundos = segundos
        }
    })
    
    let tries = 0, conversionesOK = 0, conversionesMal = 0, drops = 0
    let tacklesPos = 0, tacklesNeg = 0, quiebres = 0
    let perdidas = 0, recuperadas = 0
    let linesPos = 0, linesNeg = 0, scrumsPos = 0, scrumsNeg = 0
    let amarillas = 0, rojas = 0
    let puntosPropio = 0, puntosRival = 0
    
    eventosAgrupados.forEach(e => {
        const accion = e.accion
        
        if (accion.startsWith('RIVAL:')) {
            if (accion.includes('TRY')) puntosRival += 5
            else if (accion.includes('CONVERSION')) puntosRival += 2
            else if (accion.includes('DROP')) puntosRival += 3
            return
        }
        
        if (accion === 'Try') {
            tries++
            puntosPropio += 5
        }
        else if (accion === 'Conversión ➕') {
            conversionesOK++
            puntosPropio += 2
        }
        else if (accion === 'Conversión ➖') conversionesMal++
        else if (accion === 'Drop/Penal') {
            drops++
            puntosPropio += 3
        }
        else if (accion === 'Tackle ➕') tacklesPos++
        else if (accion === 'Tackle ➖') tacklesNeg++
        else if (accion === 'Quiebre') quiebres++
        else if (accion === '🏉 Perdida') perdidas++
        else if (accion === '🏉 Recuperada') recuperadas++
        else if (accion === 'Line ➕') linesPos++
        else if (accion === 'Line ➖') linesNeg++
        else if (accion === 'Scrum ➕') scrumsPos++
        else if (accion === 'Scrum ➖') scrumsNeg++
        else if (accion === 'Tarjeta 🟨') amarillas++
        else if (accion === 'Tarjeta 🟥') rojas++
    })
    
    return {
        id: partidoId,
        fecha: fechaISO || new Date().toISOString(),
        fechaLegible: fechaLegible || new Date().toLocaleString(),
        equipo: equipo || "",
        rival: rival || "",
        duracion: maxSegundos,
        duracionLegible: `${Math.floor(maxSegundos / 60)}:${String(maxSegundos % 60).padStart(2, '0')}`,
        tries: tries,
        conversionesOK: conversionesOK,
        conversionesMal: conversionesMal,
        drops: drops,
        tacklesPos: tacklesPos,
        tacklesNeg: tacklesNeg,
        quiebres: quiebres,
        perdidas: perdidas,
        recuperadas: recuperadas,
        linesPos: linesPos,
        linesNeg: linesNeg,
        scrumsPos: scrumsPos,
        scrumsNeg: scrumsNeg,
        amarillas: amarillas,
        rojas: rojas,
        puntosPropio: puntosPropio,
        puntosRival: puntosRival,
        eventos: eventosAgrupados.map(e => ({
            partido: partidoId,
            dni: e.dni,
            accion: e.accion,
            tiempo: e.tiempo,
            timestamp: e.timestamp || new Date().toISOString(),
            esEquipo: !e.accion.startsWith('RIVAL:')
        })),
        finalizado: true,
        finalizadoEn: new Date().toISOString()
    }
}

async function importarJugadoresSheet() {
    let sheetID = document.getElementById("sheetID").value
    
    if (!sheetID) {
        alert("Ingresá el ID del Google Sheet")
        return
    }
    
    if (sheetID.includes('/spreadsheets/d/')) {
        const match = sheetID.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
        if (match && match[1]) {
            sheetID = match[1]
        }
    }
    
    const btnCargar = document.querySelector('#pantallaConfig button[onclick="importarJugadoresSheet()"]')
    const textoOriginal = btnCargar.innerText
    btnCargar.innerText = "Cargando..."
    btnCargar.disabled = true
    
    try {
        function parseGoogleSheetResponse(texto) {
            const jsonStart = texto.indexOf('{')
            const jsonEnd = texto.lastIndexOf('}')
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error('No se encontró JSON en la respuesta')
            }
            const jsonStr = texto.substring(jsonStart, jsonEnd + 1)
            return JSON.parse(jsonStr)
        }
        
        // 1. Importar jugadores
        const jugadoresUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=Jugadores`
        const jugadoresResponse = await fetch(jugadoresUrl)
        
        if (!jugadoresResponse.ok) {
            throw new Error(`HTTP ${jugadoresResponse.status}: ${jugadoresResponse.statusText}`)
        }
        
        const jugadoresText = await jugadoresResponse.text()
        const jugadoresJson = parseGoogleSheetResponse(jugadoresText)
        
        const jugadoresData = []
        jugadoresJson.table.rows.forEach(row => {
            if (row.c && row.c[0] && row.c[0].v !== null && row.c[0].v !== "") {
                jugadoresData.push({
                    dni: String(row.c[0].v),
                    nombre: row.c[1]?.v || "",
                    apodo: row.c[2]?.v || "",
                    posicion: row.c[3]?.v || "",
                    camiseta: row.c[4]?.v || ""
                })
            }
        })
        
        if (jugadoresData.length === 0) {
            throw new Error('No se encontraron jugadores en la hoja "Jugadores"')
        }
        
        // Actualizar variable global y localStorage
        jugadores = jugadoresData
        guardarJugadores()
        console.log('Jugadores importados:', jugadoresData.length)
        
        // Refrescar la tabla de jugadores en la pantalla de preparación
        if (typeof mostrarTablaJugadores === 'function') {
            mostrarTablaJugadores()
        }
        
        // 2. Importar eventos históricos
        try {
            const eventosUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=Eventos`
            const eventosResponse = await fetch(eventosUrl)
            
            if (eventosResponse.ok) {
                const eventosText = await eventosResponse.text()
                const eventosJson = parseGoogleSheetResponse(eventosText)
                
                const partidosMap = new Map()
                
                eventosJson.table.rows.forEach(row => {
                    if (row.c && row.c[0] && row.c[0].v !== null && row.c[0].v !== "") {
                        const partidoId = String(row.c[0]?.v || "")
                        const fechaRaw = row.c[1]?.v
                        const equipo = row.c[2]?.v || ""
                        const rival = row.c[3]?.v || ""
                        const dni = row.c[4]?.v ? String(row.c[4].v) : null
                        const accion = row.c[6]?.v || ""
                        const tiempoRaw = row.c[7]?.v
                        const tiempo = parseGoogleTime(tiempoRaw)
                        
                        if (!partidosMap.has(partidoId)) {
                            partidosMap.set(partidoId, {
                                id: partidoId,
                                fechaRaw: fechaRaw,
                                equipo: equipo,
                                rival: rival,
                                eventos: []
                            })
                        }
                        
                        partidosMap.get(partidoId).eventos.push({
                            partido: partidoId,
                            dni: dni,
                            accion: accion,
                            tiempo: tiempo,
                            timestamp: new Date().toISOString()
                        })
                    }
                })
                
                const partidosImportados = []
                for (const [partidoId, data] of partidosMap) {
                    const partido = convertirEventosAPartido(
                        partidoId,
                        data.eventos,
                        data.equipo,
                        data.rival,
                        data.fechaRaw
                    )
                    partidosImportados.push(partido)
                }
                
                console.log('Partidos procesados:', partidosImportados.length)
                
                // Cargar historial existente
                let historialExistente = []
                try {
                    const historialGuardado = localStorage.getItem('historialPartidos')
                    if (historialGuardado) {
                        historialExistente = JSON.parse(historialGuardado)
                        console.log('Historial existente:', historialExistente.length)
                    }
                } catch(e) {}
                
                // Combinar partidos
                const historialPorId = new Map()
                historialExistente.forEach(p => historialPorId.set(p.id, p))
                
                partidosImportados.forEach(partidoImportado => {
                    if (historialPorId.has(partidoImportado.id)) {
                        const existente = historialPorId.get(partidoImportado.id)
                        if (partidoImportado.eventos.length > existente.eventos.length) {
                            historialPorId.set(partidoImportado.id, partidoImportado)
                            console.log(`Partido actualizado: ${partidoImportado.id}`)
                        }
                    } else {
                        historialPorId.set(partidoImportado.id, partidoImportado)
                        console.log(`Nuevo partido: ${partidoImportado.id}`)
                    }
                })
                
                // Guardar historial combinado
                const historialCombinado = Array.from(historialPorId.values())
                localStorage.setItem('historialPartidos', JSON.stringify(historialCombinado))
                
                // Actualizar variable global
                if (typeof historialPartidos !== 'undefined') {
                    historialPartidos = historialCombinado
                }
                
                console.log('Historial guardado:', historialCombinado.length)
                
                alert(`✅ Importados ${jugadoresData.length} jugadores\n📊 Importados ${partidosImportados.length} partidos (${eventosJson.table.rows.length} eventos)`)
                
                // Refrescar historial si la pantalla de estadísticas está abierta
                if (document.getElementById('pantallaEstadisticas').style.display === 'block') {
                    if (typeof cargarHistorial === 'function') {
                        cargarHistorial()
                    }
                    if (typeof cargarEstadisticasJugadores === 'function') {
                        cargarEstadisticasJugadores()
                    }
                }
                
            } else {
                alert(`✅ Importados ${jugadoresData.length} jugadores\n⚠️ No se encontró hoja "Eventos"`)
            }
        } catch (e) {
            console.error('Error importando eventos:', e)
            alert(`✅ Importados ${jugadoresData.length} jugadores\n⚠️ Error al importar eventos: ${e.message}`)
        }
        
    } catch (error) {
        console.error('❌ ERROR:', error)
        alert(`Error: ${error.message}\n\nVerificá que el sheet sea público (Compartir > Cualquier persona con el enlace)`)
    } finally {
        btnCargar.innerText = textoOriginal
        btnCargar.disabled = false
    }
}
