MODERN-CHESS: THE ULTIMATE LOW-LEVEL TECHNICAL SPECIFICATION AND COMPREHENSIVE ARCHITECTURAL BLUEPRINT
1. EXECUTIVE PREFACE & REPOSITORY OVERVIEW
Modern Chess is a hybrid turn-based tactical strategy game that combines traditional grid-based movement with modern wargaming mechanics, economic core captures, dynamic unit clustering, and real-time canvas rendering loops. Built entirely on native web standards—Vanilla JavaScript (ES6+), HTML5 Canvas API, and CSS3—this engine requires zero external graphic libraries, physics engines, or heavy framework runtimes.
This technical manual serves as an all-encompassing, exhaustive master reference document. It is specifically crafted for future artificial intelligence models, maintainers, and engineers. Every single variable name, coordinate transformation, spatial matrix equation, canvas rendering pass, asynchronous asset loader, turn validation gate, and combat resolution heuristic is laid bare in this document.
2. REPOSITORY FILE STRUCTURE & DEPENDENCY TOPOLOGY
The application relies on a strictly ordered script injection tree to avoid race conditions during asynchronous asset acquisition and DOM initialization.
/root-directory/
│
├── index.html              # DOM container, CSS styling engine, screen router, global error telemetry
├── map_setup.js            # Canvas context binding, remote CDN asset pipeline, grid coordinate math, terrain mapping, unit spawning BFS
└── team_mechanics.js       # Turn state machine, gold core tracking, team heuristics, superunit clustering, stalemate logic, combat resolution, HUD rendering

