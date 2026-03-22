let titulares=[]
let jugadorSeleccionado=null
let modoJugadores="camiseta"

let partidoID=""
let equipoActual=""
let rivalActual=""

let segundos=0
let corriendo=false
let partidoIniciado=false
let partidoFinalizado=false

let amarillas=[]

let acciones=[
"Tackle➕",
"Tackle➖",
"Quiebre",
"🏉 Perdida",
"🏉 Recuperada",
"Try",
"Conversión➕",
"Conversión➖",
"Drop/Penal",
"Line➕",
"Line➖",
"Scrum➕",
"Scrum➖",
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

// Mejora actualizarSeleccion() para manejar correctamente las tarjetas amarillas
function actualizarSeleccion() {
  let checks = [...document.querySelectorAll("#tablaJugadores input[type=checkbox]")]
  let seleccionados = checks.filter(c => c.checked)

  document.getElementById("contador").innerText = `${seleccionados.length} / 15`

  // Primero, habilitar todos los checks
  checks.forEach(c => {
    c.disabled = false
  })

  // Luego, aplicar reglas
  checks.forEach(c => {
    let dni = c.dataset.dni
    
    // Verificar si está suspendido por amarilla
    let suspendido = jugadorSuspendido(dni)
    
    if (suspendido) {
      c.checked = true
      c.disabled = true
      return
    }
    
    // Si ya hay 15 seleccionados y este no está seleccionado, deshabilitarlo
    if (seleccionados.length >= 15 && !c.checked) {
      c.disabled = true
    }
  })

  document.getElementById("btnIniciar").disabled = seleccionados.length !== 15
}

// Modifica iniciarPartido() para mantener la coherencia
function iniciarPartido() {
    const nuevoEquipo = document.getElementById("equipo").value
    const nuevoRival = document.getElementById("rival").value
    
    if (!partidoIniciado) {
        equipoActual = nuevoEquipo
        rivalActual = nuevoRival
        
        const ahora = new Date()
        const fecha = ahora.toISOString().slice(0, 10)
        const hora = ahora.toISOString().slice(11, 19).replace(/:/g, '-')
        
        // Guardar en la estructura completa
        partidoActual = {
            id: `${fecha}_${hora}_${equipoActual}_vs_${rivalActual}`,
            fechaInicio: ahora.toISOString(),
            equipo: equipoActual,
            rival: rivalActual,
            eventos: []
        }
        
        partidoID = partidoActual.id
        
        console.log('Nuevo partido creado:', partidoActual)
    } else {
        if (nuevoEquipo !== equipoActual || nuevoRival !== rivalActual) {
            equipoActual = nuevoEquipo
            rivalActual = nuevoRival
            
            const partes = partidoID.split('_')
            const fechaHora = partes.slice(0, 2).join('_')
            partidoID = `${fechaHora}_${equipoActual}_vs_${rivalActual}`
            
            // Actualizar la estructura
            partidoActual.id = partidoID
            partidoActual.equipo = equipoActual
            partidoActual.rival = rivalActual
            
            console.log('Partido actualizado:', partidoID)
        }
    }

    // Actualizar titulares...
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

let cont=document.getElementById("jugadores")
cont.innerHTML=""

titulares.forEach(j=>{

let label=
modoJugadores==="camiseta"
?(j.numero||j.apodo)
:j.apodo

let b=document.createElement("button")

b.dataset.dni=j.dni

b.innerText=label

b.onclick=()=>seleccionarJugador(j,b)

cont.appendChild(b)

})

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

return amarillas.some(a=>a.dni==dni && a.regreso>segundos)

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
    if(!jugadorSeleccionado) return

    if(jugadorSuspendido(jugadorSeleccionado.dni)){
        alert("Jugador con tarjeta amarilla")
        return
    }

    let tiempo = document.getElementById("cronometro").innerText

    let evento = {
        partido: partidoID,
        dni: jugadorSeleccionado.dni,
        accion: accion,
        tiempo: tiempo,
        timestamp: new Date().toISOString()
    }

    // Guardar en ambos arrays
    eventos.push(evento)
    if (partidoActual && partidoActual.eventos) {
        partidoActual.eventos.push(evento)
    }
    
    guardarEventos()

    if(accion.includes("🟨")){
        let regreso = segundos + (15 * 60)
        amarillas.push({
            dni: jugadorSeleccionado.dni,
            apodo: jugadorSeleccionado.apodo,
            regreso: regreso
        })
    }

    document.getElementById("ultima").innerText = 
        jugadorSeleccionado.apodo + " " + accion + " " + tiempo

    jugadorSeleccionado = null
    document.querySelectorAll("#jugadores button")
        .forEach(b => b.classList.remove("jugadorSeleccionado"))
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
        document.getElementById("btnIniciar").innerText = "Continuar"
    }
}

