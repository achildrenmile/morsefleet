/**
 * MorseFleet - Morse Code Naval Battle Game
 * Based on rules by Radioklub Vegova (S59VEG)
 *
 * Single-player game where the player sends coordinates via Morse code
 * to target the computer's hidden fleet.
 */

// =============================================================================
// MORSE CODE DEFINITIONS
// =============================================================================

/**
 * Morse code lookup table for encoding characters to dots/dashes.
 * Contains letters A-G (grid rows), numbers 1-7 (grid columns),
 * and response characters S, K, W, ? used by the computer.
 */
const MORSE_CODE = {
    // Letters needed for grid coordinates (A-G)
    'A': '.-',
    'B': '-...',
    'C': '-.-.',
    'D': '-..',
    'E': '.',
    'F': '..-.',
    'G': '--.',
    // Numbers needed for grid coordinates (1-7)
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
    '6': '-....',
    '7': '--...',
    // Response characters
    'S': '...',      // Ship hit
    'K': '-.-',      // Ship sunk (Killed)
    'W': '.--',      // Water (miss)
    '?': '..--..'    // Message not understood
};

// Reverse lookup: morse pattern -> character
const MORSE_DECODE = {};
for (const [char, code] of Object.entries(MORSE_CODE)) {
    MORSE_DECODE[code] = char;
}

// =============================================================================
// MORSE TIMING CONSTANTS (based on ~15 WPM)
// =============================================================================

/**
 * Morse code timing is based on a "unit" duration.
 * At 15 WPM: 1 unit ≈ 80ms
 *
 * Standard timing:
 * - Dot: 1 unit
 * - Dash: 3 units
 * - Intra-character gap: 1 unit (between dots/dashes)
 * - Inter-character gap: 3 units (between letters)
 * - Inter-word gap: 7 units (between words)
 *
 * For input detection, we use thresholds to distinguish dots from dashes
 * and to detect character/word boundaries.
 */
const MORSE_TIMING = {
    UNIT: 80,                    // Base unit in ms
    DOT_MAX: 200,                // Max duration for a dot (up to ~2.5 units)
    DASH_MIN: 200,               // Min duration for a dash
    CHAR_GAP: 300,               // Gap to finalize current character (~3.75 units)
    WORD_GAP: 600,               // Gap to finalize word (~7.5 units)
    // Output timing (for computer responses)
    OUT_DOT: 80,
    OUT_DASH: 240,
    OUT_INTRA: 80,               // Gap within character
    OUT_INTER: 240               // Gap between characters
};

// =============================================================================
// AUDIO OUTPUT (Web Audio API)
// =============================================================================

/**
 * MorseAudio handles audio output for Morse code signals.
 * Uses Web Audio API to generate sine wave tones.
 */
class MorseAudio {
    constructor() {
        this.audioCtx = null;
        this.oscillator = null;
        this.gainNode = null;
        this.frequency = 600; // Hz - standard CW sidetone frequency
    }

