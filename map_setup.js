// =========================================================================
// MAP SETUP & ASSET INITIALIZATION CONTROLLER (IN-WEB GRID SYSTEM)
// =========================================================================

// References the main canvas element from the HTML document DOM
const canvas = document.getElementById('gameCanvas');
if (!canvas) {
    console.error("[ERROR][map_setup] Canvas element with ID 'gameCanvas' not found in DOM.");
}

// Acquires the 2D rendering context interface for drawing graphics on the canvas
const ctx = canvas ? canvas.getContext('2d') : null;
if (!ctx) {
    console.error("[ERROR][map_setup] Failed to acquire 2D rendering context from canvas.");
}

// Board Configurations Menu Options
window.BOARD_CONFIGS = window.BOARD_CONFIGS || {
    larger_basic: { cols: 24, rows: 34, type: 'larger_basic', tileSize: 30 },
    macro_grid_ay_bv: { cols: 24, rows: 34, type: 'macro_grid_ay_bv', tileSize: 30 }
};

window.ACTIVE_BOARD_CONFIG = window.BOARD_CONFIGS.macro_grid_ay_bv;

// Dynamic grid dimensions and tile size parameters
let cols = window.ACTIVE_BOARD_CONFIG.cols;
let rows = window.ACTIVE_BOARD_CONFIG.rows;
let cellSize = canvas ? canvas.width / cols : window.ACTIVE_BOARD_CONFIG.tileSize;

// Linear interpolation mathematical utility function for smooth movement/transitions
function lerp(start, end, t) {
    return start + (end - start) * t;
}

// Base CDN raw endpoint URL string pointing to remote repository assets
const ghBase = 'https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/';

// Dynamic Loading Screen Overlay Element Creation
const loadingOverlay = document.createElement('div');
loadingOverlay.style.position = 'fixed';
loadingOverlay.style.top = '0';
loadingOverlay.style.left = '0';
loadingOverlay.style.width = '100vw';
loadingOverlay.style.height = '100vh';
loadingOverlay.style.backgroundColor = '#111111';
loadingOverlay.style.zIndex = '9999';
loadingOverlay.style.display = 'flex';
loadingOverlay.style.flexDirection = 'column';
loadingOverlay.style.justifyContent = 'center';
loadingOverlay.style.alignItems = 'center';
loadingOverlay.style.color = '#ffffff';
loadingOverlay.style.fontFamily = 'sans-serif';

loadingOverlay.innerHTML = `
    <h3 style="margin-bottom: 10px; font-weight: 600; letter-spacing: 1px;">Loading Unit Assets...</h3>
    <div style="width: 240px; height: 8px; background: #222; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
        <div id="progressBar" style="width: 0%; height: 100%; background: #2ecc71; transition: width 0.1s ease;"></div>
    </div>
    <span id="progressText" style="margin-top: 10px; font-size: 13px; color: #aaa;">0%</span>
`;
document.body.appendChild(loadingOverlay);

const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// Asset URLs restricted strictly to unit textures
const assetUrls = [
    ghBase + 'blue_tank.jpg',
    ghBase + 'blue_infantry.jpg',
    ghBase + 'blue_artillery.jpg',
    ghBase + 'blue_ship.jpg',
    ghBase + 'red_tank.jpg',
    ghBase + 'red_infantry.jpg',
    ghBase + 'red_artillery.jpg',
    ghBase + 'red_ship.jpg'
];

let loadedCount = 0;
const totalAssets = assetUrls.length;

let blueTankImg = new Image(), blueTankLoaded = false;
let blueInfantryImg = new Image(), blueInfantryLoaded = false;
let blueArtilleryImg = new Image(), blueArtilleryLoaded = false;
let blueShipImg = new Image(), blueShipLoaded = false;

let redTankImg = new Image(), redTankLoaded = false;
let redInfantryImg = new Image(), redInfantryLoaded = false;
let redArtilleryImg = new Image(), redArtilleryLoaded = false;
let redShipImg = new Image(), redShipLoaded = false;