function borrarSeleccion(){

if(segundos>0 && !partidoFinalizado){
alert("No se puede borrar partido iniciado")
return
}

document.querySelectorAll("#tablaJugadores input[type=checkbox]")
.forEach(c=>c.checked=false)

actualizarSeleccion()

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

let cont=document.getElementById("amarillas")

if(!cont) return

cont.innerHTML=""

amarillas.forEach(a=>{

let restante=a.regreso-segundos

let boton=document.querySelector(`#jugadores button[data-dni='${a.dni}']`)

if(restante<=0){

if(boton){
boton.style.background=""
boton.disabled=false
}

let d=document.createElement("div")
d.innerText="🟨 "+a.apodo+" puede volver"

cont.appendChild(d)

return
}

if(boton){
boton.style.background="gold"
boton.disabled=true
}

let m=Math.floor(restante/60)
let s=restante%60

let mm=String(m).padStart(2,"0")
let ss=String(s).padStart(2,"0")

let d=document.createElement("div")

d.innerText=`🟨 ${a.apodo} ${mm}:${ss}`

cont.appendChild(d)

})

}

// ===== VARIABLES GLOBALES PARA ESTADÍSTICAS =====
let historialPartidos = []

// Cargar historial al iniciar
try {
    const historialGuardado = localStorage.getItem('historialPartidos')
    if (historialGuardado) {
        historialPartidos = JSON.parse(historialGuardado)
    }
} catch (e) {
    console.warn('Error cargando historial:', e)
}

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
        // No necesitamos ajustar scroll en partido
    } else {
        document.getElementById('pantallaConfig').style.display = 'block'
        // IMPORTANTE: Reajustar el scroll y altura al volver a configuración
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
    // Verificar si hay partido activo
    if (!partidoIniciado || !partidoID) {
        document.getElementById('statsActual').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                ⚠️ No hay partido en curso<br>
                <small>Inicia un partido para ver estadísticas</small>
            </div>
        `
        return
    }
    
    // Si hay partido pero no hay titulares (caso raro)
    if (!titulares || titulares.length === 0) {
        document.getElementById('statsActual').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                ⚠️ No hay jugadores en el partido<br>
                <small>Selecciona los titulares antes de iniciar</small>
            </div>
        `
        return
    }
    
    // Filtrar eventos del partido actual
    const eventosPartido = eventos.filter(e => e.partido === partidoID)
    
    console.log('Debug - Estadísticas:', {
        partidoIniciado,
        partidoID,
        titulares: titulares.length,
        eventos: eventosPartido.length
    })
    
    // Calcular estadísticas
    const stats = {
        tries: eventosPartido.filter(e => e.accion === 'Try').length,
        conversionesOK: eventosPartido.filter(e => e.accion === 'Conversión➕').length,
        conversionesMal: eventosPartido.filter(e => e.accion === 'Conversión➖').length,
        drops: eventosPartido.filter(e => e.accion === 'Drop').length,
        tacklesPos: eventosPartido.filter(e => e.accion === 'Tackle➕').length,
        tacklesNeg: eventosPartido.filter(e => e.accion === 'Tackle➖').length,
        quiebres: eventosPartido.filter(e => e.accion === 'Quiebre').length,
        perdidas: eventosPartido.filter(e => e.accion === '🏉 Perdida').length,
        recuperadas: eventosPartido.filter(e => e.accion === '🏉 Recuperada').length,
        amarillas: eventosPartido.filter(e => e.accion === 'Tarjeta 🟨').length,
        rojas: eventosPartido.filter(e => e.accion === 'Tarjeta 🟥').length
    }
    
    // Calcular puntos
    const puntos = (stats.tries * 5) + (stats.conversionesOK * 2) + (stats.drops * 3)
    
    // Mostrar información del partido
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
                <div class="numero">${puntos}</div>
                <div class="etiqueta">Puntos</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.tries}</div>
                <div class="etiqueta">Tries</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.tacklesPos}</div>
                <div class="etiqueta">Tackles +</div>
            </div>
            <div class="stats-card">
                <div class="numero">${stats.quiebres}</div>
                <div class="etiqueta">Quiebres</div>
            </div>
        </div>
        
        <h3>Acciones del partido</h3>
        <table class="stats-tabla">
            <thead>
                <tr>
                    <th>Acción</th>
                    <th>Cantidad</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Tries</td><td class="destacado">${stats.tries}</td></tr>
                <tr><td>Conversiones +</td><td>${stats.conversionesOK}</td></tr>
                <tr><td>Conversiones -</td><td>${stats.conversionesMal}</td></tr>
                <tr><td>Drops</td><td>${stats.drops}</td></tr>
                <tr><td>Tackles +</td><td>${stats.tacklesPos}</td></tr>
                <tr><td>Tackles -</td><td>${stats.tacklesNeg}</td></tr>
                <tr><td>Quiebres</td><td>${stats.quiebres}</td></tr>
                <tr><td>Pérdidas</td><td>${stats.perdidas}</td></tr>
                <tr><td>Recuperadas</td><td>${stats.recuperadas}</td></tr>
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
    if (historialPartidos.length === 0) {
        document.getElementById('statsHistorial').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                No hay partidos guardados
            </div>
        `
        return
    }
    
    // Ordenar del más reciente al más antiguo (por fecha de inicio)
    const historialOrdenado = [...historialPartidos].sort((a, b) => 
        new Date(b.fecha) - new Date(a.fecha)
    )
    
    let html = '<div class="historial-lista">'
    
    historialOrdenado.forEach((partido, index) => {
        const puntos = (partido.tries * 5) + (partido.conversionesOK * 2) + (partido.drops * 3)
        
        html += `
            <div class="historial-item">
                <div class="fecha">${partido.fechaLegible || partido.fecha}</div>
                <div class="partido">${partido.equipo} vs ${partido.rival}</div>
                <div class="resultado">${puntos} puntos (${partido.tries} tries)</div>
                <div class="duracion">⏱️ ${partido.duracionLegible || Math.floor(partido.duracion / 60) + ':' + String(partido.duracion % 60).padStart(2, '0')}</div>
                <div class="acciones">
                    <button class="ver-detalle" onclick="verDetallePartido(${index})">Ver detalle</button>
                    <button onclick="exportarPartido(${index})">Exportar</button>
                </div>
            </div>
        `
    })
    
    html += '</div>'
    document.getElementById('statsHistorial').innerHTML = html
}

// ===== ESTADÍSTICAS POR JUGADOR =====
function cargarEstadisticasJugadores() {
    if (!partidoIniciado || titulares.length === 0) {
        document.getElementById('statsJugadores').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                No hay partido en curso
            </div>
        `
        return
    }
    
    const eventosPartido = eventos.filter(e => e.partido === partidoID)
    
    // Crear objeto de estadísticas por jugador
    const statsJugadores = {}
    
    titulares.forEach(j => {
        statsJugadores[j.dni] = {
            nombre: j.apodo,
            numero: j.numero,
            tries: 0,
            tacklesPos: 0,
            tacklesNeg: 0,
            quiebres: 0,
            perdidas: 0,
            recuperadas: 0,
            drops: 0,
            conversionesOK: 0,
            conversionesMal: 0,
            amarillas: 0
        }
    })
    
    // Procesar eventos
    eventosPartido.forEach(e => {
        if (statsJugadores[e.dni]) {
            if (e.accion === 'Try') statsJugadores[e.dni].tries++
            else if (e.accion === 'Tackle➕') statsJugadores[e.dni].tacklesPos++
            else if (e.accion === 'Tackle➖') statsJugadores[e.dni].tacklesNeg++
            else if (e.accion === 'Quiebre') statsJugadores[e.dni].quiebres++
            else if (e.accion === '🏉 Perdida') statsJugadores[e.dni].perdidas++
            else if (e.accion === '🏉 Recuperada') statsJugadores[e.dni].recuperadas++
            else if (e.accion === 'Drop') statsJugadores[e.dni].drops++
            else if (e.accion === 'Conversión➕') statsJugadores[e.dni].conversionesOK++
            else if (e.accion === 'Conversión➖') statsJugadores[e.dni].conversionesMal++
            else if (e.accion === 'Tarjeta 🟨') statsJugadores[e.dni].amarillas++
        }
    })
    
    // Ordenar por tries (los que más tries primero)
    const jugadoresOrdenados = Object.values(statsJugadores)
        .sort((a, b) => b.tries - a.tries)
    
    let html = `
        <table class="stats-tabla">
            <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>T</th>
                <th>Tk+</th>
                <th>Q</th>
                <th>🟨</th>
            </tr>
    `
    
    jugadoresOrdenados.forEach(j => {
        html += `
            <tr>
                <td>${j.numero || '-'}</td>
                <td>${j.nombre}</td>
                <td class="destacado">${j.tries}</td>
                <td>${j.tacklesPos}</td>
                <td>${j.quiebres}</td>
                <td style="color: ${j.amarillas > 0 ? '#d32f2f' : 'inherit'}">${j.amarillas}</td>
            </tr>
        `
    })
    
    html += '</table>'
    document.getElementById('statsJugadores').innerHTML = html
}

