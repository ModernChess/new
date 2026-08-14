// =========================================================================
// TEAM MECHANICS, COMBAT, CAPTURE, AND UI OVERLAY CONTROLLER
// =========================================================================

// --- TEAM & TURN STATE ---
let currentTurn = 'blue'; // Tracks whose turn it currently is ('blue' or 'red')
let blueCoins = 0;         // Keeps score of gold cores captured by the blue team
let redCoins = 0;          // Keeps score of gold cores captured by the red team

let flagAnimations = {};   // Stores active drop animation data for captured flags
let destroyedUnitsQueue = []; // Holds units currently playing the disintegration animation before removal

// =========================================================================
// CONSOLE LOGGING & ERROR VALIDATION SYSTEM
// =========================================================================
const TeamSystemLog = {
    info: function(message, data = null) {
        console.log(`%c[INFO][team_mechanics]: ${message}`, 'color: #3498db; font-weight: bold;', data !== null ? data : '');
    },
    warn: function(message, data = null) {
        console.warn(`%c[WARN][team_mechanics]: ${message}`, 'color: #f1c40f; font-weight: bold;', data !== null ? data : '');
    },
    error: function(message, errorDetails = null) {
        console.error(`%c[ERROR][team_mechanics]: ${message}`, 'color: #e74c3c; font-weight: bold;', errorDetails !== null ? errorDetails : '');
    },
    success: function(message, data = null) {
        console.log(`%c[SUCCESS][team_mechanics]: ${message}`, 'color: #2ecc71; font-weight: bold;', data !== null ? data : '');
    }
};

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
let blueFlagImg = new Image(); // Creates image object for blue team's flag
blueFlagImg.src = 'https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/blue_flag.jpg'; // Sets source URL for blue flag asset
let blueFlagLoaded = false; // Flag status tracking to ensure image is fully downloaded before drawing
blueFlagImg.onload = () => { 
    blueFlagLoaded = true; 
    TeamSystemLog.success('Blue flag asset loaded successfully.');
}; 
blueFlagImg.onerror = () => {
    TeamSystemLog.error('Failed to load blue flag asset from CDN source.');
};

let redFlagImg = new Image(); // Creates image object for red team's flag
redFlagImg.src = 'https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/red_flag.jpg'; // Sets source URL for red flag asset
let redFlagLoaded = false; // Flag status tracking for red flag asset
redFlagImg.onload = () => { 
    redFlagLoaded = true; 
    TeamSystemLog.success('Red flag asset loaded successfully.');
}; 
redFlagImg.onerror = () => {
    TeamSystemLog.error('Failed to load red flag asset from CDN source.');
};

// Determines which team ('blue' or 'red') a given unit belongs to based on properties or board position
function getTeamFromUnit(unit) {
    if (!unit) {
        TeamSystemLog.warn('getTeamFromUnit called with null/undefined unit. Defaulting to \'blue\'.');
        return 'blue'; // Fallback default if unit is null/undefined
    }
    if (unit._assignedTeam) return unit._assignedTeam; // Returns cached team if already evaluated
    
    if (unit.team) {
        unit._assignedTeam = unit.team.toLowerCase(); // Caches and returns explicit team property
        return unit._assignedTeam;
    }
    if (unit.name) {
        let name = unit.name.toLowerCase();
        if (name.includes('red') || name.includes('black')) { unit._assignedTeam = 'red'; return 'red'; } // Detects red team from name
        if (name.includes('blue') || name.includes('white')) { unit._assignedTeam = 'blue'; return 'blue'; } // Detects blue team from name
    }
    if (unit.img && unit.img.src) {
        let src = unit.img.src.toLowerCase();
        if (src.includes('red') || src.includes('black')) { unit._assignedTeam = 'red'; return 'red'; } // Detects team from image file URL path
        if (src.includes('blue') || src.includes('white')) { unit._assignedTeam = 'blue'; return 'blue'; }
    }
    
    unit._assignedTeam = (unit.gridY < 9) ? 'red' : 'blue'; // Spatial fallback: top half grid rows are red, bottom half are blue
    TeamSystemLog.info(`Team inferred via spatial fallback for unit '${unit.name || 'Unknown'}': ${unit._assignedTeam}`);
    return unit._assignedTeam;
}

// Calculates the strategic combat power value of a specific unit type
function getUnitPower(unit) {
    if (!unit) {
        TeamSystemLog.warn('getUnitPower called with null/undefined unit. Returning power 0.');
        return 0; // Null check returns 0 power
    }
    let name = (unit.name || '').toLowerCase();
    if (name.includes('artillery') || name.includes('ship') || name.includes('boat')) return 0; // Special units contribute 0 frontline power weight
    if (unit.power !== undefined && name.includes('artillery') === false && name.includes('ship') === false) return unit.power; // Uses custom assigned unit power if present
    if (name.includes('tank')) return 2; // Tanks have a baseline power value of 2
    if (name.includes('infantry') || name.includes('soldier')) return 1; // Infantry units have a baseline power value of 1
    return 1; // Default fallback unit power
}