function updateLoadingProgress() {
    loadedCount++;
    let percent = Math.floor((loadedCount / totalAssets) * 100);
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.innerText = percent + '%';

    console.log(`[INFO][map_setup] Asset loaded progress: ${loadedCount}/${totalAssets} (${percent}%)`);

    if (loadedCount >= totalAssets) {
        console.log("[SUCCESS][map_setup] All unit assets loaded successfully.");
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.4s ease';
            setTimeout(() => loadingOverlay.remove(), 400);
        }, 300);
    }
}

function loadAssetWithProgress(url, imgObj, setLoadedFlag) {
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.blob();
        })
        .then(blob => {
            let objectURL = URL.createObjectURL(blob);
            imgObj.src = objectURL;
            imgObj.onload = () => {
                setLoadedFlag(true);
                updateLoadingProgress();
            };
        })
        .catch(err => {
            console.warn(`[WARN][map_setup] Fetch blob failed for ${url}, falling back to direct URL assignment. Error:`, err);
            imgObj.src = url;
            imgObj.onload = () => {
                setLoadedFlag(true);
                updateLoadingProgress();
            };
            imgObj.onerror = (loadErr) => {
                console.error(`[ERROR][map_setup] Completely failed to load asset at URL: ${url}`, loadErr);
                updateLoadingProgress();
            };
        });
}

loadAssetWithProgress(assetUrls[0], blueTankImg, (val) => { blueTankLoaded = val; });
loadAssetWithProgress(assetUrls[1], blueInfantryImg, (val) => { blueInfantryLoaded = val; });
loadAssetWithProgress(assetUrls[2], blueArtilleryImg, (val) => { blueArtilleryLoaded = val; });
loadAssetWithProgress(assetUrls[3], blueShipImg, (val) => { blueShipLoaded = val; });
loadAssetWithProgress(assetUrls[4], redTankImg, (val) => { redTankLoaded = val; });
loadAssetWithProgress(assetUrls[5], redInfantryImg, (val) => { redInfantryLoaded = val; });
loadAssetWithProgress(assetUrls[6], redArtilleryImg, (val) => { redArtilleryLoaded = val; });
loadAssetWithProgress(assetUrls[7], redShipImg, (val) => { redShipLoaded = val; });

function getColName(colIndex) {
    return String.fromCharCode(65 + colIndex);
}

