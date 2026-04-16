let titulares=[]
let jugadorSeleccionado=null
let modoJugadores="camiseta"

let partidoID=""
let equipoActual=""
let rivalActual=""

let partidoEnCurso = false
let historialAccionesVisual = []  // Array para almacenar las últimas acciones (máximo 5)

let segundos=0
let corriendo=false
let partidoIniciado=false
let partidoFinalizado=false

let amarillas=[]
let rojas = []

let puntosPropio = 0
let puntosRival = 0
let historialAcciones = []

let acciones=[
"Quiebre",
"Tackle ➕",
"Tackle ➖",
"Penal",
"🏉 Recuperada",
"🏉 Perdida",
"Try",
"Conversión ➕",
"Conversión ➖",
"Drop",
"Scrum ➕",
"Scrum ➖",
"Line Robado",
"Line ➕",
"Line ➖",
"Tarjeta 🟨",
"Tarjeta 🟥"
]

let partidoActual = {
    id: null,
    fechaInicio: null,
    equipo: null,
    rival: null,
    eventos: []
}

// Agrega esto al inicio de app.js
const DEBUG = true;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('Service Worker registrado con éxito', reg))
      .catch(err => console.warn('Error al registrar el service worker', err));
  });
}

// Modifica mostrarTablaJugadores() para respetar los titulares actuales
function mostrarTablaJugadores() {
  let cont = document.getElementById("tablaJugadores")
  cont.innerHTML = ""

  jugadores.forEach(j => {
    // Buscar si el jugador está en titulares
    const titular = titulares.find(t => t.dni === j.dni)
    
    let fila = document.createElement("div")
    fila.className = "filaJugador"

    // Usar el número del titular si existe, sino el del jugador
    const numeroCamiseta = titular ? titular.numero : (j.camiseta || "")
    
    fila.innerHTML = `
      <input type="number" min="1" max="99" value="${numeroCamiseta}" data-dni="${j.dni}">
      <input type="checkbox" data-dni="${j.dni}" ${titular ? 'checked' : ''}>
      <div>${j.nombre}</div>
      <div>${j.apodo}</div>
    `

    cont.appendChild(fila)
  })

  actualizarSeleccion()
}

function filtrarJugadores(){

let txt=document.getElementById("buscarJugador").value.toLowerCase()

document.querySelectorAll(".filaJugador").forEach(f=>{

let nombre=f.children[2].innerText.toLowerCase()
let apodo=f.children[3].innerText.toLowerCase()

f.style.display=
(nombre.includes(txt)||apodo.includes(txt))
?"grid":"none"

})

}

document.addEventListener("change",e=>{

if(e.target.type==="checkbox"){
actualizarSeleccion()
}

if(e.target.type==="number"){

let dni=e.target.dataset.dni
let numero=e.target.value

let j=jugadores.find(x=>x.dni==dni)

if(j){
j.camiseta=numero
guardarJugadores()
}

}

})

document.getElementById("cantidadJugadores").addEventListener("change", function() {
    actualizarSeleccion()
})

// Mejora actualizarSeleccion() para manejar correctamente las tarjetas amarillas
function actualizarSeleccion() {
    let checks = [...document.querySelectorAll("#tablaJugadores input[type=checkbox]")]
    let seleccionados = checks.filter(c => c.checked)
    
    // Obtener la cantidad máxima de jugadores
    let cantidadMaxima = parseInt(document.getElementById("cantidadJugadores").value) || 15
    
    // Actualizar el contador visual
    document.getElementById("contador").innerText = `${seleccionados.length} / `

    // Primero, habilitar todos los checks
    checks.forEach(c => {
        c.disabled = false
    })

    // Luego, aplicar reglas
    checks.forEach(c => {
        let dni = c.dataset.dni
        
        // Verificar si está suspendido
        let suspendido = jugadorSuspendido(dni)
        
        if (suspendido) {
            c.checked = true
            c.disabled = true
            return
        }
        
        // Si ya alcanzamos la cantidad máxima y este no está seleccionado, deshabilitarlo
        if (seleccionados.length >= cantidadMaxima && !c.checked) {
            c.disabled = true
        }
    })

    // Habilitar botón Iniciar solo si tenemos la cantidad exacta
    document.getElementById("btnComenzar").disabled = seleccionados.length !== cantidadMaxima
}

function actualizarColoresBotones() {
    if (document.getElementById("pantallaPartido").style.display !== "block") return
    
    // Primero, resetear todos los botones a su estado normal
    document.querySelectorAll("#jugadores button").forEach(boton => {
        const dni = boton.dataset.dni
        const tieneRoja = rojas.some(r => String(r.dni) === String(dni))
        const tieneAmarillaActiva = amarillas.some(a => String(a.dni) === String(dni) && a.regreso > segundos)
        
        if (tieneRoja) {
            boton.style.setProperty('background', '#d32f2f', 'important')
            boton.style.setProperty('color', 'white', 'important')
            boton.disabled = true
        } else if (tieneAmarillaActiva) {
            boton.style.setProperty('background', 'gold', 'important')
            boton.style.setProperty('color', 'black', 'important')
            boton.disabled = true
        } else {
            boton.style.setProperty('background', '#43a047', 'important')
            boton.style.setProperty('color', 'white', 'important')
            boton.disabled = false
        }
    })
}

// Modifica iniciarPartido() para mantener la coherencia
function iniciarPartido() {
    // ===== NUEVA VALIDACIÓN =====
    const equipoInput = document.getElementById("equipo")
    const rivalInput = document.getElementById("rival")
    const equipo = equipoInput.value.trim()
    const rival = rivalInput.value.trim()
    
    if (equipo === "" || rival === "") {
        alert("❌ Completá los nombres de EQUIPO y RIVAL antes de comenzar")
        return
    }
    // ===== FIN VALIDACIÓN =====
    
    // Limpiar historial visual al comenzar nuevo partido
    historialAccionesVisual = []
    actualizarHistorialVisual()

    const nuevoEquipo = equipo
    const nuevoRival = rival
    const cantidadJugadores = parseInt(document.getElementById("cantidadJugadores").value) || 15
    
    if (!partidoIniciado) {
        equipoActual = nuevoEquipo
        rivalActual = nuevoRival
        
        // Limpiar cualquier entrada huérfana
        const huerfanas = historialPartidos.filter(p => p.finalizado === false)
        if (huerfanas.length > 0) {
            historialPartidos = historialPartidos.filter(p => p.finalizado !== false)
            console.log(`Limpiadas ${huerfanas.length} entradas huérfanas`)
        }
        
        const ahora = new Date()
        const fecha = ahora.toISOString().slice(0, 10)
        const hora = ahora.toISOString().slice(11, 19).replace(/:/g, '-')
        
        // ===== BLOQUEAR INPUTS =====
        document.getElementById("equipo").disabled = true
        document.getElementById("rival").disabled = true
        document.getElementById("sheetID").disabled = true
        partidoEnCurso = true
        // ===== FIN BLOQUEO =====

        // Crear entrada directamente en historialPartidos
        partidoActual = {
            id: `${fecha}_${hora}_${equipoActual}_vs_${rivalActual}`,
            fechaInicio: ahora.toISOString(),
            fecha: ahora.toISOString(),
            fechaLegible: ahora.toLocaleString(),
            equipo: equipoActual,
            rival: rivalActual,
            cantidadJugadores: cantidadJugadores,
            duracion: 0,
            duracionLegible: '0:00',
            tries: 0, 
            conversionesOK: 0, 
            drops: 0, 
            tacklesPos: 0,
            puntosPropio: 0, 
            puntosRival: 0,
            eventos: [],
            finalizado: false
        }
        
        // Registrar en historialPartidos y apuntar 'eventos' a la misma referencia
        historialPartidos.push(partidoActual)
        eventos = partidoActual.eventos
        
        partidoID = partidoActual.id
        guardarEventos()
        
        console.log('Nuevo partido creado en historialPartidos:', partidoActual.id)
    }
    
    // Resto del código (fuera del if)
    titulares = []
    
    document.querySelectorAll("#tablaJugadores .filaJugador").forEach(f => {
        let num = f.children[0].value
        let check = f.children[1]

        if (check.checked) {
            let dni = check.dataset.dni
            let j = jugadores.find(x => x.dni == dni)
            
            titulares.push({
                dni: j.dni,
                nombre: j.nombre,
                apodo: j.apodo,
                numero: num || j.camiseta || ""
            })
        }
    })

    document.getElementById("infoPartido").innerText = equipoActual + " vs " + rivalActual
    document.getElementById("pantallaConfig").style.display = "none"
    document.getElementById("pantallaPartido").style.display = "block"

    crearJugadores()
    crearAcciones()
    sincronizarEstadoPartido()
    
    partidoIniciado = true
}

