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
        
        // Add event listeners for move operations directly to the border
        borderDiv.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Start move operation
            if (window.JTEdit && window.JTEdit.currentSelectionManager) {
                window.JTEdit.currentSelectionManager.startMove(e);
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
                this.updateMove(e);
            } else if (this.isSelecting && window.currentTool && window.currentTool.startsWith('select')) {
                // Handle selection updates when mouse moves outside pixel elements
                const pixelGridPos = this.getPixelPositionFromMouseEvent(e);
                if (pixelGridPos) {
                    this.updateSelection(pixelGridPos.row, pixelGridPos.col);
                }
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
        if (!this.hasSelection()) return;
        
        // Stop any ongoing selection creation
        this.isSelecting = false;
        
        this.isMoving = true;
        this.moveStartPos = { x: event.clientX, y: event.clientY };
        
        // Store selection content for moving
        const pixelArray = this.getPixelArrayFromGlobal();
        if (pixelArray) {
            this.selectionData = this.getSelectedPixels(pixelArray);
            console.log('Selection data for move:', this.selectionData);
            
            // Collect changes for clearing the selected area
            const clearChanges = [];
            const bounds = this.currentSelection.getBounds();
            const backgroundColor = this.getBackgroundColor();
            
            for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
                for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                    if (this.currentSelection.contains(row, col)) {
                        const oldColor = pixelArray[row][col];
                        if (oldColor !== backgroundColor) {
                            clearChanges.push({
                                row: row,
                                col: col,
                                oldColor: oldColor,
                                newColor: backgroundColor
                            });
                        }
                        // Don't modify the pixel array directly - let the history system do it
                        // pixelArray[row][col] = backgroundColor;
                    }
                }
            }
            
            // Create history action for clearing the original selection area
            if (clearChanges.length > 0 && window.JTEdit && window.JTEdit.currentHistoryManager) {
                const action = new window.JTEdit.History.PixelAction(
                    clearChanges,
                    pixelArray,
                    window.currentFrameIndex || 0
                );
                action.name = 'Move Selection (Clear)';
                action.canMergeWith = function(otherAction) { return false; }; // Prevent merging
                window.JTEdit.currentHistoryManager.execute(action);
            }
            
            // Redraw canvas to show cleared area
            this.redrawCanvas();
        }
        
        // Change cursor for all elements during move
        document.body.style.cursor = 'move';
    }

    /**
     * Update selection position during move
     */
    updateMove(event) {
        if (!this.isMoving || !this.moveStartPos) return;
        
        const deltaX = event.clientX - this.moveStartPos.x;
        const deltaY = event.clientY - this.moveStartPos.y;
        
        // Calculate how many pixels to move (convert screen pixels to grid pixels)
        const metrics = this.renderer.calculateCanvasMetrics(this.pixelSize);
        const pixelSizeWithGap = this.pixelSize + metrics.gridGap;
        
        const deltaRows = Math.round(deltaY / pixelSizeWithGap);
        const deltaCols = Math.round(deltaX / pixelSizeWithGap);
        
        if (deltaRows !== 0 || deltaCols !== 0) {
            // Update selection bounds
            const bounds = this.currentSelection.getBounds();
            const newMinRow = bounds.minRow + deltaRows;
            const newMinCol = bounds.minCol + deltaCols;
            const newMaxRow = bounds.maxRow + deltaRows;
            const newMaxCol = bounds.maxCol + deltaCols;
            
            // Check bounds to ensure selection stays within canvas
            const canvasDimensions = this.getCanvasDimensions();
            if (newMinRow >= 0 && newMaxRow < canvasDimensions.height &&
                newMinCol >= 0 && newMaxCol < canvasDimensions.width) {
                
                // Update selection position
                this.currentSelection.startRow = newMinRow;
                this.currentSelection.startCol = newMinCol;
                this.currentSelection.endRow = newMaxRow;
                this.currentSelection.endCol = newMaxCol;
                
                // Update visual representation
                this.updateRenderer();
                
                // Update move start position
                this.moveStartPos.x = event.clientX;
                this.moveStartPos.y = event.clientY;
            }
        }
    }

    /**
     * End the move operation
     */
    endMove(event) {
        if (!this.isMoving) return;
        
        this.isMoving = false;
        document.body.style.cursor = '';
        
        // Place the selection content at the new position
        if (this.selectionData) {
            const bounds = this.currentSelection.getBounds();
            const pixelArray = this.getPixelArrayFromGlobal();
            
            if (pixelArray) {
                // Collect all pixel changes for history
                const changes = [];
                
                // Paste selection content at new position
                console.log('Placing selection data at new position:', bounds);
                this.selectionData.pixels.forEach(pixel => {
                    const newRow = bounds.minRow + pixel.row;
                    const newCol = bounds.minCol + pixel.col;
                    
                    console.log(`Placing pixel ${pixel.color} at (${newRow}, ${newCol})`);
                    
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
                            // Don't modify the pixel array directly - let the history system do it
                            // pixelArray[newRow][newCol] = newColor;
                        }
                    }
                });
                
                // Create history action for the move operation
                if (changes.length > 0 && window.JTEdit && window.JTEdit.currentHistoryManager) {
                    const action = new window.JTEdit.History.PixelAction(
                        changes,
                        pixelArray,
                        window.currentFrameIndex || 0
                    );
                    action.name = 'Move Selection (Place)';
                    action.canMergeWith = function(otherAction) { return false; }; // Prevent merging
                    window.JTEdit.currentHistoryManager.execute(action);
                }
                
                console.log('Move operation completed, changes made:', changes.length);
                
                // Redraw canvas with moved selection
                this.redrawCanvas();
            }
        }
        
        this.moveStartPos = null;
        this.selectionData = null;
        
        // Notify about selection change
        if (this.onSelectionChange) {
            this.onSelectionChange(this.currentSelection);
        }
    }

    /**
     * Helper function to get pixel array from global state
     */
    getPixelArrayFromGlobal() {
        if (typeof window !== 'undefined' && window.pixelArrayFrames && window.currentFrameIndex !== undefined) {
            return window.pixelArrayFrames[window.currentFrameIndex];
        }
        return null;
    }

    /**
     * Helper function to get background color from global state
     */
    getBackgroundColor() {
        if (typeof window !== 'undefined' && window.rtmouseBtnColor) {
            return window.rtmouseBtnColor;
        }
        return '#000000'; // Default to black
    }

    /**
     * Helper function to get canvas dimensions
     */
    getCanvasDimensions() {
        if (typeof window !== 'undefined' && window.pixelHeight !== undefined && window.pixelWidth !== undefined) {
            return { height: window.pixelHeight, width: window.pixelWidth };
        }
        return { height: 16, width: 32 }; // Default dimensions
    }

    /**
     * Helper function to redraw the canvas
     */
    redrawCanvas() {
        if (typeof window !== 'undefined' && window.drawPixels) {
            window.drawPixels();
        }
        if (typeof window !== 'undefined' && window.updateTextDisplay) {
            window.updateTextDisplay();
        }
    }

    /**
     * Convert mouse event coordinates to pixel grid position
     */
    getPixelPositionFromMouseEvent(event) {
        const canvasContainer = this.canvas.parentElement;
        if (!canvasContainer) return null;

        const containerRect = canvasContainer.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Calculate mouse position relative to canvas
        const mouseX = event.clientX - canvasRect.left;
        const mouseY = event.clientY - canvasRect.top;

        // Get canvas metrics for accurate positioning
        const metrics = this.renderer.calculateCanvasMetrics(this.pixelSize);
        
        // Calculate grid position
        const gridX = mouseX - (canvasRect.left - containerRect.left) - metrics.paddingLeft - metrics.borderLeft;
        const gridY = mouseY - (canvasRect.top - containerRect.top) - metrics.paddingTop - metrics.borderTop;

        // Convert to pixel coordinates
        const pixelSizeWithGap = this.pixelSize + metrics.gridGap;
        const col = Math.floor(gridX / pixelSizeWithGap);
        const row = Math.floor(gridY / pixelSizeWithGap);

        // Check bounds
        const canvasDimensions = this.getCanvasDimensions();
        if (row >= 0 && row < canvasDimensions.height && 
            col >= 0 && col < canvasDimensions.width) {
            return { row, col };
        }
        
        return null;
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