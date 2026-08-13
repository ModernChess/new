// --- TEAM & TURN STATE ---
let currentTurn = 'blue';
let blueCoins = 0;
let redCoins = 0;

let flagAnimations = {}; 
let destroyedUnitsQueue = []; // Tracks units undergoing the slow disintegration effect

// Precise Gold Cores and strict Excel-mapped capture zones
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

// Team Detection
function getTeamFromUnit(unit) {
    if (!unit) return 'blue';
    if (unit._assignedTeam) return unit._assignedTeam;
    
    if (unit.team) {
        unit._assignedTeam = unit.team.toLowerCase();
        return unit._assignedTeam;
    }
    if (unit.name) {
        let name = unit.name.toLowerCase();
        if (name.includes('red') || name.includes('black')) { unit._assignedTeam = 'red'; return 'red'; }
        if (name.includes('blue') || name.includes('white')) { unit._assignedTeam = 'blue'; return 'blue'; }
    }
    if (unit.img && unit.img.src) {
        let src = unit.img.src.toLowerCase();
        if (src.includes('red') || src.includes('black')) { unit._assignedTeam = 'red'; return 'red'; }
        if (src.includes('blue') || src.includes('white')) { unit._assignedTeam = 'blue'; return 'blue'; }
    }
    
    unit._assignedTeam = (unit.gridY < 9) ? 'red' : 'blue';
    return unit._assignedTeam;
}

// Unit Power Rule: Infantry = 1, Tank = 2. Artillery and Ships = 0 (Special Units)
function getUnitPower(unit) {
    if (!unit) return 0;
    let name = (unit.name || '').toLowerCase();
    if (name.includes('artillery') || name.includes('ship') || name.includes('boat')) return 0;
    if (unit.power !== undefined && name.includes('artillery') === false && name.includes('ship') === false) return unit.power;
    if (name.includes('tank')) return 2;
    if (name.includes('infantry') || name.includes('soldier')) return 1;
    return 1; 
}

// Check if a unit is a special unit (Artillery or Ship) that cannot connect or form superunits with tanks/infantry
function isSpecialUnit(unit) {
    if (!unit) return false;
    let name = (unit.name || '').toLowerCase();
    return name.includes('artillery') || name.includes('ship') || name.includes('boat') || getUnitPower(unit) === 0;
}

// Helper: Check if two units are touching orthogonally or diagonally
function areUnitsConnected(u1, u2) {
    let dx = Math.abs(u1.gridX - u2.gridX);
    let dy = Math.abs(u1.gridY - u2.gridY);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

// Calculate Superunits (Excluding Artillery and Ships from connecting)
function getSuperunitsForTeam(teamName, allUnits) {
    let teamUnits = allUnits.filter(u => getTeamFromUnit(u) === teamName && !isSpecialUnit(u));
    let visited = new Set();
    let superunits = [];

    teamUnits.forEach(unit => {
        if (visited.has(unit)) return;

        let group = [];
        let queue = [unit];
        visited.add(unit);

        while (queue.length > 0) {
            let curr = queue.shift();
            group.push(curr);

            teamUnits.forEach(other => {
                if (!visited.has(other) && areUnitsConnected(curr, other)) {
                    visited.add(other);
                    queue.push(other);
                }
            });
        }

        let totalPower = group.reduce((sum, u) => sum + getUnitPower(u), 0);
        superunits.push({ units: group, power: totalPower });
    });

    // Also include special units as individual groups of power 0 (or individual power if specified)
    let specialUnits = allUnits.filter(u => getTeamFromUnit(u) === teamName && isSpecialUnit(u));
    specialUnits.forEach(su => {
        superunits.push({ units: [su], power: getUnitPower(su) });
    });

    return superunits;
}

// Trigger Gradual Disintegration Effect before final removal
function queueForDisintegration(unitList) {
    let now = performance.now();
    unitList.forEach(u => {
        if (!destroyedUnitsQueue.some(item => item.unit === u)) {
            destroyedUnitsQueue.push({
                unit: u,
                startTime: now,
                duration: 1800 // Noticeably longer slow disintegration duration (1.8 seconds)
            });
        }
    });
}

// Continuous check for combat interactions & destructions
function resolveUnitInteractions() {
    let blueSupers = getSuperunitsForTeam('blue', units);
    let redSupers = getSuperunitsForTeam('red', units);

    blueSupers.forEach(bSu => {
        redSupers.forEach(rSu => {
            let isTouching = bSu.units.some(bUnit => 
                rSu.units.some(rUnit => areUnitsConnected(bUnit, rUnit) || (bUnit.gridX === rUnit.gridX && bUnit.gridY === rUnit.gridY))
            );

            if (isTouching) {
                if (bSu.power > rSu.power) {
                    queueForDisintegration(rSu.units);
                } else if (rSu.power > bSu.power) {
                    queueForDisintegration(bSu.units);
                }
            }
        });
    });

    // Clean up units whose disintegration timer has completed
    let now = performance.now();
    let fullyDestroyed = destroyedUnitsQueue.filter(item => (now - item.startTime) >= item.duration).map(item => item.unit);
    if (fullyDestroyed.length > 0) {
        units = units.filter(u => !fullyDestroyed.includes(u));
        destroyedUnitsQueue = destroyedUnitsQueue.filter(item => (now - item.startTime) < item.duration);
    }
}

function isGoldCoreCenter(c, r) {
    return goldCores.some(core => core.c === c && core.r === r);
}

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
            flagAnimations[core.id] = { startTime: performance.now(), team: team };

            if (team === 'blue') {
                blueCoins += 1;
            } else {
                redCoins += 1;
            }
        }
    });
}

