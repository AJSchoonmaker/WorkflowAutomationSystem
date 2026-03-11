document.addEventListener("DOMContentLoaded", function () {

const map = L.map('map',{
    zoomControl:true,
    minZoom:12,
    maxZoom:16
}).setView([40.75,-73.98],13)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap'
}).addTo(map)

let boroughLayer
let gridLayer = L.layerGroup().addTo(map)
let manhattanPolygon = null

fetch("boroughs.geojson")
.then(res=>res.json())
.then(data=>{

boroughLayer = L.geoJSON(data,{
    style:{
        color:"black",
        weight:2,
        fillOpacity:0
    }
}).addTo(map)

boroughLayer.eachLayer(layer=>{
    if(layer.feature.properties.name === "Manhattan"){
        manhattanPolygon = layer
        let bounds = layer.getBounds()
        map.fitBounds(bounds)
        drawGrid(bounds)
    }
})

})


function cellIntersectsPolygon(cell, polygon){

let polyPoints = polygon.getLatLngs()[0]

for(let p of polyPoints){

if(cell.contains(p)){
return true
}

}

return polygon.getBounds().intersects(cell)

}


function drawGrid(bounds){

gridLayer.clearLayers()

let south = bounds.getSouth()
let north = bounds.getNorth()
let west = bounds.getWest()
let east = bounds.getEast()

let gridSize = 12

let latStep = (north - south)/gridSize
let lonStep = (east - west)/gridSize

for(let i=0;i<gridSize;i++){

for(let j=0;j<gridSize;j++){

let cellSouth = south + (i*latStep)
let cellNorth = south + ((i+1)*latStep)

let cellWest = west + (j*lonStep)
let cellEast = west + ((j+1)*lonStep)

let cellBounds = L.latLngBounds(
[cellSouth,cellWest],
[cellNorth,cellEast]
)

if(!cellIntersectsPolygon(cellBounds,manhattanPolygon)){
continue
}

let row = String.fromCharCode(65+i)
let gridID = row+(j+1)

let rect = L.rectangle(cellBounds,{
color:"#3388ff",
weight:0.7,
opacity:0.8,
fillOpacity:0
})

rect.bindTooltip(gridID)

gridLayer.addLayer(rect)

}

}

}

})