// ===== GUARDAR PARTIDO EN HISTORIAL =====
function guardarPartidoEnHistorial() {
    if (!partidoIniciado || titulares.length === 0) return
    
    // Usar partidoActual en lugar de crear uno nuevo
    if (!partidoActual || !partidoActual.eventos) {
        console.warn('No hay datos del partido actual para guardar')
        return
    }
    
    const eventosPartido = partidoActual.eventos
    
    const stats = {
        tries: eventosPartido.filter(e => e.accion === 'Try').length,
        conversionesOK: eventosPartido.filter(e => e.accion === 'Conversión➕').length,
        drops: eventosPartido.filter(e => e.accion === 'Drop').length,
        tacklesPos: eventosPartido.filter(e => e.accion === 'Tackle➕').length
    }
    
    const partidoHistorial = {
        id: partidoActual.id,
        fecha: partidoActual.fechaInicio,
        fechaLegible: new Date(partidoActual.fechaInicio).toLocaleString(),
        equipo: partidoActual.equipo,
        rival: partidoActual.rival,
        duracion: segundos,
        duracionLegible: `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`,
        ...stats,
        eventos: eventosPartido,
        finalizado: true,
        finalizadoEn: new Date().toISOString()
    }
    
    historialPartidos.push(partidoHistorial)
    
    try {
        localStorage.setItem('historialPartidos', JSON.stringify(historialPartidos))
        console.log('Partido guardado en historial:', partidoHistorial.id)
    } catch (e) {
        console.warn('Error guardando historial:', e)
    }
}

