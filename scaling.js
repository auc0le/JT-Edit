/* ===== JT-EDIT SCALING MODULE - SMART CANVAS SCALING ===== */

/**
 * Abstract Scaling Algorithm Interface
 * Interface Segregation Principle: Specific scaling contracts
 */
class IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        throw new Error('Scale method must be implemented');
    }
}

/**
 * Nearest Neighbor Scaling - Preserves pixel art characteristics
 * Single Responsibility: Pixel-perfect scaling algorithm
 */
class NearestNeighborScaler extends IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const targetPixels = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill('#000000'));
        
        const scaleX = sourceWidth / targetWidth;
        const scaleY = sourceHeight / targetHeight;
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const sourceX = Math.floor(x * scaleX);
                const sourceY = Math.floor(y * scaleY);
                
                if (sourceY < sourceHeight && sourceX < sourceWidth) {
                    targetPixels[y][x] = sourcePixels[sourceY][sourceX];
                }
            }
        }
        
        return targetPixels;
    }
}

/**
 * EPX (Eagle/AdvMAME) Scaling - Enhanced pixel art scaling
 * Preserves sharp edges while reducing pixelation
 */
class EPXScaler extends IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        // For now, use 2x scaling then resize for other factors
        const scale2x = this.scale2x(sourcePixels, sourceWidth, sourceHeight);
        
        if (targetWidth === sourceWidth * 2 && targetHeight === sourceHeight * 2) {
            return scale2x;
        }
        
        // Use nearest neighbor for other scales
        const nnScaler = new NearestNeighborScaler();
        return nnScaler.scale(scale2x, sourceWidth * 2, sourceHeight * 2, targetWidth, targetHeight);
    }
    
    scale2x(sourcePixels, sourceWidth, sourceHeight) {
        const targetPixels = Array(sourceHeight * 2).fill(null).map(() => Array(sourceWidth * 2).fill('#000000'));
        
        for (let y = 0; y < sourceHeight; y++) {
            for (let x = 0; x < sourceWidth; x++) {
                const c = sourcePixels[y][x];
                
                // Get neighboring pixels
                const a = (y > 0) ? sourcePixels[y - 1][x] : c; // top
                const b = (x < sourceWidth - 1) ? sourcePixels[y][x + 1] : c; // right
                const d = (x > 0) ? sourcePixels[y][x - 1] : c; // left
                const g = (y < sourceHeight - 1) ? sourcePixels[y + 1][x] : c; // bottom
                
                // EPX algorithm
                const destY = y * 2;
                const destX = x * 2;
                
                if (d === a && d !== g && a !== b) {
                    targetPixels[destY][destX] = a;
                } else {
                    targetPixels[destY][destX] = c;
                }
                
                if (a === b && a !== d && b !== g) {
                    targetPixels[destY][destX + 1] = b;
                } else {
                    targetPixels[destY][destX + 1] = c;
                }
                
                if (d === g && d !== a && g !== b) {
                    targetPixels[destY + 1][destX] = d;
                } else {
                    targetPixels[destY + 1][destX] = c;
                }
                
                if (g === b && g !== d && b !== a) {
                    targetPixels[destY + 1][destX + 1] = g;
                } else {
                    targetPixels[destY + 1][destX + 1] = c;
                }
            }
        }
        
        return targetPixels;
    }
}

/**
 * Bilinear Scaling - Smooth scaling with interpolation
 * Better for photographic content
 * Note: Creates interpolated colors, respects current color mode for quantization
 */