function crearJugadores(){
    let cont = document.getElementById("jugadores")
    cont.innerHTML = ""

    titulares.forEach(j => {
        let label = modoJugadores === "camiseta" ? (j.numero || j.apodo) : j.apodo

        let b = document.createElement("button")
        b.dataset.dni = j.dni
        b.innerText = label
        b.onclick = () => seleccionarJugador(j, b)

        cont.appendChild(b)
    })
    
    // Aplicar colores después de crear los botones
    actualizarColoresBotones()
}

function toggleModo(){

modoJugadores=
modoJugadores==="camiseta"
?"apodo"
:"camiseta"

document.getElementById("toggleModo").innerText=
modoJugadores==="camiseta"
?"Apodos"
:"Camisetas"

crearJugadores()

}

function seleccionarJugador(j,b){

if(jugadorSuspendido(j.dni)) return

document.querySelectorAll("#jugadores button")
.forEach(x=>x.classList.remove("jugadorSeleccionado"))

b.classList.add("jugadorSeleccionado")

jugadorSeleccionado=j

}

function jugadorSuspendido(dni){
    // Convertir a string para comparación
    const dniStr = String(dni)
    
    // Verificar rojas
    if (rojas.some(r => String(r.dni) === dniStr)) {
        return true
    }
    // Verificar amarillas activas
    return amarillas.some(a => String(a.dni) === dniStr && a.regreso > segundos)
}

function crearAcciones(){

let cont=document.getElementById("acciones")
cont.innerHTML=""

acciones.forEach(a=>{

let b=document.createElement("button")

b.innerText=a
b.className="accion"

b.onclick=()=>registrarEvento(a)

cont.appendChild(b)

})

}

function registrarEvento(accion) {
    // Verificar si es una acción de equipo (no requiere jugador)
    const accionesEquipo = ["Line ➕", "Line ➖", "Scrum ➕", "Scrum ➖", "Line Robado"]
    const esAccionEquipo = accionesEquipo.includes(accion)
    
    // Si NO es acción de equipo, requiere jugador seleccionado
    if (!esAccionEquipo && !jugadorSeleccionado) return

    // Si es acción de jugador, verificar suspensión
    if (!esAccionEquipo && jugadorSuspendido(jugadorSeleccionado.dni)) {
        alert("Jugador con tarjeta amarilla o roja")
        return
    }

    let tiempo = document.getElementById("cronometro").innerText

    // ===== SUMAR PUNTOS PARA EL EQUIPO PROPIO =====
    let puntosASumar = 0
    if (accion === 'Try') puntosASumar = 5
    else if (accion === 'Conversión ➕') puntosASumar = 2
    else if (accion === 'Drop/Penal') puntosASumar = 3  // ← CORREGIDO: coincide con el nombre de la acción
    
    if (puntosASumar > 0) {
        puntosPropio += puntosASumar
        document.getElementById('puntosPropio').innerText = puntosPropio
    }

    // ===== CREAR EVENTO =====
    let evento = {
        partido: partidoActual.id,
        dni: esAccionEquipo ? null : jugadorSeleccionado.dni,
        accion: accion,
        tiempo: tiempo,
        timestamp: new Date().toISOString(),
        esEquipo: esAccionEquipo
    }

    // ===== AGREGAR AL HISTORIAL VISUAL =====
    let descripcion = ""
    if (esAccionEquipo) {
        descripcion = `EQUIPO: ${accion}`
    } else {
        descripcion = `${jugadorSeleccionado.apodo}: ${accion}`
    }
    agregarAlHistorialVisual(descripcion, tiempo, puntosASumar)

    eventos.push(evento)
    guardarEventos()
    
    // ===== GUARDAR EN HISTORIAL PARA DESHACER (UNIFICADO) =====
    // Guardamos UN SOLO registro que contiene TODO: la acción y los puntos
    historialAcciones.push({
        tipo: 'accion_completa',
        evento: evento,
        puntos: puntosASumar,
        accion: accion,
        dni: esAccionEquipo ? null : jugadorSeleccionado?.dni,
        tiempo: tiempo,
        esAccionEquipo: esAccionEquipo
    })

    // ===== MANEJO DE TARJETAS =====
    if (!esAccionEquipo && accion === "Tarjeta 🟨") {
        let regreso = segundos + (15 * 60)
        amarillas.push({
            dni: jugadorSeleccionado.dni,
            apodo: jugadorSeleccionado.apodo,
            regreso: regreso
        })
    }
    
    if (!esAccionEquipo && accion === "Tarjeta 🟥") {
        amarillas = amarillas.filter(a => a.dni !== jugadorSeleccionado.dni)
        rojas.push({
            dni: jugadorSeleccionado.dni,
            apodo: jugadorSeleccionado.apodo
        })
    }

    // Limpiar selección solo si fue acción de jugador
    if (!esAccionEquipo) {
        jugadorSeleccionado = null
        document.querySelectorAll("#jugadores button")
            .forEach(b => b.classList.remove("jugadorSeleccionado"))
    }
    
    actualizarColoresBotones()
}

function iniciarCrono() {
    if (segundos === 0 && !corriendo) {
        // Primer inicio
        corriendo = true
        document.getElementById("btnCrono").innerText = "Pausar"
        return
    }
    
    // Si ya estaba en marcha o pausado
    if (corriendo) {
        corriendo = false
        document.getElementById("btnCrono").innerText = "Continuar"
    } else {
        corriendo = true
        document.getElementById("btnCrono").innerText = "Pausar"
    }
}

function actualizarBotonInicio() {
    let b = document.getElementById("btnCrono")
    
    if (segundos === 0 && !corriendo) {
        b.innerText = "Iniciar"
    } else if (corriendo) {
        b.innerText = "Pausar"
    } else {
        b.innerText = "Continuar"
    }
}

setInterval(()=>{

if(!corriendo) return

segundos++

let m=Math.floor(segundos/60)
let s=segundos%60

let mm=String(m).padStart(2,"0")
let ss=String(s).padStart(2,"0")

document.getElementById("cronometro").innerText=mm+":"+ss

actualizarAmarillas()

},1000)

function mostrarPantallaConfig() {
    // Guardar el estado actual del cronómetro antes de salir
    const estabaCorriendo = corriendo
    
    document.getElementById("pantallaPartido").style.display = "none"
    document.getElementById("pantallaConfig").style.display = "block"
    
    // Limpiar y recrear contenido
    mostrarTablaJugadores()
    actualizarSeleccion()
    
    // Reajustar altura y scroll
    reajustarPantallaConfig()
    
    // No modificamos corriendo, solo guardamos para cuando volvamos
    window.cronoEstabaCorriendo = estabaCorriendo
}

function modoCambios() {
    // Guardar estado del cronómetro antes de salir
    window.cronoEstabaCorriendo = corriendo
    
    mostrarPantallaConfig()
    
    if (partidoIniciado) {
        document.getElementById("btnComenzar").innerText = "Continuar"
        // Asegurar que los inputs sigan bloqueados
        document.getElementById("equipo").disabled = true
        document.getElementById("rival").disabled = true
    } else {
        document.getElementById("btnComenzar").innerText = "Comenzar"
    }
}

function borrarSeleccion(){
    if(segundos > 0 && !partidoFinalizado){
        alert("No se puede borrar partido iniciado")
        return
    }

    document.querySelectorAll("#tablaJugadores input[type=checkbox]")
        .forEach(c => c.checked = false)

    actualizarSeleccion()
    
    // Opcional: también limpiar rojas si estás en preparación sin partido
    if (!partidoIniciado) {
        rojas = []
        amarillas = []
    }
}

function registrarCambio(sale,entra){

let tiempo=document.getElementById("cronometro").innerText

eventos.push({
partido:partidoID,
dni:sale,
accion:"Cambio_Sale",
tiempo:tiempo
})

eventos.push({
partido:partidoID,
dni:entra,
accion:"Cambio_Entra",
tiempo:tiempo
})

guardarEventos()

}

