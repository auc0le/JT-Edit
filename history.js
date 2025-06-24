/* ===== JT-EDIT HISTORY MODULE - COMMAND PATTERN IMPLEMENTATION ===== */

/**
 * Abstract Action class - Command Pattern
 * Single Responsibility: Defines interface for undoable actions
 */
class Action {
    constructor(description = '') {
        this.description = description;
        this.timestamp = Date.now();
    }

    execute() {
        throw new Error('Execute method must be implemented');
    }

    undo() {
        throw new Error('Undo method must be implemented');
    }

    redo() {
        // Default implementation: just execute again
        this.execute();
    }

    canMergeWith(otherAction) {
        return false;
    }

    mergeWith(otherAction) {
        throw new Error('MergeWith must be implemented if canMergeWith returns true');
    }
}

/**
 * Pixel Change Action - Records individual pixel modifications
 * Single Responsibility: Manages pixel color changes
 */
class PixelAction extends Action {
    constructor(pixelChanges, pixelArray, frameIndex = 0) {
        super(`Draw ${pixelChanges.length} pixel(s)`);
        this.pixelChanges = pixelChanges; // Array of {row, col, oldColor, newColor}
        this.frameIndex = frameIndex;
        this.pixelArray = pixelArray;
    }

    execute() {
        this.pixelChanges.forEach(change => {
            if (this.pixelArray[change.row] && this.pixelArray[change.row][change.col] !== undefined) {
                this.pixelArray[change.row][change.col] = change.newColor;
            }
        });
    }

    undo() {
        this.pixelChanges.forEach(change => {
            if (this.pixelArray[change.row] && this.pixelArray[change.row][change.col] !== undefined) {
                this.pixelArray[change.row][change.col] = change.oldColor;
            }
        });
    }

    canMergeWith(otherAction) {
        // Merge consecutive pixel actions within 500ms
        if (!(otherAction instanceof PixelAction)) return false;
        if (this.frameIndex !== otherAction.frameIndex) return false;
        return (otherAction.timestamp - this.timestamp) < 500;
    }

    mergeWith(otherAction) {
        // Combine pixel changes, avoiding duplicates
        const existingPixels = new Set(
            this.pixelChanges.map(p => `${p.row},${p.col}`)
        );
        
        otherAction.pixelChanges.forEach(change => {
            const key = `${change.row},${change.col}`;
            if (existingPixels.has(key)) {
                // Update existing pixel change with new color
                const existing = this.pixelChanges.find(
                    p => p.row === change.row && p.col === change.col
                );
                existing.newColor = change.newColor;
            } else {
                this.pixelChanges.push(change);
                existingPixels.add(key);
            }
        });
        
        this.timestamp = otherAction.timestamp;
        this.description = `Draw ${this.pixelChanges.length} pixel(s)`;
    }
}

/**
 * Selection Action - Records selection area changes
 */
class SelectionAction extends Action {
    constructor(oldSelection, newSelection, selectionManager) {
        super('Change selection');
        this.oldSelection = oldSelection ? this.cloneSelection(oldSelection) : null;
        this.newSelection = newSelection ? this.cloneSelection(newSelection) : null;
        this.selectionManager = selectionManager;
    }

    cloneSelection(selection) {
        if (selection instanceof RectangularSelection) {
            const clone = new RectangularSelection();
            clone.startRow = selection.startRow;
            clone.startCol = selection.startCol;
            clone.endRow = selection.endRow;
            clone.endCol = selection.endCol;
            clone.active = selection.active;
            return clone;
        }
        // Add selection cloning if needed
        return null;
    }

    execute() {
        if (this.newSelection) {
            this.selectionManager.currentSelection = this.cloneSelection(this.newSelection);
            this.selectionManager.updateRenderer();
        } else {
            this.selectionManager.clear();
        }
    }

    undo() {
        if (this.oldSelection) {
            this.selectionManager.currentSelection = this.cloneSelection(this.oldSelection);
            this.selectionManager.updateRenderer();
        } else {
            this.selectionManager.clear();
        }
    }
}

/**
 * Fill Action - Records fill operations
 */
class FillAction extends Action {
    constructor(pixelArray, color, selection = null, frameIndex = 0) {
        super(selection ? 'Fill selection' : 'Fill canvas');
        this.frameIndex = frameIndex;
        this.pixelArray = pixelArray;
        this.fillColor = color;
        this.selection = selection;
        this.oldPixels = [];
        this.captureOldState();
    }

