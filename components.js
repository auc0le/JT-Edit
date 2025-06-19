/* ===== JT-EDIT COMPONENT SYSTEM - SOLID ARCHITECTURE ===== */

/**
 * Base Component Class
 * Follows Single Responsibility Principle - handles only component lifecycle
 */
class Component {
    constructor(element) {
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        this.state = {};
        this.eventHandlers = new Map();
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => handler(data));
        }
    }

    render() {
        // Override in subclasses
    }

    destroy() {
        this.eventHandlers.clear();
    }
}

/**
 * Toolbar Component
 * Manages toolbar visibility and state
 */
class Toolbar extends Component {
    constructor(element, options = {}) {
        super(element);
        this.options = {
            variant: 'primary',
            visible: true,
            ...options
        };
        this.init();
    }

    init() {
        if (this.element) {
            this.element.classList.add('toolbar', `toolbar--${this.options.variant}`);
            if (!this.options.visible) {
                this.hide();
            }
        }
    }

    show() {
        if (this.element) {
            this.element.classList.remove('hidden');
            this.element.style.display = '';
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
    }

    toggle() {
        if (this.element?.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }
}

/**
 * Button Component
 * Handles button interactions and state
 */
class Button extends Component {
    constructor(element, options = {}) {
        super(element);
        this.options = {
            variant: 'default',
            disabled: false,
            onClick: null,
            ...options
        };
        this.init();
    }

    init() {
        if (this.element) {
            this.element.classList.add('btn');
            if (this.options.variant !== 'default') {
                this.element.classList.add(`btn--${this.options.variant}`);
            }
            
            this.element.addEventListener('click', this.handleClick.bind(this));
            
            if (this.options.disabled) {
                this.disable();
            }
        }
    }

    handleClick(event) {
        if (!this.element.disabled && this.options.onClick) {
            this.options.onClick(event);
        }
        this.emit('click', event);
    }

    enable() {
        if (this.element) {
            this.element.disabled = false;
            this.element.classList.remove('btn--disabled');
        }
    }

    disable() {
        if (this.element) {
            this.element.disabled = true;
            this.element.classList.add('btn--disabled');
        }
    }

    setLoading(loading) {
        if (loading) {
            this.disable();
            this.element.classList.add('btn--loading');
        } else {
            this.enable();
            this.element.classList.remove('btn--loading');
        }
    }
}

/**
 * ColorPicker Component
 * Manages color selection with separation of concerns
 */
class ColorPicker extends Component {
    constructor(element, options = {}) {
        super(element);
        this.options = {
            mode: '3bit',
            initialColor: '#FFFFFF',
            onChange: null,
            ...options
        };
        this.init();
    }

    init() {
        this.state = {
            currentColor: this.options.initialColor,
            recentColors: []
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Implemented based on color mode
    }

    setColor(color) {
        this.setState({ currentColor: color });
        if (this.options.onChange) {
            this.options.onChange(color);
        }
        this.emit('colorChange', color);
    }

    getColor() {
        return this.state.currentColor;
    }

    addRecentColor(color) {
        const recentColors = [...this.state.recentColors];
        if (!recentColors.includes(color)) {
            recentColors.unshift(color);
            if (recentColors.length > 5) {
                recentColors.pop();
            }
            this.setState({ recentColors });
        }
    }
}

/**
 * AnimationController Component
 * Manages animation playback state
 */
class AnimationController extends Component {
    constructor(element, options = {}) {
        super(element);
        this.options = {
            totalFrames: 1,
            currentFrame: 0,
            delay: 250,
            isPlaying: false,
            onFrameChange: null,
            ...options
        };
        this.animationTimer = null;
        this.init();
    }

    init() {
        this.state = {
            currentFrame: this.options.currentFrame,
            totalFrames: this.options.totalFrames,
            isPlaying: this.options.isPlaying,
            delay: this.options.delay
        };
    }

    play() {
        if (!this.state.isPlaying) {
            this.setState({ isPlaying: true });
            this.startAnimation();
            this.emit('play');
        }
    }

    pause() {
        if (this.state.isPlaying) {
            this.setState({ isPlaying: false });
            this.stopAnimation();
            this.emit('pause');
        }
    }

    togglePlayPause() {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    nextFrame() {
        const nextFrame = (this.state.currentFrame + 1) % this.state.totalFrames;
        this.setFrame(nextFrame);
    }

    previousFrame() {
        const prevFrame = this.state.currentFrame - 1;
        this.setFrame(prevFrame < 0 ? this.state.totalFrames - 1 : prevFrame);
    }

    setFrame(frameIndex) {
        if (frameIndex >= 0 && frameIndex < this.state.totalFrames) {
            this.setState({ currentFrame: frameIndex });
            if (this.options.onFrameChange) {
                this.options.onFrameChange(frameIndex);
            }
            this.emit('frameChange', frameIndex);
        }
    }

    startAnimation() {
        const animate = () => {
            if (this.state.isPlaying) {
                this.nextFrame();
                this.animationTimer = setTimeout(animate, this.state.delay);
            }
        };
        animate();
    }

    stopAnimation() {
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
    }

    setDelay(delay) {
        this.setState({ delay });
        if (this.state.isPlaying) {
            this.stopAnimation();
            this.startAnimation();
        }
    }

    destroy() {
        this.stopAnimation();
        super.destroy();
    }
}

/**
 * PixelCanvas Component
 * Manages pixel drawing with separation of concerns
 */
class PixelCanvas extends Component {
    constructor(element, options = {}) {
        super(element);
        this.options = {
            width: 96,
            height: 16,
            pixelSize: 8,
            onPixelClick: null,
            ...options
        };
        this.init();
    }

    init() {
        this.state = {
            pixels: this.createEmptyPixelArray(),
            mouseDown: false,
            currentTool: 'pencil'
        };
        this.setupCanvas();
        this.setupEventListeners();
    }

    createEmptyPixelArray() {
        return Array(this.options.height).fill(null).map(() => 
            Array(this.options.width).fill('#000000')
        );
    }

    setupCanvas() {
        if (this.element) {
            this.element.style.gridTemplateColumns = `repeat(${this.options.width}, ${this.options.pixelSize}px)`;
            this.element.innerHTML = '';
            this.renderPixels();
        }
    }

    setupEventListeners() {
        if (this.element) {
            this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        }
    }

    handleMouseDown(event) {
        this.setState({ mouseDown: true });
    }

    handleMouseUp(event) {
        this.setState({ mouseDown: false });
    }

    handleMouseLeave(event) {
        this.setState({ mouseDown: false });
    }

    handlePixelClick(row, col, event) {
        if (this.options.onPixelClick) {
            this.options.onPixelClick(row, col, event);
        }
        this.emit('pixelClick', { row, col, event });
    }

    setPixel(row, col, color) {
        if (row >= 0 && row < this.options.height && col >= 0 && col < this.options.width) {
            const pixels = [...this.state.pixels];
            pixels[row][col] = color;
            this.setState({ pixels });
        }
    }

    getPixel(row, col) {
        if (row >= 0 && row < this.options.height && col >= 0 && col < this.options.width) {
            return this.state.pixels[row][col];
        }
        return null;
    }

    setPixelArray(pixelArray) {
        this.setState({ pixels: pixelArray });
    }

    getPixelArray() {
        return this.state.pixels;
    }

    renderPixels() {
        if (!this.element) return;
        
        this.element.innerHTML = '';
        this.state.pixels.forEach((row, rowIndex) => {
            row.forEach((color, colIndex) => {
                const pixel = document.createElement('div');
                pixel.className = 'pixel';
                pixel.style.backgroundColor = color;
                pixel.style.width = `${this.options.pixelSize}px`;
                pixel.style.height = `${this.options.pixelSize}px`;
                
                pixel.addEventListener('click', (e) => this.handlePixelClick(rowIndex, colIndex, e));
                pixel.addEventListener('mouseenter', (e) => {
                    if (this.state.mouseDown) {
                        this.handlePixelClick(rowIndex, colIndex, e);
                    }
                });
                
                this.element.appendChild(pixel);
            });
        });
    }

    render() {
        this.renderPixels();
    }

    setPixelSize(size) {
        this.options.pixelSize = size;
        this.setupCanvas();
    }
}

/**
 * EventBus - Central event management
 * Follows Dependency Inversion Principle
 */
class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data));
        }
    }
}

/**
 * ComponentRegistry - Manages all components
 * Follows Single Responsibility Principle
 */
class ComponentRegistry {
    constructor() {
        this.components = new Map();
    }

    register(name, component) {
        this.components.set(name, component);
    }

    get(name) {
        return this.components.get(name);
    }

    has(name) {
        return this.components.has(name);
    }

    destroy(name) {
        if (this.has(name)) {
            const component = this.get(name);
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
            this.components.delete(name);
        }
    }

    destroyAll() {
        this.components.forEach((component, name) => {
            this.destroy(name);
        });
    }
}

// Export for use in main app
window.JTEdit = window.JTEdit || {};
window.JTEdit.Components = {
    Component,
    Toolbar,
    Button,
    ColorPicker,
    AnimationController,
    PixelCanvas,
    EventBus,
    ComponentRegistry
};