// Complete 24x34 Terrain Mapping derived from Book3.xlsx (Columns AY to BV, Rows 18 to 51)
const macroGridTerrainData = {
  "2,0": "l", "7,0": "l", "8,0": "l", "9,0": "l", "10,0": "g", "11,0": "g", "12,0": "g", "13,0": "l", "14,0": "l", "15,0": "l", "16,0": "l", "17,0": "l", "18,0": "l", "19,0": "l", "20,0": "l", "21,0": "l", "22,0": "l", "23,0": "l",
  "8,1": "l", "9,1": "l", "10,1": "g", "11,1": "gc2", "12,1": "g", "13,1": "l", "14,1": "l", "15,1": "l", "16,1": "l", "17,1": "l", "18,1": "l", "19,1": "l", "20,1": "l", "21,1": "l", "22,1": "l", "23,1": "l",
  "2,2": "g", "3,2": "g", "5,2": "l", "6,2": "l", "8,2": "l", "9,2": "l", "10,2": "g", "11,2": "g", "12,2": "g", "13,2": "l", "14,2": "l", "15,2": "g", "16,2": "g", "17,2": "g", "18,2": "l", "19,2": "l", "20,2": "l", "21,2": "l", "22,2": "l", "23,2": "l",
  "1,3": "l", "2,3": "g", "3,3": "gc1", "4,3": "g", "5,3": "l", "6,3": "l", "7,3": "l", "8,3": "l", "9,3": "l", "10,3": "l", "11,3": "l", "12,3": "l", "13,3": "l", "14,3": "l", "15,3": "g", "16,3": "gc3", "17,3": "g", "18,3": "l", "19,3": "l", "20,3": "l", "21,3": "l", "22,3": "l", "23,3": "l",
  "2,4": "g", "3,4": "g", "4,4": "g", "5,4": "l", "8,4": "nav", "9,4": "l", "10,4": "l", "11,4": "l", "12,4": "l", "13,4": "l", "14,4": "l", "15,4": "g", "16,4": "g", "17,4": "g", "18,4": "l", "19,4": "l", "20,4": "l", "21,4": "l", "22,4": "l", "23,4": "l",
  "1,5": "l", "2,5": "l", "4,5": "l", "7,5": "bb", "8,5": "art", "9,5": "l", "10,5": "l", "15,5": "l", "16,5": "l", "17,5": "l", "18,5": "l", "19,5": "l", "20,5": "l", "21,5": "g", "22,5": "g", "23,5": "g",
  "6,6": "bbc", "7,6": "bb", "8,6": "t", "9,6": "l", "10,6": "l", "15,6": "nav", "16,6": "g", "17,6": "g", "18,6": "g", "19,6": "l", "20,6": "l", "21,6": "g", "22,6": "gc4", "23,6": "g",
  "5,7": "bb", "6,7": "bb", "7,7": "bb", "8,7": "l", "14,7": "l", "15,7": "l", "17,7": "gc5", "18,7": "g", "19,7": "art", "20,7": "l", "21,7": "g", "22,7": "g", "23,7": "g",
  "17,8": "g", "18,8": "g", "19,8": "l", "20,8": "l", "21,8": "l", "22,8": "l", "23,8": "l",
  "17,9": "t", "18,9": "l", "19,9": "l", "20,9": "g", "21,9": "g", "22,9": "g", "23,9": "l",
  "2,10": "l", "13,10": "l", "15,10": "l", "17,10": "l", "18,10": "l", "19,10": "l", "20,10": "g", "21,10": "gc6", "22,10": "g", "23,10": "l",
  "10,11": "l", "17,11": "l", "18,11": "l", "19,11": "l", "20,11": "g", "21,11": "g", "22,11": "g", "23,11": "l",
  "5,12": "l", "7,12": "l", "12,12": "l", "13,12": "l", "14,12": "l", "16,12": "l", "17,12": "l", "18,12": "l", "19,12": "l", "20,12": "l", "21,12": "l", "22,12": "l", "23,12": "l",
  "7,13": "g", "8,13": "g", "11,13": "l", "12,13": "l", "13,13": "l", "14,13": "l", "16,13": "l", "17,13": "l", "18,13": "l", "19,13": "l", "20,13": "l", "21,13": "l", "22,13": "l", "23,13": "l",
  "4,14": "l", "5,14": "nav", "6,14": "g", "7,14": "gc8", "8,14": "g", "9,14": "l", "10,14": "l", "11,14": "l", "12,14": "l", "13,14": "l", "14,14": "l", "17,14": "l", "18,14": "l", "19,14": "l", "20,14": "l", "21,14": "l", "22,14": "l", "23,14": "l",
  "3,15": "l", "4,15": "l", "5,15": "l", "6,15": "g", "7,15": "g", "8,15": "g", "9,15": "l", "10,15": "l", "11,15": "l", "12,15": "g", "13,15": "g", "14,15": "g", "15,15": "l", "17,15": "l", "18,15": "art", "19,15": "t", "20,15": "l", "21,15": "l", "22,15": "l",
  "2,16": "l", "3,16": "l", "4,16": "l", "5,16": "l", "6,16": "l", "7,16": "l", "8,16": "l", "9,16": "l", "10,16": "l", "11,16": "l", "12,16": "g", "13,16": "gc7", "14,16": "g", "15,16": "l", "17,16": "g", "18,16": "g", "19,16": "l", "20,16": "nav",
  "2,17": "l", "3,17": "l", "4,17": "l", "5,17": "l", "6,17": "l", "7,17": "l", "8,17": "l", "9,17": "l", "10,17": "l", "11,17": "l", "12,17": "g", "13,17": "g", "14,17": "g", "17,17": "gc9", "18,17": "g",
  "1,18": "l", "2,18": "l", "3,18": "l", "4,18": "l", "5,18": "l", "6,18": "l", "7,18": "l", "8,18": "l", "9,18": "l", "10,18": "l", "11,18": "l", "12,18": "l", "13,18": "l", "14,18": "l", "15,18": "l", "18,18": "g",
  "0,19": "l", "1,19": "l", "2,19": "l", "3,19": "l", "4,19": "l", "5,19": "l", "6,19": "l", "7,19": "l", "8,19": "l", "9,19": "l", "10,19": "l", "11,19": "l", "12,19": "l", "13,19": "l", "14,19": "l", "15,19": "l", "16,19": "l", "17,19": "l",
  "0,20": "l", "1,20": "l", "2,20": "l", "3,20": "l", "4,20": "l", "5,20": "l", "6,20": "l", "7,20": "l", "8,20": "l", "9,20": "l", "10,20": "l", "11,20": "g", "12,20": "g", "13,20": "g", "14,20": "l", "15,20": "l", "16,20": "l", "17,20": "l",
  "2,21": "l", "3,21": "l", "4,21": "l", "5,21": "l", "6,21": "l", "7,21": "l", "8,21": "l", "9,21": "l", "10,21": "l", "11,21": "g", "12,21": "gc10", "13,21": "g", "14,21": "l", "15,21": "l", "16,21": "l", "17,21": "l",
  "2,22": "l", "3,22": "l", "4,22": "l", "5,22": "l", "6,22": "l", "7,22": "l", "8,22": "l", "9,22": "l", "10,22": "l", "11,22": "g", "12,22": "g", "13,22": "g", "14,22": "l", "15,22": "l", "16,22": "l", "17,22": "l",
  "2,23": "l", "3,23": "l", "4,23": "l", "5,23": "g", "6,23": "g", "7,23": "g", "8,23": "l", "9,23": "l", "10,23": "l", "11,23": "l", "12,23": "l", "13,23": "l", "14,23": "l", "15,23": "l", "16,23": "l", "17,23": "l", "18,23": "l",
  "1,24": "l", "2,24": "l", "3,24": "l", "4,24": "l", "5,24": "g", "6,24": "gc11", "7,24": "g", "8,24": "l", "9,24": "l", "10,24": "l", "11,24": "l", "12,24": "t", "13,24": "art", "14,24": "l", "15,24": "l", "16,24": "l", "17,24": "l", "18,24": "l", "19,24": "l",
  "0,25": "l", "1,25": "l", "2,25": "l", "3,25": "l", "4,25": "l", "5,25": "g", "6,25": "g", "7,25": "g", "8,25": "l", "9,25": "l", "10,25": "l", "11,25": "l", "12,25": "rb", "13,25": "rb", "14,25": "rb", "15,25": "l", "16,25": "l", "17,25": "l", "18,25": "l", "19,25": "l", "20,25": "l",
  "0,26": "l", "1,26": "l", "2,26": "l", "3,26": "l", "4,26": "l", "5,26": "l", "6,26": "l", "7,26": "l", "8,26": "l", "9,26": "l", "10,26": "l", "11,26": "l", "12,26": "rb", "13,26": "rbc", "14,26": "rb", "15,26": "l", "16,26": "l", "17,26": "l", "18,26": "l", "19,26": "l", "20,26": "l",
  "0,27": "l", "1,27": "l", "2,27": "l", "3,27": "l", "4,27": "l", "5,27": "l", "6,27": "l", "7,27": "l", "8,27": "l", "9,27": "l", "10,27": "l", "11,27": "l", "12,27": "rb", "13,27": "rb", "14,27": "rb", "15,27": "l", "16,27": "l", "17,27": "l", "18,27": "l", "19,27": "l", "20,27": "l", "21,27": "l",
  "0,28": "l", "1,28": "l", "2,28": "l", "3,28": "l", "4,28": "l", "5,28": "l", "6,28": "l", "7,28": "l", "8,28": "l", "9,28": "l", "10,28": "l", "11,28": "l", "12,28": "l", "13,28": "l", "14,28": "l", "15,28": "l", "16,28": "l", "17,28": "l", "18,28": "l", "19,28": "l", "20,28": "l", "21,28": "l",
  "1,29": "l", "2,29": "l", "3,29": "l", "4,29": "l", "5,29": "l", "6,29": "l", "7,29": "l", "8,29": "l", "9,29": "l", "10,29": "l", "11,29": "l", "12,29": "l", "13,29": "l", "14,29": "l", "15,29": "l", "16,29": "l", "17,29": "l", "18,29": "l", "19,29": "l", "20,29": "l", "21,29": "l",
  "2,30": "g", "3,30": "g", "4,30": "l", "5,30": "l", "6,30": "l", "7,30": "l", "8,30": "l", "9,30": "l", "10,30": "l", "11,30": "l", "12,30": "l", "13,30": "l", "14,30": "l", "15,30": "l", "16,30": "l", "17,30": "l", "18,30": "l", "19,30": "l", "20,30": "l", "21,30": "l",
  "1,31": "g", "2,31": "gc12", "3,31": "g", "4,31": "l", "5,31": "l", "6,31": "l", "7,31": "l", "8,31": "l", "9,31": "l", "10,31": "l", "11,31": "l", "12,31": "l", "13,31": "l", "14,31": "l", "15,31": "l", "16,31": "l", "17,31": "l", "18,31": "l", "19,31": "l", "20,31": "l",
  "1,32": "g", "2,32": "g", "3,32": "g", "4,32": "l", "5,32": "l", "6,32": "l", "7,32": "l", "8,32": "l", "9,32": "l", "10,32": "l", "11,32": "l", "12,32": "l", "13,32": "l", "14,32": "l", "15,32": "l", "16,32": "l", "17,32": "l", "18,32": "l", "19,32": "l",
  "1,33": "l", "2,33": "l", "3,33": "l", "4,33": "l", "5,33": "l", "6,33": "l", "7,33": "l", "8,33": "l", "9,33": "l", "10,33": "l", "11,33": "l", "12,33": "l", "13,33": "l", "14,33": "l", "15,33": "l", "16,33": "l", "17,33": "l", "18,33": "l", "19,33": "l"
};