function actualizarAmarillas(){
    let cont = document.getElementById("amarillas")
    if(!cont) return

    cont.innerHTML = ""

    // Marcar jugadores con roja (fondo rojo, deshabilitados)
    rojas.forEach(r => {
        let boton = document.querySelector(`#jugadores button[data-dni='${r.dni}']`)
        if(boton){
            boton.style.background = "#d32f2f"  // Rojo
            boton.disabled = true
        }
    })

    // Manejo de amarillas (igual que antes)
    amarillas.forEach(a => {
        let restante = a.regreso - segundos
        let boton = document.querySelector(`#jugadores button[data-dni='${a.dni}']`)

        if(restante <= 0){
            if(boton && !rojas.some(r => r.dni === a.dni)){  // Si no tiene roja
                boton.style.background = ""
                boton.disabled = false
            }
            let d = document.createElement("div")
            d.innerText = "🟨 " + a.apodo + " puede volver"
            cont.appendChild(d)
            return
        }

        if(boton && !rojas.some(r => r.dni === a.dni)){  // Si no tiene roja
            boton.style.background = "gold"
            boton.disabled = true
        }

        let m = Math.floor(restante / 60)
        let s = restante % 60
        let mm = String(m).padStart(2, "0")
        let ss = String(s).padStart(2, "0")

        let d = document.createElement("div")
        d.innerText = `🟨 ${a.apodo} ${mm}:${ss}`
        cont.appendChild(d)
    })

    // Actualizar colores de los botones
    actualizarColoresBotones()
}

function sumarPuntoRival(tipo) {
    let puntos = 0
    let texto = ""
    if (tipo === 'try') { puntos = 5; texto = "Try Rival" }
    else if (tipo === 'conversion') { puntos = 2; texto = "Conv Rival" }
    else if (tipo === 'drop') { puntos = 3; texto = "Drop Rival" }
    
    historialAcciones.push({
        tipo: 'punto',
        equipo: 'rival',
        accion: tipo,
        puntos: puntos,
        timestamp: Date.now()
    })
    
    puntosRival += puntos
    document.getElementById('puntosRival').innerText = puntosRival
    
    // ===== CREAR EVENTO (VERSIÓN SIMPLIFICADA) =====
    let evento = {
        partido: partidoActual.id,  // ← Usa el ID desde la fuente de verdad
        dni: null,
        accion: `RIVAL: ${tipo.toUpperCase()} +${puntos}`,
        tiempo: document.getElementById('cronometro').innerText,
        timestamp: new Date().toISOString()
    }
    
    // SOLO UNA VEZ - eventos ya es = partidoActual.eventos
    eventos.push(evento)
    guardarEventos()
    
    // ===== AGREGAR AL HISTORIAL VISUAL =====
    const tiempoActual = document.getElementById('cronometro').innerText
    agregarAlHistorialVisual(`RIVAL: ${texto}`, tiempoActual, puntos)
    // ===== FIN HISTORIAL VISUAL =====
}

function deshacerUltimaAccion() {
    if (historialAcciones.length === 0) {
        alert("No hay acciones para deshacer")
        return
    }
    
    const ultima = historialAcciones.pop()
    
    // ===== NUEVO: Manejar acción completa (unificada) =====
    if (ultima.tipo === 'accion_completa') {
        // 1. Restar puntos si los había
        if (ultima.puntos > 0) {
            puntosPropio -= ultima.puntos
            document.getElementById('puntosPropio').innerText = puntosPropio
        }
        
        // 2. Eliminar el evento del array
        const index = eventos.findIndex(e => 
            e.accion === ultima.accion && 
            e.tiempo === ultima.tiempo &&
            e.dni === ultima.dni
        )
        if (index !== -1) {
            eventos.splice(index, 1)
        }
        
        // 3. Si era tarjeta, deshacerla
        if (ultima.accion === "Tarjeta 🟨") {
            amarillas = amarillas.filter(a => a.dni !== ultima.dni)
            // Liberar al jugador visualmente
            const boton = document.querySelector(`#jugadores button[data-dni='${ultima.dni}']`)
            if (boton && !rojas.some(r => r.dni === ultima.dni)) {
                boton.style.setProperty('background', '#43a047', 'important')
                boton.style.setProperty('color', 'white', 'important')
                boton.disabled = false
            }
        }
        
        if (ultima.accion === "Tarjeta 🟥") {
            rojas = rojas.filter(r => r.dni !== ultima.dni)
            const boton = document.querySelector(`#jugadores button[data-dni='${ultima.dni}']`)
            if (boton && !amarillas.some(a => a.dni === ultima.dni && a.regreso > segundos)) {
                boton.style.setProperty('background', '#43a047', 'important')
                boton.style.setProperty('color', 'white', 'important')
                boton.disabled = false
            }
        }
        
        guardarEventos()
        actualizarColoresBotones()
        actualizarAmarillas()
        
        // Sincronizar historial visual eliminando la última acción
        if (historialAccionesVisual.length > 0) {
            historialAccionesVisual.shift()  // Elimina la más reciente
            actualizarHistorialVisual()
        }
        return
    }
    
    // ===== MANTENER COMPATIBILIDAD CON VERSIÓN ANTERIOR =====
    // (por si quedan datos viejos en el historial)
    
    if (ultima.tipo === 'punto') {
        if (ultima.equipo === 'rival') {
            puntosRival -= ultima.puntos
            document.getElementById('puntosRival').innerText = puntosRival
            
            for (let i = eventos.length - 1; i >= 0; i--) {
                if (eventos[i].accion && eventos[i].accion.includes('RIVAL')) {
                    eventos.splice(i, 1)
                    break
                }
            }
            guardarEventos()
        }
    }
    else if (ultima.tipo === 'puntoPropio') {
        puntosPropio -= ultima.puntos
        document.getElementById('puntosPropio').innerText = puntosPropio
        
        for (let i = eventos.length - 1; i >= 0; i--) {
            if (eventos[i].accion === ultima.accion && 
                eventos[i].dni !== null &&
                !eventos[i].accion.includes('RIVAL')) {
                eventos.splice(i, 1)
                break
            }
        }
        guardarEventos()
    }
    else if (ultima.tipo === 'evento') {
        const index = eventos.findIndex(e => 
            e.dni === ultima.dni && 
            e.accion === ultima.accion && 
            e.tiempo === ultima.tiempo
        )
        if (index !== -1) {
            eventos.splice(index, 1)
            guardarEventos()
        }
    }
    else if (ultima.tipo === 'eventoEquipo') {
        const index = eventos.findIndex(e => 
            e.accion === ultima.accion && 
            e.tiempo === ultima.tiempo &&
            e.esEquipo === true
        )
        if (index !== -1) {
            eventos.splice(index, 1)
            guardarEventos()
        }
    }
    else if (ultima.tipo === 'tarjeta') {
        if (ultima.subtipo === 'amarilla') {
            amarillas = amarillas.filter(a => a.dni !== ultima.dni)
            
            const boton = document.querySelector(`#jugadores button[data-dni='${ultima.dni}']`)
            if (boton) {
                boton.style.setProperty('background', '#43a047', 'important')
                boton.style.setProperty('color', 'white', 'important')
                boton.disabled = false
            }
        } else if (ultima.subtipo === 'roja') {
            rojas = rojas.filter(r => r.dni !== ultima.dni)
            
            const boton = document.querySelector(`#jugadores button[data-dni='${ultima.dni}']`)
            if (boton && !amarillas.some(a => a.dni === ultima.dni && a.regreso > segundos)) {
                boton.style.setProperty('background', '#43a047', 'important')
                boton.style.setProperty('color', 'white', 'important')
                boton.disabled = false
            }
        }
        
        for (let i = eventos.length - 1; i >= 0; i--) {
            if (eventos[i].accion && eventos[i].accion.includes(ultima.subtipo === 'amarilla' ? '🟨' : '🟥') && 
                eventos[i].dni === ultima.dni) {
                eventos.splice(i, 1)
                break
            }
        }
        guardarEventos()
        actualizarColoresBotones()
        actualizarAmarillas()
    }
    
    actualizarColoresBotones()
    actualizarAmarillas()
}