    /**
     * Initialize audio context (must be called after user interaction
     * due to browser autoplay policies).
     */
    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /**
     * Start playing a tone (key down).
     */
    startTone() {
        this.init();
        if (this.oscillator) {
            this.stopTone();
        }

        this.oscillator = this.audioCtx.createOscillator();
        this.gainNode = this.audioCtx.createGain();

        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(this.frequency, this.audioCtx.currentTime);

        // Smooth attack to avoid clicks
        this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.01);

        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
        this.oscillator.start();
    }

    /**
     * Stop playing the tone (key up).
     */
    stopTone() {
        if (this.oscillator && this.gainNode) {
            // Smooth release to avoid clicks
            const now = this.audioCtx.currentTime;
            this.gainNode.gain.cancelScheduledValues(now);
            this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
            this.gainNode.gain.linearRampToValueAtTime(0, now + 0.01);

            const osc = this.oscillator;
            setTimeout(() => {
                try { osc.stop(); } catch (e) {}
            }, 20);

            this.oscillator = null;
            this.gainNode = null;
        }
    }

    /**
     * Play a Morse code string (for computer responses).
     * @param {string} morseString - Dots and dashes to play
     * @returns {Promise} - Resolves when playback is complete
     */
    async playMorse(morseString) {
        this.init();

        for (let i = 0; i < morseString.length; i++) {
            const symbol = morseString[i];

            if (symbol === '.') {
                this.startTone();
                await this.sleep(MORSE_TIMING.OUT_DOT);
                this.stopTone();
            } else if (symbol === '-') {
                this.startTone();
                await this.sleep(MORSE_TIMING.OUT_DASH);
                this.stopTone();
            }

            // Add gap after each element (except last)
            if (i < morseString.length - 1) {
                await this.sleep(MORSE_TIMING.OUT_INTRA);
            }
        }
    }

    /**
     * Play a character in Morse code.
     * @param {string} char - Single character to play
     */
    async playChar(char) {
        const morse = MORSE_CODE[char.toUpperCase()];
        if (morse) {
            await this.playMorse(morse);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// MORSE INPUT HANDLING
// =============================================================================

/**
 * MorseInput handles real-time Morse code input from the user.
 * Tracks key press durations and gaps to decode dots, dashes, and characters.
 */
class MorseInput {
    constructor(audio, onUpdate) {
        this.audio = audio;
        this.onUpdate = onUpdate; // Callback for UI updates

        this.isKeyDown = false;
        this.keyDownTime = 0;
        this.keyUpTime = 0;

        this.currentSymbols = '';    // Current character being formed (dots/dashes)
        this.decodedChars = '';      // Fully decoded characters

        this.gapTimer = null;        // Timer for detecting character/word gaps
    }

    /**
     * Handle key press (signal on).
     */
    keyDown() {
        if (this.isKeyDown) return;

        this.isKeyDown = true;
        this.keyDownTime = Date.now();

        // Clear gap timer since we're actively sending
        if (this.gapTimer) {
            clearTimeout(this.gapTimer);
            this.gapTimer = null;
        }

        // Start audio tone
        this.audio.startTone();

        this.updateUI();
    }

    /**
     * Handle key release (signal off).
     * Determines if the signal was a dot or dash based on duration.
     */
    keyUp() {
        if (!this.isKeyDown) return;

        this.isKeyDown = false;
        this.keyUpTime = Date.now();

        // Calculate signal duration
        const duration = this.keyUpTime - this.keyDownTime;

        // Stop audio tone
        this.audio.stopTone();

        // Determine dot or dash based on duration threshold
        // Dot: short signal (<= DOT_MAX ms)
        // Dash: long signal (> DOT_MAX ms)
        if (duration <= MORSE_TIMING.DOT_MAX) {
            this.currentSymbols += '.';
        } else {
            this.currentSymbols += '-';
        }

        // Start gap timer to detect end of character
        this.startGapTimer();

        this.updateUI();
    }

    /**
     * Start timer to detect inter-character gaps.
     * When the gap exceeds CHAR_GAP, finalize the current character.
     */
    startGapTimer() {
        if (this.gapTimer) {
            clearTimeout(this.gapTimer);
        }

        this.gapTimer = setTimeout(() => {
            this.finalizeCharacter();
        }, MORSE_TIMING.CHAR_GAP);
    }

    /**
     * Finalize the current character when a gap is detected.
     * Decodes the accumulated dots/dashes into a character.
     */
    finalizeCharacter() {
        if (this.currentSymbols) {
            const decoded = MORSE_DECODE[this.currentSymbols];
            if (decoded) {
                this.decodedChars += decoded;
            } else {
                // Unknown pattern - add placeholder
                this.decodedChars += '?';
            }
            this.currentSymbols = '';
            this.updateUI();
        }
    }

    /**
     * Get the current decoded input.
     * @returns {string} - Decoded characters so far
     */
    getDecodedInput() {
        return this.decodedChars;
    }

    /**
     * Clear all input state.
     */
    clear() {
        this.currentSymbols = '';
        this.decodedChars = '';
        if (this.gapTimer) {
            clearTimeout(this.gapTimer);
            this.gapTimer = null;
        }
        this.updateUI();
    }

    /**
     * Force finalization (e.g., when user clicks "Send").
     */
    finalize() {
        this.finalizeCharacter();
    }

    /**
     * Update the UI with current state.
     */
    updateUI() {
        if (this.onUpdate) {
            this.onUpdate({
                isKeyDown: this.isKeyDown,
                currentSymbols: this.currentSymbols,
                decodedChars: this.decodedChars
            });
        }
    }
}

// =============================================================================
// SHIP PLACEMENT
// =============================================================================

/**
 * Ship class represents a single ship on the grid.
 */
class Ship {
    constructor(cells) {
        this.cells = cells;           // Array of {row, col} positions
        this.hits = new Set();        // Set of hit cell indices
    }

    /**
     * Check if this ship occupies a specific cell.
     */
    occupies(row, col) {
        return this.cells.some(cell => cell.row === row && cell.col === col);
    }

    /**
     * Record a hit on this ship.
     * @returns {boolean} - true if the ship is now sunk
     */
    hit(row, col) {
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i].row === row && this.cells[i].col === col) {
                this.hits.add(i);
                break;
            }
        }
        return this.isSunk();
    }

    /**
     * Check if ship is completely sunk.
     */
    isSunk() {
        return this.hits.size === this.cells.length;
    }
}