function getTerrain(c, r) {
    if (window.ACTIVE_BOARD_CONFIG && window.ACTIVE_BOARD_CONFIG.type === 'macro_grid_ay_bv') {
        const key = `${c},${r}`;
        return macroGridTerrainData[key] || 'l'; // Default to land if unassigned
    }

    // Fallback to legacy layout rules
    const colChar = getColName(c);
    const rowNum = r + 1;
    const coord = colChar + rowNum;

    const waterList = [
        'I5', 'J5', 'I6', 'J6', 'K6', 'H7', 'I7', 'J7', 'K7', 'G8', 'H8', 'I8', 'J8', 'K8', 
        'E9', 'F9', 'G9', 'H9', 'I9', 'J9', 'K9', 'L9', 'E10', 'F10', 'G10', 'H10', 'I10', 
        'J10', 'K10', 'L10', 'F11', 'G11', 'H11', 'I11', 'J11', 'K11', 'L11', 'M11', 'I12', 
        'J12', 'K12', 'L12', 'M12', 'N12', 'K13', 'L13', 'M13', 'N13', 'L14', 'M14', 'N14'
    ];
    if (waterList.includes(coord)) return 'water';
    if (coord === 'F12') return 'blue_navy';
    if (coord === 'L6') return 'red_navy';
    if (coord === 'A12') return 'blue_core';
    if (coord === 'A11' || coord === 'B11' || coord === 'B12' || coord === 'A13' || coord === 'B13') return 'blue_base';
    if (coord === 'L1') return 'red_core';
    if (coord === 'K1' || coord === 'M1' || coord === 'K2' || coord === 'L2' || coord === 'M2') return 'red_base';

    return 'land';
}