// ===== VARIABLES GLOBALES PARA ESTADÍSTICAS =====
// historialPartidos y su carga desde localStorage ya están en storage.js

// ===== FUNCIONES DE NAVEGACIÓN =====
function mostrarEstadisticas() {
    // Guardar qué pantalla estaba visible para volver
    if (document.getElementById('pantallaPartido').style.display === 'block') {
        window.pantallaAnterior = 'partido'
    } else if (document.getElementById('pantallaConfig').style.display === 'block') {
        window.pantallaAnterior = 'config'
    } else {
        window.pantallaAnterior = 'config' // Por defecto
    }
    
    // Ocultar pantallas principales
    document.getElementById('pantallaConfig').style.display = 'none'
    document.getElementById('pantallaPartido').style.display = 'none'
    document.getElementById('pantallaEstadisticas').style.display = 'block'
    
    // Inicializar la pestaña Actual
    activarPestana('actual')
}

function volverDeEstadisticas() {
    document.getElementById('pantallaEstadisticas').style.display = 'none'
    
    if (window.pantallaAnterior === 'partido') {
        document.getElementById('pantallaPartido').style.display = 'block'
        // Restaurar colores de los botones al volver
        setTimeout(() => {
            actualizarColoresBotones()
            actualizarAmarillas()
        }, 50)
    } else {
        document.getElementById('pantallaConfig').style.display = 'block'
        reajustarPantallaConfig()
    }
}

// ===== CAMBIO DE PESTAÑAS =====
function cambiarTabStats(tab, event) {
    // Solo actualizamos la pestaña, la función activarPestana hace todo
    activarPestana(tab)
}

function activarPestana(tab) {
    // Remover clase active de todos los botones
    document.querySelectorAll('.stats-tabs button').forEach(btn => {
        btn.classList.remove('tab-active')
    })
    
    // Agregar clase active al botón correspondiente
    const botones = document.querySelectorAll('.stats-tabs button')
    let indice = 0
    
    if (tab === 'actual') indice = 0
    else if (tab === 'historial') indice = 1
    else if (tab === 'jugadores') indice = 2
    
    if (botones[indice]) {
        botones[indice].classList.add('tab-active')
    }
    
    // Ocultar todos los contenidos
    document.getElementById('statsActual').style.display = 'none'
    document.getElementById('statsHistorial').style.display = 'none'
    document.getElementById('statsJugadores').style.display = 'none'
    
    // Mostrar el seleccionado y cargar datos
    if (tab === 'actual') {
        document.getElementById('statsActual').style.display = 'block'
        cargarEstadisticasActual()
    } else if (tab === 'historial') {
        document.getElementById('statsHistorial').style.display = 'block'
        cargarHistorial()
    } else if (tab === 'jugadores') {
        document.getElementById('statsJugadores').style.display = 'block'
        cargarEstadisticasJugadores()
    }
}

function reajustarPantallaConfig() {
    // Pequeño retraso para asegurar que la pantalla ya está visible
    setTimeout(() => {
        const config = document.getElementById('pantallaConfig')
        const tabla = document.getElementById('tablaJugadores')
        const header = document.querySelector('.headerConfig')
        const botones = document.querySelector('.botones')
        
        // Si algún elemento no existe, salir
        if (!config || !tabla || !header || !botones) return
        
        // Calcular altura disponible
        const alturaTotal = config.clientHeight
        const alturaHeader = header.offsetHeight
        const alturaBotones = botones.offsetHeight
        const alturaDisponible = alturaTotal - alturaHeader - alturaBotones - 20
        
        // Solo aplicar si la altura es válida
        if (alturaDisponible > 0) {
            tabla.style.height = alturaDisponible + 'px'
            tabla.style.maxHeight = alturaDisponible + 'px'
        }
        
        // Resetear scroll al inicio
        tabla.scrollTop = 0
        
        // Forzar reflow
        void tabla.offsetHeight
    }, 50)
}

function sincronizarEstadoPartido() {
    // Actualizar el texto del botón según el estado del cronómetro
    actualizarBotonInicio()
    
    // Actualizar la info del partido (por si cambió equipo/rival)
    document.getElementById("infoPartido").innerText = equipoActual + " vs " + rivalActual
    
    // Actualizar los botones de jugadores (por si cambió el modo)
    crearJugadores()
}

// ===== ESTADÍSTICAS DEL PARTIDO ACTUAL =====
function cargarEstadisticasActual() {
    if (!partidoIniciado || !partidoID) {
        document.getElementById('statsActual').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                ⚠️ No hay partido en curso<br>
                <small>Inicia un partido para ver estadísticas</small>
            </div>
        `
        return
    }
    
    if (!titulares || titulares.length === 0) {
        document.getElementById('statsActual').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                ⚠️ No hay jugadores en el partido<br>
                <small>Selecciona los titulares antes de iniciar</small>
            </div>
        `
        return
    }
    
    const eventosPartido = eventos.filter(e => e.partido === partidoID)
    
    // Calcular estadísticas con NUEVAS ACCIONES
    const stats = {
        // Puntos
        tries: eventosPartido.filter(e => e.accion === 'Try').length,
        conversionesOK: eventosPartido.filter(e => e.accion === 'Conversión ➕').length,
        conversionesMal: eventosPartido.filter(e => e.accion === 'Conversión ➖').length,
        drops: eventosPartido.filter(e => e.accion === 'Drop').length,
        
        // Tackles y quiebres
        tacklesPos: eventosPartido.filter(e => e.accion === 'Tackle ➕').length,
        tacklesNeg: eventosPartido.filter(e => e.accion === 'Tackle ➖').length,
        quiebres: eventosPartido.filter(e => e.accion === 'Quiebre').length,
        
        // Pelota
        perdidas: eventosPartido.filter(e => e.accion === '🏉 Perdida').length,
        recuperadas: eventosPartido.filter(e => e.accion === '🏉 Recuperada').length,
        
        // NUEVAS ACCIONES
        penal: eventosPartido.filter(e => e.accion === 'Penal').length,
        linesPos: eventosPartido.filter(e => e.accion === 'Line ➕').length,
        linesNeg: eventosPartido.filter(e => e.accion === 'Line ➖').length,
        linesRob: eventosPartido.filter(e => e.accion === 'Line Robado').length,
        scrumsPos: eventosPartido.filter(e => e.accion === 'Scrum ➕').length,
        scrumsNeg: eventosPartido.filter(e => e.accion === 'Scrum ➖').length,
        
        // Tarjetas
        amarillas: eventosPartido.filter(e => e.accion === 'Tarjeta 🟨').length,
        rojas: eventosPartido.filter(e => e.accion === 'Tarjeta 🟥').length
    }
    
    const puntos = (stats.tries * 5) + (stats.conversionesOK * 2) + (stats.drops * 3)
    const tiempoActual = document.getElementById('cronometro').innerText
    
    let html = `
        <div class="stats-info-partido">
            <div class="stats-equipo-nombre">
                <strong>${equipoActual || 'Mi equipo'}</strong> vs <strong>${rivalActual || 'Rival'}</strong>
            </div>
            <div class="stats-tiempo">
                ⏱️ Tiempo: ${tiempoActual}
            </div>
        </div>
        
        <div class="stats-resumen">
            <div class="stats-card">
                <div class="numero">${stats.tries}</div>
                <div class="etiqueta">Tries</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.conversionesOK}</div>
                <div class="etiqueta">Conversiones</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.penal}</div>
                <div class="etiqueta">Penales</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.tacklesPos}</div>
                <div class="etiqueta">Tackles +</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.quiebres}</div>
                <div class="etiqueta">Quiebres</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.scrumsPos}</div>
                <div class="etiqueta">Scrums +</div>
            </div>
        </div>
        
        <h3>Acciones del partido</h3>
        <table class="stats-tabla">
            <thead>
                <tr><th>Acción</th><th>Cantidad</th></tr>
            </thead>
            <tbody>
                <tr><td>Tries</td><td class="destacado">${stats.tries}</td></tr>
                <tr><td>Conversiones +</td><td>${stats.conversionesOK}</td></tr>
                <tr><td>Conversiones -</td><td>${stats.conversionesMal}</td></tr>
                <tr><td>Drops</td><td>${stats.drops}</td></tr>
                <tr><td>Tackles +</td><td>${stats.tacklesPos}</td></tr>
                <tr><td>Tackles -</td><td>${stats.tacklesNeg}</td></tr>
                <tr><td>Quiebres</td><td>${stats.quiebres}</td></tr>
                <tr><td>Penales</td><td>${stats.penal}</td></tr>
                <tr><td>Pérdidas</td><td>${stats.perdidas}</td></tr>
                <tr><td>Recuperadas</td><td>${stats.recuperadas}</td></tr>
                <tr><td>Line +</td><td>${stats.linesPos}</td></tr>
                <tr><td>Line -</td><td>${stats.linesNeg}</td></tr>
                <tr><td>Line Robado</td><td>${stats.linesRob}</td></tr>
                <tr><td>Scrum +</td><td>${stats.scrumsPos}</td></tr>
                <tr><td>Scrum -</td><td>${stats.scrumsNeg}</td></tr>
                <tr><td>Tarjetas Amarillas</td><td style="color: #d32f2f;">${stats.amarillas}</td></tr>
                <tr><td>Tarjetas Rojas</td><td style="color: #d32f2f;">${stats.rojas}</td></tr>
            </tbody>
        </table>
        
        ${eventosPartido.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: #999; margin-top: 20px;">
                ℹ️ Aún no hay eventos registrados
            </div>
        ` : ''}
    `
    
    document.getElementById('statsActual').innerHTML = html
}

// ===== HISTORIAL DE PARTIDOS =====
function cargarHistorial() {
    // Solo mostrar partidos finalizados (el activo, con finalizado:false, no aparece aquí)
    const finalizados = historialPartidos.filter(p => p.finalizado === true)
    
    if (finalizados.length === 0) {
        document.getElementById('statsHistorial').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                No hay partidos guardados
            </div>
        `
        return
    }
    
    // Ordenar del más reciente al más antiguo
    const historialOrdenado = [...finalizados].sort((a, b) =>
        new Date(b.fecha) - new Date(a.fecha)
    )
    
    let html = '<div class="historial-lista">'
    
    historialOrdenado.forEach((partido) => {
        const puntos = (partido.tries * 5) + (partido.conversionesOK * 2) + (partido.drops * 3)
        
        html += `
            <div class="historial-item" data-partido-id="${partido.id}">
                <div class="fecha">${partido.fechaLegible ? partido.fechaLegible.split(',')[0] : partido.fecha.split('T')[0]}</div>
                <div class="partido">${partido.equipo} vs ${partido.rival}</div>
                <div class="resultado">${puntos} puntos (${partido.tries} tries)</div>
                <div class="duracion">⏱️ ${partido.duracionLegible || Math.floor(partido.duracion / 60) + ':' + String(partido.duracion % 60).padStart(2, '0')}</div>
                <div class="acciones">
                    <button class="ver-detalle" onclick="verDetallePartido('${partido.id}')">Ver detalle</button>
                    <button onclick="exportarPartido('${partido.id}')">Exportar</button>
                    <button class="borrar-partido" onclick="confirmarBorrarPartido('${partido.id}')">🗑️ Borrar</button>
                </div>
            </div>
        `
    })
    
    html += '</div>'
    document.getElementById('statsHistorial').innerHTML = html
}

