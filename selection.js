/* ===== JT-EDIT SELECTION MODULE - SOLID ARCHITECTURE ===== */

/**
 * Selection interface - defines what a selection should do
 * Interface Segregation Principle: Small, focused interface
 */
class ISelection {
    contains(row, col) { throw new Error('Must implement contains method'); }
    getBounds() { throw new Error('Must implement getBounds method'); }
    isEmpty() { throw new Error('Must implement isEmpty method'); }
    clear() { throw new Error('Must implement clear method'); }
}

/**
 * Rectangular Selection implementation
 * Single Responsibility: Manages rectangular selection boundaries
 */
class RectangularSelection extends ISelection {
    constructor() {
        super();
        this.startRow = -1;
        this.startCol = -1;
        this.endRow = -1;
        this.endCol = -1;
        this.active = false;
    }

    setStart(row, col) {
        this.startRow = row;
        this.startCol = col;
        this.active = true;
    }

    setEnd(row, col) {
        this.endRow = row;
        this.endCol = col;
    }

    contains(row, col) {
        if (!this.active) return false;
        const minRow = Math.min(this.startRow, this.endRow);
        const maxRow = Math.max(this.startRow, this.endRow);
        const minCol = Math.min(this.startCol, this.endCol);
        const maxCol = Math.max(this.startCol, this.endCol);
        return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
    }

    getBounds() {
        if (!this.active) return null;
        return {
            minRow: Math.min(this.startRow, this.endRow),
            maxRow: Math.max(this.startRow, this.endRow),
            minCol: Math.min(this.startCol, this.endCol),
            maxCol: Math.max(this.startCol, this.endCol)
        };
    }

    isEmpty() {
        return !this.active || (this.startRow === -1);
    }

    clear() {
        this.startRow = -1;
        this.startCol = -1;
        this.endRow = -1;
        this.endCol = -1;
        this.active = false;
    }
}


/**
 * Selection Renderer - Handles visual representation of selections
 * Single Responsibility: Only renders selections, doesn't manage state
 */
class SelectionRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.overlay = null;
        this.animationFrame = null;
        this.dashOffset = 0;
        this.cachedMetrics = null;
        this.lastPixelSize = null;
        this.currentBorderDiv = null; // Track the current selection border element
        this.initOverlay();
    }

    initOverlay() {
        // Create overlay for selection visualization
        this.overlay = document.createElement('div');
        this.overlay.className = 'selection-overlay';
        this.overlay.style.position = 'absolute';
        this.overlay.style.pointerEvents = 'none';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        
        if (this.canvas.parentElement) {
            this.canvas.parentElement.style.position = 'relative';
            this.canvas.parentElement.appendChild(this.overlay);
        }
    }

    /**
     * Calculate dynamic canvas metrics for accurate positioning
     * Returns all positioning data needed for selection overlay
     */
    calculateCanvasMetrics(pixelSize) {
        // If we have cached metrics for this pixel size, use them
        if (this.cachedMetrics && this.lastPixelSize === pixelSize) {
            return this.cachedMetrics;
        }

        // Get the container and canvas elements
        const container = this.canvas.parentElement;
        if (!container) {
            console.warn('Canvas container not found');
            return this.getFallbackMetrics();
        }

        // Get bounding rectangles for accurate positioning
        const containerRect = container.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();

        // Calculate canvas position relative to container
        const canvasOffsetX = canvasRect.left - containerRect.left;
        const canvasOffsetY = canvasRect.top - containerRect.top;

        // Get computed styles for the canvas
        const canvasStyles = getComputedStyle(this.canvas);
        
        // Parse CSS values, defaulting to 0 if parsing fails
        const borderLeft = parseInt(canvasStyles.borderLeftWidth) || 0;
        const borderTop = parseInt(canvasStyles.borderTopWidth) || 0;
        const paddingLeft = parseInt(canvasStyles.paddingLeft) || 0;
        const paddingTop = parseInt(canvasStyles.paddingTop) || 0;
        
        // Get grid gap from computed styles
        const gridGap = parseInt(canvasStyles.gap) || 1;

        // Calculate where the actual pixel grid starts within the canvas
        const pixelGridStartX = canvasOffsetX + borderLeft + paddingLeft;
        const pixelGridStartY = canvasOffsetY + borderTop + paddingTop;

        // Cache the results
        this.cachedMetrics = {
            canvasOffsetX,
            canvasOffsetY,
            borderLeft,
            borderTop,
            paddingLeft,
            paddingTop,
            pixelGridStartX,
            pixelGridStartY,
            gridGap,
            pixelSize
        };
        this.lastPixelSize = pixelSize;

        return this.cachedMetrics;
    }

    /**
     * Fallback metrics when canvas measurements fail
     */
    getFallbackMetrics() {
        console.warn('Using fallback canvas metrics - selection positioning may be inaccurate');
        return {
            canvasOffsetX: 16,
            canvasOffsetY: 1,
            borderLeft: 1,
            borderTop: 1,
            paddingLeft: 15,
            paddingTop: 0,
            pixelGridStartX: 16,
            pixelGridStartY: 1,
            gridGap: 1,
            pixelSize: 8
        };
    }

    /**
     * Invalidate cached metrics (call when canvas properties change)
     */
    invalidateCache() {
        this.cachedMetrics = null;
        this.lastPixelSize = null;
    }

    renderRectangular(selection, pixelSize) {
        if (selection.isEmpty()) {
            this.clear();
            return;
        }

        const bounds = selection.getBounds();
        if (!bounds) return;

        // Get dynamic canvas metrics for accurate positioning
        const metrics = this.calculateCanvasMetrics(pixelSize);

        const borderDiv = document.createElement('div');
        borderDiv.className = 'selection-border marching-ants';
        borderDiv.style.position = 'absolute';
        borderDiv.style.pointerEvents = 'auto'; // Ensure border can receive mouse events
        
        // Add a transparent background to make the entire area clickable
        borderDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.01)'; // Nearly transparent
        
        // Calculate selection position using dynamic metrics
        // Each pixel position = pixelGridStart + (pixelIndex * (pixelSize + gap))
        const selectionLeft = metrics.pixelGridStartX + bounds.minCol * (pixelSize + metrics.gridGap);
        const selectionTop = metrics.pixelGridStartY + bounds.minRow * (pixelSize + metrics.gridGap);
        
        // Calculate selection dimensions
        // Width/height includes all pixels plus gaps between them
        const selectionWidth = (bounds.maxCol - bounds.minCol + 1) * pixelSize + (bounds.maxCol - bounds.minCol) * metrics.gridGap;
        const selectionHeight = (bounds.maxRow - bounds.minRow + 1) * pixelSize + (bounds.maxRow - bounds.minRow) * metrics.gridGap;
        
        // Apply calculated positioning
        borderDiv.style.left = `${selectionLeft}px`;
        borderDiv.style.top = `${selectionTop}px`;
        borderDiv.style.width = `${selectionWidth}px`;
        borderDiv.style.height = `${selectionHeight}px`;
        
        // Add cursor style for moving selections
        borderDiv.style.cursor = 'move';
        
        // Ensure selection is above pixels
        borderDiv.style.zIndex = '10';
        
        // Add event listeners for move operations directly to the border
        borderDiv.addEventListener('mousedown', (e) => {
            console.log('[Selection] Border mousedown event fired');
            e.preventDefault();
            e.stopPropagation();
            
            // Start move operation
            if (window.JTEdit && window.JTEdit.currentSelectionManager) {
                console.log('[Selection] Calling startMove');
                window.JTEdit.currentSelectionManager.startMove(e);
            } else {
                console.error('[Selection] SelectionManager not found!');
            }
        });
        
        // Debug logging for troubleshooting
        if (console.debug) {
            console.debug('Selection positioning:', {
                bounds,
                pixelSize,
                metrics,
                calculated: {
                    left: selectionLeft,
                    top: selectionTop,
                    width: selectionWidth,
                    height: selectionHeight
                }
            });
        }
        
        this.overlay.innerHTML = '';
        this.overlay.appendChild(borderDiv);
        this.currentBorderDiv = borderDiv; // Store reference for move operations
        this.startMarchingAnts();
    }


    startMarchingAnts() {
        const animate = () => {
            this.dashOffset = (this.dashOffset + 1) % 10;
            const elements = this.overlay.querySelectorAll('.marching-ants');
            elements.forEach(el => {
                el.style.backgroundPosition = `${this.dashOffset}px 0`;
            });
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    clear() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.overlay) {
            this.overlay.innerHTML = '';
        }
        this.currentBorderDiv = null; // Clear reference
    }

    destroy() {
        this.clear();
        if (this.overlay && this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
    }
}

