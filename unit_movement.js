// =========================================================================
// UNIT MOVEMENT, INTERACTION, AND RENDERING LOOP CONTROLLER
// =========================================================================

let selectedUnit = null;     
let legalMoves = [];         
let targetTile = null;       
let pressTimer = null;       
let rangeMode = false;
let rangeSquares = [];
let lastClickTime = 0;       // Double-click timer tracker for pendingSpawn
let lastClickTile = null;    // Double-click tile target tracker for pendingSpawn

const SystemLog = {
    info: (msg, data = null) => console.log(`[INFO][unit_movement]: ${msg}`, data ?? ''),
    warn: (msg, data = null) => console.warn(`[WARN][unit_movement]: ${msg}`, data ?? ''),
    error: (msg, data = null) => console.error(`[ERROR][unit_movement]: ${msg}`, data ?? ''),
    success: (msg, data = null) => console.log(`[SUCCESS][unit_movement]: ${msg}`, data ?? '')
};

function validateCoordinates(c, r, maxCols = cols, maxRows = rows) {
    if (typeof c !== 'number' || typeof r !== 'number' || isNaN(c) || isNaN(r)) return false;
    if (c < 0 || c >= maxCols || r < 0 || r >= maxRows) return false;
    return true;
}

function getLargerCoord(c, r) {
    if (!validateCoordinates(c, r)) return { col: 'Al', row: '1l', colIdx: 0, rowIdx: 0 };

    const cols_9x9 = ['Al', 'Bl', 'Cl', 'Dl', 'El', 'Fl', 'Gl', 'Hl', 'Il'];
    const rows_9x9 = ['1l', '2l', '3l', '4l', '5l', '6l', '7l', '8l', '9l'];
    let lc = Math.floor(c / 2);
    let lr = Math.floor(r / 2);
    if (lc >= 9) lc = 8;
    if (lr >= 9) lr = 8;

    return { col: cols_9x9[lc], row: rows_9x9[lr], colIdx: lc, rowIdx: lr };
}

function getUnitCombatRange(unit) {
    if (!unit) return [];

    let maxDist = ((unit.name || '').includes('Ship')) ? 1 : ((unit.name || '').includes('Artillery') ? 3 : 0);
    if (maxDist === 0) return [];

    let currentLg = getLargerCoord(unit.gridX, unit.gridY);
    let results = [];
    let directions = [
        {dx: 0, dy: -1}, {dx: 0, dy: 1},  
        {dx: -1, dy: 0}, {dx: 1, dy: 0},  
        {dx: -1, dy: -1}, {dx: 1, dy: -1}, 
        {dx: -1, dy: 1}, {dx: 1, dy: 1}    
    ];

    directions.forEach(dir => {
        for (let step = 1; step <= maxDist; step++) {
            let nc = currentLg.colIdx + (dir.dx * step);
            let nr = currentLg.rowIdx + (dir.dy * step);
            if (nc >= 0 && nc < 9 && nr >= 0 && nr < 9) {
                results.push({
                    startC: nc * 2, startR: nr * 2,
                    endC: nc * 2 + 1, endR: nr * 2 + 1
                });
            }
        }
    });

    return results;
}

function getLegalMoves(unit) {
    if (!unit) return [];

    let moves = [];
    let maxRange = unit.range;
    let cx = unit.gridX;
    let cy = unit.gridY;

    if (!validateCoordinates(cx, cy)) return [];

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
                if (typeof isGoldCore === 'function' && isGoldCore(nc, nr)) break;

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

    if (!validateCoordinates(c, r)) return;

    // Intercept pointer events while waiting for a deployment tile placement
    if (typeof pendingSpawn !== 'undefined' && pendingSpawn !== null) {
        let validTiles = typeof getValidDeploymentTiles === 'function' 
            ? getValidDeploymentTiles(pendingSpawn.team, pendingSpawn.unitType) 
            : [];
        let isValid = validTiles.some(t => t.c === c && t.r === r);

        if (isValid) {
            let nowTime = performance.now();
            if (lastClickTile && lastClickTile.c === c && lastClickTile.r === r && (nowTime - lastClickTime) < 400) {
                // Double-click confirmed on valid deployment tile
                let occupied = units.some(u => u.gridX === c && u.gridY === r);
                if (!occupied) {
                    let currentCellSize = typeof cellSize !== 'undefined' ? cellSize : 30;
                    
                    units.push({
                        name: pendingSpawn.unitName,
                        type: pendingSpawn.category,
                        range: pendingSpawn.unitRange,
                        gridX: c,
                        gridY: r,
                        x: c * currentCellSize,
                        y: r * currentCellSize,
                        img: pendingSpawn.img,
                        loaded: pendingSpawn.loaded,
                        team: pendingSpawn.team
                    });

                    SystemLog.success(`Successfully deployed ${pendingSpawn.unitName} for ${pendingSpawn.team.toUpperCase()} at (${c}, ${r}).`);
                    pendingSpawn = null;
                    lastClickTime = 0;
                    lastClickTile = null;
                } else {
                    SystemLog.warn(`Deployment tile (${c}, ${r}) is already occupied.`);
                }
            } else {
                lastClickTime = nowTime;
                lastClickTile = { c: c, r: r };
            }
        } else {
            SystemLog.warn(`Selected tile (${c}, ${r}) is outside valid deployment territory.`);
        }
        return;
    }

    if (r >= 0 && r < rows && c >= 0 && c < cols) {
        let clickedUnit = units.find(u => u.gridX === c && u.gridY === r);

        if (clickedUnit) {
            let unitTeam = getTeamFromUnit(clickedUnit);
            
            if (selectedUnit && rangeMode && (selectedUnit.name || '').includes('Artillery')) {
                let attackerTeam = getTeamFromUnit(selectedUnit);
                if (unitTeam !== attackerTeam) {
                    let combatRanges = getUnitCombatRange(selectedUnit);
                    let inRange = combatRanges.some(rangeBox => 
                        clickedUnit.gridX >= rangeBox.startC && clickedUnit.gridX <= rangeBox.endC &&
                        clickedUnit.gridY >= rangeBox.startR && clickedUnit.gridY <= rangeBox.endR
                    );

                    if (inRange) {
                        SystemLog.info('Artillery target acquired within range. Triggering card duel.');
                        triggerArtilleryDuel(selectedUnit, clickedUnit);
                        selectedUnit = null;
                        rangeMode = false;
                        rangeSquares = [];
                        return;
                    }
                }
            }

            if (unitTeam !== currentTurn) return; 

            pressTimer = setTimeout(() => {
                selectedUnit = clickedUnit;
                legalMoves = getLegalMoves(clickedUnit);
                targetTile = null; 
                rangeMode = false; 
            }, 5); 
        } else {
            if (selectedUnit && ((selectedUnit.name || '').includes('Ship') || (selectedUnit.name || '').includes('Artillery'))) {
                let btnX = selectedUnit.renderX + cellSize + 12;
                let btnY = selectedUnit.renderY - 12;
                let btnSize = cellSize * 0.85;

                if (touchX >= btnX && touchX <= btnX + btnSize && touchY >= btnY && touchY <= btnY + btnSize) {
                    rangeMode = !rangeMode; 
                    rangeSquares = rangeMode ? getUnitCombatRange(selectedUnit) : [];
                    return;
                }
            }

            if (selectedUnit && !rangeMode) {
                let isLegal = legalMoves.some(m => m.c === c && m.r === r);
                if (isLegal) {
                    if (targetTile && targetTile.c === c && targetTile.r === r) {
                        let success = tryMoveUnit(selectedUnit, c, r);
                        if (success) {
                            selectedUnit = null;
                            legalMoves = [];
                            targetTile = null;
                        }
                    } else {
                        targetTile = { c: c, r: r };
                    }
                }
            }
        }
    }
});