function confirmarBorrarPartido(partidoId) {
    // Buscar el partido para mostrar información en la confirmación
    const partido = historialPartidos.find(p => p.id === partidoId)
    if (!partido) {
        alert("No se encontró el partido")
        return
    }
    
    const nombrePartido = `${partido.equipo || '?'} vs ${partido.rival || '?'}`
    const fecha = partido.fechaLegible || partido.fecha
    
    // Primera confirmación
    const primeraConfirmacion = confirm(`¿Eliminar partido?\n\n${nombrePartido}\n${fecha}\n\nEsta acción no se puede deshacer.`)
    
    if (!primeraConfirmacion) return
    
    // Segunda confirmación (irreversible)
    const segundaConfirmacion = confirm(`⚠️ CONFIRMACIÓN FINAL ⚠️\n\nEl partido "${nombrePartido}" será eliminado permanentemente.\n\n¿Estás ABSOLUTAMENTE SEGURO?`)
    
    if (!segundaConfirmacion) return
    
    // Borrar el partido
    borrarPartido(partidoId)
}

function borrarPartido(partidoId) {
    // Filtrar el partido a eliminar
    const nuevoHistorial = historialPartidos.filter(p => p.id !== partidoId)
    
    if (nuevoHistorial.length === historialPartidos.length) {
        alert("No se encontró el partido para eliminar")
        return
    }
    
    // Actualizar la variable global y persistir mediante storage.js
    historialPartidos = nuevoHistorial
    guardarEventos()
    
    console.log(`Partido ${partidoId} eliminado. Restan ${historialPartidos.length} partidos`)
    
    // Refrescar la vista del historial
    cargarHistorial()
    
    // También refrescar estadísticas de jugadores si están abiertas
    if (document.getElementById('statsJugadores').style.display === 'block') {
        cargarEstadisticasJugadores()
    }
    
    // Mostrar mensaje de confirmación
    // alert("✅ Partido eliminado correctamente")
}

let subtabJugadoresActiva = 'actual'

// ===== ESTADÍSTICAS POR JUGADOR =====
function cargarEstadisticasJugadores() {
    console.log('cargarEstadisticasJugadores ejecutándose')  // Debug
    
    // Crear estructura con subpestañas
    let html = `
        <div class="stats-subtabs">
            <button class="subtab-active" onclick="cambiarSubtabJugadores('actual')">📊 Partido Actual</button>
            <button onclick="cambiarSubtabJugadores('historico')">🏆 Histórico Acumulado</button>
        </div>
        <div id="subtabActualJugadores"></div>
        <div id="subtabHistoricoJugadores" style="display:none"></div>
    `
    
    document.getElementById('statsJugadores').innerHTML = html
    console.log('HTML de subpestañas insertado')  // Debug
    
    // Cargar la subtab activa por defecto
    if (typeof subtabJugadoresActiva === 'undefined') {
        window.subtabJugadoresActiva = 'actual'
    }
    
    if (subtabJugadoresActiva === 'actual') {
        cargarEstadisticasJugadoresActual()
    } else {
        cargarEstadisticasJugadoresHistorico()
    }
}

function cambiarSubtabJugadores(tab) {
    console.log('cambiarSubtabJugadores:', tab)  // Debug
    
    window.subtabJugadoresActiva = tab
    
    // Actualizar clases de los botones
    const botones = document.querySelectorAll('.stats-subtabs button')
    botones.forEach(btn => {
        btn.classList.remove('subtab-active')
    })
    
    if (tab === 'actual') {
        botones[0].classList.add('subtab-active')
        document.getElementById('subtabActualJugadores').style.display = 'block'
        document.getElementById('subtabHistoricoJugadores').style.display = 'none'
        cargarEstadisticasJugadoresActual()
    } else {
        botones[1].classList.add('subtab-active')
        document.getElementById('subtabActualJugadores').style.display = 'none'
        document.getElementById('subtabHistoricoJugadores').style.display = 'block'
        cargarEstadisticasJugadoresHistorico()
    }
}