/**
 * ShipPlacer handles random ship placement following the game rules:
 * - Ships can only be horizontal or vertical
 * - Ships cannot touch each other (not even diagonally)
 */
class ShipPlacer {
    constructor(gridSize = 7) {
        this.gridSize = gridSize;
    }

    /**
     * Place all ships randomly on the grid.
     * Ships: 3x2-cell, 2x3-cell, 1x4-cell
     * @returns {Ship[]} - Array of placed ships
     */
    placeShips() {
        // Ship sizes: 3 ships of size 2, 2 ships of size 3, 1 ship of size 4
        const shipSizes = [4, 3, 3, 2, 2, 2];
        const ships = [];
        const occupied = this.createEmptyGrid();

        for (const size of shipSizes) {
            const ship = this.placeShip(size, occupied);
            if (ship) {
                ships.push(ship);
                this.markOccupied(ship, occupied);
            } else {
                // Placement failed - restart (shouldn't happen with 7x7 grid)
                console.warn('Ship placement failed, retrying...');
                return this.placeShips();
            }
        }

        return ships;
    }

    /**
     * Create empty grid for tracking occupied cells.
     */
    createEmptyGrid() {
        const grid = [];
        for (let i = 0; i < this.gridSize; i++) {
            grid.push(new Array(this.gridSize).fill(false));
        }
        return grid;
    }

    /**
     * Attempt to place a single ship of given size.
     * Tries random positions until successful or gives up.
     * @param {number} size - Ship length
     * @param {boolean[][]} occupied - Grid of occupied cells
     * @returns {Ship|null} - Placed ship or null if failed
     */
    placeShip(size, occupied) {
        const maxAttempts = 100;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Random orientation: 0 = horizontal, 1 = vertical
            const horizontal = Math.random() < 0.5;

            // Random starting position
            let row, col;
            if (horizontal) {
                row = Math.floor(Math.random() * this.gridSize);
                col = Math.floor(Math.random() * (this.gridSize - size + 1));
            } else {
                row = Math.floor(Math.random() * (this.gridSize - size + 1));
                col = Math.floor(Math.random() * this.gridSize);
            }

            // Generate cells for this ship
            const cells = [];
            for (let i = 0; i < size; i++) {
                if (horizontal) {
                    cells.push({ row, col: col + i });
                } else {
                    cells.push({ row: row + i, col });
                }
            }

            // Check if placement is valid (no overlap, no adjacency)
            if (this.isValidPlacement(cells, occupied)) {
                return new Ship(cells);
            }
        }

