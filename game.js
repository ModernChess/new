const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const cols = 18;
const rows = 18;
const cellSize = canvas.width / cols;

function lerp(start, end, t) {
    return start + (end - start) * t;
}

const ghBase = 'https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/';

// Dynamic Loading Screen Overlay
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
    <h3 style="margin-bottom: 10px; font-weight: 600; letter-spacing: 1px;">Loading Game Assets...</h3>
    <div style="width: 240px; height: 8px; background: #222; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
        <div id="progressBar" style="width: 0%; height: 100%; background: #2ecc71; transition: width 0.1s ease;"></div>
    </div>
    <span id="progressText" style="margin-top: 10px; font-size: 13px; color: #aaa;">0%</span>
`;
document.body.appendChild(loadingOverlay);

const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

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

function updateLoadingProgress() {
    loadedCount++;
    let percent = Math.floor((loadedCount / totalAssets) * 100);
    progressBar.style.width = percent + '%';
    progressText.innerText = percent + '%';

    if (loadedCount >= totalAssets) {
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
            if (!response.ok) throw new Error('Network response was not ok');
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
            imgObj.src = url;
            imgObj.onload = () => {
                setLoadedFlag(true);
                updateLoadingProgress();
            };
            imgObj.onerror = () => {
                updateLoadingProgress();
            };
        });
}

loadAssetWithProgress(assetUrls[0], mapImg, (val) => { mapLoaded = val; });
loadAssetWithProgress(assetUrls[1], blueTankImg, (val) => { blueTankLoaded = val; });
loadAssetWithProgress(assetUrls[2], blueInfantryImg, (val) => { blueInfantryLoaded = val; });
loadAssetWithProgress(assetUrls[3], blueArtilleryImg, (val) => { blueArtilleryLoaded = val; });
loadAssetWithProgress(assetUrls[4], blueShipImg, (val) => { blueShipLoaded = val; });
loadAssetWithProgress(assetUrls[5], redTankImg, (val) => { redTankLoaded = val; });
loadAssetWithProgress(assetUrls[6], redInfantryImg, (val) => { redInfantryLoaded = val; });
loadAssetWithProgress(assetUrls[7], redArtilleryImg, (val) => { redArtilleryLoaded = val; });
loadAssetWithProgress(assetUrls[8], redShipImg, (val) => { redShipLoaded = val; });

function getTerrain(c, r) {
    // Convert 0-indexed column and row to Excel style (e.g. c=0, r=0 -> A1)
    const colChar = String.fromCharCode(65 + c);
    const rowNum = r + 1;
    const coord = colChar + rowNum;

    // Water
    const waterList = [
        'I5', 'J5', 'I6', 'J6', 'K6', 'H7', 'I7', 'J7', 'K7', 'G8', 'H8', 'I8', 'J8', 'K8', 
        'E9', 'F9', 'G9', 'H9', 'I9', 'J9', 'K9', 'L9', 'E10', 'F10', 'G10', 'H10', 'I10', 
        'J10', 'K10', 'L10', 'F11', 'G11', 'H11', 'I11', 'J11', 'K11', 'L11', 'M11', 'I12', 
        'J12', 'K12', 'L12', 'M12', 'N12', 'K13', 'L13', 'M13', 'N13', 'L14', 'M14', 'N14'
    ];
    if (waterList.includes(coord)) return 'water';

    // Navy Docks
    if (coord === 'F12') return 'blue_navy';
    if (coord === 'L6') return 'red_navy';

    // Team Bases & Cores
    if (coord === 'A12') return 'blue_core';
    if (coord === 'A11' || coord === 'B11' || coord === 'B12' || coord === 'A13' || coord === 'B13') return 'blue_base';

    if (coord === 'L1') return 'red_core';
    if (coord === 'K1' || coord === 'M1' || coord === 'K2' || coord === 'L2' || coord === 'M2') return 'red_base';

    // Gold Mines & Cores
    const goldCores = ['G5', 'B6', 'M8', 'F15', 'Q13', 'L17'];
    if (goldCores.includes(coord)) return 'gold_core';

    const goldList = [
        'F4', 'G4', 'H4', 'A5', 'B5', 'C5', 'F5', 'H5', 'A6', 'C6', 'F6', 'G6', 'H6', 
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

let units = [];

function getBaseSquares(team) {
    let squares = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let t = getTerrain(c, r);
            if (team === 'blue' && (t === 'blue_base' || t === 'blue_core')) {
                squares.push({c, r});
            }
            if (team === 'red' && (t === 'red_base' || t === 'red_core')) {
                squares.push({c, r});
            }
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
    return {c:0, r:0};
}

function spawnTeam(team) {
    let isBlue = (team === 'blue');
    let baseSquares = getBaseSquares(team);
    let port = getPortSquare(team);

    let tankImgRef = isBlue ? blueTankImg : redTankImg;
    let tankLoadRef = () => isBlue ? blueTankLoaded : redTankLoaded;
    let infImgRef = isBlue ? blueInfantryImg : redInfantryImg;
    let infLoadRef = () => isBlue ? blueInfantryLoaded : redInfantryLoaded;
    let artImgRef = isBlue ? blueArtilleryImg : redArtilleryImg;
    let artLoadRef = () => isBlue ? blueArtilleryLoaded : redArtilleryLoaded;
    let shipImgRef = isBlue ? blueShipImg : redShipImg;
    let shipLoadRef = () => isBlue ? blueShipLoaded : redShipLoaded;

    // Ship spawns directly on its assigned team's navy dock
    units.push({ name: 'Ship', type: 'water', range: 2, gridX: port.c, gridY: port.r, x: port.c*cellSize, y: port.r*cellSize, img: shipImgRef, loaded: shipLoadRef });

    function getUniqueBasePos() {
        let available = baseSquares.filter(b => !units.some(u => u.gridX === b.c && u.gridY === b.r));
        if (available.length === 0) return baseSquares[0];
        let idx = Math.floor(Math.random() * available.length);
        return available[idx];
    }

    for (let i = 0; i < 3; i++) {
        let pos = getUniqueBasePos();
        units.push({ name: 'Tank', type: 'land', range: 3, gridX: pos.c, gridY: pos.r, x: pos.c*cellSize, y: pos.r*cellSize, img: tankImgRef, loaded: tankLoadRef });
    }

    for (let i = 0; i < 5; i++) {
        let pos = getUniqueBasePos();
        units.push({ name: 'Infantry', type: 'land', range: 2, gridX: pos.c, gridY: pos.r, x: pos.c*cellSize, y: pos.r*cellSize, img: infImgRef, loaded: infLoadRef });
    }

    let artPos = getUniqueBasePos();
    units.push({ name: 'Artillery', type: 'land', range: 2, gridX: artPos.c, gridY: artPos.r, x: artPos.c*cellSize, y: artPos.r*cellSize, img: artImgRef, loaded: artLoadRef });
}

spawnTeam('blue');
spawnTeam('red');

let selectedUnit = null;     
let legalMoves = [];         
let targetTile = null;       
let pressTimer = null;       

function getLegalMoves(unit) {
    let moves = [];
    let maxRange = unit.range;
    let cx = unit.gridX;
    let cy = unit.gridY;

    let directions = [
        {dx: 0, dy: -1}, {dx: 0, dy: 1},  
        {dx: -1, dy: 0}, {dx: 1, dy: 0},  
        {dx: -1, dy: -1}, {dx: 1, dy: -1}, 
        {dx: -1, dy: 1}, {dx: 1, dy: 1}    
    ];

    directions.forEach(dir => {
        for (let step = 1; step <= maxRange; step++) {
            let nc = cx + (dir.dx * step);
            let nr = cy + (dir.dy * step);

            if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
                let terrain = getTerrain(nc, nr);
                let isWater = isWaterTerrain(terrain);

                let validTerrain = false;
                if (unit.type === 'land' && !isWater) validTerrain = true;
                if (unit.type === 'water' && isWater) validTerrain = true;

                if (!validTerrain) break;

                moves.push({c: nc, r: nr});
            } else {
                break;
            }
        }
    });

    return moves;
}

canvas.addEventListener('pointerdown', (e) => {
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;

    let touchX = (e.clientX - rect.left) * scaleX;
    let touchY = (e.clientY - rect.top) * scaleY;

    let c = Math.floor(touchX / cellSize);
    let r = Math.floor(touchY / cellSize);

    if (r >= 0 && r < rows && c >= 0 && c < cols) {
        let clickedUnit = units.find(u => u.gridX === c && u.gridY === r);

        if (clickedUnit) {
            pressTimer = setTimeout(() => {
                selectedUnit = clickedUnit;
                legalMoves = getLegalMoves(clickedUnit);
                targetTile = null; 
            }, 500); 
        } else {
            if (selectedUnit) {
                let isLegal = legalMoves.some(m => m.c === c && m.r === r);

                if (isLegal) {
                    if (targetTile && targetTile.c === c && targetTile.r === r) {
                        selectedUnit.gridX = c;
                        selectedUnit.gridY = r;

                        selectedUnit = null;
                        legalMoves = [];
                        targetTile = null;
                    } else {
                        targetTile = { c: c, r: r };
                    }
                }
            }
        }
    }
});

canvas.addEventListener('pointerup', () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
});
canvas.addEventListener('pointercancel', () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
});

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mapLoaded) {
        ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    units.forEach(u => {
        let targetX = u.gridX * cellSize;
        let targetY = u.gridY * cellSize;
        
        u.x = lerp(u.x, targetX, 0.025);
        u.y = lerp(u.y, targetY, 0.025);

        let isMoving = Math.abs(u.x - targetX) > 0.1 || Math.abs(u.y - targetY) > 0.1;
        let vibX = isMoving ? (Math.random() - 0.5) * 1.2 : 0;
        let vibY = isMoving ? (Math.random() - 0.5) * 1.2 : 0;

        u.renderX = u.x + vibX;
        u.renderY = u.y + vibY;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(u.renderX + cellSize / 2, u.renderY + cellSize - 8, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
    });

    if (selectedUnit) {
        ctx.strokeStyle = '#ff8000';
        ctx.lineWidth = 3;
        legalMoves.forEach(m => {
            ctx.strokeRect(m.c * cellSize + 2, m.r * cellSize + 2, cellSize - 4, cellSize - 4);
        });

        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 4;
        ctx.strokeRect(selectedUnit.renderX + 2, selectedUnit.renderY + 2, cellSize - 4, cellSize - 4);
    }

    if (targetTile) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.strokeRect(targetTile.c * cellSize + 2, targetTile.r * cellSize + 2, cellSize - 4, cellSize - 4);
    }

    units.forEach(u => {
        if (u.loaded()) {
            ctx.drawImage(u.img, u.renderX + 2, u.renderY + 2, cellSize - 4, cellSize - 4);
        }
    });

    requestAnimationFrame(update);
}

update();
