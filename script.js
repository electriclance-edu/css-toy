//graphics settings
var tilePx = 10;
var viewType = 1;
const phenotypeColorVariance = 5;
const accentColorStrength = 10;
let viewRenderFunction;
//data
var tileColors = {
  red:"rgb(245,135,115)",
  lblue:"rgb(115,205,215)",
  dblue:"rgb(115,205,250)",
  orange:"rgb(250,190,115)"
} 
//world state
var time = 0;
//canvas
var canvas, ctx, screenX, screenY;
//mouse state
var mouseDown = false;
var mouseButton = -1;
var mouseColor = "rgb(0,0,0)";
var colorPicked = false;
var currentMouseTile = {x:0,y:0};
//keyb state
var ctrlPressed = false;
//virus data
const dispositionSyllables = {
  kind:"atraci",
  round:"sphera",
  deadly:"coli",
  dangerous:"letalis",
  old:"archai",
  magical:"arcani",
  parasitic:"vermici",
  bungus:"amogi",
  primal:"primoris"
}
//sim settings
const fullNutritionLevel = 5;
const startingNutrition = 10000; //10,000
const baseSpreadChance = 50;
const baseAttackChance = 1;
const baseDiffusionChance = 20;
const baseMutationChance = 0.0002;
const mutationVariance = 100;
const nutritionMutationThreshold = 1000000; //0.1;
const newMutationColonyRandBonusMax = 500; //500
const baseExplosionChance = 1;
const baseAdjacencyDebuffStrength = 0.01; //1;
const blastNutrition = 500;
const colorMinimum = 100;
const colorMaximum = 230;

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
  virusCanInfect(x,y) {
    let tile = Tile.get(x,y);
    if (!tile) {
      return true;
    } 
    if (tile.type == "wall") {
      return false;
    }
    if (tile.trueColor != this.trueColor) {
      return true;
    }
    return false;
  }
  get name() {
    const syllables = {
      r:{
        0:"Aza",
        50:"A",
        100:"Au",
        200:"Ad",
        255:"Asi",
      },
      g:{
        0:"Gil",
        50:"Go",
        100:"Gen",
        200:"Gri",
        255:"Asi",
      },
      b:{
        0:"Vre",
        50:"Vau",
        100:"Vil",
        200:"Vu",
        255:"Vou",
      }
    }
    const accentSyllables = {
      "r":"re",
      "g":"gi",
      "b":"bu"
    };
    const endingSyllables = [
      "ila","enes","elia","ilis",
      "ides","cola","llus","thrix",
      "coccus","ella","dium","bacter"
    ];

    var name = "";
    let color = rgbStringToObj(this.trueColor);
    let nondominants = ["r","g","b"];
    let dominant = Object.keys(color).reduce((a, b) => color[a] > color[b] ? a : b);
    nondominants.splice(nondominants.indexOf(dominant),1);

    let dominantRanges = Object.keys(syllables[dominant]);
    for (var i = 0; i < dominantRanges.length; i++) {
      if (color[dominant] < dominantRanges[i]) {
        name += syllables[dominant][dominantRanges[i]];
        break;
      }
    }
    nondominants.forEach((colorType)=>{    
      let typeRanges = Object.keys(syllables[colorType]);
      for (var i = 0; i < typeRanges.length; i++) {
        if (color[colorType] < typeRanges[i]) {
          name += syllables[colorType][typeRanges[i]].toLowerCase();
          break;
        }
      }
    });

    name += endingSyllables[this.data.genome.inherentNumber % endingSyllables.length];
    name += " ";
    name += accentSyllables[this.data.genome.accentColor];
    name += dispositionSyllables[this.data.genome.disposition];
    
    return name;
  }
  virusSame(x,y) {
    let tile = Tile.get(x,y);
    if (!tile) {
      return false;
    }
    return tile.trueColor == this.trueColor;
  }
  static virusVaryColor(str) {
    let rgb = rgbStringToObj(str);
    rgb.r = rgb.r + (randInt(50) * randSign());
    rgb.g = clamp(colorMinimum,rgb.g + (randInt(30) * randSign()),colorMaximum);
    rgb.b = clamp(colorMinimum,rgb.b + (randInt(30) * randSign()),colorMaximum);
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  }
  static virusGeneratePhenotypicColor(str,acc,generation) {
    let rgb = rgbStringToObj(str);
    rgb.r = clamp(colorMinimum,rgb.r + (randInt(phenotypeColorVariance) * randSign() + 20),colorMaximum);
    rgb.g = clamp(colorMinimum,rgb.g + (randInt(phenotypeColorVariance) * randSign()),colorMaximum);
    rgb.b = clamp(colorMinimum,rgb.b + (randInt(phenotypeColorVariance) * randSign()),colorMaximum);
    rgb[acc] = clamp(colorMinimum,rgb.b + accentColorStrength * (cycleNumber(generation,7)),colorMaximum);
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  }
  static generateVirusData(generation = 0,color = "newColor",accentColor = "newColor",inherentNumber = randInt(100000),disposition = randElem(Object.keys(dispositionSyllables)),nutrition = 0.01,bloodiness = 0) {
    let setColor = color == "newColor" ? Tile.generateNewVirusColor() : color;
    if (color == "newColor") color = Tile.generateNewVirusColor();
    if (accentColor == "newColor") {
      accentColor = randElem(["r","g","b"]);
    }
    return {
      phenotypicColor:Tile.virusGeneratePhenotypicColor(setColor,accentColor,generation),
      nutrition:nutrition,
      generation:generation,
      bloodiness:bloodiness,
      genome:{
        color:setColor,
        accentColor:accentColor,
        adjacencyDebuffStrength:baseAdjacencyDebuffStrength * Math.random() * mutationVariance,
        inherentNumber:inherentNumber,
        disposition:disposition
      }
    }
  }
  get trueColor() {
    if (this.data.hasOwnProperty("genome")) {
      if (this.data.genome.hasOwnProperty("color")) {
        return this.data.genome.color;
      } else {
        return "rgb(0,0,0)";
      }
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
    transformations.forEach((t)=>{
      let translatedCoord = {
        x:this.x + t[0],
        y:this.y + t[1],
      }
      let tile = Tile.get(translatedCoord.x,translatedCoord.y);
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
    transformations.forEach((t)=>{
      adj.push({
        x:this.x + t[0],
        y:this.y + t[1],
      });
    });
    return shuffleArray(adj);
  }
  get nutrition() {
    return this.data.nutrition;
  }
  set nutrition(n) {
    this.data.nutrition = n;
  }
}
//functions
document.addEventListener("contextmenu",(e)=>{
  e.preventDefault();
})
document.addEventListener("mousedown",(e)=>{
  mouseDown = true;
  mouseButton = e.button;
  
  const worldCoords = {
    x: Math.floor(e.clientX / tilePx),
    y: Math.floor(e.clientY / tilePx)
  }
  let tile = Tile.get(worldCoords.x,worldCoords.y);


  if (ctrlPressed && e.button == "0") {
    console.log(worldCoords.x,worldCoords.y,tile);
  }
  if (e.button == "1") {
    if (tile && tile.type === "virus") {
      mouseColor = tile.trueColor;
      mouseAccentColor = tile.data.genome.accentColor;
      mouseInherentNumber = tile.data.genome.inherentNumber;
      mouseDisposition = tile.data.genome.disposition;
      colorPicked = true;
    }
  } else if (!colorPicked) {
    mouseColor = Tile.generateNewVirusColor();
    mouseAccentColor = randElem(["r","g","b"]);
    mouseInherentNumber = randInt(100000);
    mouseDisposition = randElem(Object.keys(dispositionSyllables));
  } else {
    colorPicked = false;
  }
});
document.addEventListener("mouseup",(e)=>{
  mouseDown = false;
  mouseButton = -1;
});
document.addEventListener("mousemove",(e)=>{
  const worldCoords = {
    x: Math.floor(e.clientX / tilePx),
    y: Math.floor(e.clientY / tilePx)
  }

  currentMouseTile = worldCoords;

  if (!mouseDown) {
    return;
  }

  if (mouseButton == 0) {
    if (ctrlPressed) return;
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x,worldCoords.y);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x + 1,worldCoords.y);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x - 1,worldCoords.y);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x,worldCoords.y + 1);
    Tile.set(new Tile("wall",{colorType:"lblue"}),worldCoords.x,worldCoords.y - 1);
  } else if (mouseButton == 2) {
    Tile.set(new Tile("virus",Tile.generateVirusData(0,mouseColor,mouseAccentColor,mouseInherentNumber,mouseDisposition,startingNutrition)),worldCoords.x,worldCoords.y);
  }
  // setPixel(worldCoords.x,worldCoords.y,"blue");
});
document.addEventListener("keydown",(e)=>{
  let key = e.key;

  if (key == "1") setViewType(1);
  else if (key == "2") setViewType(2);
  else if (key == "3") setViewType(3);
  else if (key == "4") setViewType(4);
  if (key == "Control") ctrlPressed = true;
});
document.addEventListener("keyup",(e)=>{
  let key = e.key;
  
  if (key == "Control") ctrlPressed = false;
});
function setViewType(index) {
  const viewLores = [
    {
      title:"normal view",
      desc:"colors are based on the genomic true and accent color"
    },
    {
      title:"nutrition view",
      desc:"colors are based on the level of nutrition"
    },
    {
      title:"generational view",
      desc:"colors are based on generation"
    },
    {
      title:"emphasized color display",
      desc:"colors are extreme to show differing colonies"
    },
  ]
  viewType = index;
  document.getElementById("ViewTypeTitle").innerHTML = viewLores[index - 1].title;
  document.getElementById("ViewTypeDescription").innerHTML = viewLores[index - 1].desc;

  if (viewType == 1) {
    viewRenderFunction = (tile)=>{
      let phenotypicColor = rgbStringToObj(tile.data.phenotypicColor);

      gbModBrightness = 0.5;//(tile.data.genome.inherentNumber % 50 / 100);
      // console.log(gbModBrightness);
      let generationalBrightnessModifier = Math.min(tile.data.generation / 100 + gbModBrightness,2.2); // brighter the younger it is
      if (tile.data.genome.inherentNumber % 2) generationalBrightnessModifier = 1 / generationalBrightnessModifier - gbModBrightness;

      let battleModifier = (tile.data.bloodiness / 10) + 1; // more bloodiness, redder, darker
      let accentModifier = Math.pow(phenotypicColor[tile.data.genome.accentColor] / 255 * 2,5) * 4 - 10;
      let throbbingColor = {
        r:phenotypicColor.r * generationalBrightnessModifier * battleModifier + accentModifier,
        g:phenotypicColor.g * generationalBrightnessModifier / battleModifier + accentModifier,
        b:phenotypicColor.b * generationalBrightnessModifier / battleModifier + accentModifier,
      }
      return `rgb(${throbbingColor.r},${throbbingColor.g},${throbbingColor.b})`;
    }
  } else if (viewType == 2) {
    viewRenderFunction = (tile)=>{
      let phenotypicColor = rgbStringToObj(tile.data.phenotypicColor);
      let decimalNutritionLevel = Math.log10(tile.nutrition);
      if (decimalNutritionLevel >= 0) decimalNutritionLevel = 0;
      else decimalNutritionLevel = Math.abs(decimalNutritionLevel);
      let nutritionalColor = {
        r:(tile.nutrition / fullNutritionLevel) * 10,
        g:phenotypicColor.g * 0.3,
        b:(phenotypicColor.b) * decimalNutritionLevel
      }
      return `rgb(${nutritionalColor.r},${nutritionalColor.g},${nutritionalColor.b})`;
    }
  } else if (viewType == 3) {
    viewRenderFunction = (tile)=>{
      let baseColor = rgbStringToObj(tile.trueColor);
      let generationalColor = {
        r:tile.data.generation * 2.0 + 30 + (baseColor.r * 0.05),
        g:tile.data.generation * 1.0 + 30 + (baseColor.g * 0.05),
        b:tile.data.generation * 1.5 + 30 + (baseColor.b * 0.05),
      }
      return `rgb(${generationalColor.r},${generationalColor.g},${generationalColor.b})`;
    }
  } else if (viewType == 4) {
    viewRenderFunction = (tile)=>{
      let baseColor = rgbStringToObj(tile.trueColor);
      let extremifiedColor = {
        r:Math.pow(baseColor.r / 255 * 2,5) * 100,
        g:Math.pow(baseColor.g / 255 * 2,5) * 100,
        b:Math.pow(baseColor.b / 255 * 2,5) * 100,
      }
      extremifiedColor[tile.data.genome.accentColor] *= 2;
      return `rgb(${extremifiedColor.r},${extremifiedColor.g},${extremifiedColor.b})`;
      }
  }
}
//init
function onload() {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  screenX = Math.round(innerWidth / tilePx);
  screenY = Math.round(innerHeight / tilePx);

  initCanvas(canvas);
  initWorld();
  setViewType(1);
}
function initCanvas(elem) {
  elem.width = screenX;
  elem.height = screenY;
  setPixel(1,1,"rgb(255,0,0)");
}
function initWorld() {
  setInterval(function(){
    time++;
    timestep();
    if (time % 5 == 0) updateHover(currentMouseTile.x,currentMouseTile.y);
  },15);
}
//general
function updateHover(x,y) {
  let tile = Tile.get(x,y);

  if (tile) {
    document.getElementById("TileType").innerHTML = `Type: ${tile.type}`;
    if (tile.type == "virus") {
      document.getElementById("TileColonyName").innerHTML = `${tile.name}`;
      document.getElementById("TileNutrition").innerHTML = `Nutrition: ${tile.nutrition.toFixed(5)}`;
      document.getElementById("TileKills").innerHTML = `Bloodiness: ${tile.data.bloodiness.toFixed(1)}`;
      document.getElementById("TileColonyGeneration").innerHTML = `Colony Generation: ${tile.data.generation}`;
      document.getElementById("TileColonyColor").innerHTML = `Colony Color: ${tile.trueColor}`;
      document.getElementById("TileColonyDisposition").innerHTML = `Colony Disposition: ${tile.data.genome.disposition}`;
      document.getElementById("TileColonyInherentNumber").innerHTML = `Colony Inherent Number: ${tile.data.genome.inherentNumber}`;
      document.getElementById("TileColonyAccentColor").innerHTML = `Colony Accent: ${tile.data.genome.accentColor}`;
      
      let generationalBrightnessModifier = Math.min(tile.data.generation / 100 + 0.5,2.2); // brighter the younger it is
      if (tile.data.genome.inherentNumber % 2) generationalBrightnessModifier = 1 / generationalBrightnessModifier - 0.5;
      document.getElementById("GenerationalBrightnessModifier").innerHTML = `DEBUG GBMod: ${generationalBrightnessModifier}`;
    }
  }
}
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
        setPixel(x,y,viewRenderFunction(tile));
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
        let nutritionDeficit = Math.min((tile.nutrition / fullNutritionLevel),1);
        // let friendlyAdjacents = tile.friendlyAdjacents.length;
        // let adjacencyDebuff = (Math.pow(friendlyAdjacents * tile.data.genome.adjacencyDebuffStrength + 1,2));

        tile.data.bloodiness = Math.max(0,tile.data.bloodiness - 0.05);
        var adjs = tile.adjacentCoords;
        adjs.forEach((coord)=>{
          let otherTile = Tile.get(coord.x,coord.y);
          if (tile.virusEdible(coord.x,coord.y)) {
            // EATING CASE (not happening for now)
            Tile.set(new Tile("virus",Tile.generateVirusData(++tile.data.generation,tile.trueColor,tile.data.genome.accentColor,tile.data.genome.inherentNumber,tile.data.genome.disposition,100)),coord.x,coord.y);
          } else if (tile.virusSame(coord.x,coord.y) && chance(baseDiffusionChance / diffusionReceivers)) {
            // DIFFUSION CASE
            if (chance(baseDiffusionChance / 10)) {
              // Super diffuse
              otherTile.nutrition += tile.nutrition * 0.9;
              tile.nutrition = tile.nutrition * 0.1;
            } else {
              otherTile.nutrition += tile.nutrition / (diffusionReceivers + 1);
              tile.nutrition = tile.nutrition / (diffusionReceivers + 1) * (diffusionReceivers);
            }
          } else if (false) {
          } else if (tile.virusCanInfect(coord.x,coord.y) && !otherTile && chance(baseSpreadChance * nutritionDeficit)) {
            // SPREAD TO AIR CASE
            Tile.set(new Tile("virus",Tile.generateVirusData(++tile.data.generation,tile.trueColor,tile.data.genome.accentColor,tile.data.genome.inherentNumber,tile.data.genome.disposition,tile.nutrition * 0.99)),coord.x,coord.y);
            tile.nutrition = tile.nutrition * 0.01;
          } else if (tile.virusCanInfect(coord.x,coord.y) && Tile.get(coord.x,coord.y)) {
            // ATTACK CASE - If there is another tile, and it is a virus, attempt to attack
            if (chance(baseAttackChance * nutritionDeficit) && otherTile.type == "virus") {
              // SUCCESSFUL ATTACK CASE
              explode = chance(baseExplosionChance);
              let bloodiness = otherTile.data.bloodiness + 1;
              Tile.set(new Tile("virus",Tile.generateVirusData(++tile.data.generation,tile.trueColor,tile.data.genome.accentColor,tile.data.genome.inherentNumber,tile.data.genome.disposition,tile.nutrition * 0.99,bloodiness)),coord.x,coord.y);
              tile.nutrition = tile.nutrition * 0.01;
            }
          } else if (chance(baseMutationChance / Math.max(tile.nutrition,1))) {
            // MUTATION CASE
            Tile.set(new Tile("virus",Tile.generateVirusData(0,Tile.virusVaryColor(tile.trueColor))),coord.x,coord.y);
            tile.nutrition = 0;
            let stolenNutrition = 0;
            Tile.get(coord.x,coord.y).adjacents.forEach((adj) => {
              stolenNutrition += adj.nutrition;
              // adj.nutrition = 0; BUG: CAUSES LINES
            });
            Tile.get(coord.x,coord.y).nutrition += stolenNutrition;
            Tile.get(coord.x,coord.y).nutrition += randInt(newMutationColonyRandBonusMax);
          }
        });

        if (explode) {
          tile.nutrition += blastNutrition;
          tile.data.bloodiness += 5
          if (chance(10)) {
            tile.adjacents.forEach((adj)=>{
              if (adj.trueColor == tile.trueColor) {
                adj.nutrition += blastNutrition;
                adj.data.bloodiness += 5;
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
function clamp(min,val,max) {
  return Math.min(Math.max(min,val),max);
}
function getRGBDistance(a,b) {
  return Math.sqrt(Math.pow(a.r - b.r,2) + Math.pow(a.g - b.g,2) + Math.pow(a.b - b.b,2));
}
function randElem(arr) {
  return arr[randInt(arr.length)];
}
function cycleNumber(index, cycleSize = 8) {
  let raw = (index % (cycleSize*2)) - cycleSize;
  raw = raw < 0 ? raw : raw + 1;
  raw = Math.abs(raw);
  return raw;
}
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(unshuffled) {
  let shuffled = unshuffled
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
  return shuffled;
}