// Identifies whether a unit is a non-standard combat entity (Artillery, Ship, Boat, or 0-power unit)
function isSpecialUnit(unit) {
    if (!unit) return false;
    let name = (unit.name || '').toLowerCase();
    return name.includes('artillery') || name.includes('ship') || name.includes('boat') || getUnitPower(unit) === 0;
}

// Checks if two units are immediately adjacent to each other horizontally, vertically, or diagonally (Chebyshev distance <= 1)
function areUnitsConnected(u1, u2) {
    if (!u1 || !u2) return false;
    let dx = Math.abs(u1.gridX - u2.gridX); // Horizontal coordinate distance difference
    let dy = Math.abs(u1.gridY - u2.gridY); // Vertical coordinate distance difference
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0); // True if touching within 1 tile and not the exact same tile
}

// Groups team units into connected "superunits", accounting for direct bonds and proxy enemy-bridge connections
function getSuperunitsForTeam(teamName, allUnits) {
    if (!Array.isArray(allUnits)) {
        TeamSystemLog.error('getSuperunitsForTeam received invalid units array.');
        return [];
    }

    let teamUnits = allUnits.filter(u => getTeamFromUnit(u) === teamName && !isSpecialUnit(u)); // Filters regular combat units for the team
    let enemyUnits = allUnits.filter(u => getTeamFromUnit(u) !== teamName && !isSpecialUnit(u)); // Filters enemy combat units for proxy checks
    let visited = new Set(); // Tracks processed units to prevent infinite loops during traversal
    let superunits = []; // Collection array to store assembled superunit groups

    teamUnits.forEach(unit => {
        if (visited.has(unit)) return; // Skip if unit is already part of a processed cluster

        let group = []; // Units belonging to this specific superunit cluster
        let queue = [unit]; // Traversal queue
        visited.add(unit);

        while (queue.length > 0) {
            let curr = queue.shift();
            group.push(curr);

            // 1. Direct friendly connections check
            teamUnits.forEach(other => {
                if (!visited.has(other) && areUnitsConnected(curr, other)) {
                    visited.add(other);
                    queue.push(other); // Adds directly touching friendly unit to cluster
                }
            });

            // 2. Proxy Bridge Connections through adjacent enemy units check
            teamUnits.forEach(other => {
                if (!visited.has(other)) {
                    let bridgedByEnemy = enemyUnits.some(eUnit => areUnitsConnected(curr, eUnit) && areUnitsConnected(other, eUnit));
                    if (bridgedByEnemy) {
                        visited.add(other);
                        queue.push(other); // Adds friendly unit separated by an enemy bridge to cluster
                    }
                }
            });
        }

        let totalPower = group.reduce((sum, u) => sum + getUnitPower(u), 0); // Sums total combined power of all units in cluster
        superunits.push({ units: group, power: totalPower });
    });

    // Treats individual special units (artillery/ships) as standalone superunit entities
    let specialUnits = allUnits.filter(u => getTeamFromUnit(u) === teamName && isSpecialUnit(u));
    specialUnits.forEach(su => {
        superunits.push({ units: [su], power: getUnitPower(su) });
    });

    return superunits;
}

// Checks if a specific unit is currently locked in an equal-power frontline stalemate with an enemy superunit
function isUnitLockedInStalemate(unit) {
    if (!unit) return false;
    let team = getTeamFromUnit(unit);
    let opposingTeam = team === 'blue' ? 'red' : 'blue';
    let teamSupers = getSuperunitsForTeam(team, units);
    let opposingSupers = getSuperunitsForTeam(opposingTeam, units);

    let isLocked = false;
    teamSupers.forEach(su => {
        if (su.units.includes(unit)) {
            opposingSupers.forEach(oSu => {
                let touching = oSu.units.some(ou => su.units.some(u => areUnitsConnected(u, ou) || (u.gridX === ou.gridX && u.gridY === ou.gridY)));
                if (touching && su.power === oSu.power) {
                    isLocked = true; // True if touching an enemy superunit of exact matching power level
                }
            });
        }
    });
    return isLocked;
}

// Queues a list of defeated units into the disintegration animation pipeline
function queueForDisintegration(unitList) {
    if (!Array.isArray(unitList) || unitList.length === 0) return;
    let now = performance.now();
    unitList.forEach(u => {
        if (!destroyedUnitsQueue.some(item => item.unit === u)) {
            destroyedUnitsQueue.push({
                unit: u,
                startTime: now,
                duration: 1800 // Animation duration in milliseconds before complete removal
            });
            TeamSystemLog.info(`Unit '${u.name}' queued for disintegration sequence.`);
        }
    });
}

