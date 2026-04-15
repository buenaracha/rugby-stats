// ==================== FUNCIONES DE CONVERSIÓN ====================

// Función para convertir fecha de Google Sheets a ISO
function parseGoogleDate(dateValue) {
    if (!dateValue) return { iso: "", legible: "" }
    
    if (typeof dateValue === 'string' && dateValue.startsWith('Date(')) {
        const match = dateValue.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/)
        if (match) {
            const year = parseInt(match[1])
            const month = parseInt(match[2])
            const day = parseInt(match[3])
            const hour = parseInt(match[4] || 0)
            const min = parseInt(match[5] || 0)
            const sec = parseInt(match[6] || 0)
            
            const dateObj = new Date(year, month, day, hour, min, sec)
            return {
                iso: dateObj.toISOString(),
                legible: dateObj.toLocaleString('es-AR', { 
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                })
            }
        }
    }
    
    if (typeof dateValue === 'string' && dateValue.includes('-')) {
        const d = new Date(dateValue)
        return {
            iso: dateValue,
            legible: d.toLocaleString('es-AR')
        }
    }
    
    return { iso: "", legible: "" }
}

// Función para convertir tiempo de Google Sheets a segundos
function parseGoogleTime(timeValue, formattedValue) {
    if (!timeValue) return 0;
    
    // Usar el valor formateado si existe (más confiable para duraciones)
    if (formattedValue && typeof formattedValue === 'string' && formattedValue.includes(':')) {
        const partes = formattedValue.split(':');
        const minutos = parseInt(partes[0]);
        const segundos = parseInt(partes[1]);
        return (minutos * 60) + segundos;
    }
    
    // Fallback: intentar parsear el valor raw
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
        const partes = timeValue.split(':');
        const minutos = parseInt(partes[0]);
        const segundos = parseInt(partes[1]);
        return (minutos * 60) + (segundos || 0);
    }
    
    if (typeof timeValue === 'number') {
        return timeValue;
    }
    
    return 0;
}

// ==================== CONVERSIÓN DE EVENTOS A PARTIDO ====================

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
            fechaLegible = dateObj.toLocaleString('es-AR')
        }
    }
    
    // Calcular duración máxima del partido
    let maxSegundos = 0
    eventosAgrupados.forEach(e => {
        if (e.tiempo !== null && e.tiempo !== undefined) {
            const segs = (typeof e.tiempo === "number") ? e.tiempo : parseGoogleTime(e.tiempo)
            if (segs > maxSegundos) maxSegundos = segs
        }
    })
    
    // Contadores de estadísticas
    let tries = 0, conversionesOK = 0, conversionesMal = 0, drops = 0
    let tacklesPos = 0, tacklesNeg = 0, quiebres = 0
    let perdidas = 0, recuperadas = 0
    let linesPos = 0, linesNeg = 0, scrumsPos = 0, scrumsNeg = 0
    let amarillas = 0, rojas = 0
    let penales = 0, linesRob = 0 
    let puntosPropio = 0, puntosRival = 0
    
    // Procesar eventos
    eventosAgrupados.forEach(e => {
        const accion = e.accion

        if (accion.startsWith('RIVAL:')) {
            if (accion.includes('TRY')) puntosRival += 5
            else if (accion.includes('CONVERSION')) puntosRival += 2
            else if (accion.includes('DROP') || accion.includes('PENAL')) puntosRival += 3
            return
        }
        
        if (accion === 'Try') { tries++; puntosPropio += 5 }
        else if (accion === 'Conversión ➕') { conversionesOK++; puntosPropio += 2 }
        else if (accion === 'Conversión ➖') conversionesMal++
        else if (accion === 'Drop' || accion === 'Penal') {
            if (accion === 'Penal') penales++; else drops++
            puntosPropio += 3
        }
        else if (accion === 'Tackle ➕') tacklesPos++
        else if (accion === 'Tackle ➖') tacklesNeg++
        else if (accion === 'Quiebre') quiebres++
        else if (accion === '🏉 Perdida') perdidas++
        else if (accion === '🏉 Recuperada') recuperadas++
        else if (accion === 'Line ➕') linesPos++
        else if (accion === 'Line ➖') linesNeg++
        else if (accion === 'Line Robado') linesRob++
        else if (accion === 'Scrum ➕') scrumsPos++
        else if (accion === 'Scrum ➖') scrumsNeg++
        else if (accion === 'Tarjeta 🟨') amarillas++
        else if (accion === 'Tarjeta 🟥') rojas++
    })

    // Formatear duración legible
    const totalMinutos = Math.floor(maxSegundos / 60)
    const segundosRestantes = maxSegundos % 60
    const duracionLegible = `${String(totalMinutos).padStart(2, '0')}:${String(segundosRestantes).padStart(2, '0')}`
    
    return {
        id: partidoId,
        fecha: fechaISO || new Date().toISOString(),
        fechaLegible: fechaLegible || new Date().toLocaleString('es-AR'),
        equipo: equipo || "",
        rival: rival || "",
        duracion: maxSegundos,
        duracionLegible: duracionLegible,
        tries: tries,
        conversionesOK: conversionesOK,
        conversionesMal: conversionesMal,
        drops: drops,
        penales: penales,
        linesRob: linesRob,
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
            nombre: e.nombre || "",
            accion: e.accion,
            tiempo: e.tiempo,
            timestamp: e.timestamp || new Date().toISOString(),
            esEquipo: !e.accion.startsWith('RIVAL:')
        })),
        finalizado: true,
        finalizadoEn: new Date().toISOString()
    }
}

