// --- TEAM & TURN STATE ---
let currentTurn = 'blue'; // 'blue' or 'red'
let blueCoins = 0;
let redCoins = 0;

// Gold Cores mapping on the 18x18 grid
let goldCores = [
    { c: 4, r: 4, owner: null },
    { c: 13, r: 5, owner: null },
    { c: 8, r: 7, owner: null },
    { c: 9, r: 10, owner: null },
    { c: 4, r: 14, owner: null },
    { c: 14, r: 16, owner: null }
];

// Load Flag Images
let blueFlagImg = new Image();
blueFlagImg.src = 'https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/blue_flag.jpg';
let blueFlagLoaded = false;
blueFlagImg.onload = () => { blueFlagLoaded = true; };

let redFlagImg = new Image();
redFlagImg.src = 'https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/red_flag.jpg';
let redFlagLoaded = false;
redFlagImg.onload = () => { redFlagLoaded = true; };

// Foolproof team detection using position & properties
function getTeamFromUnit(unit) {
    if (!unit) return 'blue';
    
    // 1. Explicit team property if it exists
    if (unit.team) return unit.team.toLowerCase();
    
    // 2. Name or image path checks
    if (unit.name) {
        let name = unit.name.toLowerCase();
        if (name.includes('red')) return 'red';
        if (name.includes('blue')) return 'blue';
    }
    if (unit.img && unit.img.src) {
        let src = unit.img.src.toLowerCase();
        if (src.includes('red')) return 'red';
        if (src.includes('blue')) return 'blue';
    }
    
    // 3. Position-based detection (Top half = Red, Bottom half = Blue on an 18x18 grid)
    if (typeof unit.gridY === 'number') {
        return unit.gridY < 9 ? 'red' : 'blue';
    }
    
    return 'blue';
}

function isGoldCore(c, r) {
    return goldCores.some(core => core.c === c && core.r === r);
}

function checkAndCaptureGold(unit, c, r) {
    let team = getTeamFromUnit(unit);
    goldCores.forEach(core => {
        let dist = Math.abs(core.c - c) + Math.abs(core.r - r);
        if (dist <= 1 && core.owner !== team) {
            core.owner = team;
            if (team === 'blue') {
                blueCoins += 1;
                console.log(`💰 BLUE captured Gold Core at (${core.c}, ${core.r})!`);
            } else {
                redCoins += 1;
                console.log(`💰 RED captured Gold Core at (${core.c}, ${core.r})!`);
            }
        }
    });
}

function tryMoveUnit(unit, newC, newR) {
    console.log(`\n--- ATTEMPTING MOVE ---`);
    console.log(`Current Turn State: ${currentTurn}`);
    
    let unitTeam = getTeamFromUnit(unit);
    console.log(`Moving Unit Team detected as: ${unitTeam}`);

    // Strict turn validation
    if (unitTeam !== currentTurn) {
        console.error(`❌ BLOCKED: Tried to move a ${unitTeam} unit, but it is currently ${currentTurn}'s turn!`);
        return false; 
    }

    if (isGoldCore(newC, newR)) {
        console.error(`❌ BLOCKED: Cannot step directly onto a gold core tile!`);
        return false; 
    }

    // Execute Move
    unit.gridX = newC;
    unit.gridY = newR;

    checkAndCaptureGold(unit, newC, newR);

    // Switch Turn
    let previousTurn = currentTurn;
    currentTurn = (currentTurn === 'blue') ? 'red' : 'blue';
    console.log(`🔄 Turn Switched: ${previousTurn.toUpperCase()} ➡️ ${currentTurn.toUpperCase()}`);
    console.log(`-------------------------\n`);
    
    return true;
}

function drawTeamUIAndFlags() {
    goldCores.forEach(core => {
        let px = core.c * cellSize;
        let py = core.r * cellSize;

        if (core.owner === 'blue' && blueFlagLoaded) {
            ctx.drawImage(blueFlagImg, px + cellSize * 0.25, py - cellSize * 0.5, cellSize * 0.5, cellSize * 1.4);
        } else if (core.owner === 'red' && redFlagLoaded) {
            ctx.drawImage(redFlagImg, px + cellSize * 0.25, py - cellSize * 0.5, cellSize * 0.5, cellSize * 1.4);
        }
    });

    // Draw HUD Box
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(10, 10, 210, 60);
    ctx.strokeStyle = currentTurn === 'blue' ? '#3498db' : '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 210, 60);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Turn: ${currentTurn.toUpperCase()}`, 20, 30);
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Blue Coins: ${blueCoins}`, 20, 48);
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`Red Coins: ${redCoins}`, 120, 48);
    ctx.restore();
}