function isWaterTerrain(terrain) {
    return terrain === 'water' || terrain === 'blue_navy' || terrain === 'red_navy' || terrain === 'g';
}

// Procedural In-Web Grid System Render Function
function drawGridMap() {
    if (!ctx) return;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let terrain = getTerrain(c, r);
            let fillColor = '#d5dbdb'; // Default land color

            if (terrain === 'l' || terrain === 'land') fillColor = '#a9dfbf';
            else if (terrain === 'water' || terrain === 'g') fillColor = '#2980b9';
            else if (terrain === 'blue_navy') fillColor = '#1f618d';
            else if (terrain === 'red_navy') fillColor = '#b03a2e';
            else if (terrain === 'blue_core') fillColor = '#85c1e9';
            else if (terrain === 'blue_base') fillColor = '#aed6f1';
            else if (terrain === 'red_core') fillColor = '#b03a2e';
            else if (terrain === 'red_base') fillColor = '#f5b7b1';
            else if (terrain === 'bb') fillColor = '#f1c40f'; // Yellow base structure
            else if (terrain === 'bbc') fillColor = '#7f8c8d'; // Blue command center / obstacle
            else if (terrain === 'rb') fillColor = '#f9e79f'; // Red base structure
            else if (terrain === 'rbc') fillColor = '#e74c3c'; // Red command center
            else if (terrain === 'art') fillColor = '#e67e22'; // Artillery emplacement
            else if (terrain === 'nav') fillColor = '#8e44ad'; // Navigation node
            else if (terrain === 't') fillColor = '#95a5a6';   // Terrain obstacle
            else if (terrain && terrain.startsWith('gc')) fillColor = '#3498db'; // Grid centers 1-12

            // Fill cell background
            ctx.fillStyle = fillColor;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);

            // Draw crisp visible grid lines and coordinate labels
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);

            // Optional subtle coordinate text inside tiles
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.font = '8px sans-serif';
            ctx.fillText(getColName(c) + (r + 1), c * cellSize + 3, r * cellSize + 10);
        }
    }
}

