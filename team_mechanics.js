// --- TEAM & TURN STATE ---
let currentTurn = 'blue'; // 'blue' or 'red'
let blueCoins = 0;
let redCoins = 0;

// Precise Gold Cores and their strict Excel-mapped capture zones (g tiles)
let goldCores = [
    {
        id: 'gc1', c: 12, r: 7, owner: null,
        captureZones: [{c:11, r:6}, {c:12, r:6}, {c:13, r:6}, {c:11, r:7}, {c:13, r:7}, {c:12, r:8}, {c:13, r:8}]
    },
    {
        id: 'gc2', c: 16, r: 12, owner: null,
        captureZones: [{c:15, r:11}, {c:16, r:11}, {c:17, r:11}, {c:15, r:12}, {c:17, r:12}, {c:15, r:13}, {c:16, r:13}, {c:17, r:13}]
    },
    {
        id: 'gc3', c: 11, r: 16, owner: null,
        captureZones: [{c:10, r:15}, {c:11, r:15}, {c:12, r:15}, {c:10, r:16}, {c:12, r:16}, {c:10, r:17}, {c:11, r:17}, {c:12, r:17}]
    },
    {
        id: 'gc4', c: 5, r: 14, owner: null,
        captureZones: [{c:4, r:13}, {c:5, r:13}, {c:6, r:13}, {c:4, r:14}, {c:6, r:14}, {c:4, r:15}, {c:5, r:15}, {c:6, r:15}]
    },
    {
        id: 'gc5', c: 6, r: 4, owner: null,
        captureZones: [{c:5, r:3}, {c:6, r:3}, {c:7, r:3}, {c:5, r:4}, {c:7, r:4}, {c:5, r:5}, {c:6, r:5}, {c:7, r:5}]
    },
    {
        id: 'gc6', c: 1, r: 5, owner: null,
        captureZones: [{c:0, r:4}, {c:1, r:4}, {c:2, r:4}, {c:0, r:5}, {c:2, r:5}, {c:0, r:6}, {c:1, r:6}, {c:2, r:6}]
    }
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

// Foolproof & Permanent Team Detection
function getTeamFromUnit(unit) {
    if (!unit) return 'blue';
    if (unit._assignedTeam) return unit._assignedTeam;
    
    if (unit.team) {
        unit._assignedTeam = unit.team.toLowerCase();
        return unit._assignedTeam;
    }
    if (unit.name) {
        let name = unit.name.toLowerCase();
        if (name.includes('red')) { unit._assignedTeam = 'red'; return 'red'; }
        if (name.includes('blue')) { unit._assignedTeam = 'blue'; return 'blue'; }
    }
    if (unit.img && unit.img.src) {
        let src = unit.img.src.toLowerCase();
        if (src.includes('red')) { unit._assignedTeam = 'red'; return 'red'; }
        if (src.includes('blue')) { unit._assignedTeam = 'blue'; return 'blue'; }
    }
    
    unit._assignedTeam = (unit.gridY < 9) ? 'red' : 'blue';
    return unit._assignedTeam;
}

// Check if a tile is the exact center core coordinate (units cannot step directly on core centers)
function isGoldCoreCenter(c, r) {
    return goldCores.some(core => core.c === c && core.r === r);
}

// Check if a unit's landing position triggers capture strictly via its assigned capture zones or direct local adjacency
function checkAndCaptureGold(unit, c, r) {
    let team = getTeamFromUnit(unit);
    goldCores.forEach(core => {
        let dx = Math.abs(core.c - c);
        let dy = Math.abs(core.r - r);
        let inDefinedZone = core.captureZones.some(zone => zone.c === c && zone.r === r);
        let isLocalAdjacent = (dx <= 1 && dy <= 1); 

        let matches = inDefinedZone || (isLocalAdjacent && core.id !== 'gc5' && core.id !== 'gc6');
        
        if (matches && core.owner !== team) {
            core.owner = team;
            if (team === 'blue') {
                blueCoins += 1;
                console.log(`💰 BLUE captured Gold Core ${core.id} at center (${core.c}, ${core.r})! Blue Coins: ${blueCoins}`);
            } else {
                redCoins += 1;
                console.log(`💰 RED captured Gold Core ${core.id} at center (${core.c}, ${core.r})! Red Coins: ${redCoins}`);
            }
        }
    });
}

function tryMoveUnit(unit, newC, newR) {
    let unitTeam = getTeamFromUnit(unit);
    if (unitTeam !== currentTurn) {
        return false; 
    }

    // Block stepping directly onto the center core tile itself
    if (isGoldCoreCenter(newC, newR)) {
        return false; 
    }

    // Execute Move
    unit.gridX = newC;
    unit.gridY = newR;

    // Evaluate capture
    checkAndCaptureGold(unit, newC, newR);

    // Switch Turn
    currentTurn = (currentTurn === 'blue') ? 'red' : 'blue';
    return true;
}

function drawTeamUIAndFlags() {
    goldCores.forEach(core => {
        let px = core.c * cellSize;
        let py = core.r * cellSize;

        // Resized and shifted upwards to stretch into the upper tile as requested
        if (core.owner === 'blue' && blueFlagLoaded) {
            ctx.drawImage(blueFlagImg, px, py - cellSize * 0.9, cellSize, cellSize * 1.9);
        } else if (core.owner === 'red' && redFlagLoaded) {
            ctx.drawImage(redFlagImg, px, py - cellSize * 0.9, cellSize, cellSize * 1.9);
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