        return null;
    }

    /**
     * Check if ship placement is valid.
     * Ships cannot overlap or touch other ships (including diagonally).
     * @param {Object[]} cells - Proposed ship cells
     * @param {boolean[][]} occupied - Grid of occupied/forbidden cells
     * @returns {boolean} - true if placement is valid
     */
    isValidPlacement(cells, occupied) {
        for (const cell of cells) {
            // Check bounds
            if (cell.row < 0 || cell.row >= this.gridSize ||
                cell.col < 0 || cell.col >= this.gridSize) {
                return false;
            }
            // Check if cell or adjacent cells are occupied
            if (occupied[cell.row][cell.col]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Mark a ship's cells and surrounding cells as occupied.
     * This enforces the "no touching" rule (including diagonals).
     * @param {Ship} ship - Ship to mark
     * @param {boolean[][]} occupied - Grid to update
     */
    markOccupied(ship, occupied) {
        for (const cell of ship.cells) {
            // Mark the cell itself and all 8 surrounding cells
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const r = cell.row + dr;
                    const c = cell.col + dc;
                    if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
                        occupied[r][c] = true;
                    }
                }
            }
        }
    }
}

// =============================================================================
// GAME STATE
// =============================================================================

/**
 * Cell states for the target grid (what the player sees).
 */
const CellState = {
    UNKNOWN: 'unknown',   // Not yet fired upon
    WATER: 'water',       // Miss
    HIT: 'hit',          // Hit but ship not sunk
    SUNK: 'sunk'         // Part of a sunk ship
};

/**
 * GameState manages the overall game state including:
 * - Computer's ship positions
 * - Target grid (player's view of computer's grid)
 * - Shot history
 * - Win condition
 */
class GameState {
    constructor() {
        this.gridSize = 7;
        this.reset();
    }

    /**
     * Reset game to initial state.
     */
    reset() {
        // Place computer's ships
        const placer = new ShipPlacer(this.gridSize);
        this.ships = placer.placeShips();

        // Initialize target grid (what player sees)
        this.targetGrid = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.targetGrid.push(new Array(this.gridSize).fill(CellState.UNKNOWN));
        }

        // Statistics
        this.shotsFired = 0;
        this.shipsRemaining = this.ships.length;
        this.isGameOver = false;
    }

    /**
     * Process a shot at the given coordinate.
     * @param {number} row - Row index (0-6, corresponding to A-G)
     * @param {number} col - Column index (0-6, corresponding to 1-7)
     * @returns {string} - Response character: 'S' (hit), 'K' (sunk), 'W' (water)
     */
    processShot(row, col) {
        // Check if already fired at this cell
        if (this.targetGrid[row][col] !== CellState.UNKNOWN) {
            // Already fired here - treat as water (or could return '?')
            return 'W';
        }

        this.shotsFired++;

        // Check each ship for a hit
        for (const ship of this.ships) {
            if (ship.occupies(row, col)) {
                const sunk = ship.hit(row, col);

                if (sunk) {
                    // Mark all cells of this ship as sunk
                    for (const cell of ship.cells) {
                        this.targetGrid[cell.row][cell.col] = CellState.SUNK;
                    }
                    this.shipsRemaining--;

                    // Check win condition
                    if (this.shipsRemaining === 0) {
                        this.isGameOver = true;
                    }

                    return 'K'; // Sunk
                } else {
                    this.targetGrid[row][col] = CellState.HIT;
                    return 'S'; // Hit
                }
            }
        }

        // No ship at this location - miss
        this.targetGrid[row][col] = CellState.WATER;
        return 'W'; // Water
    }

    /**
     * Get cell state at position.
     */
    getCellState(row, col) {
        return this.targetGrid[row][col];
    }
}

// =============================================================================
// RULES ENGINE
// =============================================================================

/**
 * RulesEngine validates input and coordinates game logic.
 */
class RulesEngine {
    constructor() {
        // Valid row letters and column numbers
        this.validRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        this.validCols = ['1', '2', '3', '4', '5', '6', '7'];
    }

    /**
     * Parse and validate a coordinate string.
     * Expected format: letter (A-G) followed by number (1-7)
     * @param {string} input - User input (e.g., "A1", "G7")
     * @returns {Object|null} - {row, col} or null if invalid
     */
    parseCoordinate(input) {
        if (!input || input.length < 2) {
            return null;
        }

        // Normalize input
        const normalized = input.toUpperCase().trim();

        // Extract letter and number
        const letter = normalized.charAt(0);
        const number = normalized.charAt(1);

        // Validate
        const rowIndex = this.validRows.indexOf(letter);
        const colIndex = this.validCols.indexOf(number);

        if (rowIndex === -1 || colIndex === -1) {
            return null;
        }

        return { row: rowIndex, col: colIndex };
    }