canvas.addEventListener('pointerup', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
canvas.addEventListener('pointercancel', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Replaced mapImg with the procedural in-web grid system drawer
    if (typeof drawGridMap === 'function') {
        drawGridMap();
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (typeof drawTeamUIAndFlags === 'function') {
        drawTeamUIAndFlags();
    }

    // Deployment Outline Overlay pass while pendingSpawn is active
    if (typeof pendingSpawn !== 'undefined' && pendingSpawn !== null) {
        let validTiles = typeof getValidDeploymentTiles === 'function' 
            ? getValidDeploymentTiles(pendingSpawn.team, pendingSpawn.unitType) 
            : [];
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3.5;
        validTiles.forEach(tile => {
            let px = tile.c * cellSize;
            let py = tile.r * cellSize;
            ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
        });
    }

    units.forEach(u => {
        let targetX = u.gridX * cellSize;
        let targetY = u.gridY * cellSize;
        
        u.x = lerp(u.x, targetX, 0.05);
        u.y = lerp(u.y, targetY, 0.05);

        u.renderX = u.x;
        u.renderY = u.y;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(u.renderX + cellSize / 2, u.renderY + cellSize - 8, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
    });

    if (selectedUnit) {
        if (rangeMode) {
            ctx.strokeStyle = '#ffffff'; 
            ctx.lineWidth = 3.5;
            rangeSquares.forEach(sq => {
                let px = sq.startC * cellSize;
                let py = sq.startR * cellSize;
                let pWidth = (sq.endC - sq.startC + 1) * cellSize;
                let pHeight = (sq.endR - sq.startR + 1) * cellSize;
                ctx.strokeRect(px + 2, py + 2, pWidth - 4, pHeight - 4);
            });
        } else {
            ctx.strokeStyle = '#ff8000';
            ctx.lineWidth = 3;
            legalMoves.forEach(m => {
                ctx.strokeRect(m.c * cellSize + 2, m.r * cellSize + 2, cellSize - 4, cellSize - 4);
            });

            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 4;
            ctx.strokeRect(selectedUnit.renderX + 2, selectedUnit.renderY + 2, cellSize - 4, cellSize - 4);
        }

        if ((selectedUnit.name || '').includes('Ship') || (selectedUnit.name || '').includes('Artillery')) {
            let btnX = selectedUnit.renderX + cellSize + 12;
            let btnY = selectedUnit.renderY - 12;
            let btnSize = cellSize * 0.85;
            
            ctx.fillStyle = rangeMode ? '#c0392b' : '#e74c3c';
            ctx.fillRect(btnX, btnY, btnSize, btnSize);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, btnSize, btnSize);

            ctx.beginPath();
            ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize * 0.25, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    if (targetTile && !rangeMode) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.strokeRect(targetTile.c * cellSize + 2, targetTile.r * cellSize + 2, cellSize - 4, cellSize - 4);
    }

    units.forEach(u => {
        if (u.loaded && u.loaded()) {
            ctx.drawImage(u.img, u.renderX + 2, u.renderY + 2, cellSize - 4, cellSize - 4);
        }
    });

    requestAnimationFrame(update);
}

SystemLog.info('Unit movement controller updated successfully with Deployment Overlays and Double-Click Handlers.');
update();