function cargarEstadisticasJugadoresHistorico() {
    // Todos los partidos (finalizados y el activo) están en historialPartidos
    const hayDatos = historialPartidos.some(p => p.eventos && p.eventos.length > 0)
    if (!hayDatos) {
        document.getElementById('subtabHistoricoJugadores').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                No hay datos históricos disponibles<br>
                <small>Finaliza partidos para ver estadísticas acumuladas</small>
            </div>
        `
        return
    }
    
    // Recopilar todos los eventos de todos los partidos.
    // El partido activo ya está en historialPartidos (finalizado: false),
    // por lo que NO hay que agregar 'eventos' por separado.
    let todosLosEventos = []
    historialPartidos.forEach(partido => {
        if (partido.eventos && partido.eventos.length > 0) {
            todosLosEventos.push(...partido.eventos)
        }
    })
    
    // Inicializar estadísticas con todos los jugadores
    const statsJugadores = {}
    
    jugadores.forEach(j => {
        statsJugadores[j.dni] = {
            nombre: j.apodo,
            numero: j.camiseta || '-',
            tries: 0,
            tacklesPos: 0,
            tacklesNeg: 0,
            quiebres: 0,
            penales: 0,
            perdidas: 0,
            recuperadas: 0,
            drops: 0,
            conversionesOK: 0,
            conversionesMal: 0,
            amarillas: 0,
            rojas: 0,
            partidosJugados: 0
        }
    })
    
    // Procesar eventos y contar partidos jugados
    const partidosPorJugador = {}
    
    todosLosEventos.forEach(e => {
        if (statsJugadores[e.dni]) {
            // Contar partidos jugados (un partido por combinación dni+partido)
            const clave = `${e.dni}_${e.partido}`
            if (!partidosPorJugador[clave]) {
                partidosPorJugador[clave] = true
                statsJugadores[e.dni].partidosJugados++
            }
            
            // Sumar estadísticas
            if (e.accion === 'Try') statsJugadores[e.dni].tries++
            else if (e.accion === 'Tackle ➕') statsJugadores[e.dni].tacklesPos++
            else if (e.accion === 'Tackle ➖') statsJugadores[e.dni].tacklesNeg++
            else if (e.accion === 'Quiebre') statsJugadores[e.dni].quiebres++
            else if (e.accion === 'Penal') statsJugadores[e.dni].penales++
            else if (e.accion === '🏉 Perdida') statsJugadores[e.dni].perdidas++
            else if (e.accion === '🏉 Recuperada') statsJugadores[e.dni].recuperadas++
            else if (e.accion === 'Drop') statsJugadores[e.dni].drops++
            else if (e.accion === 'Conversión ➕') statsJugadores[e.dni].conversionesOK++
            else if (e.accion === 'Conversión ➖') statsJugadores[e.dni].conversionesMal++
            else if (e.accion === 'Tarjeta 🟨') statsJugadores[e.dni].amarillas++
            else if (e.accion === 'Tarjeta 🟥') statsJugadores[e.dni].rojas++
        }
    })
    
    // Calcular puntos y filtrar jugadores con participación
    const jugadoresConDatos = Object.values(statsJugadores)
        .filter(j => j.partidosJugados > 0 || j.tries > 0 || j.tacklesPos > 0)
        .map(j => ({
            ...j,
            puntos: (j.tries * 5) + (j.conversionesOK * 2) + (j.drops * 3)
        }))
        .sort((a, b) => b.puntos - a.puntos)
    
    if (jugadoresConDatos.length === 0) {
        document.getElementById('subtabHistoricoJugadores').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                No hay estadísticas acumuladas
            </div>
        `
        return
    }
    
    // Contar total de partidos (el activo ya está incluido en historialPartidos)
    const totalPartidos = historialPartidos.length
    
    // Generar tabla
    let tablaHtml = `
        <div style="overflow-x: auto;">
            <table class="stats-tabla" style="min-width: 750px;">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jugador</th>
                        <th>Pts</th>
                        <th>PJ</th>
                        <th>Try</th>
                        <th>Tk+</th>
                        <th>Tk-</th>
                        <th>Pe</th>
                        <th>Q</th>
                        <th>PP</th>
                        <th>PR</th>
                        <th>D</th>
                        <th>Cv+</th>
                        <th>Cv-</th>
                        <th>🟨</th>
                        <th>🟥</th>
                    </tr>
                </thead>
                <tbody>
    `
    
    jugadoresConDatos.forEach(j => {
        tablaHtml += `
             <tr>
                <td style="text-align: center;">${j.numero || '-'}</td>
                <td style="text-align: left;">${j.nombre}</td>
                <td style="text-align: center; font-weight: bold; color: #1b5e20;">${j.puntos}</td>
                <td style="text-align: center;">${j.partidosJugados}</td>
                <td style="text-align: center;">${j.tries}</td>
                <td style="text-align: center;">${j.tacklesPos}</td>
                <td style="text-align: center;">${j.tacklesNeg}</td>
                <td style="text-align: center;">${j.penales}</td>
                <td style="text-align: center;">${j.quiebres}</td>
                <td style="text-align: center;">${j.perdidas}</td>
                <td style="text-align: center;">${j.recuperadas}</td>
                <td style="text-align: center;">${j.drops}</td>
                <td style="text-align: center;">${j.conversionesOK}</td>
                <td style="text-align: center;">${j.conversionesMal}</td>
                <td style="text-align: center; color: ${j.amarillas > 0 ? '#d32f2f' : 'inherit'};">${j.amarillas}</td>
                <td style="text-align: center; color: ${j.rojas > 0 ? '#d32f2f' : 'inherit'};">${j.rojas}</td>
             </tr>
        `
    })
    
    tablaHtml += `
                </tbody>
             </table>
        </div>
        <div style="text-align: center; font-size: 11px; color: #666; margin-top: 10px;">
            📊 Estadísticas acumuladas de ${totalPartidos} partido${totalPartidos !== 1 ? 's' : ''}
        </div>
    `
    
    document.getElementById('subtabHistoricoJugadores').innerHTML = tablaHtml
}

