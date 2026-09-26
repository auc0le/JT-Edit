# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JT-Edit is a browser-based pixel art editor for CoolLED1248 LED panels. It's a pure frontend JavaScript application with no build process or dependencies beyond vendored libraries.

## Development Commands

This is a static web application with no build process:
- **Run locally**: Open `index.html` in any web browser
- **Deploy**: Upload all files to a web server
- **Test**: Manual testing in browser (no test framework)
- **Lint**: No linting configured

## Architecture

### Core Files
- `index.html` - Single page application entry point (top bar, tool rail, canvas area, right panel, timeline, status bar)
- `styles.css` - Design tokens and all styling (dark workspace; LED preview and timeline styles live here)
- `app.js` - Main application logic (event handling, pixel management, file I/O)
- `ui.js` - UI glue for the chrome: 3-bit palette swatches, status bar readouts, legends (no editor state of its own)
- `timeline.js` - Animation frame thumbnails: click to select, drag to reorder (calls `selectFrame`/`moveFrame` in app.js)
- `scaling.js` - Canvas scaling algorithms and the Resize canvas dialog
- `selection.js` - Rectangle selection, move, copy/cut/paste
- `history.js` - Undo/redo command stack
- `keyboard-shortcuts.js` - Keyboard shortcut registry (drives the DOM controls by id)
- `FileSaver.js` - Save functionality for JT files and PNG export
- `saveas.js` - FileSaver.js library for browser file downloads

Element ids in `index.html` are the contract between the markup and the scripts: `app.js` and `keyboard-shortcuts.js` look controls up by id, so keep ids when restructuring markup. `drawPixels()` calls `window.JTEdit.ui.afterDraw()` after every redraw; `ui.js` and `timeline.js` refresh from that hook.

### Key Data Structures

**Pixel Storage**: 2D arrays of hex color strings
```javascript
pixelArray[row][col] = '#FF0000';  // Red pixel
pixelArrayFrames[frameIndex] = pixelArray;  // For animations
```

**JT File Format**: JSON structure with two types:
- Static: `dataType: 1` with `graffitiData` array
- Animation: `dataType: 0` with `aniData` array and frame info

### Color System
JT-Edit supports two color modes:

**3-bit Color Mode** (8 colors only):
- Binary RGB values map to hex colors
- '000' = Black, '001' = Red, '010' = Green, etc.
- Required for CoolLED1248 LED panel compatibility
- Color quantization applied to imports and scaling operations

**24-bit Color Mode** (full color):
- Standard RGB color space with 16.7 million colors
- Used for general image editing and PNG export
- No color quantization applied
- Bilinear scaling preserves full color gradients

### Important Functions
- `createPixelArray()` - Initialize pixel grid
- `drawPixels()` - Render to canvas using divs
- `generateExportData()` - Convert pixels to JT format
- `importImage()` - Load and quantize images to 3-bit color

## Development Guidelines

1. **No Framework**: This is vanilla JavaScript - avoid adding dependencies
2. **Browser Compatibility**: Must work in modern browsers without transpilation
3. **Canvas Rendering**: Uses CSS Grid with divs, not HTML5 Canvas API
4. **File Format**: JT format is proprietary - maintain compatibility with CoolLED1248
5. **Color Constraints**: Respect current color mode - 3-bit (8 colors) or 24-bit (full color)
6. **No CDN dependencies for function**: icons are inline SVG; Google Fonts is progressive (system fonts offline)
7. **Paint performance**: never add `:hover`, transforms or shadows to `.pixel` unconditionally; a 32x192 panel is 6,144 cells and drag painting updates one cell at a time

## Testing Approach

Manual testing workflow:
1. Open index.html in browser
2. Test all panel sizes (16x32 through 32x192)
3. Test both 3-bit and 24-bit color modes
4. Verify import/export of sample files in `sample files/` directory
5. Test both static and animation modes
6. Test scaling operations in both color modes
7. Verify exported files work with CoolLED1248 app