// Compares opposing superunits on the board, resolving combat outcomes and triggering destruction queues
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
                    queueForDisintegration(rSu.units); // Blue stronger: destroys red superunit
                } else if (rSu.power > bSu.power) {
                    queueForDisintegration(bSu.units); // Red stronger: destroys blue superunit
                }
            }
        });
    });

    // Cleans up units whose disintegration animation duration has fully elapsed
    let now = performance.now();
    let fullyDestroyed = destroyedUnitsQueue.filter(item => (now - item.startTime) >= item.duration).map(item => item.unit);
    if (fullyDestroyed.length > 0) {
        units = units.filter(u => !fullyDestroyed.includes(u)); // Removes destroyed units from active unit array
        destroyedUnitsQueue = destroyedUnitsQueue.filter(item => (now - item.startTime) < item.duration);
        TeamSystemLog.success(`Cleaned up ${fullyDestroyed.length} fully disintegrated units from the board.`);
    }
}

// Checks if target grid coordinates land exactly on a Gold Core's center tile
function isGoldCoreCenter(c, r) {
    return goldCores.some(core => core.c === c && core.r === r);
}

// Checks and processes gold core capture events when a unit steps into a valid capture zone
function checkAndCaptureGold(unit, c, r) {
    if (!unit) return;
    let team = getTeamFromUnit(unit);
    goldCores.forEach(core => {
        let dx = Math.abs(core.c - c);
        let dy = Math.abs(core.r - r);
        let inDefinedZone = core.captureZones.some(zone => zone.c === c && zone.r === r);
        let isLocalAdjacent = (dx <= 1 && dy <= 1); 

        let matches = inDefinedZone || (isLocalAdjacent && core.id !== 'gc5' && core.id !== 'gc6');
        
        if (matches && core.owner !== team) {
            core.owner = team; // Updates gold core ownership to capturing team
            flagAnimations[core.id] = { startTime: performance.now(), team: team }; // Triggers drop animation

            if (team === 'blue') {
                blueCoins += 1; // Increments blue team coin score
                TeamSystemLog.success(`Blue team captured Gold Core '${core.id}'! Current Blue Coins: ${blueCoins}`);
            } else {
                redCoins += 1; // Increments red team coin score
                TeamSystemLog.success(`Red team captured Gold Core '${core.id}'! Current Red Coins: ${redCoins}`);
            }
        }
    });
}

// Validates and processes a unit movement attempt, enforcing turn orders, stalemate locks, and capture checks
function tryMoveUnit(unit, newC, newR) {
    if (!unit) {
        TeamSystemLog.error('tryMoveUnit called with null/undefined unit.');
        return false;
    }

    let unitTeam = getTeamFromUnit(unit);
    if (unitTeam !== currentTurn) {
        TeamSystemLog.warn(`Move rejected: Unit belongs to ${unitTeam}, but it is currently ${currentTurn}'s turn.`);
        return false; // Blocks movement if it is not that team's active turn
    }
    
    if (isGoldCoreCenter(newC, newR)) {
        TeamSystemLog.warn(`Move rejected: Attempted to move unit onto Gold Core center tile (${newC}, ${newR}).`);
        return false; // Prohibits moving units directly onto gold core centers
    }

    // Prohibits movement if the unit is currently locked in an equal power stalemate
    if (isUnitLockedInStalemate(unit)) {
        TeamSystemLog.warn(`🔒 STALEMATE LOCK: Unit '${unit.name}' cannot be moved while locked in equal power stalemate!`);
        return false;
    }

    unit.gridX = newC; // Updates unit column coordinate
    unit.gridY = newR; // Updates unit row coordinate

    checkAndCaptureGold(unit, newC, newR); // Checks if move results in gold core capture
    resolveUnitInteractions(); // Resolves combat interactions after movement

    currentTurn = (currentTurn === 'blue') ? 'red' : 'blue'; // Switches active turn to opposing team
    TeamSystemLog.info(`Turn successfully passed. Current turn is now: ${currentTurn}`);
    return true;
}