    captureOldState() {
        const rows = this.pixelArray.length;
        const cols = this.pixelArray[0].length;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (!this.selection || this.selection.contains(row, col)) {
                    this.oldPixels.push({
                        row,
                        col,
                        color: this.pixelArray[row][col]
                    });
                }
            }
        }
    }

    execute() {
        this.oldPixels.forEach(pixel => {
            this.pixelArray[pixel.row][pixel.col] = this.fillColor;
        });
    }

    undo() {
        this.oldPixels.forEach(pixel => {
            this.pixelArray[pixel.row][pixel.col] = pixel.color;
        });
    }
}

/**
 * Transform Action - Records move/shift operations
 */
class TransformAction extends Action {
    constructor(pixelArray, transformType, direction, selection = null, frameIndex = 0) {
        super(`${transformType} ${direction}`);
        this.frameIndex = frameIndex;
        this.pixelArray = pixelArray;
        this.transformType = transformType; // 'shift' or 'move'
        this.direction = direction; // 'up', 'down', 'left', 'right'
        this.selection = selection;
        this.oldState = this.captureState();
    }

    captureState() {
        // Deep copy the pixel array or selection area
        if (this.selection) {
            const bounds = this.selection.getBounds();
            const state = [];
            for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
                for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                    if (this.selection.contains(row, col)) {
                        state.push({
                            row,
                            col,
                            color: this.pixelArray[row][col]
                        });
                    }
                }
            }
            return state;
        } else {
            return this.pixelArray.map(row => [...row]);
        }
    }

    execute() {
        if (this.transformType === 'shift') {
            this.shiftPixels();
        }
        // Add move implementation when needed
    }

    undo() {
        if (this.selection) {
            this.oldState.forEach(pixel => {
                this.pixelArray[pixel.row][pixel.col] = pixel.color;
            });
        } else {
            this.pixelArray.forEach((row, i) => {
                row.forEach((_, j) => {
                    this.pixelArray[i][j] = this.oldState[i][j];
                });
            });
        }
    }

    shiftPixels() {
        const rows = this.pixelArray.length;
        const cols = this.pixelArray[0].length;
        
        switch (this.direction) {
            case 'up':
                if (this.selection) {
                    // Shift only selected pixels
                    const bounds = this.selection.getBounds();
                    const tempRow = [];
                    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                        if (this.selection.contains(bounds.minRow, col)) {
                            tempRow.push(this.pixelArray[bounds.minRow][col]);
                        }
                    }
                    
                    for (let row = bounds.minRow; row < bounds.maxRow; row++) {
                        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                            if (this.selection.contains(row + 1, col)) {
                                this.pixelArray[row][col] = this.pixelArray[row + 1][col];
                            }
                        }
                    }
                    
                    tempRow.forEach((color, i) => {
                        const col = bounds.minCol + i;
                        this.pixelArray[bounds.maxRow][col] = color;
                    });
                } else {
                    const firstRow = this.pixelArray.shift();
                    this.pixelArray.push(firstRow);
                }
                break;
                
            case 'down':
                if (this.selection) {
                    const bounds = this.selection.getBounds();
                    const tempRow = [];
                    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                        if (this.selection.contains(bounds.maxRow, col)) {
                            tempRow.push(this.pixelArray[bounds.maxRow][col]);
                        }
                    }
                    
                    for (let row = bounds.maxRow; row > bounds.minRow; row--) {
                        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                            if (this.selection.contains(row - 1, col)) {
                                this.pixelArray[row][col] = this.pixelArray[row - 1][col];
                            }
                        }
                    }
                    
                    tempRow.forEach((color, i) => {
                        const col = bounds.minCol + i;
                        this.pixelArray[bounds.minRow][col] = color;
                    });
                } else {
                    const lastRow = this.pixelArray.pop();
                    this.pixelArray.unshift(lastRow);
                }
                break;
                
            case 'left':
                for (let row = 0; row < rows; row++) {
                    if (this.selection) {
                        const bounds = this.selection.getBounds();
                        if (row >= bounds.minRow && row <= bounds.maxRow) {
                            const temp = this.pixelArray[row][bounds.minCol];
                            for (let col = bounds.minCol; col < bounds.maxCol; col++) {
                                if (this.selection.contains(row, col + 1)) {
                                    this.pixelArray[row][col] = this.pixelArray[row][col + 1];
                                }
                            }
                            this.pixelArray[row][bounds.maxCol] = temp;
                        }
                    } else {
                        const firstElement = this.pixelArray[row].shift();
                        this.pixelArray[row].push(firstElement);
                    }
                }
                break;
                
            case 'right':
                for (let row = 0; row < rows; row++) {
                    if (this.selection) {
                        const bounds = this.selection.getBounds();
                        if (row >= bounds.minRow && row <= bounds.maxRow) {
                            const temp = this.pixelArray[row][bounds.maxCol];
                            for (let col = bounds.maxCol; col > bounds.minCol; col--) {
                                if (this.selection.contains(row, col - 1)) {
                                    this.pixelArray[row][col] = this.pixelArray[row][col - 1];
                                }
                            }
                            this.pixelArray[row][bounds.minCol] = temp;
                        }
                    } else {
                        const lastElement = this.pixelArray[row].pop();
                        this.pixelArray[row].unshift(lastElement);
                    }
                }
                break;
        }
    }
}

