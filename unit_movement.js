let selectedUnit = null;     
let legalMoves = [];         
let targetTile = null;       
let pressTimer = null;       
let rangeMode = false;
let rangeSquares = [];

function getLargerCoord(c, r) {
    const cols_9x9 = ['Al', 'Bl', 'Cl', 'Dl', 'El', 'Fl', 'Gl', 'Hl', 'Il'];
    const rows_9x9 = ['1l', '2l', '3l', '4l', '5l', '6l', '7l', '8l', '9l'];
    let lc = Math.floor(c / 2);
    let lr = Math.floor(r / 2);
    if (lc >= 9) lc = 8;
    if (lr >= 9) lr = 8;
    return { col: cols_9x9[lc], row: rows_9x9[lr], colIdx: lc, rowIdx: lr };
}

function getUnitCombatRange(unit) {
    let maxDist = (unit.name === 'Ship') ? 1 : (unit.name === 'Artillery' ? 3 : 0);
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
                if (typeof isGoldCore === 'function' && isGoldCore(nc, nr)) {
                    break;
                }

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
            let unitTeam = getTeamFromUnit(clickedUnit);
            if (unitTeam !== currentTurn) {
                return; // Cannot select opponent units on wrong turn
            }

            pressTimer = setTimeout(() => {
                selectedUnit = clickedUnit;
                legalMoves = getLegalMoves(clickedUnit);
                targetTile = null; 
                rangeMode = false; 
            }, 500); 
        } else {
            if (selectedUnit && (selectedUnit.name === 'Ship' || selectedUnit.name === 'Artillery')) {
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
                        
                        // PASS MOVE TO TEAM MECHANICS
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

    if (mapLoaded) {
        ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // DRAW HUD & TEAM FLAGS OVERLAY
    if (typeof drawTeamUIAndFlags === 'function') {
        drawTeamUIAndFlags();
    }

    units.forEach(u => {
        let targetX = u.gridX * cellSize;
        let targetY = u.gridY * cellSize;
        
        u.x = lerp(u.x, targetX, 0.025);
        u.y = lerp(u.y, targetY, 0.025);

        let isMoving = Math.abs(u.x - targetX) > 0.1 || Math.abs(u.y - targetY) > 0.1;
        u.renderX = u.x + (isMoving ? (Math.random() - 0.5) * 1.2 : 0);
        u.renderY = u.y + (isMoving ? (Math.random() - 0.5) * 1.2 : 0);

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

        if (selectedUnit.name === 'Ship' || selectedUnit.name === 'Artillery') {
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

update();
