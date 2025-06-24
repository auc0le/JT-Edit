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

    renderRectangular(selection, pixelSize) {
        if (selection.isEmpty()) {
            this.clear();
            return;
        }

        const bounds = selection.getBounds();
        if (!bounds) return;

        const borderDiv = document.createElement('div');
        borderDiv.className = 'selection-border marching-ants';
        borderDiv.style.position = 'absolute';
        // Account for canvas padding and border
        const canvasOffsetX = 16; // 15px left padding + 1px left border
        const canvasOffsetY = 1;  // 1px top border
        const gapSize = 1; // 1px grid gap
        
        borderDiv.style.left = `${bounds.minCol * (pixelSize + gapSize) + canvasOffsetX}px`;
        borderDiv.style.top = `${bounds.minRow * (pixelSize + gapSize) + canvasOffsetY}px`;
        borderDiv.style.width = `${(bounds.maxCol - bounds.minCol + 1) * pixelSize + (bounds.maxCol - bounds.minCol) * gapSize}px`;
        borderDiv.style.height = `${(bounds.maxRow - bounds.minRow + 1) * pixelSize + (bounds.maxRow - bounds.minRow) * gapSize}px`;
        
        this.overlay.innerHTML = '';
        this.overlay.appendChild(borderDiv);
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
    }


    startSelection(row, col) {
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
    }
}

// Export for use in main app
window.JTEdit = window.JTEdit || {};
window.JTEdit.SelectionManager = SelectionManager;