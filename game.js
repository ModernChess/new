const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const cols = 18;
const rows = 18;
const cellSize = canvas.width / cols;

function lerp(start, end, t) {
    return start + (end - start) * t;
}

const ghBase = 'https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/';

// 1. CREATE PROFESSIONAL SPLASH SCREEN (Logo Reveal)
const splashOverlay = document.createElement('div');
splashOverlay.style.position = 'fixed';
splashOverlay.style.top = '0';
splashOverlay.style.left = '0';
splashOverlay.style.width = '100vw';
splashOverlay.style.height = '100vh';
splashOverlay.style.backgroundColor = '#0d0d0d';
splashOverlay.style.zIndex = '10000';
splashOverlay.style.display = 'flex';
splashOverlay.style.flexDirection = 'column';
splashOverlay.style.justifyContent = 'center';
splashOverlay.style.alignItems = 'center';
splashOverlay.style.opacity = '1';
splashOverlay.style.transition = 'opacity 0.6s ease';

// Logo element with professional styling and fade-in pulse effect
const splashLogo = document.createElement('img');
splashLogo.src = ghBase + 'logo.png';
splashLogo.style.width = '160px';
splashLogo.style.height = '160px';
splashLogo.style.objectFit = 'contain';
splashLogo.style.borderRadius = '24px';
splashLogo.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
splashLogo.style.transform = 'scale(0.95)';
splashLogo.style.transition = 'transform 1.5s ease, opacity 1s ease';

splashOverlay.appendChild(splashLogo);
document.body.appendChild(splashOverlay);

// Trigger smooth logo entrance animation
setTimeout(() => {
    splashLogo.style.transform = 'scale(1)';
}, 50);

// 2. CREATE LOADING SCREEN OVERLAY (Appears after splash screen completes)
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
loadingOverlay.style.opacity = '0';
loadingOverlay.style.pointerEvents = 'none';
loadingOverlay.style.transition = 'opacity 0.4s ease';
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

// 3. SEQUENCE MANAGER: 3-Second Splash Delay -> Fade to Loading Screen -> Fetch Assets
setTimeout(() => {
    // Fade out splash screen
    splashOverlay.style.opacity = '0';
    setTimeout(() => {
        splashOverlay.remove();
        // Activate loading screen view
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.pointerEvents = 'auto';

        // Begin loading assets
        loadAssetWithProgress(assetUrls[0], mapImg, (val) => { mapLoaded = val; });
        loadAssetWithProgress(assetUrls[1], blueTankImg, (val) => { blueTankLoaded = val; });
        loadAssetWithProgress(assetUrls[2], blueInfantryImg, (val) => { blueInfantryLoaded = val; });
        loadAssetWithProgress(assetUrls[3], blueArtilleryImg, (val) => { blueArtilleryLoaded = val; });
        loadAssetWithProgress(assetUrls[4], blueShipImg, (val) => { blueShipLoaded = val; });
        loadAssetWithProgress(assetUrls[5], redTankImg, (val) => { redTankLoaded = val; });
        loadAssetWithProgress(assetUrls[6], redInfantryImg, (val) => { redInfantryLoaded = val; });
        loadAssetWithProgress(assetUrls[7], redArtilleryImg, (val) => { redArtilleryLoaded = val; });
        loadAssetWithProgress(assetUrls[8], redShipImg, (val) => { redShipLoaded = val; });
    }, 600);
}, 3000);

function getTerrain(c, r) {
    if ((c >= 6 && c <= 8) && (r === 0 || r === 1)) {
        if (c === 7 && r === 0) return 'gold_core';
        return 'gold';
    }
    if ((c >= 6 && c <= 8) && (r >= 4 && r <= 6)) {
        if (c === 7 && r === 5) return 'gold_core';
        return 'gold';
    }
    if (c === 8 && r === 6) return 'gold';
    if ((c >= 14 && c <= 16) && (r >= 6 && r <= 8)) {
        if (c === 15 && r === 7) return 'gold_core';
        return 'gold';
    }
    if ((c >= 13 && c <= 15) && (r >= 12 && r <= 14)) {
        if (c === 14 && r === 13) return 'gold_core';
        return 'gold';
    }
    if ((c >= 2 && c <= 4) && (r >= 10 && r <= 12)) {
        if (c === 3 && r === 11) return 'gold_core';
        return 'gold';
    }
    if ((c >= 2 && c <= 4) && (r >= 16 && r === 17)) {
        if (c === 3 && r === 17) return 'gold_core';
        return 'gold';
    }

    if (c === 4 && (r === 8 || r === 9)) return 'water';
    if (c === 5 && (r >= 7 && r <= 9)) return 'water';
    if (c === 6 && (r >= 7 && r <= 10)) return 'water';
    if (c === 7 && (r >= 7 && r <= 11)) return 'water';
    if (c === 8 && (r >= 6 && r <= 13)) return 'water';
    if (c === 9 && (r >= 6 && r <= 13)) return 'water';
    if (c === 10 && (r >= 5 && r <= 12)) return 'water';
    if (c === 11 && (r >= 4 && r <= 9)) return 'water';
    if (c === 12 && (r >= 4 && r <= 7)) return 'water';
    if (c === 13 && (r >= 4 && r <= 6)) return 'water';

    if ((c >= 10 && c <= 12) && (r === 16 || r === 17)) {
        if (c === 11 && r === 17) return 'blue_core';
        return 'blue_base';
    }

    if ((c === 15 && r === 0) || (c === 16 && r === 0) || (c === 16 && r === 1) || (c === 17 && r === 0) || (c === 17 && r === 1) || (c === 17 && r === 2)) {
        if (c === 17 && r === 0) return 'red_core';
        return 'red_base';
    }

    if (c === 8 && r === 14) return 'blue_navy';
    if (c === 14 && r === 3) return 'red_navy';

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