Script Load Order & Execution Sequence:
 * index.html parses first, constructing the Document Object Model, injecting inline CSS rules, setting up global window error event listeners, and rendering the multi-screen navigation wrapper.
 * map_setup.js executes second. It extracts the HTML5 Canvas context (#gameCanvas), sets up the 18x18 grid matrix, initiates the remote CDN asset download queue via fetch/blob caching, generates the loading overlay DOM element, defines the algebraic terrain lookups, and triggers the team spawn algorithms.
 * team_mechanics.js executes last. It establishes the turn-management state variables, gold core coordinate structures, flag animation matrices, superunit graph traversal algorithms, combat evaluation loops, disintegration visual shaders, and the master UI HUD draw pass.
3. index.html — THE DOM, SCREEN ROUTER, & ERROR TELEMETRY SUBSYSTEM
3.1 CSS Design System & Responsive Viewports
The presentation layer is styled via an embedded <style> block leveraging modern CSS Custom Properties (CSS variables) defined on the :root scope:
 * --bg-color: #111; (Deep charcoal primary window background)
 * --panel-bg: #1a1a1a; (Dark gray screen container background)
 * --border-color: #333; (Subtle boundary outlines)
 * --accent-green: #2ecc71; (Confirmation and success highlight color)
 * --accent-blue: #3498db; (Blue team primary identity color)
 * --text-main: #ffffff; (Primary high-contrast text)
 * --text-muted: #aaaaaa; (Secondary metadata text)
The global body element enforces full viewport coverage (width: 100vw; height: 100vh; overflow: hidden;) with flexbox centering.
3.2 The Screen-Switching Architecture
The application acts as a single-page application (SPA) simulation using full-screen container divs designated with the .screen CSS class.
 * Default State: All screens possess display: none; by default.
 * Active State: The screen possessing the .active utility class switches to display: flex;.
The navigateTo(screenId) Function:
function navigateTo(screenId) {
    console.log(`[INFO][index_html] Attempting navigation to screen: '${screenId}'`);
    
    const targetScreen = document.getElementById(screenId);
    if (!targetScreen) {
        console.error(`[ERROR][index_html] Navigation failed: Screen element with ID '${screenId}' does not exist.`);
        return;
    }

    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    targetScreen.classList.add('active');
    console.log(`[SUCCESS][index_html] Successfully navigated to screen: '${screenId}'`);
}

This function wipes the .active class from every single screen in the document before applying it exclusively to the target screenId, ensuring zero DOM overlapping anomalies.
3.3 Global Error Interception & Script Diagnostics
To ensure total observability for future AI agents inspecting browser logs, index.html implements global error handling:
 * window.onerror Event Listener: Intercepts uncaught runtime exceptions globally, logging the exact error message, filename, line number, and column number.
 * onerror Attribute Handlers on <script> Tags: Each external script injection tag (map_setup.js, team_mechanics.js, unit_movement.js) includes an inline fallback logger to instantly catch network or syntax load failures.
4. map_setup.js — CANVAS BINDING, ASSET PIPELINE, & BOARD TOPOLOGY
4.1 Grid Geometry & Spatial Mathematics
The game board is modeled as a discrete Cartesian grid matrix of fixed dimensions:
 * Columns (cols): 18
 * Rows (rows): 18
 * Canvas Width / Height: Standardized at 540 pixels in the HTML markup (width="540" height="540").
 * Cell Size Formula (cellSize):
   
   
   Every single grid cell occupies exactly a 30 \times 30 pixel square on the rendering surface.
Linear Interpolation Mathematical Utility (lerp):
Used across movement and transition systems for smooth coordinate blending:


Where t represents a normalized scalar time parameter bounded between 0.0 and 1.0.
4.2 Remote Asset Pipeline & Blob Caching Engine
Assets are fetched over HTTPS from a raw GitHub repository endpoint defined by ghBase:
[https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/](https://cdn.jsdelivr.net/gh/ModernChess/assets-images@main/)
Array of Tracked Assets (assetUrls):
 * map2.png (Board background texture)
 * blue_tank.jpg
 * blue_infantry.jpg
 * blue_artillery.jpg
 * blue_ship.jpg
 * red_tank.jpg
 * red_infantry.jpg
 * red_artillery.jpg
 * red_ship.jpg
The Loading Screen Overlay DOM Builder:
Upon script execution, map_setup.js dynamically injects a full-screen HTML overlay (#111111) directly into document.body with zIndex: '9999', containing a CSS-transitioned progress bar (#progressBar) and text percentage counter (#progressText).
The loadAssetWithProgress(url, imgObj, setLoadedFlag) Function:
 * Executes an asynchronous fetch(url) request to download raw binary data.
 * Validates response.ok; throws an error if network status is invalid.
 * Converts the HTTP response stream into a binary Blob object via response.blob().
 * Creates a local temporary memory reference using URL.createObjectURL(blob).
 * Assigns the object URL to imgObj.src.
 * Registers an onload handler that triggers setLoadedFlag(true) and calls updateLoadingProgress().
 * Robust Fallback Catch Block: If the fetch blob request fails due to CORS or network refusal, it catches the exception, assigns the raw remote url directly to imgObj.src, handles standard loading, and includes an onerror failsafe to prevent infinite loading hangs.
Progress Completion & Overlay Removal:
When loadedCount equals totalAssets, a setTimeout triggers a smooth CSS opacity fade-out (transition: opacity 0.4s ease; opacity: '0';), followed by loadingOverlay.remove() after 400 milliseconds.
5. ALGEBRAIC TERRAIN MAPPING & SPAWNING TOPOLOGY
5.1 Coordinate Translation (getTerrain(c, r))
The board uses standard chess algebraic notation mapped internally from zero-indexed integer grid coordinates (c, r):
 * Column Character (colChar): Generated via String.fromCharCode(65 + c) (where column 0 = 'A', column 1 = 'B', ..., column 17 = 'R').
 * Row Number (rowNum): Generated via r + 1 (where row 0 = 1, row 1 = 2, ..., row 17 = 18).
 * Coordinate String (coord): Concatenation of colChar + rowNum (e.g., column 0, row 0 yields 'A1').
5.2 Terrain Classification Definitions
 * Water Terrain List (waterList): A hardcoded array of 50 specific grid coordinate strings (e.g., 'I5', 'J5', 'H7', 'E9', etc.) representing river networks and ocean tiles. Validated via isWaterTerrain(terrain).
 * Naval Ports:
   * 'F12' returns 'blue_navy' (Blue team maritime spawn anchor).
   * 'L6' returns 'red_navy' (Red team maritime spawn anchor).
 * Team Bases & Cores:
   * Blue Core: 'A12' ('blue_core').
   * Blue Bases: 'A11', 'B11', 'B12', 'A13', 'B13' ('blue_base').
   * Red Core: 'L1' ('red_core').
   * Red Bases: 'K1', 'M1', 'K2', 'L2', 'M2' ('red_base').
 * Gold Resources:
   * Gold Cores (Strategic Capture Objectives): 'G5', 'B6', 'M8', 'F15', 'Q13', 'L17' ('gold_core').
   * Secondary Gold Resource Tiles: An array of 49 board coordinates classified as 'gold'.
 * Default Terrain: Any coordinate not matching the above arrays defaults to 'land'.
5.3 Team Spawning Engine (spawnTeam(team))
When spawnTeam('blue' or 'red') executes:
 * Naval Unit Spawn: Finds the port square via getPortSquare(team) and pushes one Ship (type: 'water', range: 2) into the global units array.
 * Land Unit Spawning (BFS Pathfinding): Uses getAvailableLandPos() to spawn:
   * 3 Tanks (type: 'land', range: 3)
   * 5 Infantry units (type: 'land', range: 2)
   * 1 Artillery unit (type: 'land', range: 2)
 * Breadth-First Search (BFS) Algorithm for Land Spawning:
   * First, filters available base squares that do not contain an existing unit.
   * If bases are saturated, it defaults to the team core and instantiates a queue-based graph traversal visiting orthogonal neighbors ({c, r-1}, {c, r+1}, {c-1, r}, {c+1, r}).
   * It checks boundary limits (0 <= c < cols, 0 <= r < rows), prevents revisiting nodes via a Set, and ensures candidate tiles are neither occupied by units nor classified as water terrain via isWaterTerrain().
6. team_mechanics.js — TURN STATES, SUPERUNITS, COMBAT, & RENDER MATH
6.1 State Management & Gold Core Matrix
 * currentTurn: String tracking active phase ('blue' or 'red').
 * blueCoins / redCoins: Integer counters tracking economic capture points.
 * goldCores Array: Contains 6 core objects (gc1 through gc6), each storing its center coordinate (c, r), current owner (null, 'blue', or 'red'), and an explicit array of captureZones coordinates defining its perimeter.
6.2 Team Heuristics (getTeamFromUnit(unit))
Resolves a unit's faction through a multi-tier fallback cascade:
 * Returns cached unit._assignedTeam if present.
 * Inspects explicit unit.team property.
 * Scans unit.name for strings matching 'red', 'black', 'blue', or 'white'.
 * Inspects unit.img.src URL substrings.
 * Spatial Fallback: If all metadata is missing, units situated in grid rows < 9 default to 'red', while rows \ge 9 default to 'blue'.
6.3 Unit Power Weights & Special Status
 * getUnitPower(unit): Returns combat power integer weights. Artillery, Ships, and Boats return 0. Tanks return 2. Infantry units return 1.
 * isSpecialUnit(unit): Returns true if a unit is artillery, a ship, a boat, or has a power weight of 0.
6.4 Graph Traversal & Chebyshev Connectivity
Two units are connected if they touch horizontally, vertically, or diagonally.
Chebyshev Distance Formula:
Superunit Clustering (getSuperunitsForTeam(teamName, allUnits)):
 * Filters active non-special combat units for the target team.
 * Groups adjacent units using a graph traversal queue and visited Set.
 * Proxy Bridge Connection: Friendly units that do not touch directly are still merged into the same superunit cluster if they both touch the same adjacent enemy unit.
 * Sums individual unit power weights to calculate total cluster power (su.power).
 * Appends special units (Artillery/Ships) as standalone 1-unit superunits.
6.5 Stalemate Lock Verification (isUnitLockedInStalemate(unit))
A unit is locked in an equal-power stalemate if:
 * It belongs to a superunit cluster in direct contact with an opposing superunit cluster.
 * The total power of the friendly cluster exactly equals the total power of the opposing cluster (su.power === oSu.power).
 * Behavior: Locked units are prohibited from moving (tryMoveUnit returns false).
7. COMBAT RESOLUTION & DISINTEGRATION SHADER PIPELINE
7.1 Combat Resolution Matrix (resolveUnitInteractions())
 * Iterates through all blue and red superunits on the board.
 * If any unit in a blue superunit touches any unit in a red superunit (via Chebyshev distance or overlapping coordinates), power values are compared:
   * If \text{BluePower} > \text{RedPower}: Red superunit units are queued for destruction.
   * If \text{RedPower} > \text{BluePower}: Blue superunit units are queued for destruction.
   * If \text{BluePower} == \text{RedPower}: Stalemate lock applies; units survive but are immobilized.
7.2 Disintegration Animation Pipeline (queueForDisintegration)
 * Defeated units enter destroyedUnitsQueue with a startTime timestamp and an 1800ms duration.
 * Shader Effect: During the render loop, a 4 \times 4 grid-cell patch fading overlay is drawn over the unit's coordinates. Red semi-transparent alpha blocks (rgba(255, 50, 50, alpha)) progressively fade in over time based on linear threshold calculations.
 * Once elapsed time exceeds 1800ms, the unit is permanently spliced out of the global units array.
8. ADVANCED HUD & VECTOR OFFSET RENDERING MATH (drawTeamUIAndFlags)
8.1 Gold Core Flag Drop Animation
 * When captured, flagAnimations[core.id] initializes with a timestamp.
 * Cosine Easing Formula:
   
8.2 Power Badge Vector Offset Calculation (Inward Map Centering)
To prevent superunit power tags from occluding unit sprites, badges are mathematically offset toward the center of the board:
 * Absolute Map Center Pixels:
   
 * Superunit Cluster Pixel Center:
   
 * Directional Vector Toward Map Center:
   
 * Euclidean Magnitude Length & Normalization:
   
 * Rounded Rectangle Pill Badge Rendering: Draws a red pill (#cc0000) with a white outline (#ffffff, line width 2.5) and centered bold text (ctx.roundRect).
9. CONSOLE TELEMETRY & DEBUGGING PREFIX STANDARDS
All modules use standardized bracketed console tags to ensure chat agents and developers can parse system states instantly:
 * [SUCCESS][module_name]: Successful asset initialization, capture events, or combat resolutions.
 * [INFO][module_name]: State changes, turn transitions, and progress percentages.
 * [WARN][module_name]: Non-critical fallbacks, move validation blocks, and port warnings.
 * [ERROR][module_name]: Critical failures, missing DOM elements, and network fetch rejections.
================================================================================
END OF TECHNICAL SPECIFICATION — MODERN CHESS REPOSITORY BLUEPRINT