class BilinearScaler extends IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const targetPixels = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill('#000000'));
        
        const scaleX = (sourceWidth - 1) / targetWidth;
        const scaleY = (sourceHeight - 1) / targetHeight;
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const gx = x * scaleX;
                const gy = y * scaleY;
                
                const gxi = Math.floor(gx);
                const gyi = Math.floor(gy);
                
                const c00 = this.hexToRgb(sourcePixels[gyi] ? sourcePixels[gyi][gxi] || '#000000' : '#000000');
                const c10 = this.hexToRgb(sourcePixels[gyi] ? sourcePixels[gyi][gxi + 1] || c00 : '#000000');
                const c01 = this.hexToRgb(sourcePixels[gyi + 1] ? sourcePixels[gyi + 1][gxi] || c00 : '#000000');
                const c11 = this.hexToRgb(sourcePixels[gyi + 1] ? sourcePixels[gyi + 1][gxi + 1] || c00 : '#000000');
                
                const wx = gx - gxi;
                const wy = gy - gyi;
                
                const r = Math.round(
                    c00.r * (1 - wx) * (1 - wy) +
                    c10.r * wx * (1 - wy) +
                    c01.r * (1 - wx) * wy +
                    c11.r * wx * wy
                );
                
                const g = Math.round(
                    c00.g * (1 - wx) * (1 - wy) +
                    c10.g * wx * (1 - wy) +
                    c01.g * (1 - wx) * wy +
                    c11.g * wx * wy
                );
                
                const b = Math.round(
                    c00.b * (1 - wx) * (1 - wy) +
                    c10.b * wx * (1 - wy) +
                    c01.b * (1 - wx) * wy +
                    c11.b * wx * wy
                );
                
                const hexColor = this.rgbToHex(r, g, b);
                // Only quantize to 3-bit if the application is in 3-bit mode
                targetPixels[y][x] = (window.colorFormat === '3bit') ? this.quantizeToThreeBit(hexColor) : hexColor;
            }
        }
        
        return targetPixels;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    quantizeToThreeBit(hexColor) {
        // Convert hex to RGB
        const rgb = this.hexToRgb(hexColor);
        
        // Define the 8 allowed colors in 3-bit color space
        const colors = [
            [255, 0, 0],   // Red
            [0, 255, 0],   // Green
            [0, 0, 255],   // Blue
            [255, 255, 0], // Yellow
            [255, 0, 255], // Magenta
            [0, 255, 255], // Cyan
            [255, 255, 255], // White
            [0, 0, 0]      // Black
        ];
        
        // Find the nearest color using Euclidean distance
        const nearestColor = colors.reduce((nearest, color) => {
            const distance = Math.sqrt(
                Math.pow(rgb.r - color[0], 2) +
                Math.pow(rgb.g - color[1], 2) +
                Math.pow(rgb.b - color[2], 2)
            );
            
            return distance < nearest.distance ? {
                color,
                distance
            } : nearest;
        }, {
            color: null,
            distance: Infinity
        }).color;
        
        return this.rgbToHex(...nearestColor);
    }
}

/**
 * Scaling Strategy - Strategy Pattern
 * Open/Closed Principle: Can add new algorithms without modifying existing code
 */
class ScalingStrategy {
    constructor() {
        this.algorithms = {
            'nearest': new NearestNeighborScaler(),
            'epx': new EPXScaler(),
            'bilinear': new BilinearScaler()
        };
    }
    
    getAlgorithm(type) {
        return this.algorithms[type] || this.algorithms['nearest'];
    }
    
    addAlgorithm(name, algorithm) {
        this.algorithms[name] = algorithm;
    }
}

/**
 * Canvas Scaler - Main scaling coordinator
 * Single Responsibility: Coordinates scaling operations
 */
class CanvasScaler {
    constructor(options = {}) {
        this.strategy = new ScalingStrategy();
        this.defaultAlgorithm = options.defaultAlgorithm || 'nearest';
        this.defaultBackgroundColor = options.defaultBackgroundColor || '#000000';
        this.onProgress = options.onProgress || null;
    }
    
