// --- Team & Turn Mechanics ---
let currentTurn = 'blue'; // 'blue' or 'red'
let blueCoins = 0;
let redCoins = 0;

// Asset loading for flags and coins
const coinImg = new Image();
coinImg.src = ghBase + 'Coin.png';

const blueFlagImg = new Image();
blueFlagImg.src = ghBase + 'blue_flag.jpg';

const redFlagImg = new Image();
redFlagImg.src = ghBase + 'red_flag.jpg';

// Gold Cores and their associated territory / captured state
const goldCoresData = [
    { coord: 'G5', c: 6, r: 4, owner: null },
    { coord: 'B6', c: 1, r: 5, owner: null },
    { coord: 'M8', c: 12, r: 7, owner: null },
    { coord: 'F15', c: 5, r: 14, owner: null },
    { coord: 'Q13', c: 16, r: 12, owner: null },
    { coord: 'L17', c: 11, r: 16, owner: null }
];

// Map gold squares to their nearest gold core
function getNearestCore(c, r) {
    let nearest = goldCoresData[0];
    let minDist = 9999;
    goldCoresData.forEach(core => {
        let dist = Math.abs(core.c - c) + Math.abs(core.r - r);
        if (dist < minDist) {
            minDist = dist;
            nearest = core;
        }
    });
    return nearest;
}

// Check if a tile is a gold core (reserved for flags, units cannot stand on them)
function isGoldCore(c, r) {
    return goldCoresData.some(core => core.c === c && core.r === r);
}

// Override or extend unit movement validation to block gold cores & enforce turns
function getTeamFromUnit(unit) {
    if (unit.img === blueTankImg || unit.img === blueInfantryImg || unit.img === blueArtilleryImg || unit.img === blueShipImg) {
        return 'blue';
    }
    return 'red';
}

// Hook into movement execution to check gold captures and switch turns
function tryMoveUnit(unit, targetC, targetR) {
    let unitTeam = getTeamFromUnit(unit);
    if (unitTeam !== currentTurn) {
        return false; // Not this team's turn!
    }

    if (isGoldCore(targetC, targetR)) {
        return false; // Gold cores are reserved for flags only!
    }

    let legal = getLegalMoves(unit);
    let isLegal = legal.some(m => m.c === targetC && m.r === targetR);
    if (!isLegal) return false;

    // Execute move
    unit.gridX = targetC;
    unit.gridY = targetR;

    // Check if land unit reached a gold square
    let terrain = getTerrain(targetC, targetR);
    if (terrain === 'gold') {
        let core = getNearestCore(targetC, targetR);
        if (core.owner !== unitTeam) {
            // Capture core if unowned or owned by enemy
            if (core.owner === 'blue') blueCoins = Math.max(0, blueCoins - 1);
            if (core.owner === 'red') redCoins = Math.max(0, redCoins - 1);

            core.owner = unitTeam;
            if (unitTeam === 'blue') blueCoins++;
            if (unitTeam === 'red') redCoins++;
        }
    }

    // Switch turn
    currentTurn = (currentTurn === 'blue') ? 'red' : 'blue';
    return true;
}

// Draw UI overlay for turns and coins, plus flags on captured gold cores
function drawTeamUIAndFlags() {
    // 1. Draw Flags on Captured Cores (Bottom of image aligned with bottom of core square, extending upwards)
    goldCoresData.forEach(core => {
        if (core.owner) {
            let flagImg = (core.owner === 'blue') ? blueFlagImg : redFlagImg;
            let px = core.c * cellSize;
            let py = core.r * cellSize;
            
            // High height, low width flag proportions
            let flagWidth = cellSize * 0.7;
            let flagHeight = cellSize * 1.8;
            let drawX = px + (cellSize - flagWidth) / 2;
            let drawY = (py + cellSize) - flagHeight; // Bottom aligned with bottom of tile

            if (flagImg.complete && flagImg.naturalWidth !== 0) {
                ctx.drawImage(flagImg, drawX, drawY, flagWidth, flagHeight);
            }
        }
    });

    // 2. Draw Turn & Coin HUD overlay at top of canvas
    ctx.save();
    ctx.fillStyle = 'rgba(17, 17, 17, 0.85)';
    ctx.fillRect(10, 10, 220, 70);
    ctx.strokeStyle = currentTurn === 'blue' ? '#3498db' : '#e74c3c';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 220, 70);

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Turn: ${currentTurn.toUpperCase()}`, 20, 32);

    // Draw Coins
    if (coinImg.complete && coinImg.naturalWidth !== 0) {
        ctx.drawImage(coinImg, 20, 42, 22, 22);
        ctx.drawImage(coinImg, 120, 42, 22, 22);
    }

    ctx.fillStyle = '#3498db';
    ctx.fillText(`Blue: ${blueCoins}`, 48, 58);

    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`Red: ${redCoins}`, 148, 58);
    ctx.restore();
}
