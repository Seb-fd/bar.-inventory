# Sistema POS Simple

Un sistema de gestión de inventario y punto de venta (POS) construido con Google Apps Script y Google Sheets.

## 📋 Descripción

Sistema POS (Point of Sale) completo para pequeños y medianos negocios. Gestiona inventario, ventas, compras, gastos y genera reportes financieros en tiempo real.

**Tecnología**: Google Apps Script + Google Sheets + JavaScript Vanilla

---

## 🚀 Características

### Gestión de Inventario
- Registro de productos con múltiples precios (hasta 4 precios de venta)
- Control de stock en tiempo real
- Categorización de productos
- Búsqueda avanzada por ID, código o nombre
- Alertas de stock bajo

### Punto de Venta (POS)
- Interfaz de venta rápida
- Múltiples métodos de pago (efectivo, transferencia, tarjeta, Sistecredito, Addi)
- Cálculo automático de comisiones por método de pago
- Descuentos por producto y globales
- Domicilios con costo de envío
- Facturación automática

### Compras
- Registro de compras a proveedores
- Actualización automática de inventario
- Seguimiento de precios de compra

### Gestión Financiera
- Registro de gastos y aprovechamientos
- Cierre de caja diario
- Conciliación de ventas
- Dashboard con métricas financieras
- Resumen diario automático

### Funcionalidades Técnicas
- Validación de entrada robusta
- Búsqueda con índices dinámicos (resistente a cambios en columnas)
- Paginación en todas las tablas
- Diseño responsive (móvil y escritorio)
- Sistema de roles (admin/ventas)
- Pruebas automatizadas (69 tests)

---

## 📁 Estructura del Proyecto

```
Inventory/
├── sg.js              # Backend (Google Apps Script) - 1,605 líneas
├── script.js         # Frontend JavaScript - 6,123 líneas
├── estilo.css        # Estilos CSS - 2,055 líneas
├── utils.js          # Utilidades compartidas - 75 líneas
├── index.html        # Estructura HTML - 1,613 líneas
├── img/              # Imágenes y favicon
├── tests/            # Pruebas automatizadas
│   ├── unit.test.js          # Pruebas unitarias (44 tests)
│   ├── integration.test.js   # Pruebas integración (25 tests)
│   ├── run.js                # Runner de pruebas
│   └── README.md             # Documentación de pruebas
└── .gitignore
```

---

## 🛠️ Tecnologías

| Componente | Tecnología |
|------------|------------|
| Backend | Google Apps Script |
| Base de datos | Google Sheets |
| Frontend | JavaScript (ES6+) |
| Estilos | CSS3 |
| Testing | JavaScript (mocks + HTTP) |
| UI Icons | Font Awesome 6.5 |
| Gráficos | Chart.js |

---

## 📊 Estructura de Datos

### Hojas de Google Sheets

| Hoja | Descripción |
|------|-------------|
| `Categorias` | Categorías de productos |
| `Productos` | Catálogo de productos |
| `Ventas` | Registro de ventas |
| `Ventas_Detalle` | Detalle de items vendidos |
| `Compras` | Registro de compras |
| `Compras_Detalle` | Detalle de items comprados |
| `resumen_diario` | Resumen financiero diario |
| `Gastos` | Registro de gastos |
| `Aprovechamientos` | Ingresos adicionales |
| `Cierres` | Cierres de caja |

---

## 🔌 API del Backend

### Funciones Disponibles

| Función | Descripción | Método |
|---------|-------------|--------|
| `getCategorias` | Obtiene todas las categorías | GET |
| `agregarCategoria` | Agrega nueva categoría | POST |
| `getInventario` | Obtiene todos los productos | GET |
| `buscarProducto` | Busca productos por query | GET |
| `agregarProducto` | Agrega nuevo producto | POST |
| `registrarVentaPOS` | Registra una venta | POST |
| `registrarCompraPOS` | Registra una compra | POST |
| `registrarTransaccion` | Registra transacción simple | POST |
| `getVentaDetalle` | Obtiene detalle de venta | GET |
| `getResumenDiario` | Obtiene resumen del día | GET |
| `registrarGasto` | Registra un gasto | POST |
| `registrarAprovechamiento` | Registra aprovechamiento | POST |
| `conciliarVenta` | Concilia una venta | POST |
| `eliminarGasto` | Elimina un gasto | POST |
| `iniciarBaseDeDatos` | Inicializa las hojas | POST |
| `resetearBaseDeDatos` | Resetea toda la base | POST |

---

## ⚙️ Configuración

### 1. Google Sheets

1. Crear un nuevo Google Sheet
2. Ir a **Extensiones** > **Apps Script**
3. Copiar el contenido de `sg.js` al editor
4. Desplegar como **Aplicación web**
5. Copiar la URL desplegada

### 2. Configurar Frontend

Editar `sg.js` línea 4:
```javascript
const SPREADSHEET_ID = "TU_SPREADSHEET_ID";
```

Editar `script.js` línea 1-2:
```javascript
const SCRIPT_URL = "https://script.google.com/macros/s/TU_SCRIPT_ID/exec";
```

---

## 🧪 Pruebas Automatizadas

El proyecto incluye **69 pruebas automatizadas** que verifican el correcto funcionamiento del sistema.

### Ejecutar Pruebas

1. Abrir la aplicación en el navegador
2. Presionar **F12** para abrir DevTools
3. Copiar y pegar el contenido de `tests/unit.test.js` en la consola
4. Ejecutar:
   ```javascript
   runOnlyUnitTests()  // Pruebas unitarias (44 tests)
   ```

### Cobertura de Pruebas

| Tipo | Cantidad | Estado |
|------|----------|--------|
| Unitarias | 44 | ✅ Pasando |
| Integración | 25 | ✅ Pasando |
| **Total** | **69** | ✅ **100%** |

---

## 📱 Secciones del Sistema

1. **Dashboard** - Gráficos y resumen financiero
2. **Inventario** - Listado de productos con filtros
3. **Registrar Producto** - Alta de nuevos productos
4. **Categorías** - Gestión de categorías
5. **Compras** - Registro de compras (POS)
6. **Ventas** - Punto de venta
7. **Gastos** - Registro de gastos y aprovechamientos
8. **Cierre de Caja** - Cierre diario
9. **Conciliación** - Conciliación de ventas
10. **Resúmenes** - Reportes
11. **Configuración** - Inicialización de base de datos

---

## 🔒 Seguridad

- Validación de entrada en backend y frontend
- Manejo de entrada maliciosa
- Rate limiting en llamadas a la API
- Sistema de roles (admin/ventas)

---

## 📈 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Líneas de código (total) | ~9,800 |
| Funciones en backend | 30 |
| Secciones en frontend | 11 |
| Pruebas automatizadas | 69 |
| Cobertura de tests | 100% |

---

## 🤝 Contribuidores

- **Desarrollador principal**: [Seb-fd](https://github.com/Seb-fd)

---

## 📄 Licencia

Licencia propia. Todos los derechos reservados.

---

## 🔗 Enlaces

- **Repositorio**: https://github.com/Seb-fd/Inventory-temp
- **Autor**: https://github.com/Seb-fd

---

*Sistema POS Simple - Gestiona tu inventario y ventas con Google Sheets*
