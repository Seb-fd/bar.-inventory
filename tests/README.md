# 🧪 Documentación de Pruebas - Inventario

Este directorio contiene las pruebas automatizadas para el sistema de inventario.

## 📁 Estructura de Archivos

```
tests/
├── unit.test.js         # Pruebas unitarias (sin conexión a red)
├── integration.test.js  # Pruebas de integración (HTTP real)
├── run.js              # Runner principal
└── README.md           # Este archivo
```

---

## 🚀 Cómo Ejecutar las Pruebas

### Opción 1: Cargar en el Navegador

1. Abre la aplicación de inventario en el navegador
2. Abre la consola de desarrollo (F12 → Console)
3. Carga los scripts de prueba:
   ```javascript
   // Cargar scripts dinámicamente o incluye en el HTML
   ```
4. Ejecuta las pruebas:
   ```javascript
   // Todas las pruebas
   runAllTests()
   
   // Solo unitarias
   runOnlyUnitTests()
   
   // Solo integración
   runOnlyIntegrationTests()
   ```

### Opción 2: Include en HTML

Agregar al HTML antes de cerrar `</body>`:
```html
<script src="tests/unit.test.js"></script>
<script src="tests/integration.test.js"></script>
<script src="tests/run.js"></script>
```

---

## 📋 Tipos de Pruebas

### 🧪 Pruebas Unitarias (`unit.test.js`)

Prueban funciones individuales sin necesidad de conexión a internet.

**Características:**
- No requieren conexión a Google Sheets
- Ejecución rápida (< 1 segundo)
- Mocks de Google Apps Script
- Validación de entrada
- Casos borde

**Funciones probadas:**
- `generateUniqueAppId()`
- `getColumnIndex()`
- `findProductById()`
- `agregarCategoria()`
- `agregarProducto()`
- `buscarProducto()`
- `registrarVentaPOS()` (validación)
- `registrarCompraPOS()` (validación)
- `getData()`

**Ejecutar:**
```javascript
runUnitTests()
```

---

### 🌐 Pruebas de Integración (`integration.test.js`)

Prueban el sistema completo via HTTP al backend real.

**Características:**
- Conectan a Google Apps Script real
- Pueden modificar datos (usar hoja de prueba)
- Verifican API completa
- Prueban manejo de errores
- Rate limiting

**Funciones probadas:**
- `getCategorias` (GET)
- `getInventario` (GET)
- `buscarProducto` (GET)
- `getResumenDiario` (GET)
- `getData` (GET)
- `agregarCategoria` (POST)
- `registrarGasto` (POST)
- `registrarAprovechamiento` (POST)
- Acciones inválidas
- Concurrencia
- Rate limiting
- Entrada maliciosa

**Ejecutar:**
```javascript
runIntegrationTests()
```

---

## ⚙️ Configuración

### Cambiar URL del Script

En `integration.test.js`, línea 17:
```javascript
const SCRIPT_URL = 'TU_URL_AQUI';
```

O desde la consola antes de ejecutar:
```javascript
window.SCRIPT_URL = 'tu-url-aqui';
```

---

## 📊 Casos de Prueba por Función

### `getColumnIndex()`
| # | Test | Esperado |
|---|------|----------|
| 1 | Columna existe | Índice correcto |
| 2 | Columna no existe | Fallback |
| 3 | Columna con tilde | Índice correcto |
| 4 | Case insensitive | Encuentra |

### `agregarCategoria()`
| # | Test | Esperado |
|---|------|----------|
| 1 | Datos válidos | Success |
| 2 | Sin datos | Error |
| 3 | Nombre vacío | Error |
| 4 | Espacios | Trim |

### `agregarProducto()`
| # | Test | Esperado |
|---|------|----------|
| 1 | Producto válido | Success |
| 2 | Sin nombre | Error |
| 3 | Sin código | Error |
| 4 | Código duplicado | Warning |

### `registrarVentaPOS()`
| # | Test | Esperado |
|---|------|----------|
| 1 | Sin datos | Error |
| 2 | Sin items | Warning |
| 3 | Item incompleto | Error |
| 4 | Cantidad <= 0 | Error |
| 5 | Precio negativo | Error |

### `buscarProducto()`
| # | Test | Esperado |
|---|------|----------|
| 1 | Por ID | Resultados |
| 2 | Por código | Resultados |
| 3 | Por nombre | Resultados |
| 4 | Query vacío | Warning |
| 5 | No existe | Warning |

---

## 🔍 Interpretación de Resultados

### Símbolos
- ✅ **PASS**: Prueba Passed
- ❌ **FAIL**: Prueba fallida
- ⏭️  **SKIP**: Prueba omitida

### Códigos de Color
- **Verde**: Éxito total
- **Ambar**: Advertencias (no críticas)
- **Rojo**: Errores (requieren atención)

---

## ⚠️ Precauciones

1. **Pruebas de integración modifican datos reales**
   - Usar hoja de prueba para desarrollo
   - Hacer backup antes de ejecutar

2. **Rate Limiting**
   - Google Apps Script tiene límites
   - Las pruebas incluyen delays entre requests

3. **Concurrencia**
   - No ejecutar múltiples veces simultáneamente

---

## 🛠️ Desarrollo

### Agregar Nuevas Pruebas

**Unitarias** (`unit.test.js`):
```javascript
function testNuevaFuncion() {
  console.log('\n🧪 PRUEBAS: nuevaFuncion()');
  
  // Test 1
  TestRunner.assert(
    condition,
    'Descripción del test',
    'Detalles adicionales'
  );
}

// Agregar al runner
function runUnitTests() {
  // ... existing tests
  testNuevaFuncion();
}
```

**Integración** (`integration.test.js`):
```javascript
async function testNuevaFuncionAPI() {
  console.log('\n🧪 PRUEBAS: nuevaFuncionAPI');
  
  const result = await fetchPost({ 
    action: 'nuevaFuncion', 
    param: 'value' 
  });
  
  IntegrationRunner.assert(
    result.status === 'success',
    'Descripción del test',
    `Status: ${result.status}`
  );
}
```

---

## 📈 Métricas de Cobertura

| Tipo | Funciones | Casos |
|------|-----------|-------|
| Unitarias | 9 | 30+ |
| Integración | 12 | 20+ |
| **Total** | **21** | **50+** |

---

## 📝 Changelog

### v1.0 (2024)
- ✅ Versión inicial
- ✅ Pruebas unitarias con mocks
- ✅ Pruebas de integración HTTP
- ✅ Runner principal
- ✅ Documentación completa
