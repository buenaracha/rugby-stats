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
"Drop",
"Tarjeta 🟨",
"Tarjeta 🟥"
]

function mostrarTablaJugadores(){

let cont=document.getElementById("tablaJugadores")
cont.innerHTML=""

jugadores.forEach(j=>{

let fila=document.createElement("div")

fila.className="filaJugador"

fila.innerHTML=`
<input type="number" min="1" max="99" value="${j.camiseta||""}" data-dni="${j.dni}"> <input type="checkbox" data-dni="${j.dni}">

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

function actualizarSeleccion(){

let checks=[...document.querySelectorAll("#tablaJugadores input[type=checkbox]")]
let seleccionados=checks.filter(c=>c.checked)

document.getElementById("contador").innerText=
`${seleccionados.length} / 15`

checks.forEach(c=>{

let dni=c.dataset.dni
let suspendido=jugadorSuspendido(dni)

if(suspendido){
c.checked=true
c.disabled=true
return
}

if(seleccionados.length>=15 && !c.checked){
c.disabled=true
}else{
c.disabled=false
}

})

document.getElementById("btnIniciar").disabled=
seleccionados.length!==15

}

function iniciarPartido(){
let titularesPrevios=[...titulares]

equipoActual=document.getElementById("equipo").value
rivalActual=document.getElementById("rival").value

partidoID=
new Date().toISOString().slice(0,10)+"*"+equipoActual+"*"+rivalActual

titulares=[]
if(titularesPrevios.length){

titularesPrevios.forEach(j=>{

if(!titulares.find(x=>x.dni==j.dni)){
registrarCambio(j.dni,"")
}

})

titulares.forEach(j=>{

if(!titularesPrevios.find(x=>x.dni==j.dni)){
registrarCambio("",j.dni)
}

})

}

document.querySelectorAll("#tablaJugadores .filaJugador")
.forEach(f=>{

let num=f.children[0].value
let check=f.children[1]

if(check.checked){

let dni=check.dataset.dni
let j=jugadores.find(x=>x.dni==dni)

titulares.push({
dni:j.dni,
nombre:j.nombre,
apodo:j.apodo,
numero:num||j.camiseta||""
})

}

})

if(segundos===0){
partidoFinalizado=false
document.getElementById("cronometro").innerText="00:00"
}

document.getElementById("pantallaConfig").style.display="none"
document.getElementById("pantallaPartido").style.display="block"

document.getElementById("infoPartido").innerText=
equipoActual+" vs "+rivalActual

crearJugadores()
crearAcciones()
actualizarBotonInicio()

partidoIniciado=true

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

function registrarEvento(accion){

if(!jugadorSeleccionado) return

if(jugadorSuspendido(jugadorSeleccionado.dni)){
alert("Jugador con tarjeta amarilla")
return
}

let tiempo=document.getElementById("cronometro").innerText

let evento={
partido:partidoID,
dni:jugadorSeleccionado.dni,
accion:accion,
tiempo:tiempo
}

eventos.push(evento)
guardarEventos()

if(accion.includes("🟨")){

let regreso=segundos+(15*60)

amarillas.push({
dni:jugadorSeleccionado.dni,
apodo:jugadorSeleccionado.apodo,
regreso:regreso
})

}

document.getElementById("ultima").innerText=
jugadorSeleccionado.apodo+" "+accion+" "+tiempo

jugadorSeleccionado=null

document.querySelectorAll("#jugadores button")
.forEach(b=>b.classList.remove("jugadorSeleccionado"))

}

function iniciarCrono(){

if(segundos===0){
corriendo=true
document.getElementById("btnCrono").innerText="Pausar"
return
}

if(corriendo){
corriendo=false
document.getElementById("btnCrono").innerText="Continuar"
}else{
corriendo=true
document.getElementById("btnCrono").innerText="Pausar"
}

}

function actualizarBotonInicio(){

let b=document.getElementById("btnCrono")

if(segundos===0){
b.innerText="Iniciar"
}else{
b.innerText="Continuar"
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

function modoCambios(){

document.getElementById("pantallaPartido").style.display="none"
document.getElementById("pantallaConfig").style.display="block"

if(partidoIniciado){
document.getElementById("btnIniciar").innerText="Continuar"
}

}

function finalizarPartido(){

if(!confirm("Finalizar partido?")) return

corriendo=false
segundos=0

amarillas=[]

document.getElementById("cronometro").innerText="00:00"
document.getElementById("amarillas").innerHTML=""
document.getElementById("ultima").innerText="Sin eventos"

document.getElementById("pantallaPartido").style.display="none"
document.getElementById("pantallaConfig").style.display="block"

document.getElementById("btnIniciar").innerText="Iniciar"

partidoFinalizado=true
partidoIniciado=false

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

mostrarTablaJugadores()
