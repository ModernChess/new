// =========================================================================
// TEAM MECHANICS, COMBAT, AND CAPTURE CONTROLLER
// =========================================================================

let currentTurn = 'blue';
let blueCoins = 0;
let redCoins = 0;
let destroyedUnitsQueue = [];
let flagAnimations = {};

let goldCores = [
    { id: 'gc1', c: 6, r: 4, owner: null, captureZones: [{c:6, r:3}, {c:6, r:5}, {c:5, r:4}, {c:7, r:4}] },
    { id: 'gc2', c: 1, r: 5, owner: null, captureZones: [{c:1, r:4}, {c:1, r:6}, {c:0, r:5}, {c:2, r:5}] },
    { id: 'gc3', c: 12, r: 7, owner: null, captureZones: [{c:12, r:6}, {c:12, r:8}, {c:11, r:7}, {c:13, r:7}] },
    { id: 'gc4', c: 5, r: 14, owner: null, captureZones: [{c:5, r:13}, {c:5, r:15}, {c:4, r:14}, {c:6, r:14}] },
    { id: 'gc5', c: 16, r: 12, owner: null, captureZones: [{c:16, r:11}, {c:16, r:13}, {c:15, r:12}, {c:17, r:12}] },
    { id: 'gc6', c: 11, r: 16, owner: null, captureZones: [{c:11, r:15}, {c:11, r:17}, {c:10, r:16}, {c:12, r:16}] }
];

const TeamLog = {
    info: (msg, data = null) => console.log(`[INFO][team_mechanics]: ${msg}`, data ?? ''),
    warn: (msg, data = null) => console.warn(`[WARN][team_mechanics]: ${msg}`, data ?? ''),
    success: (msg, data = null) => console.log(`[SUCCESS][team_mechanics]: ${msg}`, data ?? '')
};

