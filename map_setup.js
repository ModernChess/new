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

// Dynamic grid dimensions and tile size parameters (overwritten on initGameMap) - Updated to Larger Board (24x34)
let cols = 24;
let rows = 34;
let cellSize = canvas ? canvas.width / cols : 30;

// Linear interpolation mathematical utility function for smooth movement/transitions
function lerp(start, end, t) {
    return start + (end - start) * t;
}

// Base CDN raw endpoint URL string pointing to remote repository assets (Map image removed)
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

// Injects inner HTML markup elements for the loading progress indicator bar
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

// Asset URLs restricted strictly to unit textures (external map image excluded)
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

let mapLoaded = true; 

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

// Initiates background loading tasks for unit textures only
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

function getTerrain(c, r) {
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

    const goldCoresList = ['G5', 'B6', 'M8', 'F15', 'Q13', 'L17'];
    if (goldCoresList.includes(coord)) return 'gold_core';

    const goldList = [
        'F4', 'G4', 'H4', 'A5', 'B5', 'C5', 'F4', 'F5', 'H5', 'A6', 'C6', 'F6', 'G6', 'H6', 
        'A7', 'B7', 'C7', 'L7', 'M7', 'N7', 'L8', 'N8', 'M9', 'N9', 'P12', 'Q12', 'R12', 
        'P13', 'R13', 'E14', 'F14', 'G14', 'P14', 'Q14', 'R14', 'E15', 'G15', 'E16', 'F16', 
        'G16', 'K16', 'L16', 'M16', 'K17', 'M17', 'K18', 'L18', 'M18'
    ];
    if (goldList.includes(coord)) return 'gold';

    return 'land';
}

function isWaterTerrain(terrain) {
    return terrain === 'water' || terrain === 'blue_navy' || terrain === 'red_navy';
}

// Procedural In-Web Grid System Render Function
function drawGridMap() {
    if (!ctx) return;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let terrain = getTerrain(c, r);
            let fillColor = '#d5dbdb'; // Default land color

            if (terrain === 'water') fillColor = '#2980b9';
            else if (terrain === 'blue_navy') fillColor = '#1f618d';
            else if (terrain === 'red_navy') fillColor = '#b03a2e';
            else if (terrain === 'blue_core' || terrain === 'blue_base') fillColor = '#85c1e9';
            else if (terrain === 'red_core' || terrain === 'red_base') fillColor = '#f5b7b1';
            else if (terrain === 'gold_core') fillColor = '#f1c40f';
            else if (terrain === 'gold') fillColor = '#f9e79f';
            else if (terrain === 'land') fillColor = '#a9dfbf';

            // Fill cell background
            ctx.fillStyle = fillColor;
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);

            // Draw crisp visible grid lines and coordinate labels
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);

            // Optional subtle coordinate text inside tiles for debugging/clarity
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
            if (team === 'blue' && (t === 'blue_base' || t === 'blue_core')) squares.push({c, r});
            if (team === 'red' && (t === 'red_base' || t === 'red_core')) squares.push({c, r});
        }
    }
    return squares;
}

function getPortSquare(team) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let t = getTerrain(c, r);
            if (team === 'blue' && t === 'blue_navy') return {c, r};
            if (team === 'red' && t === 'red_navy') return {c, r};
        }
    }
    console.warn(`[WARN][map_setup] Port square not found for team '${team}'. Defaulting to (0,0).`);
    return {c: 0, r: 0};
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

    console.log(`[SUCCESS][map_setup] Team '${team}' successfully spawned with lone initial infantry at (${startPos.c}, ${startPos.r}).`);
}

window.initGameMap = function(config) {
    const boardConfig = config || window.ACTIVE_BOARD_CONFIG || window.BOARD_CONFIGS.larger_basic;

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

window.initGameMap(window.BOARD_CONFIGS ? window.BOARD_CONFIGS.larger_basic : { cols: 24, rows: 34, type: 'larger_basic' });

console.log("[SUCCESS][map_setup] Map setup script loaded with In-Web Grid System successfully.");
