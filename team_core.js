// =========================================================================
// TEAM CORE, ECONOMY, BASES, & WIN CONDITIONS CONTROLLER
// =========================================================================

let currentTurn = 'blue';
let blueCoins = 0;
let redCoins = 0;
let destroyedUnitsQueue = [];
let flagAnimations = {};
let gameOver = false;
let winnerMessage = '';
let pendingSpawn = null; // Intercepted shop purchase state waiting for tile placement

// All 12 Grid Centers and Team Base Cores mapped for the 24x34 Macro Grid Layout (AY-BV, 18-51)
let goldCores = [
    { id: 'gc1', c: 3, r: 3, owner: null, isBase: false, captureZones: [{c:2, r:3}, {c:4, r:3}, {c:3, r:2}, {c:3, r:4}, {c:2, r:2}, {c:2, r:4}, {c:4, r:2}, {c:4, r:4}] },
    { id: 'gc2', c: 11, r: 1, owner: null, isBase: false, captureZones: [{c:10, r:1}, {c:12, r:1}, {c:11, r:0}, {c:11, r:2}, {c:10, r:0}, {c:10, r:2}, {c:12, r:0}, {c:12, r:2}] }, 
    { id: 'gc3', c: 16, r: 3, owner: null, isBase: false, captureZones: [{c:15, r:3}, {c:17, r:3}, {c:16, r:2}, {c:16, r:4}, {c:15, r:2}, {c:15, r:4}, {c:17, r:2}, {c:17, r:4}] },
    { id: 'gc4', c: 22, r: 6, owner: null, isBase: false, captureZones: [{c:21, r:6}, {c:23, r:6}, {c:22, r:5}, {c:22, r:7}, {c:21, r:5}, {c:21, r:7}, {c:23, r:5}, {c:23, r:7}] },
    { id: 'gc5', c: 17, r: 7, owner: null, isBase: false, captureZones: [{c:16, r:7}, {c:18, r:7}, {c:17, r:6}, {c:17, r:8}, {c:16, r:6}, {c:16, r:8}, {c:18, r:6}, {c:18, r:8}] },
    { id: 'gc6', c: 21, r: 10, owner: null, isBase: false, captureZones: [{c:20, r:10}, {c:22, r:10}, {c:21, r:9}, {c:21, r:11}, {c:20, r:9}, {c:20, r:11}, {c:22, r:9}, {c:22, r:11}] },
    // gc7: Red Base Special Gold Core (placed at Red command center / base region r:16, c:13)
    { id: 'gc7', c: 13, r: 16, owner: 'red', isBase: true, teamBase: 'red', captureZones: [{c:12, r:16}, {c:14, r:16}, {c:13, r:15}, {c:13, r:17}, {c:12, r:15}, {c:12, r:17}, {c:14, r:15}, {c:14, r:17}] },
    // gc8: Blue Base Special Gold Core (placed at Blue command center / base region r:14, c:7)
    { id: 'gc8', c: 7, r: 14, owner: 'blue', isBase: true, teamBase: 'blue', captureZones: [{c:6, r:14}, {c:8, r:14}, {c:7, r:13}, {c:7, r:15}, {c:6, r:13}, {c:6, r:15}, {c:8, r:13}, {c:8, r:15}] },
    { id: 'gc9', c: 17, r: 17, owner: null, isBase: false, captureZones: [{c:16, r:17}, {c:18, r:17}, {c:17, r:16}, {c:17, r:18}, {c:16, r:16}, {c:16, r:18}, {c:18, r:16}, {c:18, r:18}] },
    { id: 'gc10', c: 12, r: 21, owner: null, isBase: false, captureZones: [{c:11, r:21}, {c:13, r:21}, {c:12, r:20}, {c:12, r:22}, {c:11, r:20}, {c:11, r:22}, {c:13, r:20}, {c:13, r:22}] },
    { id: 'gc11', c: 6, r: 24, owner: null, isBase: false, captureZones: [{c:5, r:24}, {c:7, r:24}, {c:6, r:23}, {c:6, r:25}, {c:5, r:23}, {c:5, r:25}, {c:7, r:23}, {c:7, r:25}] },
    { id: 'gc12', c: 2, r: 31, owner: null, isBase: false, captureZones: [{c:1, r:31}, {c:3, r:31}, {c:2, r:30}, {c:2, r:32}, {c:1, r:30}, {c:1, r:32}, {c:3, r:30}, {c:3, r:32}] }
];