function getTeamFromUnit(unit) {
    if (!unit) return null;
    if (unit._assignedTeam) return unit._assignedTeam;
    if (unit.team) return unit.team.toLowerCase();
    
    let nameStr = (unit.name || '').toLowerCase();
    if (nameStr.includes('red') || nameStr.includes('black')) return 'red';
    if (nameStr.includes('blue') || nameStr.includes('white')) return 'blue';
    
    if (unit.img && unit.img.src) {
        let src = unit.img.src.toLowerCase();
        if (src.includes('red')) return 'red';
        if (src.includes('blue')) return 'blue';
    }

    let team = unit.gridY < 9 ? 'red' : 'blue';
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

function getSuperunitsForTeam(teamName, allUnits) {
    let teamUnits = allUnits.filter(u => getTeamFromUnit(u) === teamName);
    let combatUnits = teamUnits.filter(u => !isSpecialUnit(u) && getUnitPower(u) !== Infinity);
    let specialUnits = teamUnits.filter(u => isSpecialUnit(u) || getUnitPower(u) === Infinity);
    let superunits = [];
    let visited = new Set();

    combatUnits.forEach(unit => {
        if (visited.has(unit)) return;
        let cluster = [];
        let queue = [unit];
        visited.add(unit);

        while (queue.length > 0) {
            let curr = queue.shift();
            cluster.push(curr);

            combatUnits.forEach(other => {
                if (!visited.has(other)) {
                    let touching = areUnitsAdjacent(curr, other);
                    let sharingEnemyBridge = false;
                    if (!touching) {
                        sharingEnemyBridge = allUnits.some(enemy => 
                            getTeamFromUnit(enemy) !== teamName && areUnitsAdjacent(curr, enemy) && areUnitsAdjacent(other, enemy)
                        );
                    }
                    if (touching || sharingEnemyBridge) {
                        visited.add(other);
                        queue.push(other);
                    }
                }
            });
        }

        let totalPower = cluster.reduce((sum, u) => sum + getUnitPower(u), 0);
        superunits.push({
            units: cluster,
            power: totalPower,
            isSpecial: false,
            team: teamName
        });
    });

    specialUnits.forEach(sp => {
        superunits.push({
            units: [sp],
            power: getUnitPower(sp),
            isSpecial: true,
            team: teamName
        });
    });

    return superunits;
}

function isUnitLockedInStalemate(unit, allUnits) {
    if (isSpecialUnit(unit) || getUnitPower(unit) === Infinity) return false;
    let team = getTeamFromUnit(unit);
    let enemyTeam = team === 'blue' ? 'red' : 'blue';
    let mySuList = getSuperunitsForTeam(team, allUnits);
    let enemySuList = getSuperunitsForTeam(enemyTeam, allUnits);

    let mySu = mySuList.find(su => su.units.includes(unit));
    if (!mySu) return false;

    for (let oSu of enemySuList) {
        let inContact = mySu.units.some(u1 => oSu.units.some(u2 => areUnitsAdjacent(u1, u2)));
        if (inContact && mySu.power === oSu.power) {
            return true;
        }
    }
    return false;
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

function resolveUnitInteractions(allUnits) {
    let blueSuList = getSuperunitsForTeam('blue', allUnits);
    let redSuList = getSuperunitsForTeam('red', allUnits);
    let unitsToDestroy = new Set();

    blueSuList.forEach(bSu => {
        redSuList.forEach(rSu => {
            let touching = bSu.units.some(bu => rSu.units.some(ru => areUnitsAdjacent(bu, ru) || (bu.gridX === ru.gridX && bu.gridY === ru.gridY)));
            if (touching) {
                if (bSu.power > rSu.power) {
                    rSu.units.forEach(u => unitsToDestroy.add(u));
                } else if (rSu.power > bSu.power) {
                    bSu.units.forEach(u => unitsToDestroy.add(u));
                }
            }
        });
    });

    allUnits.forEach(ship => {
        let shipTeam = getTeamFromUnit(ship);
        let shipName = (ship.name || '').toLowerCase();
        if (shipName.includes('ship') && typeof getUnitCombatRange === 'function') {
            let combatRanges = getUnitCombatRange(ship);
            allUnits.forEach(targetUnit => {
                let targetTeam = getTeamFromUnit(targetUnit);
                if (targetTeam && targetTeam !== shipTeam) {
                    let targetName = (targetUnit.name || '').toLowerCase();
                    if (targetName.includes('ship')) return; // Ships do not destroy ships at range

                    let inRange = combatRanges.some(rangeBox => 
                        targetUnit.gridX >= rangeBox.startC && targetUnit.gridX <= rangeBox.endC &&
                        targetUnit.gridY >= rangeBox.startR && targetUnit.gridY <= rangeBox.endR
                    );
                    if (inRange) {
                        unitsToDestroy.add(targetUnit);
                    }
                }
            });
        }
    });

    if (unitsToDestroy.size > 0) {
        commitUnitDestruction(allUnits, unitsToDestroy);
    }
}

function tryMoveUnit(unit, newC, newR) {
    if (!unit) return false;
    if (isUnitLockedInStalemate(unit, units)) {
        return false;
    }

    unit.gridX = newC;
    unit.gridY = newR;

    goldCores.forEach(core => {
        // Allow BOTH orthogonal and diagonal adjacent tiles (Chebyshev distance <= 1)
        let isAdjacentToCore = Math.abs(core.c - newC) <= 1 && Math.abs(core.r - newR) <= 1;

        if (isAdjacentToCore) {
            let currentTeam = getTeamFromUnit(unit);
            
            // Only trigger capture and flag animation if unowned or owned by the enemy team
            if (core.owner !== currentTeam) {
                core.owner = currentTeam;
                if (currentTeam === 'blue') blueCoins++;
                else redCoins++;
                flagAnimations[core.id] = performance.now(); // Play animation only on fresh/enemy capture
            }
        }
    });

    resolveUnitInteractions(units);
    currentTurn = currentTurn === 'blue' ? 'red' : 'blue';
    return true;
}

function drawTeamUIAndFlags() {
    let now = performance.now();

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

    goldCores.forEach(core => {
        let cx = core.c * cellSize + cellSize / 2;
        let cy = core.r * cellSize + cellSize / 2;

        if (core.owner) {
            ctx.fillStyle = core.owner === 'blue' ? '#3498db' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.25, 0, Math.PI * 2);
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
                let dropOffset = (1 - Math.cos(progress * Math.PI * 0.5)) * (cellSize * 1.5);
                let renderY = cy - (cellSize * 1.5) + dropOffset;

                ctx.fillStyle = core.owner === 'blue' ? '#2980b9' : '#c0392b';
                ctx.fillRect(cx - 4, renderY, 8, cellSize * 0.8);
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

    let mapCenterX = canvas.width / 2;
    let mapCenterY = canvas.height / 2;

    ['blue', 'red'].forEach(teamName => {
        let suList = getSuperunitsForTeam(teamName, units);
        suList.forEach(su => {
            let avgX = su.units.reduce((sum, u) => sum + (u.renderX !== undefined ? u.renderX : u.gridX * cellSize), 0) / su.units.length;
            let avgY = su.units.reduce((sum, u) => sum + (u.renderY !== undefined ? u.renderY : u.gridY * cellSize), 0) / su.units.length;

            let unitCenterX = avgX + cellSize / 2;
            let unitCenterY = avgY + cellSize / 2;

            let dirX = mapCenterX - unitCenterX;
            let dirY = mapCenterY - unitCenterY;
            let length = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
            
            let significantDistance = cellSize * 1.8;
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
            
            let lockedText = su.units.some(u => isUnitLockedInStalemate(u, units)) ? ' 🔒' : '';
            ctx.fillText(`${powerDisplay}${lockedText}`, badgeX + 22, badgeY + 12);
        });
    });

    destroyedUnitsQueue = destroyedUnitsQueue.filter(item => {
        let elapsed = now - item.startTime;
        let progress = elapsed / item.duration;
        if (progress >= 1.0) return false;

        let u = item.unit;
        let rx = u.gridX * cellSize;
        let ry = u.gridY * cellSize;

        ctx.fillStyle = `rgba(255, 50, 50, ${1 - progress})`;
        ctx.fillRect(rx + 2, ry + 2, cellSize - 4, cellSize - 4);
        return true;
    });
}