    /**
     * Format coordinate for display.
     */
    formatCoordinate(row, col) {
        return this.validRows[row] + this.validCols[col];
    }

    /**
     * Get response meaning for display.
     */
    getResponseMeaning(response) {
        switch (response) {
            case 'S': return 'Ship hit!';
            case 'K': return 'Ship sunk!';
            case 'W': return 'Water (miss)';
            case '?': return 'Message not understood';
            default: return 'Unknown';
        }
    }
}

// =============================================================================
// GAME UI
// =============================================================================

/**
 * GameUI handles all DOM interactions and user interface updates.
 */
class GameUI {
    constructor(game) {
        this.game = game;
        this.initElements();
        this.createGrid();
    }

    /**
     * Cache DOM elements.
     */
    initElements() {
        this.elements = {
            targetGrid: document.getElementById('target-grid'),
            shipsRemaining: document.getElementById('ships-remaining'),
            shotsFired: document.getElementById('shots-fired'),
            gameResult: document.getElementById('game-result'),
            resultText: document.getElementById('result-text'),
            currentSignal: document.getElementById('current-signal'),
            currentChar: document.getElementById('current-char'),
            decodedInput: document.getElementById('decoded-input'),
            morseKey: document.getElementById('morse-key'),
            signalIndicator: document.getElementById('signal-indicator'),
            sendBtn: document.getElementById('send-btn'),
            clearBtn: document.getElementById('clear-btn'),
            newGameBtn: document.getElementById('new-game-btn'),
            lastCoord: document.getElementById('last-coord'),
            responseChar: document.getElementById('response-char'),
            responseMeaning: document.getElementById('response-meaning')
        };
    }

    /**
     * Create the 7x7 target grid.
     */
    createGrid() {
        this.elements.targetGrid.innerHTML = '';
        this.cells = [];

        for (let row = 0; row < 7; row++) {
            this.cells[row] = [];
            for (let col = 0; col < 7; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell unknown';
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.elements.targetGrid.appendChild(cell);
                this.cells[row][col] = cell;
            }
        }
    }

    /**
     * Update a cell's display state.
     */
    updateCell(row, col, state) {
        const cell = this.cells[row][col];
        cell.className = 'cell ' + state;
    }

    /**
     * Update entire grid from game state.
     */
    updateGrid() {
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const state = this.game.gameState.getCellState(row, col);
                this.updateCell(row, col, state);
            }
        }
    }

    /**
     * Update game statistics display.
     */
    updateStats() {
        this.elements.shipsRemaining.textContent = this.game.gameState.shipsRemaining;
        this.elements.shotsFired.textContent = this.game.gameState.shotsFired;
    }

    /**
     * Update Morse input display.
     */
    updateMorseInput(state) {
        this.elements.currentSignal.textContent = state.isKeyDown ? 'ON' : 'OFF';
        this.elements.currentChar.textContent = state.currentSymbols || '-';
        this.elements.decodedInput.textContent = state.decodedChars || '-';

        // Update signal indicator
        if (state.isKeyDown) {
            this.elements.signalIndicator.classList.add('on');
            this.elements.morseKey.classList.add('active');
        } else {
            this.elements.signalIndicator.classList.remove('on');
            this.elements.morseKey.classList.remove('active');
        }
    }

    /**
     * Update response display.
     */
    updateResponse(coord, response, meaning) {
        this.elements.lastCoord.textContent = coord || '-';
        this.elements.responseChar.textContent = response || '-';
        this.elements.responseMeaning.textContent = meaning || '-';
    }

    /**
     * Show game over message.
     */
    showGameOver() {
        this.elements.gameResult.style.display = 'block';
        this.elements.resultText.textContent =
            `Victory! Fleet destroyed in ${this.game.gameState.shotsFired} shots.`;
        this.elements.sendBtn.disabled = true;
    }

    /**
     * Reset UI for new game.
     */
    reset() {
        this.createGrid();
        this.updateStats();
        this.updateResponse(null, null, null);
        this.elements.gameResult.style.display = 'none';
        this.elements.sendBtn.disabled = false;
    }
}