const TeamLog = {
    info: (msg, data = null) => console.log(`[INFO][team_core]: ${msg}`, data ?? ''),
    warn: (msg, data = null) => console.warn(`[WARN][team_core]: ${msg}`, data ?? ''),
    success: (msg, data = null) => console.log(`[SUCCESS][team_core]: ${msg}`, data ?? '')
};

function getTeamFromUnit(unit) {
    if (!unit) return null;
    if (unit.team) return unit.team.toLowerCase();
    if (unit._assignedTeam) return unit._assignedTeam;
    
    let nameStr = (unit.name || '').toLowerCase();
    if (nameStr.includes('red') || nameStr.includes('black')) return 'red';
    if (nameStr.includes('blue') || nameStr.includes('white')) return 'blue';
    
    if (unit.img && unit.img.src) {
        let src = unit.img.src.toLowerCase();
        if (src.includes('red')) return 'red';
        if (src.includes('blue')) return 'blue';
    }

    let midRow = typeof rows !== 'undefined' ? rows / 2 : 17;
    let team = unit.gridY < midRow ? 'red' : 'blue';
    unit._assignedTeam = team;
    return team;
}

function getUnitPower(unit) {
    if (!unit) return 0;
    let name = (unit.name || '').toLowerCase();
    if (name.includes('ship')) return Infinity;
    if (name.includes('artillery') || name.includes('boat')) return 0;
    if (name.includes('tank')) return 2;
    if (name.includes('infantry') || name.includes('soldier')) return 1;
    return 1;
}

function isSpecialUnit(unit) {
    if (!unit) return false;
    let name = (unit.name || '').toLowerCase();
    return name.includes('artillery') || name.includes('boat') || getUnitPower(unit) === 0;
}

