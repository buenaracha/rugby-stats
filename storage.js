let jugadores = JSON.parse(localStorage.getItem("jugadores") || "[]")

let eventos = JSON.parse(localStorage.getItem("eventos") || "[]")

function guardarJugadores(){
localStorage.setItem("jugadores",JSON.stringify(jugadores))
}

function guardarEventos(){
localStorage.setItem("eventos",JSON.stringify(eventos))
}

function exportarEventos(){

let filas=[]

eventos.forEach(e=>{

filas.push([
e.partidoID,
e.dni,
e.accion,
e.tiempo
].join(","))

})

let csv="\uFEFF"+filas.join("\n")

let blob=new Blob([csv],{type:"text/csv;charset=utf-8;"})

let a=document.createElement("a")

a.href=URL.createObjectURL(blob)
a.download="eventos.csv"
a.click()

}
