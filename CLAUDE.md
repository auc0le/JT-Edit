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
- `index.html` - Single page application entry point
- `app.js` - Main application logic (event handling, pixel management, file I/O)
- `FileSaver.js` - Save functionality for JT files and PNG export
- `saveas.js` - FileSaver.js library for browser file downloads

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
3-bit color space (8 colors only):
- Binary RGB values map to hex colors
- '000' = Black, '001' = Red, '010' = Green, etc.
- Color quantization required for image imports

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
5. **Color Constraints**: Always respect 3-bit color limitation (8 colors max)

## Testing Approach

Manual testing workflow:
1. Open index.html in browser
2. Test all panel sizes (16x32 through 32x192)
3. Verify import/export of sample files in `sample files/` directory
4. Test both static and animation modes
5. Verify exported files work with CoolLED1248 app