function cargarEstadisticasJugadoresActual() {
    if (!partidoIniciado || titulares.length === 0) {
        document.getElementById('subtabActualJugadores').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                No hay partido en curso
            </div>
        `
        return
    }
    
    const eventosPartido = eventos.filter(e => e.partido === partidoID)
    
    const statsJugadores = {}
    
    titulares.forEach(j => {
        statsJugadores[j.dni] = {
            nombre: j.apodo,
            numero: j.numero,
            tries: 0,
            tacklesPos: 0,
            tacklesNeg: 0,
            quiebres: 0,
            penales: 0,
            perdidas: 0,
            recuperadas: 0,
            drops: 0,
            conversionesOK: 0,
            conversionesMal: 0,
            amarillas: 0,
            rojas: 0
        }
    })
    
    eventosPartido.forEach(e => {
        if (statsJugadores[e.dni]) {
            if (e.accion === 'Try') statsJugadores[e.dni].tries++
            else if (e.accion === 'Tackle ➕') statsJugadores[e.dni].tacklesPos++
            else if (e.accion === 'Tackle ➖') statsJugadores[e.dni].tacklesNeg++
            else if (e.accion === 'Quiebre') statsJugadores[e.dni].quiebres++
            else if (e.accion === 'Penal') statsJugadores[e.dni].penales++
            else if (e.accion === '🏉 Perdida') statsJugadores[e.dni].perdidas++
            else if (e.accion === '🏉 Recuperada') statsJugadores[e.dni].recuperadas++
            else if (e.accion === 'Drop') statsJugadores[e.dni].drops++
            else if (e.accion === 'Conversión ➕') statsJugadores[e.dni].conversionesOK++
            else if (e.accion === 'Conversión ➖') statsJugadores[e.dni].conversionesMal++
            else if (e.accion === 'Tarjeta 🟨') statsJugadores[e.dni].amarillas++
            else if (e.accion === 'Tarjeta 🟥') statsJugadores[e.dni].rojas++
        }
    })
    
    const jugadoresOrdenados = Object.values(statsJugadores)
        .sort((a, b) => b.tries - a.tries)
    
    let html = `
        <div style="max-height: 500px; overflow-y: auto;">
            <table class="stats-tabla">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jugador</th>
                        <th>Try</th>
                        <th>Tk+</th>
                        <th>Tk-</th>
                        <th>Pe</th>
                        <th>Q</th>
                        <th>PP</th>
                        <th>PR</th>
                        <th>D</th>
                        <th>Cv+</th>
                        <th>Cv-</th>
                        <th>🟨</th>
                        <th>🟥</th>
                     </thead>
                <tbody>
    `
    
    jugadoresOrdenados.forEach(j => {
        html += `
            <tr>
                <td style="text-align: center;">${j.numero || '-'} </td>
                <td style="text-align: left;">${j.nombre} </td>
                <td style="text-align: center; font-weight: bold; color: #1b5e20;">${j.tries} </td>
                <td style="text-align: center;">${j.tacklesPos} </td>
                <td style="text-align: center;">${j.tacklesNeg} </td>
                <td style="text-align: center;">${j.penales}</td>
                <td style="text-align: center;">${j.quiebres} </td>
                <td style="text-align: center;">${j.perdidas} </td>
                <td style="text-align: center;">${j.recuperadas} </td>
                <td style="text-align: center;">${j.drops} </td>
                <td style="text-align: center;">${j.conversionesOK} </td>
                <td style="text-align: center;">${j.conversionesMal} </td>
                <td style="text-align: center; color: ${j.amarillas > 0 ? '#d32f2f' : 'inherit'};">${j.amarillas} </td>
                <td style="text-align: center; color: ${j.rojas > 0 ? '#d32f2f' : 'inherit'};">${j.rojas} </td>
             </tr>
        `
    })
    
    html += `
                </tbody>
             </table>
        </div>
    `
    
    // IMPORTANTE: Actualizar subtabActualJugadores, NO statsJugadores
    document.getElementById('subtabActualJugadores').innerHTML = html
}

// ===== GUARDAR PARTIDO EN HISTORIAL =====
function guardarPartidoEnHistorial() {
    if (!partidoIniciado || titulares.length === 0) return

    if (!partidoActual || !partidoActual.eventos) {
        console.warn('No hay datos del partido actual para guardar')
        return
    }
    
    // El partido ya está en historialPartidos desde iniciarPartido().
    // Solo actualizamos los campos de resumen y marcamos como finalizado.
    const eventosPartido = partidoActual.eventos
    
    partidoActual.duracion        = segundos
    partidoActual.duracionLegible = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
    partidoActual.tries           = eventosPartido.filter(e => e.accion === 'Try').length
    partidoActual.conversionesOK  = eventosPartido.filter(e => e.accion === 'Conversión ➕').length
    partidoActual.penales         = eventosPartido.filter(e => e.accion === 'Penal').length
    partidoActual.tacklesPos      = eventosPartido.filter(e => e.accion === 'Tackle ➕').length
    partidoActual.finalizado      = true
    partidoActual.finalizadoEn    = new Date().toISOString()
    
    guardarEventos()  // persiste historialPartidos completo
    console.log('Partido finalizado en historial:', partidoActual.id)
}

// ===== VER DETALLE DE PARTIDO HISTÓRICO =====
function verDetallePartido(partidoId) {
    if (!partidoId) {
        console.error('partidoId es undefined')
        alert('Error: No se pudo identificar el partido')
        return
    }
    
    const partido = historialPartidos.find(p => p.id === partidoId)
    if (!partido) {
        console.error('Partido no encontrado con ID:', partidoId)
        alert("No se encontró el partido")
        return
    }
    
    const eventosPartido = partido.eventos || []
    
    const stats = {
        tries: eventosPartido.filter(e => e.accion === 'Try').length,
        conversionesOK: eventosPartido.filter(e => e.accion === 'Conversión ➕').length,
        conversionesMal: eventosPartido.filter(e => e.accion === 'Conversión ➖').length,
        drops: eventosPartido.filter(e => e.accion === 'Drop').length,
        tacklesPos: eventosPartido.filter(e => e.accion === 'Tackle ➕').length,
        tacklesNeg: eventosPartido.filter(e => e.accion === 'Tackle ➖').length,
        quiebres: eventosPartido.filter(e => e.accion === 'Quiebre').length,
        penales: eventosPartido.filter(e => e.accion === 'Penal').length,
        perdidas: eventosPartido.filter(e => e.accion === '🏉 Perdida').length,
        recuperadas: eventosPartido.filter(e => e.accion === '🏉 Recuperada').length,
        linesPos: eventosPartido.filter(e => e.accion === 'Line ➕').length,
        linesNeg: eventosPartido.filter(e => e.accion === 'Line ➖').length,
        linesRob: eventosPartido.filter(e => e.accion === 'Line Robado').length,
        scrumsPos: eventosPartido.filter(e => e.accion === 'Scrum ➕').length,
        scrumsNeg: eventosPartido.filter(e => e.accion === 'Scrum ➖').length,
        amarillas: eventosPartido.filter(e => e.accion === 'Tarjeta 🟨').length,
        rojas: eventosPartido.filter(e => e.accion === 'Tarjeta 🟥').length
    }
    
    const puntosPropio = partido.puntosPropio || 0
    const puntosRival = partido.puntosRival || 0
    
    // Generar filas de la tabla
    let filasTabla = `
        <tr><td>Tries</td><td class="destacado">${stats.tries}</td></tr>
        <tr><td>Conversiones +</td><td>${stats.conversionesOK}</td></tr>
        <tr><td>Conversiones -</td><td>${stats.conversionesMal}</td></tr>
        <tr><td>Drops/Penal</td><td>${stats.drops}</td></tr>
        <tr><td>Tackles +</td><td>${stats.tacklesPos}</td></tr>
        <tr><td>Tackles -</td><td>${stats.tacklesNeg}</td></tr>
        <tr><td>Quiebres</td><td>${stats.quiebres}</td></tr>
        <tr><td>Penales</td><td>${stats.penales}</td></tr>
        <tr><td>Pérdidas</td><td>${stats.perdidas}</td></tr>
        <tr><td>Recuperadas</td><td>${stats.recuperadas}</td></tr>
        <tr><td>Line +</td><td>${stats.linesPos}</td></tr>
        <tr><td>Line -</td><td>${stats.linesNeg}</td></tr>
        <tr><td>Line Robado</td><td>${stats.linesRob}</td></tr>
        <tr><td>Scrum +</td><td>${stats.scrumsPos}</td></tr>
        <tr><td>Scrum -</td><td>${stats.scrumsNeg}</td></tr>
        <tr><td>Tarjetas Amarillas</td><td style="color: #d32f2f;">${stats.amarillas}</td></tr>
        <tr><td>Tarjetas Rojas</td><td style="color: #d32f2f;">${stats.rojas}</td></tr>
    `
    
    const modalHtml = `
        <div id="modalDetallePartido" class="modal-overlay">
            <div class="modal-contenido">
                <div class="modal-header">
                    <h3>${partido.equipo} vs ${partido.rival}</h3>
                    <button class="modal-cerrar" onclick="cerrarModalDetalle()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="modal-info">
                        <div>📅 ${partido.fechaLegible || partido.fecha}</div>
                        <div>⏱️ Duración: ${partido.duracionLegible || Math.floor(partido.duracion / 60) + ':' + String(partido.duracion % 60).padStart(2, '0')}</div>
                        <div class="modal-marcador">
                            <span class="propio">${puntosPropio}</span> - <span class="rival">${puntosRival}</span>
                        </div>
                    </div>
                    
                    <div class="stats-resumen">
                        <div class="stats-card">
                            <div class="numero">${stats.tries}</div>
                            <div class="etiqueta">Tries</div>
                        </div>
                        <div class="stats-card">
                            <div class="numero">${stats.conversionesOK}</div>
                            <div class="etiqueta">Conversiones</div>
                        </div>
                        <div class="stats-card">
                            <div class="numero">${stats.penales}</div>
                            <div class="etiqueta">Penales</div>
                        </div>
                        <div class="stats-card">
                            <div class="numero">${stats.tacklesPos}</div>
                            <div class="etiqueta">Tackles +</div>
                        </div>
                        <div class="stats-card">
                            <div class="numero">${stats.quiebres}</div>
                            <div class="etiqueta">Quiebres</div>
                        </div>
                        <div class="stats-card">
                            <div class="numero">${stats.scrumsPos}</div>
                            <div class="etiqueta">Scrum +</div>
                        </div>
                    </div>
                    
                    <h4>Acciones del partido</h4>
                    <table class="stats-tabla">
                        <thead>
                            <tr>
                                <th>Acción</th>
                                <th>Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasTabla}
                        </tbody>
                    </table>
                    
                    <button class="btn-ver-jugadores" onclick="verJugadoresPartido('${partido.id}')">👥 Ver jugadores del partido</button>
                </div>
            </div>
        </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHtml)
}

function cerrarModalDetalle() {
    const modal = document.getElementById('modalDetallePartido')
    if (modal) modal.remove()
}

