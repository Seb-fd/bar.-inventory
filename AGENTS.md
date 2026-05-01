# AGENTS.md - Inventory Project (The Hermit Cocktail Bar)

## Project Type
Vanilla JS + Google Apps Script. No build tools, no package.json, no Node.js.

## Branch
- **bar-inventory** - Contains The Hermit Cocktail Bar implementation (separate from main)
- **main** - Original store/lencería inventory (do not confuse with bar branch)

## Key Files
- `sg.js` - Backend (Google Apps Script). **Config at line 4: `SPREADSHEET_ID`**
- `script.js` - Frontend. **Config at lines 1-2: `SCRIPT_URL`**
- `index.html` - Main HTML
- `estilo.css` - Styles
- `utils.js` - Shared utilities
- `cuentas.js` - Open tabs/accounts system with localStorage
- `floor-plan.js` - Interactive canvas floor plan
- `recetas.js` - Cocktail recipes CRUD

## Running Tests
Browser console only:
1. Open app in browser
2. Press F12 → Console tab
3. Copy/paste content of `tests/unit.test.js`
4. Run: `runOnlyUnitTests()` or `runAllTests()`

## Configuration

### Current Config (bar-inventory branch)
- **SPREADSHEET_ID**: `12IlQFCmS420xFR-J8KSzhGPueYF2lrElHu6_PrTFARQ`
- **SCRIPT_URL**: `https://script.google.com/macros/s/AKfycbwdp3wBAQEpf2gPJKa0nfiAOlHAeLXV3bMsyE5JiO1x-9thWS6v7W33q4OC4MvNflpY/exec`

### Changing Configuration
When switching between projects:
1. Update `SPREADSHEET_ID` in `sg.js` line 4
2. Update `SCRIPT_URL` in `script.js` lines 1-2
3. Clear browser localStorage: `localStorage.clear()` then refresh
4. If using new Apps Script, redeploy ("Deploy > New deployment")

## Data Structure (Google Sheets)
Required sheets: Categorias, Productos, Mesas, Recetas, Zonas, Cuentas, Ventas, Ventas_Detalle, Compras, Gastos

### Productos sheet fields
id, nombre, código, categoría, volumen_ml, contenido_oz, precio_botella, precio_onza, precio_ml, precio_venta, stock, fecha_creado

## Common Issues
- **Seeing old data**: Clear localStorage (`localStorage.clear()`) before testing new sheet
- **callGoogleScript not defined**: Ensure utils.js loads before script.js in HTML
- **Floor plan empty**: `initDefaultLayout()` auto-creates 5 stools + 4 tables if no data exists

## Theme
Dark theme with neon green accent (#7CFF5A), black background (#000000), dark cards (#181818)