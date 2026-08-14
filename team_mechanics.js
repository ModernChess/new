// =========================================================================
// TEAM MECHANICS, SPECIALSUPERUNITS, COMBAT, AND WIN CONDITIONS CONTROLLER
// =========================================================================

let currentTurn = 'blue';
let blueCoins = 0;
let redCoins = 0;
let destroyedUnitsQueue = [];
let flagAnimations = {};
let gameOver = false;
let winnerMessage = '';

let goldCores = [
    { id: 'gc1', c: 6, r: 4, owner: null, isBase: false, captureZones: [{c:6, r:3}, {c:6, r:5}, {c:5, r:4}, {c:7, r:4}, {c:5, r:3}, {c:5, r:5}, {c:7, r:3}, {c:7, r:5}] },
    { id: 'gc2', c: 11, r: 0, owner: 'red', isBase: true, teamBase: 'red', isTrueBaseCore: true, captureZones: [{c:11, r:0}, {c:11, r:1}, {c:10, r:0}, {c:12, r:0}, {c:10, r:1}, {c:12, r:1}, {c:10, r:2}, {c:12, r:2}, {c:11, r:2}] }, // Red True Base Core (L1 -> c:11, r:0)
    { id: 'gc3', c: 12, r: 7, owner: null, isBase: false, captureZones: [{c:12, r:6}, {c:12, r:8}, {c:11, r:7}, {c:13, r:7}, {c:11, r:6}, {c:11, r:8}, {c:13, r:6}, {c:13, r:8}] },
    { id: 'gc4', c: 5, r: 14, owner: null, isBase: false, captureZones: [{c:5, r:13}, {c:5, r:15}, {c:4, r:14}, {c:6, r:14}, {c:4, r:13}, {c:4, r:15}, {c:6, r:13}, {c:6, r:15}] },
    { id: 'gc5', c: 0, r: 11, owner: 'blue', isBase: true, teamBase: 'blue', isTrueBaseCore: true, captureZones: [{c:0, r:11}, {c:0, r:10}, {c:0, r:12}, {c:1, r:10}, {c:1, r:11}, {c:1, r:12}, {c:1, r:13}, {c:0, r:13}] }, // Blue True Base Core (A12 -> c:0, r:11)
    { id: 'gc6', c: 11, r: 16, owner: null, isBase: false, captureZones: [{c:11, r:15}, {c:11, r:17}, {c:10, r:16}, {c:12, r:16}, {c:10, r:15}, {c:10, r:17}, {c:12, r:15}, {c:12, r:17}] }
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

    // STRICT CHECK: Only true faction base cores (`isTrueBaseCore`) trigger win conditions!
    goldCores.forEach(core => {
        if (core.isBase && core.isTrueBaseCore) {
            let occupyingUnit = allUnits.find(u => u.gridX === core.c && u.gridY === core.r);
            if (occupyingUnit) {
                let unitTeam = getTeamFromUnit(occupyingUnit);
                if (unitTeam !== core.teamBase) {
                    gameOver = true;
                    winnerMessage = `${unitTeam.toUpperCase()} TEAM WINS BY CAPTURING ENEMY BASE!`;
                    TeamLog.success(winnerMessage);
                }
            }
        }
    });
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
        
        goldCores.forEach(core => {
            if (core.owner === teamName) {
                let supportingUnitInZone = cluster.some(u => core.captureZones.some(z => z.c === u.gridX && z.r === u.gridY) || (u.gridX === core.c && u.gridY === core.r));
                if (supportingUnitInZone) {
                    superunits.push({
                        units: cluster,
                        power: totalPower,
                        isSpecial: false,
                        isSpecialSuperunit: true,
                        core: core,
                        team: teamName
                    });
                    return;
                }
            }
        });

        superunits.push({
            units: cluster,
            power: totalPower,
            isSpecial: false,
            isSpecialSuperunit: false,
            team: teamName
        });
    });

    specialUnits.forEach(sp => {
        superunits.push({
            units: [sp],
            power: getUnitPower(sp),
            isSpecial: true,
            isSpecialSuperunit: false,
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
                if (bSu.power === Infinity && rSu.power === Infinity) {
                    bSu.units.forEach(u => unitsToDestroy.add(u));
                    rSu.units.forEach(u => unitsToDestroy.add(u));
                } else if (bSu.power > rSu.power) {
                    rSu.units.forEach(u => unitsToDestroy.add(u));
                } else if (rSu.power > bSu.power) {
                    bSu.units.forEach(u => unitsToDestroy.add(u));
                }
            }
        });
    });

    allUnits.forEach(ship => {
        let shipName = (ship.name || '').toLowerCase();
        if (shipName.includes('ship')) {
            let combatRanges = getUnitCombatRange(ship);
            allUnits.coreRangeHitCheck = true;
            allUnits.forEach(targetUnit => {
                if (getTeamFromUnit(targetUnit) !== getTeamFromUnit(ship)) {
                    let targetName = (targetUnit.name || '').toLowerCase();
                    if (targetName.includes('ship')) return;

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

    checkWinConditions(allUnits);
}

function tryMoveUnit(unit, newC, newR) {
    if (gameOver || !unit) return false;
    if (isUnitLockedInStalemate(unit, units)) {
        return false;
    }

    let movingTeam = getTeamFromUnit(unit);
    let movingPower = getUnitPower(unit);

    goldCores.forEach(core => {
        let inZone = core.captureZones.some(z => z.c === newC && z.r === newR) || (core.c === newC && core.r === newR);

        if (inZone) {
            let defendingTeam = core.owner;
            
            if (defendingTeam !== movingTeam) {
                if (defendingTeam && defendingTeam !== movingTeam) {
                    let defenderSu = getSuperunitsForTeam(defendingTeam, units).find(su => su.core === core || su.units.some(u => core.captureZones.some(z => z.c === u.gridX && z.r === u.gridY)));
                    let defenderPower = defenderSu ? defenderSu.power : 0;

                    if (movingPower > defenderPower) {
                        core.owner = movingTeam;
                        if (movingTeam === 'blue') blueCoins++;
                        else redCoins++;
                        flagAnimations[core.id] = performance.now();
                        TeamLog.success(`${movingTeam.toUpperCase()} captured enemy/neutral Gold Core ${core.id}!`);
                    } else {
                        let directlyConnectedToDefenderUnits = units.some(defU => getTeamFromUnit(defU) === defendingTeam && areUnitsAdjacent(unit, defU));
                        if (directlyConnectedToDefenderUnits) {
                            unitsToDestroy.add(unit);
                            TeamLog.warn(`${movingTeam.toUpperCase()} unit failed to capture core ${core.id} and was destroyed due to direct unit contact.`);
                        } else {
                            TeamLog.info(`${movingTeam.toUpperCase()} unit failed to capture core ${core.id} but survived safely.`);
                        }
                    }
                } else if (!defendingTeam) {
                    core.owner = movingTeam;
                    if (movingTeam === 'blue') blueCoins++;
                    else redCoins++;
                    flagAnimations[core.id] = performance.now();
                    TeamLog.success(`${movingTeam.toUpperCase()} claimed neutral Gold Core ${core.id}!`);
                }
            }
        }
    });

    unit.gridX = newC;
    unit.gridY = newR;

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
            if (su.units.length <= 1 && su.power !== Infinity && !su.isSpecialSuperunit) return;

            let avgX = su.units.reduce((sum, u) => sum + (u.renderX !== undefined ? u.renderX : u.gridX * cellSize), 0) / su.units.length;
            let avgY = su.units.reduce((sum, u) => sum + (u.renderY !== undefined ? u.renderY : u.gridY * cellSize), 0) / su.units.length;

            if (su.isSpecialSuperunit && su.core) {
                avgX = (avgX + su.core.c * cellSize) / 2;
                avgY = (avgY + su.core.r * cellSize) / 2;
            }

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