// ==================== IMPORTACIÓN PRINCIPAL ====================

async function importarJugadoresSheet() {
    let sheetID = document.getElementById("sheetID").value
    
    if (!sheetID) {
        alert("Ingresá el ID del Google Sheet")
        return
    }
    
    // Extraer ID si es URL completa
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
        
        // Refrescar la tabla de jugadores
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
                        const tiempoFormatted = row.c[7]?.f
                        const tiempo = parseGoogleTime(tiempoRaw, tiempoFormatted)
                        
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
                
                // Combinar partidos con merge inteligente
                const historialPorId = new Map()
                historialPartidos.forEach(p => historialPorId.set(p.id, p))
                
                partidosImportados.forEach(partidoImportado => {
                    if (historialPorId.has(partidoImportado.id)) {
                        const existente = historialPorId.get(partidoImportado.id)
                        const eventosExistentes = existente.eventos || []
                        
                        const claveEvento = e => `${e.dni}|${e.accion}|${e.tiempo}`
                        const clavesExistentes = new Set(eventosExistentes.map(claveEvento))
                        
                        const eventosNuevos = partidoImportado.eventos.filter(
                            e => !clavesExistentes.has(claveEvento(e))
                        )
                        
                        if (eventosNuevos.length > 0) {
                            existente.eventos = [...eventosExistentes, ...eventosNuevos]
                            console.log(`Partido ${partidoImportado.id}: +${eventosNuevos.length} eventos nuevos`)
                        }
                    } else {
                        historialPorId.set(partidoImportado.id, partidoImportado)
                        console.log(`Nuevo partido importado: ${partidoImportado.id}`)
                    }
                })
                
                historialPartidos = Array.from(historialPorId.values())
                guardarEventos()
                
                console.log('Historial guardado:', historialPartidos.length)
                
                alert(`✅ Importados ${jugadoresData.length} jugadores\n📊 Importados ${partidosImportados.length} partidos (${eventosJson.table.rows.length} eventos)`)
                
                // Refrescar pantallas si están abiertas
                if (document.getElementById('pantallaEstadisticas').style.display === 'block') {
                    if (typeof cargarHistorial === 'function') cargarHistorial()
                    if (typeof cargarEstadisticasJugadores === 'function') cargarEstadisticasJugadores()
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

// ==================== FUNCIÓN DE DIAGNÓSTICO (OPCIONAL) ====================

async function diagnosticarTiempos() {
    let sheetID = document.getElementById("sheetID").value
    
    if (!sheetID) {
        alert("Ingresá el ID del Google Sheet primero")
        return
    }
    
    // Extraer ID si es URL completa
    if (sheetID.includes('/spreadsheets/d/')) {
        const match = sheetID.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
        if (match && match[1]) {
            sheetID = match[1]
        }
    }
    
    const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=Eventos`
    
    try {
        const response = await fetch(url)
        const text = await response.text()
        
        const jsonStart = text.indexOf('{')
        const jsonEnd = text.lastIndexOf('}')
        const jsonStr = text.substring(jsonStart, jsonEnd + 1)
        const data = JSON.parse(jsonStr)
        
        console.log("=== DIAGNÓSTICO DE TIEMPOS ===")
        
        const tiemposUnicos = new Map()
        for (const row of data.table.rows) {
            if (row.c && row.c[7] && row.c[7].v) {
                const raw = row.c[7].v
                const formatted = row.c[7].f
                const key = `${raw}|${formatted}`
                if (!tiemposUnicos.has(key)) {
                    tiemposUnicos.set(key, { raw, formatted })
                }
            }
        }
        
        tiemposUnicos.forEach(({ raw, formatted }) => {
            const segundos = parseGoogleTime(raw, formatted)
            const minutos = Math.floor(segundos / 60)
            const segs = segundos % 60
            console.log(`${formatted || raw} → ${segundos} segundos → ${minutos}:${String(segs).padStart(2,'0')}`)
        })
        
        alert("Diagnóstico completo. Revisá la consola (F12)")
        
    } catch (error) {
        console.error("Error en diagnóstico:", error)
        alert("Error: " + error.message)
    }
}