let units = [];

function getBaseSquares(team) {
    let squares = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let t = getTerrain(c, r);
            if (team === 'blue' && (t === 'blue_base' || t === 'blue_core' || t === 'bb' || t === 'bbc')) squares.push({c, r});
            if (team === 'red' && (t === 'red_base' || t === 'red_core' || t === 'rb' || t === 'rbc')) squares.push({c, r});
        }
    }
    return squares;
}

function spawnTeam(team) {
    let isBlue = (team === 'blue');
    let baseSquares = getBaseSquares(team);
    let startPos = baseSquares.length > 0 ? baseSquares[0] : {c: isBlue ? 0 : (cols - 1), r: isBlue ? (rows - 1) : 0};

    let infImgRef = isBlue ? blueInfantryImg : redInfantryImg;
    let infLoadRef = () => isBlue ? blueInfantryLoaded : redInfantryLoaded;

    units.push({ 
        name: 'Infantry', 
        type: 'land', 
        range: 2, 
        gridX: startPos.c, 
        gridY: startPos.r, 
        x: startPos.c * cellSize, 
        y: startPos.r * cellSize, 
        img: infImgRef, 
        loaded: infLoadRef,
        team: team 
    });

    console.log(`[SUCCESS][map_setup] Team '${team}' successfully spawned with initial infantry at (${startPos.c}, ${startPos.r}).`);
}

window.initGameMap = function(config) {
    const boardConfig = config || window.ACTIVE_BOARD_CONFIG || window.BOARD_CONFIGS.macro_grid_ay_bv;
    window.ACTIVE_BOARD_CONFIG = boardConfig;

    cols = boardConfig.cols || 24;
    rows = boardConfig.rows || 34;

    if (canvas) {
        cellSize = canvas.width / cols;
    } else {
        cellSize = boardConfig.tileSize || 30;
    }

    units = [];
    spawnTeam('blue');
    spawnTeam('red');

    console.log(`[SUCCESS][map_setup] Map re-initialized for preset: '${boardConfig.type}' (${cols}x${rows} grid, cellSize: ${cellSize}px).`);
};

// Initialize with the new Macro Grid map by default
window.initGameMap(window.BOARD_CONFIGS.macro_grid_ay_bv);

console.log("[SUCCESS][map_setup] Map setup script loaded with Macro Grid System (AY-BV, 18-51) successfully.");