// Move Unit with Lock-in Stalemate Support
function tryMoveUnit(unit, newC, newR) {
    let unitTeam = getTeamFromUnit(unit);
    if (unitTeam !== currentTurn) return false; 
    if (isGoldCoreCenter(newC, newR)) return false; 

    // Execute the move first so the unit physically arrives at the target location
    unit.gridX = newC;
    unit.gridY = newR;

    checkAndCaptureGold(unit, newC, newR);
    resolveUnitInteractions();

    currentTurn = (currentTurn === 'blue') ? 'red' : 'blue';
    return true;
}

// Custom Render Extension for Disintegration Effect & Stalemate Locks 🔒
function drawTeamUIAndFlags() {
    let currentTime = performance.now();

    resolveUnitInteractions();

    // Draw Gold Core Flags
    goldCores.forEach(core => {
        if (!core.owner) return;
        let px = core.c * cellSize;
        let py = core.r * cellSize;
        let targetY = py - cellSize * 0.9;
        let flagWidth = cellSize;
        let flagHeight = cellSize * 1.75;

        let anim = flagAnimations[core.id];
        let renderY = targetY;

        if (anim && anim.team === core.owner) {
            let elapsed = currentTime - anim.startTime;
            let duration = 500; 
            if (elapsed < duration) {
                let progress = elapsed / duration;
                let dropOffset = (1 - Math.cos(progress * Math.PI * 0.5)) * (cellSize * 1.5);
                renderY = targetY - (cellSize * 1.5) + dropOffset;
            }
        }

        let flagImgToDraw = (core.owner === 'blue' && blueFlagLoaded) ? blueFlagImg : 
                           (core.owner === 'red' && redFlagLoaded) ? redFlagImg : null;

        if (flagImgToDraw) {
            ctx.drawImage(flagImgToDraw, px, renderY, flagWidth, flagHeight);
        }
    });

    // Render Superunit Power Labels & Stalemate Locks 🔒
    ['blue', 'red'].forEach(team => {
        let superunits = getSuperunitsForTeam(team, units);
        let opposingTeam = team === 'blue' ? 'red' : 'blue';
        let opposingSupers = getSuperunitsForTeam(opposingTeam, units);

        superunits.forEach(su => {
            // Check if this superunit is in a deadlock with an opposing equal-power superunit
            let isLocked = false;
            su.units.forEach(u => {
                opposingSupers.forEach(oSu => {
                    let touching = oSu.units.some(ou => areUnitsConnected(u, ou) || (u.gridX === ou.gridX && u.gridY === ou.gridY));
                    if (touching && su.power === oSu.power) {
                        isLocked = true;
                    }
                });
            });

            let avgX = su.units.reduce((sum, u) => sum + (u.renderX !== undefined ? u.renderX : u.gridX * cellSize), 0) / su.units.length;
            let avgY = su.units.reduce((sum, u) => sum + (u.renderY !== undefined ? u.renderY : u.gridY * cellSize), 0) / su.units.length;

            ctx.save();
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#ff3333'; 
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            
            let label = su.units.length > 1 ? `Power: ${su.power}` : '';
            if (isLocked) label += ' 🔒';

            if (label.trim() !== '') {
                ctx.strokeText(label, avgX + cellSize * 0.1, avgY - 4);
                ctx.fillText(label, avgX + cellSize * 0.1, avgY - 4);
            }
            ctx.restore();
        });
    });

    // Handle Gradual Patch-by-Patch Disintegration Overlay for Destroyed Units
    destroyedUnitsQueue.forEach(item => {
        let elapsed = currentTime - item.startTime;
        let progress = Math.min(1, elapsed / item.duration);
        let ux = item.unit.gridX * cellSize;
        let uy = item.unit.gridY * cellSize;

        ctx.save();
        // Create a grid-patterned progressive fade disintegration effect
        let cols = 4;
        let rows = 4;
        let cellW = cellSize / cols;
        let cellH = cellSize / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Stagger the disappearance across areas of the square
                let threshold = (r * cols + c) / (rows * cols);
                if (progress > threshold) {
                    let alpha = Math.max(0, 1 - ((progress - threshold) * rows * cols * 0.5));
                    ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
                    ctx.fillRect(ux + c * cellW, uy + r * cellH, cellW - 1, cellH - 1);
                }
            }
        }
        ctx.restore();
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
