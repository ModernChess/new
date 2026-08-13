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
    ghBase + 'map1.png',
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
    // Note: c (column) and r (row) are 0-indexed (A=0, 1=row 0)
    
    // Gold Cores & Gold Squares
    // Top Cluster (Cols 5-7 [F-H], Rows 3-4 [4-5]) -> Core at G5 (6, 4)
    if (c >= 5 && c <= 7 && r >= 3 && r <= 4) {
        if (c === 6 && r === 4) return 'gold_core';
        return 'gold';
    }
    // Left Cluster (Cols 0-2 [A-C], Rows 4-6 [5-7]) -> Core at B6 (1, 5)
    if (c >= 0 && c <= 2 && r >= 4 && r <= 6) {
        if (c === 1 && r === 5) return 'gold_core';
        return 'gold';
    }
    // Upper-Right Cluster (Cols 11-13 [L-N], Rows 6-8 [7-9]) -> Core at M8 (12, 7)
    if (c >= 11 && c <= 13 && r >= 6 && r <= 8) {
        if (c === 12 && r === 7) return 'gold_core';
        return 'gold';
    }
    // Lower-Left Cluster (Cols 3-5 [D-F], Rows 13-15 [14-16]) -> Core at E15 (4, 14)
    if (c >= 3 && c <= 5 && r >= 13 && r <= 15) {
        if (c === 4 && r === 14) return 'gold_core';
        return 'gold';
    }
    // Bottom-Right Cluster (Cols 10-12 [K-M], Rows 15-17 [16-18]) -> Core at L17 (11, 16)
    if (c >= 10 && c <= 12 && r >= 15 && r <= 17) {
        if (c === 11 && r === 16) return 'gold_core';
        return 'gold';
    }
    // Far-Right Cluster (Cols 15-17 [P-R], Rows 11-13 [12-14]) -> Core at Q13 (16, 12)
    if (c >= 15 && c <= 17 && r >= 11 && r <= 13) {
        if (c === 16 && r === 12) return 'gold_core';
        return 'gold';
    }

    // Water Cluster (Dark Blue spanning columns E-N [4-13] and rows 5-14 [4-13])
    if (c >= 4 && c <= 13 && r >= 4 && r <= 13) {
        return 'water';
    }

    // Blue Team (Light Blue squares at Cols 0-1 [A-B], Rows 10-12 [11-13]) -> Core at B12 (1, 11)
    if (c >= 0 && c <= 1 && r >= 10 && r <= 12) {
        if (c === 1 && r === 11) return 'blue_core';
        return 'blue_base';
    }

    // Red Team (Red squares at Cols 10-12 [K-M], Rows 0-1 [1-2]) -> Core at L1 (11, 0)
    if (c >= 10 && c <= 12 && r >= 0 && r <= 1.2) {
        if (c === 11 && r === 0) return 'red_core';
        return 'red_base';
    }

    // Navy Docks (Purple cells at L6 -> index (11, 5) and D12 -> index (3, 11))
    if (c === 11 && r === 5) return 'blue_navy';
    if (c === 3 && r === 11) return 'red_navy';

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