    calculateScaleInfo(sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;
        
        // Determine if aspect ratios match
        const sourceRatio = sourceWidth / sourceHeight;
        const targetRatio = targetWidth / targetHeight;
        const aspectRatioMatch = Math.abs(sourceRatio - targetRatio) < 0.01;
        
        // Calculate centered positioning for non-matching ratios
        let centeredSize, offsetX = 0, offsetY = 0;
        
        if (!aspectRatioMatch) {
            // Use minimum scale to fit entirely within target
            const minScale = Math.min(scaleX, scaleY);
            centeredSize = {
                width: Math.round(sourceWidth * minScale),
                height: Math.round(sourceHeight * minScale)
            };
            
            offsetX = Math.floor((targetWidth - centeredSize.width) / 2);
            offsetY = Math.floor((targetHeight - centeredSize.height) / 2);
        }
        
        return {
            scaleX,
            scaleY,
            aspectRatioMatch,
            centeredSize,
            offsetX,
            offsetY,
            scaling: scaleX > 1 ? 'upscaling' : 'downscaling'
        };
    }
    
    calculatePositionOffsets(positioning, sourceWidth, sourceHeight, targetWidth, targetHeight, scaledWidth, scaledHeight) {
        let offsetX = 0;
        let offsetY = 0;
        
        // Handle the case where we're scaling down (cropping)
        const isDownscaling = sourceWidth > targetWidth || sourceHeight > targetHeight;
        
        if (isDownscaling) {
            // For downscaling, we need to determine which part of the source to keep
            const scaleX = targetWidth / sourceWidth;
            const scaleY = targetHeight / sourceHeight;
            const scale = Math.max(scaleX, scaleY); // Use max to fill the target
            
            const scaledW = Math.round(sourceWidth * scale);
            const scaledH = Math.round(sourceHeight * scale);
            
            // Calculate crop offsets based on position
            if (positioning.horizontal === 'left') {
                offsetX = 0;
            } else if (positioning.horizontal === 'middle') {
                offsetX = Math.floor((scaledW - targetWidth) / 2);
            } else if (positioning.horizontal === 'right') {
                offsetX = scaledW - targetWidth;
            }
            
            if (positioning.vertical === 'top') {
                offsetY = 0;
            } else if (positioning.vertical === 'center') {
                offsetY = Math.floor((scaledH - targetHeight) / 2);
            } else if (positioning.vertical === 'bottom') {
                offsetY = scaledH - targetHeight;
            }
            
            return { offsetX: -offsetX, offsetY: -offsetY, cropMode: true };
        } else {
            // For upscaling, position the smaller image within the larger canvas
            if (positioning.horizontal === 'left') {
                offsetX = 0;
            } else if (positioning.horizontal === 'middle') {
                offsetX = Math.floor((targetWidth - scaledWidth) / 2);
            } else if (positioning.horizontal === 'right') {
                offsetX = targetWidth - scaledWidth;
            }
            
            if (positioning.vertical === 'top') {
                offsetY = 0;
            } else if (positioning.vertical === 'center') {
                offsetY = Math.floor((targetHeight - scaledHeight) / 2);
            } else if (positioning.vertical === 'bottom') {
                offsetY = targetHeight - scaledHeight;
            }
            
            return { offsetX, offsetY, cropMode: false };
        }
    }
    