// ===== MODIFICAR FINALIZAR PARTIDO PARA GUARDAR HISTORIAL =====
function finalizarPartido() {
    if (!confirm("Finalizar partido?")) return
    
    // Guardar puntos en partidoActual antes de guardar
    partidoActual.puntosPropio = puntosPropio
    partidoActual.puntosRival = puntosRival
    
    guardarPartidoEnHistorial()
    
    corriendo = false
    segundos = 0
    amarillas = []
    rojas = []
    puntosPropio = 0
    puntosRival = 0
    historialAcciones = []
    
    document.getElementById("cronometro").innerText = "00:00"
    document.getElementById("amarillas").innerHTML = ""
    document.getElementById("puntosPropio").innerText = "0"
    document.getElementById("puntosRival").innerText = "0"
    // Limpiar historial visual al finalizar
    historialAccionesVisual = []
    actualizarHistorialVisual()

    // ===== DESBLOQUEAR Y LIMPIAR INPUTS =====
    const equipoInput = document.getElementById("equipo")
    const rivalInput = document.getElementById("rival")
    const sheetInput = document.getElementById("sheetID")
    
    equipoInput.disabled = false
    rivalInput.disabled = false
    sheetInput.disabled = false
    
    // Limpiar los campos para el próximo partido
    equipoInput.value = ""
    rivalInput.value = ""
    partidoEnCurso = false
    // ===== FIN LIMPIEZA =====
    
    mostrarPantallaConfig()
    document.getElementById("btnComenzar").innerText = "Comenzar"
    
    partidoFinalizado = true
    partidoIniciado = false
}

function verJugadoresPartido(partidoId) {
    console.log('verJugadoresPartido llamado con ID:', partidoId)
    
    const partido = historialPartidos.find(p => p.id === partidoId)
    if (!partido) {
        console.error('Partido no encontrado:', partidoId)
        alert("No se encontró el partido")
        return
    }
    
    const eventosPartido = partido.eventos || []
    
    // Obtener jugadores únicos que participaron
    const jugadoresUnicos = {}
    
    eventosPartido.forEach(e => {
        if (e.dni && !jugadoresUnicos[e.dni]) {
            const jugador = jugadores.find(j => j.dni == e.dni)
            jugadoresUnicos[e.dni] = {
                dni: e.dni,
                apodo: jugador ? jugador.apodo : 'Desconocido',
                numero: jugador ? jugador.camiseta : '-'
            }
        }
    })
    
    // Calcular estadísticas por jugador
    const statsJugadores = {}
    
    Object.keys(jugadoresUnicos).forEach(dni => {
        statsJugadores[dni] = {
            ...jugadoresUnicos[dni],
            tries: 0,
            tacklesPos: 0,
            tacklesNeg: 0,
            quiebres: 0,
            penales: 0,
            perdidas: 0,
            recuperadas: 0,
            drops: 0,
            conversionesOK: 0,
            conversionesMal: 0,
            amarillas: 0,
            rojas: 0
        }
    })
    
    eventosPartido.forEach(e => {
        if (statsJugadores[e.dni]) {
            if (e.accion === 'Try') statsJugadores[e.dni].tries++
            else if (e.accion === 'Tackle ➕') statsJugadores[e.dni].tacklesPos++
            else if (e.accion === 'Tackle ➖') statsJugadores[e.dni].tacklesNeg++
            else if (e.accion === 'Quiebre') statsJugadores[e.dni].quiebres++
            else if (e.accion === 'Penal') statsJugadores[e.dni].penales++
            else if (e.accion === '🏉 Perdida') statsJugadores[e.dni].perdidas++
            else if (e.accion === '🏉 Recuperada') statsJugadores[e.dni].recuperadas++
            else if (e.accion === 'Drop') statsJugadores[e.dni].drops++
            else if (e.accion === 'Conversión ➕') statsJugadores[e.dni].conversionesOK++
            else if (e.accion === 'Conversión ➖') statsJugadores[e.dni].conversionesMal++
            else if (e.accion === 'Tarjeta 🟨') statsJugadores[e.dni].amarillas++
            else if (e.accion === 'Tarjeta 🟥') statsJugadores[e.dni].rojas++
        }
    })
    
    const jugadoresOrdenados = Object.values(statsJugadores)
        .sort((a, b) => b.tries - a.tries)
    
    let jugadoresHtml = `
        <div style="max-height: 400px; overflow-y: auto; width: 100%;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #1b5e20; color: white; position: sticky; top: 0;">
                        <th style="padding: 8px;">#</th>
                        <th style="padding: 8px;">Jugador</th>
                        <th style="padding: 8px;">Try</th>
                        <th style="padding: 8px;">Tk+</th>
                        <th style="padding: 8px;">Tk-</th>
                        <th style="padding: 8px;">Pe</th>
                        <th style="padding: 8px;">Q</th>
                        <th style="padding: 8px;">PP</th>
                        <th style="padding: 8px;">PR</th>
                        <th style="padding: 8px;">D</th>
                        <th style="padding: 8px;">Cv+</th>
                        <th style="padding: 8px;">Cv-</th>
                        <th style="padding: 8px;">🟨</th>
                        <th style="padding: 8px;">🟥</th>
                     </tr>
                </thead>
                <tbody>
    `
    
    jugadoresOrdenados.forEach(j => {
        jugadoresHtml += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; text-align: center;">${j.numero || '-'}</td>
                <td style="padding: 8px; text-align: left;">${j.apodo}</td>
                <td style="padding: 8px; text-align: center; font-weight: bold; color: #1b5e20;">${j.tries}</td>
                <td style="padding: 8px; text-align: center;">${j.tacklesPos}</td>
                <td style="padding: 8px; text-align: center;">${j.tacklesNeg}</td>
                <td style="padding: 8px; text-align: center;">${j.penales}</td>
                <td style="padding: 8px; text-align: center;">${j.quiebres}</td>
                <td style="padding: 8px; text-align: center;">${j.perdidas}</td>
                <td style="padding: 8px; text-align: center;">${j.recuperadas}</td>
                <td style="padding: 8px; text-align: center;">${j.drops}</td>
                <td style="padding: 8px; text-align: center;">${j.conversionesOK}</td>
                <td style="padding: 8px; text-align: center;">${j.conversionesMal}</td>
                <td style="padding: 8px; text-align: center; color: ${j.amarillas > 0 ? '#d32f2f' : 'inherit'};">${j.amarillas}</td>
                <td style="padding: 8px; text-align: center; color: ${j.rojas > 0 ? '#d32f2f' : 'inherit'};">${j.rojas}</td>
             </tr>
        `
    })
    
    jugadoresHtml += `
                </tbody>
             </table>
        </div>
        <button class="btn-cerrar-jugadores" onclick="cerrarModalDetalle()" style="width: 100%; background: #1b5e20; color: white; padding: 12px; margin-top: 16px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Cerrar</button>
    `
    
    const modalBody = document.querySelector('#modalDetallePartido .modal-body')
    if (modalBody) {
        modalBody.innerHTML = jugadoresHtml
    } else {
        console.error('No se encontró el modal-body')
    }
}

function actualizarHistorialVisual() {
    const contenedor = document.getElementById("listaAcciones")
    if (!contenedor) return
    
    if (historialAccionesVisual.length === 0) {
        contenedor.innerHTML = '<div class="accion-vacia">Sin eventos</div>'
        return
    }
    
    let html = ""
    // Mostrar desde la más reciente a la más antigua
   for (let i = 0; i < historialAccionesVisual.length; i++) {
        const item = historialAccionesVisual[i]
        const puntosTexto = item.puntos > 0 ? `<span class="puntos">+${item.puntos}</span>` : ""
        html += `
            <div class="accion-item">
                <span class="tiempo">${item.tiempo}</span>
                <span class="descripcion">${item.descripcion}</span>
                ${puntosTexto}
            </div>
        `
    }
    
    contenedor.innerHTML = html
}

function agregarAlHistorialVisual(descripcion, tiempo, puntos = 0) {
    historialAccionesVisual.unshift({  // unshift agrega al principio (más reciente)
        descripcion: descripcion,
        tiempo: tiempo,
        puntos: puntos,
        timestamp: Date.now()
    })
    
    // Mantener solo las últimas 5
    if (historialAccionesVisual.length > 5) {
        historialAccionesVisual.pop()
    }
    
    actualizarHistorialVisual()
}

// Al final del archivo, donde se llama a mostrarTablaJugadores()
mostrarTablaJugadores()

// Inicializar el contador con el valor por defecto
document.getElementById("contador").innerText = `0 / ${document.getElementById("cantidadJugadores").value}`

// Al final de app.js, agregá:
window.addEventListener('jugadoresActualizados', function() {
    console.log('Evento: jugadoresActualizados')
    mostrarTablaJugadores()
    actualizarSeleccion()
})