/**
 * Selection Manager - Coordinates selection operations
 * Open/Closed Principle: Can be extended with new selection types
 * Dependency Inversion: Depends on ISelection interface, not concrete implementations
 */
class SelectionManager {
    constructor(canvas, onSelectionChange) {
        this.canvas = canvas;
        this.onSelectionChange = onSelectionChange;
        this.currentSelection = null;
        this.renderer = new SelectionRenderer(canvas);
        this.isSelecting = false;
        this.clipboard = null;
        this.pixelSize = 8;
        this.isMoving = false;
        this.moveStartPos = null;
        this.selectionData = null; // Store selection content for moving
        this.originalBounds = null; // Store original selection bounds
        this.moveDelta = { rows: 0, cols: 0 }; // Track cumulative movement
        this.setupLayoutListeners();
        this.setupMoveListeners();
    }

    /**
     * Set up listeners for layout changes that affect positioning
     */
    setupLayoutListeners() {
        // Debounced resize handler to avoid excessive recalculations
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.onLayoutChange();
            }, 100);
        };

        // Listen for window resize events
        window.addEventListener('resize', handleResize);

        // Store cleanup function for destroy method
        this.cleanupResize = () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        };
    }

    /**
     * Handle layout changes that might affect selection positioning
     */
    onLayoutChange() {
        // Invalidate cached positioning metrics
        this.renderer.invalidateCache();
        
        // Re-render current selection with updated positioning
        if (this.hasSelection()) {
            this.updateRenderer();
        }
    }

    /**
     * Set up listeners for selection move operations
     */
    setupMoveListeners() {
        // We'll handle move detection differently - let the border element handle its own events

        // Mouse move for dragging selection or updating selection creation
        document.addEventListener('mousemove', (e) => {
            if (this.isMoving) {
                console.log('[Move] Document mousemove in move mode');
                this.updateMove(e);
            } else if (this.isSelecting && window.currentTool && window.currentTool.startsWith('select')) {
                // Handle selection updates when mouse moves outside pixel elements
                const pixelGridPos = this.getPixelPositionFromMouseEvent(e);
                // Always update since getPixelPositionFromMouseEvent now clamps to bounds
                this.updateSelection(pixelGridPos.row, pixelGridPos.col);
            }
        });

        // Mouse up to end move OR selection creation
        document.addEventListener('mouseup', (e) => {
            if (this.isMoving) {
                this.endMove(e);
            } else if (this.isSelecting) {
                // End selection creation when mouse is released anywhere
                this.endSelection();
            }
        });
    }

    /**
     * Start moving the selection
     */
    startMove(event) {
        console.log('[Move] startMove called', { hasSelection: this.hasSelection(), isMoving: this.isMoving });
        if (!this.hasSelection()) {
            console.log('[Move] No selection, returning');
            return;
        }
        
        // Stop any ongoing selection creation
        this.isSelecting = false;
        
        this.isMoving = true;
        this.moveStartPos = { x: event.clientX, y: event.clientY };
        console.log('[Move] Move started at', this.moveStartPos);
        
        // Store selection content and original bounds
        const pixelArray = this.getPixelArrayFromGlobal();
        if (pixelArray) {
            this.selectionData = this.getSelectedPixels(pixelArray);
            this.originalBounds = this.currentSelection.getBounds();
            this.moveDelta = { rows: 0, cols: 0 };
            console.log('[Move] Selection data stored:', {
                pixelCount: this.selectionData.pixels.length,
                bounds: this.originalBounds
            });
        } else {
            console.error('[Move] Could not get pixel array!');
        }
        
        // Change cursor for all elements during move
        document.body.style.cursor = 'move';
    }

    /**
     * Update selection position during move
     */
    updateMove(event) {
        if (!this.isMoving || !this.moveStartPos || !this.originalBounds) {
            if (!this.isMoving && event.buttons === 1) {
                console.log('[Move] Mouse moving with button down but not in move mode');
            }
            return;
        }
        console.log('[Move] updateMove called');
        
        const deltaX = event.clientX - this.moveStartPos.x;
        const deltaY = event.clientY - this.moveStartPos.y;
        
        // Calculate how many pixels to move (convert screen pixels to grid pixels)
        const metrics = this.renderer.calculateCanvasMetrics(this.pixelSize);
        const pixelSizeWithGap = this.pixelSize + metrics.gridGap;
        
        const totalDeltaRows = Math.round(deltaY / pixelSizeWithGap);
        const totalDeltaCols = Math.round(deltaX / pixelSizeWithGap);
        
        console.log('[Move] Delta calculation:', {
            deltaX, deltaY,
            pixelSizeWithGap,
            totalDeltaRows,
            totalDeltaCols
        });
        
        // Calculate new position based on original bounds
        const newMinRow = this.originalBounds.minRow + totalDeltaRows;
        const newMinCol = this.originalBounds.minCol + totalDeltaCols;
        const newMaxRow = this.originalBounds.maxRow + totalDeltaRows;
        const newMaxCol = this.originalBounds.maxCol + totalDeltaCols;
        
        // Check bounds to ensure selection stays within canvas
        const canvasDimensions = this.getCanvasDimensions();
        if (newMinRow >= 0 && newMaxRow < canvasDimensions.height &&
            newMinCol >= 0 && newMaxCol < canvasDimensions.width) {
            
            // Track the total movement
            this.moveDelta.rows = totalDeltaRows;
            this.moveDelta.cols = totalDeltaCols;
            
            // Update selection position
            this.currentSelection.startRow = newMinRow;
            this.currentSelection.startCol = newMinCol;
            this.currentSelection.endRow = newMaxRow;
            this.currentSelection.endCol = newMaxCol;
            
            // Update visual representation
            this.updateRenderer();
        }
    }

    /**
     * End the move operation
     */
    endMove(event) {
        console.log('[Move] endMove called', { isMoving: this.isMoving });
        if (!this.isMoving) return;
        
        this.isMoving = false;
        document.body.style.cursor = '';
        
        // Only perform the move if we actually moved
        if (this.selectionData && this.originalBounds && 
            (this.moveDelta.rows !== 0 || this.moveDelta.cols !== 0)) {
            
            const pixelArray = this.getPixelArrayFromGlobal();
            if (pixelArray) {
                // Collect all pixel changes for history
                const changes = [];
                const backgroundColor = this.getBackgroundColor();
                
                // First, clear the original selection area
                for (let row = this.originalBounds.minRow; row <= this.originalBounds.maxRow; row++) {
                    for (let col = this.originalBounds.minCol; col <= this.originalBounds.maxCol; col++) {
                        const oldColor = pixelArray[row][col];
                        if (oldColor !== backgroundColor) {
                            changes.push({
                                row: row,
                                col: col,
                                oldColor: oldColor,
                                newColor: backgroundColor
                            });
                        }
                    }
                }
                
                // Then, place selection content at new position
                const newBounds = this.currentSelection.getBounds();
                console.log('[Move] Moving selection:', {
                    from: this.originalBounds,
                    to: newBounds,
                    delta: this.moveDelta,
                    pixelCount: this.selectionData.pixels.length
                });
                
                this.selectionData.pixels.forEach(pixel => {
                    const newRow = newBounds.minRow + pixel.row;
                    const newCol = newBounds.minCol + pixel.col;
                    
                    // Ensure we're within bounds
                    if (newRow >= 0 && newRow < pixelArray.length &&
                        newCol >= 0 && newCol < pixelArray[0].length) {
                        const oldColor = pixelArray[newRow][newCol];
                        const newColor = pixel.color;
                        
                        if (oldColor !== newColor) {
                            changes.push({
                                row: newRow,
                                col: newCol,
                                oldColor: oldColor,
                                newColor: newColor
                            });
                        }
                    }
                });
                
                // Create single history action for the entire move operation
                console.log('[Move] Total changes to apply:', changes.length);
                if (changes.length > 0 && window.JTEdit && window.JTEdit.currentHistoryManager) {
                    console.log('[Move] Creating history action');
                    const action = new window.JTEdit.History.PixelAction(
                        changes,
                        pixelArray,
                        currentFrameIndex || 0
                    );
                    action.name = 'Move Selection';
                    action.canMergeWith = function(otherAction) { return false; }; // Prevent merging
                    console.log('[Move] Executing history action');
                    window.JTEdit.currentHistoryManager.execute(action);
                    console.log('[Move] History action executed');
                } else if (changes.length === 0) {
                    console.log('[Move] No changes to apply');
                } else {
                    console.error('[Move] History manager not available');
                }
                
                // Redraw canvas with moved selection
                this.redrawCanvas();
            }
        }
        
        this.moveStartPos = null;
        this.selectionData = null;
        this.originalBounds = null;
        this.moveDelta = { rows: 0, cols: 0 };
        
        // Notify about selection change
        if (this.onSelectionChange) {
            this.onSelectionChange(this.currentSelection);
        }
    }

    /**
     * Helper function to get pixel array from global state
     */
    getPixelArrayFromGlobal() {
        // These are global let variables, not window properties
        if (typeof pixelArrayFrames !== 'undefined' && typeof currentFrameIndex !== 'undefined') {
            return pixelArrayFrames[currentFrameIndex];
        }
        return null;
    }

    /**
     * Helper function to get background color from global state
     */
    getBackgroundColor() {
        // rtmouseBtnColor is a global var, not window property
        if (typeof rtmouseBtnColor !== 'undefined') {
            return rtmouseBtnColor;
        }
        return '#000000'; // Default to black
    }

    /**
     * Helper function to get canvas dimensions
     */
    getCanvasDimensions() {
        // pixelHeight and pixelWidth are global vars, not window properties
        if (typeof pixelHeight !== 'undefined' && typeof pixelWidth !== 'undefined') {
            return { height: pixelHeight, width: pixelWidth };
        }
        return { height: 16, width: 32 }; // Default dimensions
    }

    /**
     * Helper function to redraw the canvas
     */
    redrawCanvas() {
        // drawPixels and updateTextDisplay are global functions
        if (typeof drawPixels !== 'undefined') {
            drawPixels();
        }
        if (typeof updateTextDisplay !== 'undefined') {
            updateTextDisplay();
        }
    }

    /**
     * Convert mouse event coordinates to pixel grid position
     */
    getPixelPositionFromMouseEvent(event) {
        const canvasContainer = this.canvas.parentElement;
        if (!canvasContainer) return null;

        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate mouse position relative to canvas
        const mouseX = event.clientX - canvasRect.left;
        const mouseY = event.clientY - canvasRect.top;

        // Get canvas metrics for accurate positioning
        const metrics = this.renderer.calculateCanvasMetrics(this.pixelSize);
        
        // Calculate grid position by subtracting padding/border from mouse position
        const gridX = mouseX - metrics.paddingLeft - metrics.borderLeft;
        const gridY = mouseY - metrics.paddingTop - metrics.borderTop;

        // Convert to pixel coordinates
        const pixelSizeWithGap = this.pixelSize + metrics.gridGap;
        let col = Math.floor(gridX / pixelSizeWithGap);
        let row = Math.floor(gridY / pixelSizeWithGap);

        // Clamp to canvas bounds instead of returning null
        // This allows selection to continue even when mouse is outside canvas
        const canvasDimensions = this.getCanvasDimensions();
        row = Math.max(0, Math.min(row, canvasDimensions.height - 1));
        col = Math.max(0, Math.min(col, canvasDimensions.width - 1));
        
        return { row, col };
    }

    startSelection(row, col) {
        // Don't start new selection if we're in the middle of moving
        if (this.isMoving) return;
        
        this.isSelecting = true;
        this.currentSelection = new RectangularSelection();
        this.currentSelection.setStart(row, col);
        this.currentSelection.setEnd(row, col);
        this.updateRenderer();
    }

    updateSelection(row, col) {
        if (!this.isSelecting) return;
        
        // Clamp row and col to canvas bounds
        const canvasDimensions = this.getCanvasDimensions();
        row = Math.max(0, Math.min(row, canvasDimensions.height - 1));
        col = Math.max(0, Math.min(col, canvasDimensions.width - 1));
        
        this.currentSelection.setEnd(row, col);
        this.updateRenderer();
    }

    endSelection() {
        if (!this.isSelecting) return;
        console.log('Ending selection');
        this.isSelecting = false;
        this.updateRenderer();
        if (this.onSelectionChange) {
            this.onSelectionChange(this.currentSelection);
        }
    }

    clear() {
        this.isSelecting = false;
        if (this.currentSelection) {
            this.currentSelection.clear();
        }
        this.renderer.clear();
        if (this.onSelectionChange) {
            this.onSelectionChange(null);
        }
    }

    hasSelection() {
        return this.currentSelection && !this.currentSelection.isEmpty();
    }

    getSelectedPixels(pixelArray) {
        if (!this.hasSelection()) return null;
        
        const bounds = this.currentSelection.getBounds();
        if (!bounds) return null;
        
        const selectedPixels = [];
        for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
            for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                if (this.currentSelection.contains(row, col)) {
                    selectedPixels.push({
                        row: row - bounds.minRow,
                        col: col - bounds.minCol,
                        color: pixelArray[row][col]
                    });
                }
            }
        }
        
        return {
            pixels: selectedPixels,
            width: bounds.maxCol - bounds.minCol + 1,
            height: bounds.maxRow - bounds.minRow + 1,
            originalBounds: bounds
        };
    }

    copy(pixelArray) {
        this.clipboard = this.getSelectedPixels(pixelArray);
        return this.clipboard !== null;
    }

    cut(pixelArray, backgroundColor = '#000000') {
        if (!this.copy(pixelArray)) return false;
        
        // Clear selected pixels
        const bounds = this.currentSelection.getBounds();
        for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
            for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                if (this.currentSelection.contains(row, col)) {
                    pixelArray[row][col] = backgroundColor;
                }
            }
        }
        
        this.clear();
        return true;
    }

    paste(pixelArray, targetRow, targetCol) {
        if (!this.clipboard) return false;
        
        const { pixels, width, height } = this.clipboard;
        const maxRow = pixelArray.length;
        const maxCol = pixelArray[0].length;
        
        pixels.forEach(pixel => {
            const row = targetRow + pixel.row;
            const col = targetCol + pixel.col;
            if (row >= 0 && row < maxRow && col >= 0 && col < maxCol) {
                pixelArray[row][col] = pixel.color;
            }
        });
        
        // Create selection around pasted area
        this.clear();
        this.currentSelection = new RectangularSelection();
        this.currentSelection.setStart(targetRow, targetCol);
        this.currentSelection.setEnd(
            Math.min(targetRow + height - 1, maxRow - 1),
            Math.min(targetCol + width - 1, maxCol - 1)
        );
        this.updateRenderer();
        
        return true;
    }

    selectAll(rows, cols) {
        this.clear();
        this.currentSelection = new RectangularSelection();
        this.currentSelection.setStart(0, 0);
        this.currentSelection.setEnd(rows - 1, cols - 1);
        this.updateRenderer();
        if (this.onSelectionChange) {
            this.onSelectionChange(this.currentSelection);
        }
    }

    setPixelSize(size) {
        // Invalidate cached metrics when pixel size changes
        if (this.pixelSize !== size) {
            this.renderer.invalidateCache();
        }
        this.pixelSize = size;
        this.updateRenderer();
    }

    updateRenderer() {
        if (!this.currentSelection) return;
        this.renderer.renderRectangular(this.currentSelection, this.pixelSize);
    }

    destroy() {
        this.clear();
        this.renderer.destroy();
        
        // Clean up layout listeners
        if (this.cleanupResize) {
            this.cleanupResize();
        }
        
        // Clean up any ongoing move operation
        this.isMoving = false;
        document.body.style.cursor = '';
        this.moveStartPos = null;
        this.selectionData = null;
    }
}

// Export for use in main app
window.JTEdit = window.JTEdit || {};
window.JTEdit.SelectionManager = SelectionManager;