    scalePixelArray(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight, options = {}) {
        const algorithm = options.algorithm || this.defaultAlgorithm;
        const backgroundColor = options.backgroundColor || this.defaultBackgroundColor;
        const positioning = options.positioning || { vertical: 'center', horizontal: 'middle' };
        
        const scaler = this.strategy.getAlgorithm(algorithm);
        const info = this.calculateScaleInfo(sourceWidth, sourceHeight, targetWidth, targetHeight);
        
        let scaledPixels;
        
        if (positioning === 'stretch') {
            // Direct scaling to target size
            scaledPixels = scaler.scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight);
        } else {
            // Handle positioned scaling
            const isDownscaling = sourceWidth > targetWidth || sourceHeight > targetHeight;
            
            if (isDownscaling) {
                // For downscaling with cropping
                const scaleX = targetWidth / sourceWidth;
                const scaleY = targetHeight / sourceHeight;
                const scale = Math.max(scaleX, scaleY); // Use max to fill the target
                
                const scaledW = Math.round(sourceWidth * scale);
                const scaledH = Math.round(sourceHeight * scale);
                
                // First scale the image
                const tempScaled = scaler.scale(sourcePixels, sourceWidth, sourceHeight, scaledW, scaledH);
                
                // Calculate crop offsets
                const { offsetX, offsetY } = this.calculatePositionOffsets(
                    positioning, sourceWidth, sourceHeight, targetWidth, targetHeight, scaledW, scaledH
                );
                
                // Create final cropped image
                scaledPixels = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill(backgroundColor));
                
                const startX = -offsetX;
                const startY = -offsetY;
                
                for (let y = 0; y < targetHeight; y++) {
                    for (let x = 0; x < targetWidth; x++) {
                        const sourceY = startY + y;
                        const sourceX = startX + x;
                        
                        if (sourceY >= 0 && sourceY < scaledH && sourceX >= 0 && sourceX < scaledW) {
                            scaledPixels[y][x] = tempScaled[sourceY][sourceX];
                        }
                    }
                }
            } else {
                // For upscaling with positioning
                const { centeredSize } = info;
                const tempScaled = scaler.scale(
                    sourcePixels, 
                    sourceWidth, 
                    sourceHeight, 
                    centeredSize.width, 
                    centeredSize.height
                );
                
                // Create final canvas with background
                scaledPixels = Array(targetHeight).fill(null).map(() => 
                    Array(targetWidth).fill(backgroundColor)
                );
                
                // Calculate position offsets
                const { offsetX, offsetY } = this.calculatePositionOffsets(
                    positioning, sourceWidth, sourceHeight, targetWidth, targetHeight, 
                    centeredSize.width, centeredSize.height
                );
                
                // Copy scaled pixels to position
                for (let y = 0; y < centeredSize.height; y++) {
                    for (let x = 0; x < centeredSize.width; x++) {
                        const targetY = offsetY + y;
                        const targetX = offsetX + x;
                        
                        if (targetY >= 0 && targetY < targetHeight && 
                            targetX >= 0 && targetX < targetWidth) {
                            scaledPixels[targetY][targetX] = tempScaled[y][x];
                        }
                    }
                }
            }
        }
        
        return {
            pixels: scaledPixels,
            info
        };
    }
    
    scaleFrames(pixelArrayFrames, sourceWidth, sourceHeight, targetWidth, targetHeight, options = {}) {
        const scaledFrames = [];
        const totalFrames = pixelArrayFrames.length;
        
        for (let i = 0; i < totalFrames; i++) {
            if (this.onProgress) {
                this.onProgress({
                    current: i + 1,
                    total: totalFrames,
                    percentage: Math.round((i + 1) / totalFrames * 100)
                });
            }
            
            const result = this.scalePixelArray(
                pixelArrayFrames[i],
                sourceWidth,
                sourceHeight,
                targetWidth,
                targetHeight,
                options
            );
            
            scaledFrames.push(result.pixels);
        }
        
        return scaledFrames;
    }
    
    generatePreview(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight, algorithm = 'nearest', options = {}) {
        // Generate a smaller preview for performance
        const previewScale = 0.5;
        const previewWidth = Math.max(1, Math.round(targetWidth * previewScale));
        const previewHeight = Math.max(1, Math.round(targetHeight * previewScale));
        
        const result = this.scalePixelArray(
            sourcePixels,
            sourceWidth,
            sourceHeight,
            previewWidth,
            previewHeight,
            { 
                algorithm,
                positioning: options.positioning || { vertical: 'center', horizontal: 'middle' },
                backgroundColor: options.backgroundColor || this.defaultBackgroundColor
            }
        );
        
        return {
            pixels: result.pixels,
            width: previewWidth,
            height: previewHeight,
            info: result.info
        };
    }
}

/**
 * Scaling Preview Dialog - UI for scaling preview
 * Single Responsibility: Manages scaling preview interface
 */
class ScalingPreviewDialog {
    constructor(container, onApply, onCancel) {
        this.container = container;
        this.onApply = onApply;
        this.onCancel = onCancel;
        this.scaler = new CanvasScaler();
        this.currentPreview = null;
        this.createDialog();
    }
    
