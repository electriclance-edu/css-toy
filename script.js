//graphics settings
var tilePx = 10;
var viewType = 1;
//data
var tileColors = {
  red:"rgb(245,135,115)",
  lblue:"rgb(115,205,215)",
  dblue:"rgb(115,205,250)",
  orange:"rgb(250,190,115)"
} 
//canvas
var canvas, ctx, screenX, screenY;
//mouse state
var mouseDown = false;
var mouseButton = -1;
var mouseColor = "rgb(0,0,0)";
var colorPicked = false;
//keyb state
var ctrlPressed = false;

//sim settings
const fullNutritionLevel = 5;
const startingNutrition = 10; //10,000
const baseSpreadChance = 10;
const baseDiffusionChance = 10;
const baseMutationChance = 0.0002;
const mutationVariance = 100;
const nutritionMutationThreshold = 1000000; //0.1;
const newMutationColonyRandBonusMax = 50; //500
const baseExplosionChance = 1;
const baseAdjacencyDebuffStrength = 0.1; //1;
const blastNutrition = 500;
const colorMinimum = 100;

//classes
class Tile {
  static tileRows = {};

  constructor(type,data = {}) {
    this.type = type;
    this.data = data;
  }
  static set(tile,x,y) {
    if (!Tile.tileRows.hasOwnProperty(y)) {
      Tile.tileRows[y] = {};
    }
    tile.data.loc = {
      x:x,
      y:y
    }
    Tile.tileRows[y][x] = tile;
  }
  static get(x,y,debug=false) {
    if (!Tile.tileRows.hasOwnProperty(y)) {
      return undefined;
    }
    if (!Tile.tileRows[y].hasOwnProperty(x)) {
      return undefined;
    }
    return Tile.tileRows[y][x];
  }
  static generateNewVirusColor() {
    return `rgb(${randInt(255)},${colorMinimum + randInt(100)},${colorMinimum + randInt(20)})`;
  }
  virusEdible(x,y) {
    let tile = Tile.get(x,y);
    if (!tile) {
      return false;
    } 
    return tile.type == "food";
  }
  virusInfectable(x,y,color) {
    let tile = Tile.get(x,y);
    if (!tile) {
      return true;
    } 
    if (tile.type == "wall") {
      return false;
    }
    if (tile.color != this.color) {
      return true;
    }
    return false;
  }
  virusSame(x,y,color) {
    let tile = Tile.get(x,y);
    if (!tile) {
      return false;
    } 
    return tile.color == this.color;
  }
  static virusVaryColor(str) {
    let rgb = rgbStringToObj(str);
    rgb.r = rgb.r + (randInt(15) * randSign());
    rgb.g = Math.min(colorMinimum,rgb.g + (randInt(15) * randSign()));
    rgb.b = Math.min(colorMinimum,rgb.b + (randInt(15) * randSign()));
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  }
  static generateVirusData(color = "newColor",nutrition = 0.01) {
    return {
      color:color == "newColor" ? Tile.generateNewVirusColor() : Tile.virusVaryColor(color),
      nutrition:nutrition,
      genome:{
        adjacencyDebuffStrength:baseAdjacencyDebuffStrength * Math.random() * mutationVariance
      }
    }
  }
  get color() {
    if (this.data.hasOwnProperty("color")) {
      return this.data.color;
    } else if (this.data.hasOwnProperty("colorType")) {
      return tileColors[this.data.colorType];
    } else {
      return "rgb(0,0,0)";
    }
  }
  get x() {
    return this.data.loc.x;
  }
  get y() {
    return this.data.loc.y;
  }
  get friendlyAdjacents() {
    let friendlies = [];
    let adjacents = this.adjacents;
    adjacents.forEach((adj)=>{
      if (adj.color == this.color) friendlies.push(adj);
    });
    return friendlies;
  }
  get adjacents() {
    const transformations = [
      [0,-1],
      [0,1],
      [-1,0],
      [1,0],
      [1,1],
      [1,-1],
      [-1,1],
      [-1,-1],
    ]
    let adj = [];
    // console.log("--------------");
    transformations.forEach((t)=>{
      let translatedCoord = {
        x:this.x + t[0],
        y:this.y + t[1],
      }
      let tile = Tile.get(translatedCoord.x,translatedCoord.y);
      // console.log(this.x,this.y,translatedCoord);
      if (tile) {
        adj.push(tile);
      }
    });

    return adj;
  }
  get adjacentCoords() {
    const transformations = [
      [0,-1],
      [0,1],
      [-1,0],
      [1,0],
      [1,1],
      [1,-1],
      [-1,1],
      [-1,-1],
    ]
    let adj = [];
    // console.log("--------------");
    transformations.forEach((t)=>{
      adj.push({
        x:this.x + t[0],
        y:this.y + t[1],
      });
    });

    return adj;
  }
}
//functions
document.addEventListener("contextmenu",(e)=>{
  e.preventDefault();
})
document.addEventListener("mousedown",(e)=>{
  mouseDown = true;
  mouseButton = e.button;
  

  const monitorCoords = {
    x: e.clientX,
    y: e.clientY
  }
  const worldCoords = {
    x: Math.floor(e.clientX / tilePx),
    y: Math.floor(e.clientY / tilePx)
  }
  let tile = Tile.get(worldCoords.x,worldCoords.y);


  if (ctrlPressed && e.button == "0") {
    console.log(worldCoords.x,worldCoords.y,tile);
  }
  if (e.button == "1") {
    if (tile) {
      mouseColor = tile.color;
      colorPicked = true;
    }
  } else if (!colorPicked) {
    mouseColor = Tile.generateNewVirusColor();
  } else {
    colorPicked = false;
  }
});
document.addEventListener("mouseup",(e)=>{
  mouseDown = false;
  mouseButton = -1;
});
document.addEventListener("mousemove",(e)=>{
  if (!mouseDown) {
    return;
  }

  const monitorCoords = {
    x: e.clientX,
    y: e.clientY
  }
  const worldCoords = {
    x: Math.floor(e.clientX / tilePx),
    y: Math.floor(e.clientY / tilePx)
  }

  if (mouseButton == 0) {
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x,worldCoords.y);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x + 1,worldCoords.y);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x - 1,worldCoords.y);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x,worldCoords.y + 1);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x,worldCoords.y - 1);
  } else if (mouseButton == 2) {
    Tile.set(new Tile("virus",Tile.generateVirusData(mouseColor,startingNutrition)),worldCoords.x,worldCoords.y);
  }
  // setPixel(worldCoords.x,worldCoords.y,"blue");
});
document.addEventListener("keydown",(e)=>{
  let key = e.key;

  if (key == "1") viewType = 1;
  if (key == "2") viewType = 2;
  if (key == "Control") ctrlPressed = true;
});
document.addEventListener("keyup",(e)=>{
  let key = e.key;
  
  if (key == "Control") ctrlPressed = false;
});
//init
function onload() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  screenX = Math.round(innerWidth / tilePx);
  screenY = Math.round(innerHeight / tilePx);

  initCanvas(canvas);
  initWorld();
}
function initCanvas(elem) {
  elem.width = screenX;
  elem.height = screenY;
  setPixel(1,1,"rgb(255,0,0)");
}
function initWorld() {
  setInterval(function(){
    timestep();
  },15);
}
//general
function setPixel(x,y,color) {
  ctx.fillStyle = color;
  ctx.fillRect(x,y,1,1);
}
function timestep() {
  updateViruses();
  resetCanvas();
  renderCanvas();
}
function resetCanvas() {
  ctx.clearRect(0, 0, screenX, screenY);
}
function renderCanvas() {
  for (const [y, row] of Object.entries(Tile.tileRows)) {
    for (const [x, tile] of Object.entries(row)) {
      if (tile.type == "virus") {
        if (viewType == 1) setPixel(x,y,tile.color);
        else if (viewType == 2) setPixel(x,y,`rgb(${(tile.data.nutrition / fullNutritionLevel) * 100},${tile.color.split(",")[1]},${tile.color.split(",")[2]}`);
      } else {
        setPixel(x,y,"rgb(0,0,0)");
      }
    }
  }
} 
function updateViruses() {
  for (const [y, row] of Object.entries(Tile.tileRows)) {
    for (const [x, tile] of Object.entries(row)) {
      if (tile.type == "virus") {
        let explode = false;
        let diffusionReceivers = tile.friendlyAdjacents.length;

        let adjs = tile.adjacentCoords;
        adjs.forEach((coord)=>{
          if (tile.virusEdible(coord.x,coord.y)) {
            Tile.set(new Tile("virus",Tile.generateVirusData(tile.data.color,100)),coord.x,coord.y);
          } else if (tile.virusSame(coord.x,coord.y) && chance(baseDiffusionChance / diffusionReceivers)) {
            if (chance(baseDiffusionChance / 10)) {
              Tile.get(coord.x,coord.y).data.nutrition += tile.data.nutrition * 0.9;
              tile.data.nutrition = tile.data.nutrition * 0.1;
            } else {
              Tile.get(coord.x,coord.y).data.nutrition += tile.data.nutrition / (diffusionReceivers + 1);
              tile.data.nutrition = tile.data.nutrition / (diffusionReceivers + 1) * (diffusionReceivers);
            }
          } else if (tile.virusInfectable(coord.x,coord.y,tile.data.color) && chance(baseSpreadChance * Math.min((tile.data.nutrition / fullNutritionLevel),1) / (Math.pow(tile.friendlyAdjacents.length * tile.data.genome.adjacencyDebuffStrength + 1,2)))) {
            let dueNutrition = tile.data.nutrition * 0.99;
            let otherTile = Tile.get(coord.x,coord.y);
            if (otherTile) {
              if (otherTile.type == "virus") {
                dueNutrition -= otherTile.data.nutrition * 0.5;
                explode = chance(baseExplosionChance);
              }
            }
            Tile.set(new Tile("virus",Tile.generateVirusData(tile.data.color,dueNutrition)),coord.x,coord.y);
            tile.data.nutrition = tile.data.nutrition * 0.01;
          } else if (chance(baseMutationChance / Math.max(tile.data.nutrition,1))) {
            Tile.set(new Tile("virus",Tile.generateVirusData(tile.data.color)),coord.x,coord.y);
            tile.data.nutrition = 0;
            let stolenNutrition = 0;
            Tile.get(coord.x,coord.y).adjacents.forEach((adj) => {
              stolenNutrition += adj.data.nutrition;
              adj.data.nutrition = 0;
            });
            Tile.get(coord.x,coord.y).data.nutrition += stolenNutrition;
            Tile.get(coord.x,coord.y).data.nutrition += randInt(newMutationColonyRandBonusMax);
          }
        });

        if (explode) {
          // console.log("boom");
          tile.data.nutrition += blastNutrition;
          if (chance(10)) {
            // console.log("megaboom");
            tile.adjacents.forEach((adj)=>{
              if (adj.color == tile.color) {
                adj.data.nutrition += blastNutrition;
              }
            });
          }
        }
      }
    }
  }
  //spread
    //chance to not work
    //chance to mutate
}

function rgbStringToObj(string) {
  string = string.substr(4,string.length - 5).split(",");
  return {
    r:parseInt(string[0]),
    g:parseInt(string[1]),
    b:parseInt(string[2])
  };
}
function chance(percent) {
  return Math.random() * 100 < percent;
}
function randInt(max) {
  return Math.floor(Math.random() * max);
}
function rectIntCoords(x0,y0,x1,y1) {
  let coords = [];
  for (var x = Math.max(x0,0); x <= x1; x++) {
    for (var y = Math.max(y0,0); y <= y1; y++) {
      coords.push({x:x,y:y});
    }
  }
  return coords;
}
function circleIntCoords(x,y,rad) {
  let possibleCoords = rectIntCoords(
    Math.floor(x - rad),
    Math.floor(y - rad),
    Math.ceil(x + rad),
    Math.ceil(y + rad),
  )
  const center = {x:x,y:y};
  let coords = [];
  possibleCoords.forEach((coord)=>{
    if (dist(coord,center) < rad) {
      coords.push(coord);
    }
  });
  return coords;
}
// Returns the euclidian distance between two points.
function dist(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x,2) + Math.pow(a.y - b.y,2));
}
function randSign() {
  return randInt(2) ? 1 : -1;
}