// =============================================================================
// MAIN GAME CONTROLLER
// =============================================================================

/**
 * MorseFleetGame is the main controller that coordinates all components.
 */
class MorseFleetGame {
    constructor() {
        // Initialize components
        this.audio = new MorseAudio();
        this.gameState = new GameState();
        this.rules = new RulesEngine();
        this.ui = new GameUI(this);

        // Initialize Morse input with UI callback
        this.morseInput = new MorseInput(this.audio, (state) => {
            this.ui.updateMorseInput(state);
        });

        this.isProcessing = false; // Prevent input during computer response

        this.bindEvents();
        this.ui.updateStats();
    }

    /**
     * Bind event listeners for user interaction.
     */
    bindEvents() {
        const { morseKey, sendBtn, clearBtn, newGameBtn } = this.ui.elements;

        // Morse key - mouse events
        morseKey.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (!this.isProcessing && !this.gameState.isGameOver) {
                this.morseInput.keyDown();
            }
        });

        morseKey.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.morseInput.keyUp();
        });

        morseKey.addEventListener('mouseleave', () => {
            if (this.morseInput.isKeyDown) {
                this.morseInput.keyUp();
            }
        });

        // Morse key - touch events for mobile
        morseKey.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.isProcessing && !this.gameState.isGameOver) {
                this.morseInput.keyDown();
            }
        });

        morseKey.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.morseInput.keyUp();
        });

        // Spacebar for Morse input
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                if (!this.isProcessing && !this.gameState.isGameOver) {
                    this.morseInput.keyDown();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.morseInput.keyUp();
            }
        });

        // Control buttons
        sendBtn.addEventListener('click', () => this.sendCoordinate());
        clearBtn.addEventListener('click', () => this.clearInput());
        newGameBtn.addEventListener('click', () => this.newGame());
    }

    /**
     * Process the entered coordinate and get computer response.
     */
    async sendCoordinate() {
        if (this.isProcessing || this.gameState.isGameOver) return;

        // Finalize any pending Morse input
        this.morseInput.finalize();

        // Small delay to ensure finalization
        await new Promise(resolve => setTimeout(resolve, 100));

        const input = this.morseInput.getDecodedInput();

        if (!input) {
            await this.respondWithMorse('?', 'No input received');
            return;
        }

        // Parse coordinate
        const coord = this.rules.parseCoordinate(input);

        if (!coord) {
            // Invalid coordinate
            await this.respondWithMorse('?', 'Invalid coordinate: ' + input);
            return;
        }

        // Process the shot
        const response = this.gameState.processShot(coord.row, coord.col);
        const coordStr = this.rules.formatCoordinate(coord.row, coord.col);
        const meaning = this.rules.getResponseMeaning(response);

        // Update UI
        this.ui.updateGrid();
        this.ui.updateStats();

        // Send response in Morse
        await this.respondWithMorse(response, meaning, coordStr);

        // Check win condition
        if (this.gameState.isGameOver) {
            this.ui.showGameOver();
        }

        // Clear input for next turn
        this.morseInput.clear();
    }

    /**
     * Send computer response in Morse code.
     */
    async respondWithMorse(response, meaning, coord = null) {
        this.isProcessing = true;

        // Update display
        this.ui.updateResponse(coord || '-', response, meaning);

        // Play Morse response
        await this.audio.playChar(response);

        this.isProcessing = false;
    }

    /**
     * Clear current Morse input.
     */
    clearInput() {
        this.morseInput.clear();
    }

    /**
     * Start a new game.
     */
    newGame() {
        this.gameState.reset();
        this.morseInput.clear();
        this.ui.reset();
        this.isProcessing = false;
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MorseFleetGame();
    console.log('MorseFleet initialized. Press SPACE or click the Morse key to input Morse code.');
});
