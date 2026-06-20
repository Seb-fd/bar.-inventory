# AGENTS.md - The Hermit Cocktail Bar

## Project Type
Vanilla JS + Google Apps Script. No build tools, no package.json, no Node.js.

## Historia
Este proyecto era anteriormente un branch (`bar-inventory`) de otro proyecto. Fue separado completamente para facilitar el deploy a producción. Ahora es el proyecto standalone de The Hermit Cocktail Bar.

## key Files
- `sg.js` - Backend (Apps Script). **`SPREADSHEET_ID` at line 4**
- `script.js` - Frontend. **`SCRIPT_URL` at lines 1-2**, admin password at line 243
- `config.js` - Bar config (`BAR_CONFIG`, unit conversions, stock levels)
- `utils.js` - Shared utilities + offline support (ventas/compras sync, inventory cache)
- `cuentas.js` - Open tabs/accounts with localStorage
- `floor-plan.js` - Interactive canvas floor plan
- `recetas.js` - Cocktail recipes CRUD
- `index.html` - Load order matters: utils.js → config.js → script.js → cuentas.js → floor-plan.js → recetas.js

## Running Tests
Browser console only (paste into app page, not empty tab):
1. Open app in browser, F12 → Console
2. Paste `tests/unit.test.js`, then `tests/run.js`
3. Run: `runOnlyUnitTests()` or `runAllTests()`

Test files: `unit.test.js`, `integration.test.js`, `utils.test.js`, `frontend.test.js`, `recetas.test.js`, `cuentas.test.js`
Note: `tests/run-tests.js` is a Node.js verification script, not the browser runner.

## Configuration

### Current (bar-inventory standalone)
- **SPREADSHEET_ID**: `12IlQFCmS420xFR-J8KSzhGPueYF2lrElHu6_PrTFARQ`
- **SCRIPT_URL**: `https://script.google.com/macros/s/AKfycbwdp3wBAQEpf2gPJKa0nfiAOlHAeLXV3bMsyE5JiO1x-9thWS6v7W33q4OC4MvNflpY/exec`

### Switching projects
1. Update `SPREADSHEET_ID` in `sg.js` line 4
2. Update `SCRIPT_URL` in `script.js` lines 1-2
3. Clear localStorage: `localStorage.clear()` then refresh
4. If using new Apps Script, redeploy ("Deploy > New deployment")

## Google Sheets Structure
Required sheets: Categorias, Productos, Compras, Ventas, resumen_diario, Ventas_Detalle, Compras_Detalle, Aprovechamientos, Gastos, Cierres, Mesas, Recetas, Cuentas, Zonas

### Productos sheet fields
id, nombre, código, categoría, precio_compra, precio_venta, precio_venta_2, precio_venta_3, precio_venta_4, stock, fecha_creado

## Offline Support
- Ventas/compras auto-save to localStorage when offline, sync on reconnect
- Inventory cached in localStorage (24h TTL)
- Offline indicator shows pending count: `updateOfflineIndicator()`

## Business Date (5PM Cutoff)
The system uses a "business date" that starts at 5PM (bar opens). A transaction at 2AM belongs to the previous day's business session.

- **Frontend**: `toBusinessDateISO(dateStr)` in `utils.js` — converts any date to its business date (YYYY-MM-DD)
- **Backend**: `getBusinessDate()` in `sg.js` — same logic for Google Apps Script
- **Dashboard**: Ranges "hoy", "semana", "mes" all use business date
- **Cierres**: `prepararCierreCaja()` filters by business date

**IMPORTANT**: Google Apps Script project timezone must be set to `America/Bogota` (GMT-5) in `File > Project settings > Time zone` for `getBusinessDate()` to work correctly.

## Common Issues
- **Old data**: Clear localStorage before testing new sheet
- **callGoogleScript not defined**: Ensure utils.js loads before script.js in HTML (verified correct in index.html)
- **Floor plan empty**: `initDefaultLayout()` auto-creates 5 stools + 4 tables if no data exists

## Theme
Dark theme: neon green #7CFF5A, black #000000, cards #181818