    createDialog() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'scaling-dialog modal';
        this.dialog.innerHTML = `
            <div class="modal__content scaling-dialog__content">
                <div class="modal__header">
                    <h2 class="modal__title">Scale Canvas</h2>
                    <button class="btn btn--icon-sm" id="closeScalingDialog" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal__body">
                    <div class="scaling-options">
                        <div class="option-group">
                            <label for="scalingAlgorithm">Scaling Algorithm:</label>
                            <select id="scalingAlgorithm" class="control-input">
                                <option value="nearest">Nearest Neighbor (Pixel Art)</option>
                                <option value="epx">EPX (Enhanced Pixel Art)</option>
                                <option value="bilinear">Bilinear (Smooth)</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="scalingResizeMode">Resize Mode:</label>
                            <select id="scalingResizeMode" class="control-input">
                                <option value="stretch" selected>Stretch to Fit</option>
                                <option value="keep-size">Keep Size</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="scalingBackground">Background Color:</label>
                            <input type="color" id="scalingBackground" value="#000000" class="control-input">
                        </div>
                    </div>
                    
                    <div class="position-controls" style="display: none;">
                        <div class="option-group position-group" id="verticalPositionGroup">
                            <label for="scalingVerticalPosition">Vertical Position:</label>
                            <select id="scalingVerticalPosition" class="control-input">
                                <option value="top">Top</option>
                                <option value="center" selected>Center</option>
                                <option value="bottom">Bottom</option>
                            </select>
                        </div>
                        
                        <div class="option-group position-group" id="horizontalPositionGroup">
                            <label for="scalingHorizontalPosition">Horizontal Position:</label>
                            <select id="scalingHorizontalPosition" class="control-input">
                                <option value="left">Left</option>
                                <option value="middle" selected>Middle</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="preview-section">
                        <div class="preview-comparison">
                            <div class="preview-before">
                                <h4>Before</h4>
                                <canvas class="preview-canvas" id="beforeCanvas"></canvas>
                                <div class="preview-info" id="beforeInfo"></div>
                            </div>
                            <div class="preview-after">
                                <h4>After</h4>
                                <canvas class="preview-canvas" id="afterCanvas"></canvas>
                                <div class="preview-info" id="afterInfo"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal__footer">
                    <button id="cancelScaling" class="btn btn--secondary">Cancel</button>
                    <button id="applyScaling" class="btn btn--primary">Apply Scaling</button>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.dialog);
        this.bindEvents();
    }
    
    bindEvents() {
        const algorithmSelect = this.dialog.querySelector('#scalingAlgorithm');
        const resizeModeSelect = this.dialog.querySelector('#scalingResizeMode');
        const verticalPositionSelect = this.dialog.querySelector('#scalingVerticalPosition');
        const horizontalPositionSelect = this.dialog.querySelector('#scalingHorizontalPosition');
        const backgroundInput = this.dialog.querySelector('#scalingBackground');
        const applyBtn = this.dialog.querySelector('#applyScaling');
        const cancelBtn = this.dialog.querySelector('#cancelScaling');
        const closeBtn = this.dialog.querySelector('#closeScalingDialog');
        
        // Event handlers for preview updates
        algorithmSelect.addEventListener('change', () => this.updatePreview());
        resizeModeSelect.addEventListener('change', () => {
            this.updatePositionVisibility();
            this.updatePreview();
        });
        verticalPositionSelect.addEventListener('change', () => this.updatePreview());
        horizontalPositionSelect.addEventListener('change', () => this.updatePreview());
        backgroundInput.addEventListener('change', () => this.updatePreview());
        
        applyBtn.addEventListener('click', () => this.handleApply());
        cancelBtn.addEventListener('click', () => this.handleCancel());
        closeBtn.addEventListener('click', () => this.handleCancel());
        
        // Close on outside click
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.handleCancel();
            }
        });
    }
    
    updatePositionVisibility() {
        const resizeMode = this.dialog.querySelector('#scalingResizeMode').value;
        const positionControls = this.dialog.querySelector('.position-controls');
        
        if (resizeMode === 'stretch') {
            positionControls.style.display = 'none';
        } else {
            positionControls.style.display = 'flex';
        }
    }
    
    show(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        this.sourcePixels = sourcePixels;
        this.sourceWidth = sourceWidth;
        this.sourceHeight = sourceHeight;
        this.targetWidth = targetWidth;
        this.targetHeight = targetHeight;
        
        this.dialog.classList.add('modal--open');
        this.updatePositionVisibility();
        this.updatePreview();
        this.renderBeforePreview();
    }
    
    hide() {
        this.dialog.classList.remove('modal--open');
    }
    
    updatePreview() {
        const algorithm = this.dialog.querySelector('#scalingAlgorithm').value;
        const resizeMode = this.dialog.querySelector('#scalingResizeMode').value;
        const verticalPosition = this.dialog.querySelector('#scalingVerticalPosition').value;
        const horizontalPosition = this.dialog.querySelector('#scalingHorizontalPosition').value;
        const backgroundColor = this.dialog.querySelector('#scalingBackground').value;
        
        // Determine positioning value based on resize mode
        let positioning;
        if (resizeMode === 'stretch') {
            positioning = 'stretch';
        } else {
            // Combine vertical and horizontal positions
            positioning = {
                vertical: verticalPosition,
                horizontal: horizontalPosition
            };
        }
        
        const preview = this.scaler.generatePreview(
            this.sourcePixels,
            this.sourceWidth,
            this.sourceHeight,
            this.targetWidth,
            this.targetHeight,
            algorithm,
            {
                positioning: positioning,
                backgroundColor: backgroundColor
            }
        );
        
        this.currentPreview = {
            algorithm,
            positioning: positioning,
            backgroundColor
        };
        
        this.renderAfterPreview(preview);
        this.updateInfo(preview.info);
    }
    
    renderBeforePreview() {
        const canvas = this.dialog.querySelector('#beforeCanvas');
        const ctx = canvas.getContext('2d');
        
        const scale = Math.min(200 / this.sourceWidth, 200 / this.sourceHeight);
        canvas.width = this.sourceWidth * scale;
        canvas.height = this.sourceHeight * scale;
        
        this.renderPixelsToCanvas(ctx, this.sourcePixels, scale);
        
        this.dialog.querySelector('#beforeInfo').textContent = 
            `${this.sourceWidth} × ${this.sourceHeight}`;
    }
    
    renderAfterPreview(preview) {
        const canvas = this.dialog.querySelector('#afterCanvas');
        const ctx = canvas.getContext('2d');
        
        const scale = Math.min(200 / preview.width, 200 / preview.height);
        canvas.width = preview.width * scale;
        canvas.height = preview.height * scale;
        
        this.renderPixelsToCanvas(ctx, preview.pixels, scale);
        
        this.dialog.querySelector('#afterInfo').textContent = 
            `${this.targetWidth} × ${this.targetHeight}`;
    }
    
    renderPixelsToCanvas(ctx, pixels, scale) {
        for (let y = 0; y < pixels.length; y++) {
            for (let x = 0; x < pixels[y].length; x++) {
                ctx.fillStyle = pixels[y][x];
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }
    
    updateInfo(info) {
        const scaleText = info.scaling === 'upscaling' ? 'Upscaling' : 'Downscaling';
        const ratioText = info.aspectRatioMatch ? 'Aspect ratio preserved' : 'Aspect ratio changed';
        
        // Could add more detailed info display here
    }
    
    handleApply() {
        if (this.onApply && this.currentPreview) {
            this.onApply(this.currentPreview);
        }
        this.hide();
    }
    
    handleCancel() {
        if (this.onCancel) {
            this.onCancel();
        }
        this.hide();
    }
    
    destroy() {
        if (this.dialog && this.dialog.parentElement) {
            this.dialog.parentElement.removeChild(this.dialog);
        }
    }
}

// Export for use in main app
window.JTEdit = window.JTEdit || {};
window.JTEdit.Scaling = {
    CanvasScaler,
    ScalingPreviewDialog,
    ScalingStrategy
};