/**
 * Frame Action - Records frame operations in animations
 */
class FrameAction extends Action {
    constructor(type, frameData, frameIndex, pixelArrayFrames) {
        super(`${type} frame`);
        this.type = type; // 'add', 'delete', 'clone'
        this.frameData = frameData;
        this.frameIndex = frameIndex;
        this.pixelArrayFrames = pixelArrayFrames;
    }

    execute() {
        switch (this.type) {
            case 'add':
                this.pixelArrayFrames.splice(this.frameIndex, 0, this.frameData);
                break;
            case 'delete':
                this.pixelArrayFrames.splice(this.frameIndex, 1);
                break;
            case 'clone':
                const clonedFrame = this.frameData.map(row => [...row]);
                this.pixelArrayFrames.splice(this.frameIndex + 1, 0, clonedFrame);
                break;
        }
    }

    undo() {
        switch (this.type) {
            case 'add':
                this.pixelArrayFrames.splice(this.frameIndex, 1);
                break;
            case 'delete':
                this.pixelArrayFrames.splice(this.frameIndex, 0, this.frameData);
                break;
            case 'clone':
                this.pixelArrayFrames.splice(this.frameIndex + 1, 1);
                break;
        }
    }
}

/**
 * History Manager - Manages undo/redo stacks
 * Single Responsibility: Manages action history
 * Open/Closed: Can work with any Action subclass
 */
class HistoryManager {
    constructor(options = {}) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = options.maxHistorySize || 100;
        this.onHistoryChange = options.onHistoryChange || null;
        this.isExecutingAction = false;
    }

    execute(action) {
        if (this.isExecutingAction) return;
        
        this.isExecutingAction = true;
        
        try {
            // Check if we can merge with the last action
            if (this.undoStack.length > 0) {
                const lastAction = this.undoStack[this.undoStack.length - 1];
                if (lastAction.canMergeWith(action)) {
                    lastAction.mergeWith(action);
                    action.execute();
                    this.notifyChange();
                    return;
                }
            }
            
            // Execute the action
            action.execute();
            
            // Add to undo stack
            this.undoStack.push(action);
            
            // Clear redo stack (new action invalidates redo history)
            this.redoStack = [];
            
            // Limit history size
            if (this.undoStack.length > this.maxHistorySize) {
                this.undoStack.shift();
            }
            
            this.notifyChange();
        } finally {
            this.isExecutingAction = false;
        }
    }

    undo() {
        if (!this.canUndo()) return false;
        
        this.isExecutingAction = true;
        
        try {
            const action = this.undoStack.pop();
            action.undo();
            this.redoStack.push(action);
            
            // Limit redo stack size
            if (this.redoStack.length > this.maxHistorySize) {
                this.redoStack.shift();
            }
            
            this.notifyChange();
            return true;
        } finally {
            this.isExecutingAction = false;
        }
    }

    redo() {
        if (!this.canRedo()) return false;
        
        this.isExecutingAction = true;
        
        try {
            const action = this.redoStack.pop();
            action.redo();
            this.undoStack.push(action);
            
            this.notifyChange();
            return true;
        } finally {
            this.isExecutingAction = false;
        }
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.notifyChange();
    }

    getHistory() {
        return {
            undoStack: this.undoStack.map(a => ({
                description: a.description,
                timestamp: a.timestamp
            })),
            redoStack: this.redoStack.map(a => ({
                description: a.description,
                timestamp: a.timestamp
            }))
        };
    }

    notifyChange() {
        if (this.onHistoryChange) {
            this.onHistoryChange({
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                history: this.getHistory()
            });
        }
    }
}

// Export for use in main app
window.JTEdit = window.JTEdit || {};
window.JTEdit.History = {
    HistoryManager,
    PixelAction,
    SelectionAction,
    FillAction,
    TransformAction,
    FrameAction
};