function areUnitsAdjacent(u1, u2) {
    let dx = Math.abs(u1.gridX - u2.gridX);
    let dy = Math.abs(u1.gridY - u2.gridY);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

function checkWinConditions(allUnits) {
    if (gameOver) return;

    let redLandUnits = allUnits.filter(u => getTeamFromUnit(u) === 'red' && !isSpecialUnit(u) && getUnitPower(u) !== Infinity);
    let blueLandUnits = allUnits.filter(u => getTeamFromUnit(u) === 'blue' && !isSpecialUnit(u) && getUnitPower(u) !== Infinity);
    let redTotal = allUnits.filter(u => getTeamFromUnit(u) === 'red');
    let blueTotal = allUnits.filter(u => getTeamFromUnit(u) === 'blue');

    if (redLandUnits.length === 0 || redTotal.length === 0) {
        gameOver = true;
        winnerMessage = 'BLUE TEAM WINS BY ANNIHILATION!';
        TeamLog.success(winnerMessage);
        return;
    }
    if (blueLandUnits.length === 0 || blueTotal.length === 0) {
        gameOver = true;
        winnerMessage = 'RED TEAM WINS BY ANNIHILATION!';
        TeamLog.success(winnerMessage);
        return;
    }

    goldCores.forEach(core => {
        if (core.isBase && core.owner && core.teamBase) {
            if (core.owner !== core.teamBase) {
                gameOver = true;
                winnerMessage = `${core.owner.toUpperCase()} TEAM WINS BY CAPTURING ENEMY BASE!`;
                TeamLog.success(winnerMessage);
            }
        }
    });
}

function commitUnitDestruction(unitsArray, unitsToDestroy) {
    unitsToDestroy.forEach(u => {
        let index = unitsArray.indexOf(u);
        if (index !== -1) {
            unitsArray.splice(index, 1);
        }
        if (!destroyedUnitsQueue.some(item => item.unit === u)) {
            destroyedUnitsQueue.push({
                unit: u,
                startTime: performance.now(),
                duration: 1800
            });
        }
    });
}

function toggleShop() {
    let modal = document.getElementById('shop-modal');
    if (!modal) return;
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function buyUnit(unitType) {
    if (gameOver) return;

    let activeTeam = currentTurn;
    let cost = 0;
    let unitName = '';
    let unitRange = 2;
    let unitCategory = 'land';
    let imgRef, loadRef;

    if (activeTeam === 'blue') {
        if (unitType === 'infantry') { cost = 1; unitName = 'Infantry'; unitRange = 2; imgRef = typeof blueInfantryImg !== 'undefined' ? blueInfantryImg : null; loadRef = () => typeof blueInfantryLoaded !== 'undefined' && blueInfantryLoaded; }
        else if (unitType === 'tank') { cost = 1; unitName = 'Tank'; unitRange = 3; imgRef = typeof blueTankImg !== 'undefined' ? blueTankImg : null; loadRef = () => typeof blueTankLoaded !== 'undefined' && blueTankLoaded; }
        else if (unitType === 'artillery') { cost = 2; unitName = 'Artillery'; unitRange = 2; imgRef = typeof blueArtilleryImg !== 'undefined' ? blueArtilleryImg : null; loadRef = () => typeof blueArtilleryLoaded !== 'undefined' && blueArtilleryLoaded; }
        else if (unitType === 'ship') { cost = 2; unitName = 'Ship'; unitRange = 2; unitCategory = 'water'; imgRef = typeof blueShipImg !== 'undefined' ? blueShipImg : null; loadRef = () => typeof blueShipLoaded !== 'undefined' && blueShipLoaded; }
    } else {
        if (unitType === 'infantry') { cost = 1; unitName = 'Infantry'; unitRange = 2; imgRef = typeof redInfantryImg !== 'undefined' ? redInfantryImg : null; loadRef = () => typeof redInfantryLoaded !== 'undefined' && redInfantryLoaded; }
        else if (unitType === 'tank') { cost = 1; unitName = 'Tank'; unitRange = 3; imgRef = typeof redTankImg !== 'undefined' ? redTankImg : null; loadRef = () => typeof redTankLoaded !== 'undefined' && redTankLoaded; }
        else if (unitType === 'artillery') { cost = 2; unitName = 'Artillery'; unitRange = 2; imgRef = typeof redArtilleryImg !== 'undefined' ? redArtilleryImg : null; loadRef = () => typeof redArtilleryLoaded !== 'undefined' && redArtilleryLoaded; }
        else if (unitType === 'ship') { cost = 2; unitName = 'Ship'; unitRange = 2; unitCategory = 'water'; imgRef = typeof redShipImg !== 'undefined' ? redShipImg : null; loadRef = () => typeof redShipLoaded !== 'undefined' && redShipLoaded; }
    }

    let currentCoins = activeTeam === 'blue' ? blueCoins : redCoins;
    if (currentCoins < cost) {
        TeamLog.warn(`Not enough gold to buy ${unitType}! Required: ${cost}, Available: ${currentCoins}`);
        alert(`Not enough gold! You need ${cost} gold coins.`);
        return;
    }

    if (activeTeam === 'blue') blueCoins -= cost;
    else redCoins -= cost;

    pendingSpawn = {
        unitType: unitType,
        unitName: unitName,
        unitRange: unitRange,
        category: unitCategory,
        team: activeTeam,
        cost: cost,
        img: imgRef,
        loaded: loadRef
    };

    TeamLog.success(`${activeTeam.toUpperCase()} purchased ${unitType}. Awaiting valid deployment tile selection.`);
    toggleShop();
}

function getValidDeploymentTiles(team, unitType) {
    let validTiles = [];

    goldCores.forEach(core => {
        let isCoreControlled = (core.owner === team);
        let isTeamBase = (core.isBase && core.teamBase === team);

        if (unitType === 'infantry') {
            if (isCoreControlled || isTeamBase) {
                if (core.captureZones) {
                    core.captureZones.forEach(zone => {
                        validTiles.push({ c: zone.c, r: zone.r });
                    });
                }
                validTiles.push({ c: core.c, r: core.r });
            }
        } else {
            if (isCoreControlled) {
                if (core.captureZones) {
                    core.captureZones.forEach(zone => {
                        validTiles.push({ c: zone.c, r: zone.r });
                    });
                }
                validTiles.push({ c: core.c, r: core.r });
            }
        }
    });

    if (unitType === 'infantry' && typeof getBaseSquares === 'function') {
        let baseSquares = getBaseSquares(team);
        if (baseSquares) baseSquares.forEach(b => validTiles.push(b));
    } else if (unitType === 'ship' && typeof getPortSquare === 'function') {
        let port = getPortSquare(team);
        if (port) validTiles.push(port);
    }

    let uniqueTiles = [];
    let seen = new Set();
    validTiles.forEach(t => {
        let key = `${t.c},${t.r}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueTiles.push(t);
        }
    });

    return uniqueTiles;
}

function getSuperunitsForTeamFallback(teamName, unitsList) {
    if (typeof window.getSuperunitsForTeam === 'function') {
        return window.getSuperunitsForTeam(teamName, unitsList);
    }
    return [];
}

function isUnitLockedInStalemateFallback(unit, unitsList) {
    if (typeof window.isUnitLockedInStalemate === 'function') {
        return window.isUnitLockedInStalemate(unit, unitsList);
    }
    return false;
}

function drawTeamUIAndFlags() {
    if (typeof ctx === 'undefined' || !ctx || typeof canvas === 'undefined' || !canvas) return;

    let now = performance.now();
    let currentCellSize = typeof cellSize !== 'undefined' ? cellSize : 30;

    // HUD Display
    ctx.fillStyle = 'rgba(26, 26, 26, 0.85)';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.fillRect(12, 12, 160, 60);
    ctx.strokeRect(12, 12, 160, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Turn: ${currentTurn.toUpperCase()}`, 24, 20);
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Blue Coins: ${blueCoins}`, 24, 38);
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`Red Coins: ${redCoins}`, 24, 54);

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(winnerMessage, canvas.width / 2, canvas.height / 2);
        return;
    }

    // Render Gold Cores and Flag Animations
    goldCores.forEach(core => {
        let cx = core.c * currentCellSize + currentCellSize / 2;
        let cy = core.r * currentCellSize + currentCellSize / 2;

        if (core.owner) {
            ctx.fillStyle = core.owner === 'blue' ? '#3498db' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(cx, cy, currentCellSize * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        }

        if (flagAnimations[core.id]) {
            let elapsed = now - flagAnimations[core.id];
            let duration = 500;
            if (elapsed < duration) {
                let progress = elapsed / duration;
                let dropOffset = (1 - Math.cos(progress * Math.PI * 0.5)) * (currentCellSize * 1.5);
                let renderY = cy - (currentCellSize * 1.5) + dropOffset;

                ctx.fillStyle = core.owner === 'blue' ? '#2980b9' : '#c0392b';
                ctx.fillRect(cx - 4, renderY, 8, currentCellSize * 0.8);
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.moveTo(cx + 4, renderY);
                ctx.lineTo(cx + 16, renderY + 6);
                ctx.lineTo(cx + 4, renderY + 12);
                ctx.fill();
            } else {
                delete flagAnimations[core.id];
            }
        }
    });

    // Superunit Badges Rendering
    let mapCenterX = canvas.width / 2;
    let mapCenterY = canvas.height / 2;

    ['blue', 'red'].forEach(teamName => {
        let suList = getSuperunitsForTeamFallback(teamName, typeof units !== 'undefined' ? units : []);
        suList.forEach(su => {
            if (su.units.length <= 1 && su.power !== Infinity && !su.isSpecialSuperunit) return;

            let avgX = su.units.reduce((sum, u) => sum + (u.renderX !== undefined ? u.renderX : u.gridX * currentCellSize), 0) / su.units.length;
            let avgY = su.units.reduce((sum, u) => sum + (u.renderY !== undefined ? u.renderY : u.gridY * currentCellSize), 0) / su.units.length;

            if (su.isSpecialSuperunit && su.core) {
                avgX = (avgX + su.core.c * currentCellSize) / 2;
                avgY = (avgY + su.core.r * currentCellSize) / 2;
            }

            let unitCenterX = avgX + currentCellSize / 2;
            let unitCenterY = avgY + currentCellSize / 2;

            let dirX = mapCenterX - unitCenterX;
            let dirY = mapCenterY - unitCenterY;
            let length = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
            
            let significantDistance = currentCellSize * 1.8;
            let offsetX = (dirX / length) * significantDistance;
            let offsetY = (dirY / length) * significantDistance;

            let badgeX = unitCenterX + offsetX - 22;
            let badgeY = unitCenterY + offsetY - 12;

            ctx.fillStyle = '#cc0000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            let powerDisplay = su.power === Infinity ? '∞' : su.power;
            
            ctx.beginPath();
            ctx.fillRect(badgeX, badgeY, 44, 24);
            ctx.strokeRect(badgeX, badgeY, 44, 24);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let activeUnitsList = typeof units !== 'undefined' ? units : [];
            let lockedText = su.units.some(u => isUnitLockedInStalemateFallback(u, activeUnitsList)) ? ' 🔒' : '';
            ctx.fillText(`${powerDisplay}${lockedText}`, badgeX + 22, badgeY + 12);
        });
    });

    // Destroyed Units Animation Queue
    destroyedUnitsQueue = destroyedUnitsQueue.filter(item => {
        let elapsed = now - item.startTime;
        let progress = elapsed / item.duration;
        if (progress >= 1.0) return false;

        let u = item.unit;
        let rx = u.gridX * currentCellSize;
        let ry = u.gridY * currentCellSize;

        ctx.fillStyle = `rgba(255, 50, 50, ${1 - progress})`;
        ctx.fillRect(rx + 2, ry + 2, currentCellSize - 4, currentCellSize - 4);
        return true;
    });
}
