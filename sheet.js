async function importarJugadoresSheet(){

let input=document.getElementById("sheetID").value.trim()

if(!input){
alert("Ingresar link o ID del Sheet")
return
}

/* extraer ID si pegaron el link */

let id=input

if(input.includes("/spreadsheets/d/")){
id=input.split("/spreadsheets/d/")[1].split("/")[0]
}

try{

let url=`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`

let r=await fetch(url)

let t=await r.text()

let json=JSON.parse(t.substring(47).slice(0,-2))

let rows=json.table.rows

let mapaCamisetas={}

jugadores.forEach(j=>{
if(j.camiseta){
mapaCamisetas[j.dni]=j.camiseta
}
})

jugadores=[]

rows.forEach(r=>{

let c=r.c

if(!c) return

let dni = c[0]?.v || ""

jugadores.push({

dni: dni,
nombre: c[1]?.v || "",
apodo: c[2]?.v || "",
posicion: c[3]?.v || "",
camiseta: c[4]?.v || mapaCamisetas[dni] || ""

})

})

guardarJugadores()

alert("Jugadores cargados: "+jugadores.length)

mostrarTablaJugadores()

}catch(e){

console.error(e)

alert("Error leyendo Sheet")

}

}
