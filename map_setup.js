// =========================================================================
// MAP SETUP & ASSET INITIALIZATION CONTROLLER
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

// Defines the total number of grid columns on the game board map
const cols = 18;
// Defines the total number of grid rows on the game board map
const rows = 18;
// Calculates individual cell pixel dimensions relative to total canvas width
const cellSize = canvas ? canvas.width / cols : 0;

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
// Injects inner HTML markup elements for the loading progress indicator bar
loadingOverlay.innerHTML = `
    <h3 style="margin-bottom: 10px; font-weight: 600; letter-spacing: 1px;">Loading Game Assets...</h3>
    <div style="width: 240px; height: 8px; background: #222; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
        <div id="progressBar" style="width: 0%; height: 100%; background: #2ecc71; transition: width 0.1s ease;"></div>
    </div>
    <span id="progressText" style="margin-top: 10px; font-size: 13px; color: #aaa;">0%</span>
`;
// Appends the loading overlay dynamically directly to the document body
document.body.appendChild(loadingOverlay);

// References to the progress bar and text percentage display elements
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// Array list containing all external remote asset file download links
const assetUrls = [
    ghBase + 'map2.png',
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

// Image objects and corresponding boolean loaded state trackers
let mapImg = new Image();
let mapLoaded = false;

let blueTankImg = new Image(), blueTankLoaded = false;
let blueInfantryImg = new Image(), blueInfantryLoaded = false;
let blueArtilleryImg = new Image(), blueArtilleryLoaded = false;
let blueShipImg = new Image(), blueShipLoaded = false;

let redTankImg = new Image(), redTankLoaded = false;
let redInfantryImg = new Image(), redInfantryLoaded = false;
let redArtilleryImg = new Image(), redArtilleryLoaded = false;
let redShipImg = new Image(), redShipLoaded = false;

// Updates progress bar width and text percentage as assets finish loading
function updateLoadingProgress() {
    loadedCount++;
    let percent = Math.floor((loadedCount / totalAssets) * 100);
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.innerText = percent + '%';

    console.log(`[INFO][map_setup] Asset loaded progress: ${loadedCount}/${totalAssets} (${percent}%)`);

    // Fades out and removes loading overlay once all assets have successfully loaded
    if (loadedCount >= totalAssets) {
        console.log("[SUCCESS][map_setup] All game assets loaded successfully.");
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.4s ease';
            setTimeout(() => loadingOverlay.remove(), 400);
        }, 300);
    }
}

// Robust asset loader function using fetch blob caching with fallback error handling
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

// Initiates background loading tasks for all map and unit textures
loadAssetWithProgress(assetUrls[0], mapImg, (val) => { mapLoaded = val; });
loadAssetWithProgress(assetUrls[1], blueTankImg, (val) => { blueTankLoaded = val; });
loadAssetWithProgress(assetUrls[2], blueInfantryImg, (val) => { blueInfantryLoaded = val; });
loadAssetWithProgress(assetUrls[3], blueArtilleryImg, (val) => { blueArtilleryLoaded = val; });
loadAssetWithProgress(assetUrls[4], blueShipImg, (val) => { blueShipLoaded = val; });
loadAssetWithProgress(assetUrls[5], redTankImg, (val) => { redTankLoaded = val; });
loadAssetWithProgress(assetUrls[6], redInfantryImg, (val) => { redInfantryLoaded = val; });
loadAssetWithProgress(assetUrls[7], redArtilleryImg, (val) => { redArtilleryLoaded = val; });
loadAssetWithProgress(assetUrls[8], redShipImg, (val) => { redShipLoaded = val; });

// Determines terrain type classification based on specific grid coordinates
function getTerrain(c, r) {
    const colChar = String.fromCharCode(65 + c);
    const rowNum = r + 1;
    const coord = colChar + rowNum;

    // List of map coordinates designated as water terrain tiles
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

// Utility check to determine if a terrain string qualifies as water
function isWaterTerrain(terrain) {
    return terrain === 'water' || terrain === 'blue_navy' || terrain === 'red_navy';
}

// Global array holding active game units - modified to start with a LONE INFANTRY per team
let units = [];

// Retrieves array of coordinates corresponding to a team's base and core structures
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

// Finds the designated navy port square for a given team
function getPortSquare(team) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let t = getTerrain(c, r);
            if (team === 'blue' && t === 'blue_navy') return {c, r};
            if (team === 'red' && t === 'red_navy') return {c, r};
        }
    }
    console.warn(`[WARN][map_setup] Port square not found for team '${team}'. Defaulting to (0,0).`);
    return {c:0, r:0};
}

// Spawns initial units: modified so each side begins with just a lone infantry unit instead of the full army
function spawnTeam(team) {
    let isBlue = (team === 'blue');
    let baseSquares = getBaseSquares(team);
    let startPos = baseSquares.length > 0 ? baseSquares[0] : {c: isBlue ? 0 : 11, r: isBlue ? 11 : 0};

    let infImgRef = isBlue ? blueInfantryImg : redInfantryImg;
    let infLoadRef = () => isBlue ? blueInfantryLoaded : redInfantryLoaded;

    // Game begins with a lone infantry per side
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

    console.log(`[SUCCESS][map_setup] Team '${team}' successfully spawned with lone initial infantry.`);
}

// Triggers initial team spawning sequence for both factions
spawnTeam('blue');
spawnTeam('red');

console.log("[SUCCESS][map_setup] Map setup script loaded and execution initialized cleanly.");