// =========================================================================
// RENDER FUNCTION WITH MAP-CENTER ORIENTED OFFSET POWER LABELS
// =========================================================================
function drawTeamUIAndFlags() {
    let currentTime = performance.now();

    resolveUnitInteractions(); // Continuously resolves ongoing combat rules during render frame

    // 1. Disintegration Overlay: Renders gradual grid-cell patch fading effect for defeated units
    destroyedUnitsQueue.forEach(item => {
        let elapsed = currentTime - item.startTime;
        let progress = Math.min(1, elapsed / item.duration);
        let ux = item.unit.gridX * cellSize;
        let uy = item.unit.gridY * cellSize;

        ctx.save();
        let cols = 4;
        let rows = 4;
        let cellW = cellSize / cols;
        let cellH = cellSize / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
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

    // 2. Render Gold Core Flags: Draws captured team flags over gold core tiles with drop animation
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
                renderY = targetY - (cellSize * 1.5) + dropOffset; // Cosine easing drop offset calculation
            }
        }

        let flagImgToDraw = (core.owner === 'blue' && blueFlagLoaded) ? blueFlagImg : 
                           (core.owner === 'red' && redFlagLoaded) ? redFlagImg : null;

        if (flagImgToDraw) {
            ctx.drawImage(flagImgToDraw, px, renderY, flagWidth, flagHeight);
        }
    });

    // 3. Render Power Badges with Significant Inward Offset (Towards Map Center)
    let mapCenterX = (ctx.canvas.width / 2); // Calculates absolute horizontal center pixel coordinate of the canvas map
    let mapCenterY = (ctx.canvas.height / 2); // Calculates absolute vertical center pixel coordinate of the canvas map

    ['blue', 'red'].forEach(team => {
        let superunits = getSuperunitsForTeam(team, units);
        let opposingTeam = team === 'blue' ? 'red' : 'blue';
        let opposingSupers = getSuperunitsForTeam(opposingTeam, units);

        superunits.forEach(su => {
            let isLocked = false;
            su.units.forEach(u => {
                opposingSupers.forEach(oSu => {
                    let touching = oSu.units.some(ou => areUnitsConnected(u, ou) || (u.gridX === ou.gridX && u.gridY === ou.gridY));
                    if (touching && su.power === oSu.power) {
                        isLocked = true;
                    }
                });
            });

            // Calculates average pixel location center of all units inside the superunit group
            let avgX = su.units.reduce((sum, u) => sum + (u.renderX !== undefined ? u.renderX : u.gridX * cellSize), 0) / su.units.length;
            let avgY = su.units.reduce((sum, u) => sum + (u.renderY !== undefined ? u.renderY : u.gridY * cellSize), 0) / su.units.length;

            let labelText = su.units.length > 1 ? `${su.power}` : ''; // Only displays power badge if superunit has multiple units combined
            if (isLocked) labelText += ' 🔒'; // Appends lock symbol text if group is stalemated

            if (labelText.trim() !== '') {
                // Calculates directional vector pointing from the superunit cluster towards the map center
                let dirX = mapCenterX - (avgX + cellSize / 2);
                let dirY = mapCenterY - (avgY + cellSize / 2);
                let length = Math.sqrt(dirX * dirX + dirY * dirY); // Euclidean magnitude length calculation
                
                let offsetX = 0;
                let offsetY = 0;
                let significantDistance = cellSize * 1.8; // Safe pixel distance offset multiplier away from unit cluster

                if (length > 0) {
                    offsetX = (dirX / length) * significantDistance; // Normalizes and scales horizontal offset vector
                    offsetY = (dirY / length) * significantDistance; // Normalizes and scales vertical offset vector
                } else {
                    offsetY = -significantDistance; // Fallback default upward offset if cluster sits dead-center
                }

                let tagCenterX = avgX + (cellSize / 2) + offsetX;
                let tagCenterY = avgY + (cellSize / 2) + offsetY;

                ctx.save();
                ctx.font = 'bold 15px sans-serif';
                
                let textMetrics = ctx.measureText(labelText);
                let paddingX = 10;
                let tagWidth = textMetrics.width + paddingX * 2;
                let tagHeight = 26;
                let tagX = tagCenterX - (tagWidth / 2);
                let tagY = tagCenterY - (tagHeight / 2);

                ctx.fillStyle = '#cc0000'; // Red badge pill background fill color
                ctx.strokeStyle = '#ffffff'; // White border outline color
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 6); // Draws rounded rectangle pill shape
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#ffffff'; // White text fill color
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(labelText, tagCenterX, tagCenterY); // Renders power/lock text label on badge
                ctx.restore();
            }
        });
    });

    // 4. Draw HUD Box: Renders on-screen game status interface panel showing turn and coin counts
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Semi-transparent dark box background
    ctx.fillRect(10, 10, 210, 60);
    ctx.strokeStyle = currentTurn === 'blue' ? '#3498db' : '#e74c3c'; // Border color matches active team color
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 210, 60);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Turn: ${currentTurn.toUpperCase()}`, 20, 30); // Displays active turn indicator text
    ctx.fillStyle = '#3498db';
    ctx.fillText(`Blue Coins: ${blueCoins}`, 20, 48); // Displays blue team captured gold score
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(`Red Coins: ${redCoins}`, 120, 48); // Displays red team captured gold score
    ctx.restore();
}

TeamSystemLog.info('Team mechanics and combat controller initialized successfully.');