// ===== VER DETALLE DE PARTIDO HISTÓRICO =====
function verDetallePartido(index) {
    const partido = historialPartidos[index]
    alert(`Detalle de ${partido.equipo} vs ${partido.rival}\n\n` +
          `Tries: ${partido.tries}\n` +
          `Conversiones: ${partido.conversionesOK || 0}\n` +
          `Drops: ${partido.drops || 0}\n` +
          `Tackles+: ${partido.tacklesPos || 0}`)
}

// ===== EXPORTAR PARTIDO =====
function exportarPartido(index) {
    const partido = historialPartidos[index]
    const dataStr = JSON.stringify(partido, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `partido_${partido.equipo}_vs_${partido.rival}_${partido.fecha}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
}

// ===== MODIFICAR FINALIZAR PARTIDO PARA GUARDAR HISTORIAL =====
function finalizarPartido() {
    if (!confirm("Finalizar partido?")) return
    
    // Guardar en historial antes de finalizar
    guardarPartidoEnHistorial()
    
    corriendo = false
    segundos = 0
    amarillas = []
    
    document.getElementById("cronometro").innerText = "00:00"
    document.getElementById("amarillas").innerHTML = ""
    document.getElementById("ultima").innerText = "Sin eventos"
    
    mostrarPantallaConfig()
    document.getElementById("btnIniciar").innerText = "Iniciar"
    
    partidoFinalizado = true
    partidoIniciado = false
}

mostrarTablaJugadores()
