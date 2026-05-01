/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRUEBAS UNITARIAS - sg.js (CON MOCKS COMPLETOS)
 * Funciones helper y validación de entrada
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Cómo ejecutar:
 * 1. Abrir consola del navegador en la página de la aplicación
 * 2. Copiar y pegar TODO este código en la consola
 * 3. Ejecutar: runOnlyUnitTests()
 * 
 * Este archivo incluye MOCKS de todas las funciones de Google Apps Script
 * para que las pruebas unitarias funcionen en el navegador.
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // 📦 DATOS MOCK - Simulación de Google Sheets
  // ═══════════════════════════════════════════════════════════════════════

  // Headers de las hojas
  const HEADERS_PRODUCTOS = ["id", "nombre", "código", "categoría", "precio_compra", "precio_venta", "precio_venta_2", "precio_venta_3", "precio_venta_4", "stock", "fecha_creado"];
  const HEADERS_CATEGORIAS = ["id", "nombre"];
  const HEADERS_VENTAS = ["id_venta", "fecha", "cliente", "total_final", "metodo_pago", "ingresado"];
  const HEADERS_COMPRAS = ["id_compra", "fecha", "proveedor", "total_final", "metodo_pago"];

  // Datos simulados
  let mockCategorias = [
    ["id-CAT-001", "Electrónicos"],
    ["id-CAT-002", "Accesorios"]
  ];

  let mockProductos = [
    ["id-PROD-001", "Laptop HP 15", "LAP001", "Electrónicos", 800000, 1200000, 1100000, 1000000, 950000, 10, new Date()],
    ["id-PROD-002", "Mouse Inalámbrico", "MOU001", "Accesorios", 25000, 45000, 40000, 35000, 30000, 50, new Date()],
    ["id-PROD-003", "Teclado Mecánico", "TEC001", "Accesorios", 80000, 150000, 140000, 130000, 120000, 25, new Date()],
    ["id-PROD-004", "Monitor 24\"", "MON001", "Electrónicos", 350000, 500000, 480000, 450000, 420000, 8, new Date()]
  ];

  let mockVentas = [];
  let mockCompras = [];
  let mockGastos = [];
  let consecutiveVentas = 0;
  let consecutiveCompras = 0;

  // ═══════════════════════════════════════════════════════════════════════
  // 🔧 MOCKS DE GOOGLE APPS SCRIPT
  // ═══════════════════════════════════════════════════════════════════════

  // Función para crear sheets simulados
  const createMockSheet = (name, headers, data) => {
    const sheetData = [headers, ...data];
    return {
      name: name,
      getDataRange: () => ({
        getValues: () => sheetData
      }),
      getLastRow: () => sheetData.length,
      getLastColumn: () => headers.length,
      appendRow: (row) => { 
        sheetData.push(row); 
        data.push(row);
      },
      deleteRow: (index) => { 
        sheetData.splice(index + 1, 1); 
        if (data[index - 1]) data.splice(index - 1, 1);
      },
      getRange: (row, col, numRows, numCols) => ({
        setValue: (val) => { sheetData[row-1][col-1] = val; },
        setValues: (vals) => {
          vals.forEach((v, i) => { 
            if (sheetData[row-1+i]) sheetData[row-1+i][col-1] = v[0]; 
          });
        },
        getValues: () => {
          const startRow = row - 1;
          const endRow = Math.min(startRow + numRows, sheetData.length);
          return sheetData.slice(startRow, endRow).map(r => r.slice(col - 1, col - 1 + numCols));
        }
      })
    };
  };

  // Map de sheets simulados
  const mockSheets = {};

  const initializeMockSheets = () => {
    mockSheets['Categorias'] = createMockSheet('Categorias', HEADERS_CATEGORIAS, mockCategorias);
    mockSheets['Productos'] = createMockSheet('Productos', HEADERS_PRODUCTOS, mockProductos);
    mockSheets['Ventas'] = createMockSheet('Ventas', HEADERS_VENTAS, mockVentas);
    mockSheets['Compras'] = createMockSheet('Compras', HEADERS_COMPRAS, mockCompras);
  };

  initializeMockSheets();

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎭 IMPLEMENTACIÓN DE FUNCIONES MOCK (copiadas de sg.js)
  // ═══════════════════════════════════════════════════════════════════════

  // Usar window para navegador, global para Node.js
  const globalScope = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});

  // Helper: buscar índice de columna
  function getColumnIndex(sheet, columnName, fallbackIndex) {
    try {
      const headers = sheet.getDataRange().getValues()[0];
      const index = headers.indexOf(columnName);
      if (index !== -1) {
        return index;
      }
      console.log(`[MOCK] Columna '${columnName}' no encontrada, usando fallback: ${fallbackIndex}`);
      return fallbackIndex;
    } catch (e) {
      console.log(`[MOCK] Error en getColumnIndex: ${e.message}`);
      return fallbackIndex;
    }
  }

  // Helper: generar ID único
  function generateUniqueAppId() {
    return 'id-' + new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 9).toUpperCase();
  }

  // Helper: buscar producto por ID
  function findProductById(sheetProductos, productoId) {
    try {
      const data = sheetProductos.getDataRange().getValues();
      const idColIndex = getColumnIndex(sheetProductos, 'id', 0);
      
      const searchId = String(productoId || '').trim().toLowerCase();
      
      for (let i = 1; i < data.length; i++) {
        const rowId = String(data[i][idColIndex] || '').trim().toLowerCase();
        if (rowId === searchId) {
          return { rowData: data[i], rowIndex: i };
        }
      }
      return { rowData: null, rowIndex: -1 };
    } catch (error) {
      console.log(`[MOCK] Error en findProductById: ${error.message}`);
      return { rowData: null, rowIndex: -1 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 IMPLEMENTACIÓN DE FUNCIONES DEL NEGOCIO (MOCK)
  // ═══════════════════════════════════════════════════════════════════════

  // getSpreadsheet mock
  globalScope.getSpreadsheet = function() {
    return {
      getSheetByName: function(name) {
        return mockSheets[name] || null;
      }
    };
  };

  // agregarCategoria mock
  globalScope.agregarCategoria = function(data) {
    if (!data) {
      return { status: 'error', message: 'No se recibieron datos.' };
    }
    if (!data.nombre || String(data.nombre).trim() === '') {
      return { status: 'error', message: 'El nombre de la categoría es requerido.' };
    }

    const sheet = mockSheets['Categorias'];
    if (!sheet) {
      return { status: 'error', message: "La pestaña 'Categorias' no existe." };
    }

    const newId = generateUniqueAppId();
    const newRow = [newId, String(data.nombre).trim()];

    try {
      sheet.appendRow(newRow);
      return { status: 'success', message: `Categoría '${data.nombre}' agregada (ID: ${newId}).` };
    } catch (e) {
      return { status: 'error', message: `Error al escribir categoría: ${e.message}` };
    }
  };

  // agregarProducto mock
  globalScope.agregarProducto = function(data) {
    if (!data) {
      return { status: 'error', message: 'No se recibieron datos.' };
    }
    if (!data.nombre || String(data.nombre).trim() === '') {
      return { status: 'error', message: 'El nombre del producto es requerido.' };
    }
    if (!data.codigo || String(data.codigo).trim() === '') {
      return { status: 'error', message: 'El código del producto es requerido.' };
    }
    if (!data.categoria || String(data.categoria).trim() === '') {
      return { status: 'error', message: 'La categoría del producto es requerida.' };
    }

    const sheet = mockSheets['Productos'];
    if (!sheet) {
      return { status: 'error', message: "La pestaña 'Productos' no existe." };
    }

    // Verificar código duplicado
    const productosData = sheet.getDataRange().getValues();
    const headers = productosData[0];
    const codigoCol = headers.indexOf('código');
    
    if (codigoCol !== -1) {
      const codigoBusqueda = String(data.codigo || '').trim().toLowerCase();
      for (let i = 1; i < productosData.length; i++) {
        const codigoExistente = String(productosData[i][codigoCol] || '').trim().toLowerCase();
        if (codigoExistente && codigoExistente === codigoBusqueda) {
          return { status: 'warning', message: `Ya existe un producto con el código '${data.codigo}'.` };
        }
      }
    }

    const newId = generateUniqueAppId();
    const precioVentaBase = parseFloat(data.precio_venta) || 0;
    const precioVenta2 = data.precio_venta_2 !== undefined ? parseFloat(data.precio_venta_2) : precioVentaBase;
    const precioVenta3 = data.precio_venta_3 !== undefined ? parseFloat(data.precio_venta_3) : precioVentaBase;
    const precioVenta4 = data.precio_venta_4 !== undefined ? parseFloat(data.precio_venta_4) : precioVentaBase;

    const newRow = [
      newId,
      data.nombre,
      data.codigo,
      data.categoria,
      parseFloat(data.precio_compra) || 0,
      precioVentaBase,
      precioVenta2,
      precioVenta3,
      precioVenta4,
      parseInt(data.stock) || 0,
      new Date()
    ];

    try {
      sheet.appendRow(newRow);
      return { status: 'success', message: `Producto '${data.nombre}' agregado (ID: ${newId}).`, id: newId };
    } catch (e) {
      return { status: 'error', message: `Error al escribir producto: ${e.message}` };
    }
  };

  // getData mock
  globalScope.getData = function(sheetName) {
    const sheet = mockSheets[sheetName];
    if (!sheet) {
      return { status: 'error', message: `Hoja '${sheetName}' no encontrada.` };
    }

    try {
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) {
        return { status: 'success', data: [] };
      }

      const headers = data[0];
      const rows = data.slice(1);
      
      const parsedData = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          let value = row[index];
          // Convertir números
          if (typeof value === 'string' && !isNaN(value) && value !== '') {
            value = parseFloat(value);
          }
          obj[header] = value;
        });
        return obj;
      });

      return { status: 'success', data: parsedData };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  };

  // buscarProducto mock
  globalScope.buscarProducto = function(query) {
    const data = globalScope.getData('Productos');

    if (data.status !== 'success') return data;

    const products = data.data;
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length === 0) {
      return { status: 'warning', message: 'Especifique un ID, Código o Nombre para buscar.' };
    }

    const results = products.filter((p) => {
      const idStr = String(p.id || '');
      const codigoStr = String(p.código || '');
      const nombreStr = String(p.nombre || '');

      return (
        idStr.toLowerCase().includes(lowerQuery) ||
        codigoStr.toLowerCase().includes(lowerQuery) ||
        nombreStr.toLowerCase().includes(lowerQuery)
      );
    });

    if (results.length > 0) {
      return { status: 'success', data: results, message: `${results.length} coincidencias encontradas.` };
    } else {
      return { status: 'warning', message: 'Producto no encontrado.' };
    }
  };

  // registrarVentaPOS mock
  globalScope.registrarVentaPOS = function(data) {
    // Validación
    if (!data) {
      return { status: 'error', message: 'No se recibieron datos.' };
    }
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return { status: 'warning', message: 'No hay productos en la venta.' };
    }
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.producto_id || !item.cantidad || !item.precio) {
        return { status: 'error', message: `Item ${i + 1} incompleto: requiere producto_id, cantidad y precio.` };
      }
      if (parseInt(item.cantidad) <= 0) {
        return { status: 'error', message: `Item ${i + 1}: la cantidad debe ser mayor a 0.` };
      }
      if (parseFloat(item.precio) < 0) {
        return { status: 'error', message: `Item ${i + 1}: el precio no puede ser negativo.` };
      }
    }

    const sheetVentas = mockSheets['Ventas'];
    const sheetProductos = mockSheets['Productos'];
    
    if (!sheetVentas || !sheetProductos) {
      return { status: 'error', message: 'Una o más hojas necesarias no existen.' };
    }

    // Validar stock
    const productosData = sheetProductos.getDataRange().getValues();
    const headers = productosData[0];
    const idCol = headers.indexOf('id');
    const stockCol = headers.indexOf('stock');

    for (const item of data.items) {
      let productoEncontrado = false;
      for (let i = 1; i < productosData.length; i++) {
        if (String(productosData[i][idCol]) === String(item.producto_id)) {
          productoEncontrado = true;
          const stockActual = parseInt(productosData[i][stockCol]) || 0;
          if (stockActual < item.cantidad) {
            return { status: 'warning', message: `Stock insuficiente para producto. Stock actual: ${stockActual}` };
          }
          break;
        }
      }
      if (!productoEncontrado) {
        return { status: 'error', message: `Producto ${item.producto_id} no encontrado.` };
      }
    }

    // Calcular totales
    let subtotal = 0;
    data.items.forEach(item => {
      subtotal += parseFloat(item.precio) * parseInt(item.cantidad);
    });
    const descuento = subtotal * (parseFloat(data.descuento_global_pct) || 0) / 100;
    const totalFinal = subtotal - descuento;
    const comision = totalFinal * (parseFloat(data.comision) || 0) / 100;

    consecutiveVentas++;
    const ventaId = 'V-' + String(consecutiveVentas).padStart(5, '0');
    const fecha = new Date();

    const ventaRow = [
      ventaId,
      fecha,
      data.cliente || 'Mostrador',
      totalFinal,
      data.metodoPago || 'efectivo',
      data.ingresado !== false ? 'TRUE' : 'FALSE'
    ];

    sheetVentas.appendRow(ventaRow);

    // Actualizar stock
    for (const item of data.items) {
      const { rowData, rowIndex } = findProductById(sheetProductos, item.producto_id);
      if (rowIndex !== -1) {
        const stockActual = parseInt(rowData[stockCol]) || 0;
        const nuevoStock = stockActual - parseInt(item.cantidad);
        sheetProductos.getRange(rowIndex + 1, stockCol + 1).setValue(nuevoStock);
      }
    }

    return { 
      status: 'success', 
      message: 'Venta registrada correctamente.', 
      id_venta: ventaId,
      venta: { id_venta: ventaId, total_final: totalFinal },
      items: data.items
    };
  };

  // registrarCompraPOS mock
  globalScope.registrarCompraPOS = function(data) {
    // Validación
    if (!data) {
      return { status: 'error', message: 'No se recibieron datos.' };
    }
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return { status: 'warning', message: 'No hay productos en la compra.' };
    }
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.producto_id || !item.cantidad || !item.precio) {
        return { status: 'error', message: `Item ${i + 1} incompleto: requiere producto_id, cantidad y precio.` };
      }
      if (parseInt(item.cantidad) <= 0) {
        return { status: 'error', message: `Item ${i + 1}: la cantidad debe ser mayor a 0.` };
      }
      if (parseFloat(item.precio) < 0) {
        return { status: 'error', message: `Item ${i + 1}: el precio no puede ser negativo.` };
      }
    }

    const sheetCompras = mockSheets['Compras'];
    const sheetProductos = mockSheets['Productos'];
    
    if (!sheetCompras || !sheetProductos) {
      return { status: 'error', message: 'Una o más hojas necesarias no existen.' };
    }

    // Calcular totales
    let subtotal = 0;
    data.items.forEach(item => {
      subtotal += parseFloat(item.precio) * parseInt(item.cantidad);
    });
    const descuento = subtotal * (parseFloat(data.descuento_global_pct) || 0) / 100;
    const totalFinal = subtotal - descuento;

    consecutiveCompras++;
    const compraId = 'C-' + String(consecutiveCompras).padStart(5, '0');
    const fecha = new Date();

    const compraRow = [
      compraId,
      fecha,
      data.proveedor || 'Sin proveedor',
      totalFinal,
      data.metodoPago || 'efectivo'
    ];

    sheetCompras.appendRow(compraRow);

    // Actualizar stock y precio de compra
    const productosData = sheetProductos.getDataRange().getValues();
    const headers = productosData[0];
    const idCol = headers.indexOf('id');
    const stockCol = headers.indexOf('stock');
    const precioCompraCol = headers.indexOf('precio_compra');

    for (const item of data.items) {
      for (let i = 1; i < productosData.length; i++) {
        if (String(productosData[i][idCol]) === String(item.producto_id)) {
          const stockActual = parseInt(productosData[i][stockCol]) || 0;
          const nuevoStock = stockActual + parseInt(item.cantidad);
          sheetProductos.getRange(i + 1, stockCol + 1).setValue(nuevoStock);
          sheetProductos.getRange(i + 1, precioCompraCol + 1).setValue(parseFloat(item.precio));
          break;
        }
      }
    }

    return { 
      status: 'success', 
      message: 'Compra registrada correctamente.', 
      compraId: compraId,
      total: totalFinal
    };
  };

  // getVentaDetalle mock
  globalScope.getVentaDetalle = function(idVenta) {
    const sheetVentas = mockSheets['Ventas'];
    
    if (!sheetVentas) {
      return { status: 'error', message: 'No se encontró la hoja de ventas.' };
    }

    const ventasData = sheetVentas.getDataRange().getValues();
    const headersVentas = ventasData[0];
    
    const ventaIdCol = headersVentas.indexOf('id_venta');
    if (ventaIdCol === -1) {
      return { status: 'error', message: 'Columna id_venta no encontrada.' };
    }

    const ventaRow = ventasData.find((row, i) => i > 0 && String(row[ventaIdCol]) === String(idVenta));

    if (!ventaRow) {
      return { status: 'error', message: 'Venta no encontrada.' };
    }

    const venta = {};
    headersVentas.forEach((h, i) => (venta[h] = ventaRow[i]));

    return {
      status: 'success',
      venta: venta,
      items: []
    };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 CONFIGURACIÓN DEL TEST RUNNER
  // ═══════════════════════════════════════════════════════════════════════

  const TestRunner = {
    passed: 0,
    failed: 0,
    results: [],
    
    reset() {
      this.passed = 0;
      this.failed = 0;
      this.results = [];
      // Reiniciar datos mock
      mockCategorias = [
        ["id-CAT-001", "Electrónicos"],
        ["id-CAT-002", "Accesorios"]
      ];
      mockProductos = [
        ["id-PROD-001", "Laptop HP 15", "LAP001", "Electrónicos", 800000, 1200000, 1100000, 1000000, 950000, 10, new Date()],
        ["id-PROD-002", "Mouse Inalámbrico", "MOU001", "Accesorios", 25000, 45000, 40000, 35000, 30000, 50, new Date()],
        ["id-PROD-003", "Teclado Mecánico", "TEC001", "Accesorios", 80000, 150000, 140000, 130000, 120000, 25, new Date()],
        ["id-PROD-004", "Monitor 24\"", "MON001", "Electrónicos", 350000, 500000, 480000, 450000, 420000, 8, new Date()]
      ];
      mockVentas = [];
      mockCompras = [];
      consecutiveVentas = 0;
      consecutiveCompras = 0;
      initializeMockSheets();
    },
    
    assert(condition, testName, details = '') {
      if (condition) {
        this.passed++;
        this.results.push({ status: 'PASS', name: testName, details });
        console.log(`✅ PASS: ${testName}`);
      } else {
        this.failed++;
        this.results.push({ status: 'FAIL', name: testName, details });
        console.error(`❌ FAIL: ${testName}${details ? ' - ' + details : ''}`);
      }
    },
    
    summary() {
      const total = this.passed + this.failed;
      console.log('\n' + '='.repeat(60));
      console.log(`📊 RESUMEN DE PRUEBAS UNITARIAS`);
      console.log('='.repeat(60));
      console.log(`Total: ${total} | ✅ Pasadas: ${this.passed} | ❌ Fallidas: ${this.failed}`);
      console.log('='.repeat(60));
      
      if (this.failed > 0) {
        console.log('\n⚠️  PRUEBAS FALLIDAS:');
        this.results.filter(r => r.status === 'FAIL').forEach(r => {
          console.log(`  - ${r.name}`);
        });
      }
      
      if (this.passed === total) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!\n');
      }
      
      return { passed: this.passed, failed: this.failed, total };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: generateUniqueAppId()
  // ═══════════════════════════════════════════════════════════════════════

  function testGenerateUniqueAppId() {
    console.log('\n🧪 PRUEBAS: generateUniqueAppId()');
    console.log('-'.repeat(50));

    const id1 = generateUniqueAppId();
    TestRunner.assert(
      typeof id1 === 'string' && id1.startsWith('id-'),
      'Genera ID con prefijo "id-"',
      `Generado: ${id1}`
    );

    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateUniqueAppId());
    }
    TestRunner.assert(
      ids.size === 100,
      'Genera 100 IDs únicos',
      `Únicos: ${ids.size}/100`
    );

    const id2 = generateUniqueAppId();
    TestRunner.assert(
      id2.length > 10,
      'ID tiene longitud suficiente (> 10)',
      `Longitud: ${id2.length}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: getColumnIndex()
  // ═══════════════════════════════════════════════════════════════════════

  function testGetColumnIndex() {
    console.log('\n🧪 PRUEBAS: getColumnIndex()');
    console.log('-'.repeat(50));

    const mockSheet = mockSheets['Productos'];

    const result1 = getColumnIndex(mockSheet, 'stock', 9);
    TestRunner.assert(
      result1 === 9,
      'Retorna índice correcto para "stock"',
      `Esperado: 9, Obtenido: ${result1}`
    );

    const result2 = getColumnIndex(mockSheet, 'columna_inexistente', 5);
    TestRunner.assert(
      result2 === 5,
      'Usa fallback cuando columna no existe',
      `Fallback usado: ${result2}`
    );

    const result3 = getColumnIndex(mockSheet, 'categoría', 0);
    TestRunner.assert(
      result3 === 3,
      'Maneja columnas con tildes correctamente',
      `Índice: ${result3}`
    );

    const result4 = getColumnIndex(mockSheet, 'id', 0);
    TestRunner.assert(
      result4 === 0,
      'Retorna 0 para primera columna',
      `Índice: ${result4}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: findProductById()
  // ═══════════════════════════════════════════════════════════════════════

  function testFindProductById() {
    console.log('\n🧪 PRUEBAS: findProductById()');
    console.log('-'.repeat(50));

    const mockSheet = mockSheets['Productos'];

    const result1 = findProductById(mockSheet, 'id-PROD-001');
    TestRunner.assert(
      result1.rowIndex === 1 && result1.rowData[1] === 'Laptop HP 15',
      'Encuentra producto por ID exacto',
      `Fila: ${result1.rowIndex}, Nombre: ${result1.rowData ? result1.rowData[1] : 'N/A'}`
    );

    const result2 = findProductById(mockSheet, 'id-INEXISTENTE');
    TestRunner.assert(
      result2.rowIndex === -1 && result2.rowData === null,
      'Retorna null cuando no encuentra',
      `rowIndex: ${result2.rowIndex}`
    );

    const result3 = findProductById(mockSheet, 'id-prod-002');
    TestRunner.assert(
      result3.rowIndex === 2,
      'Búsqueda case insensitive',
      `Fila: ${result3.rowIndex}`
    );

    const result4 = findProductById(mockSheet, '');
    TestRunner.assert(
      result4.rowIndex === -1,
      'Maneja ID vacío',
      `rowIndex: ${result4.rowIndex}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: agregarCategoria()
  // ═══════════════════════════════════════════════════════════════════════

  function testAgregarCategoria() {
    console.log('\n🧪 PRUEBAS: agregarCategoria()');
    console.log('-'.repeat(50));

    let result = agregarCategoria({ nombre: 'Electrónicos' });
    TestRunner.assert(
      result.status === 'success',
      'Categoría válida retorna success',
      `Status: ${result.status}`
    );

    result = agregarCategoria(null);
    TestRunner.assert(
      result.status === 'error' && result.message.includes('No se recibieron datos'),
      'Sin datos retorna error',
      `Mensaje: ${result.message}`
    );

    result = agregarCategoria({ nombre: '' });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('requerido'),
      'Nombre vacío retorna error',
      `Mensaje: ${result.message}`
    );

    result = agregarCategoria({ nombre: '  Test  ' });
    TestRunner.assert(
      result.status === 'success',
      'Nombre con espacios se procesa correctamente',
      `Status: ${result.status}`
    );

    result = agregarCategoria({});
    TestRunner.assert(
      result.status === 'error' && result.message.includes('requerido'),
      'Objeto sin nombre retorna error',
      `Mensaje: ${result.message}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: agregarProducto()
  // ═══════════════════════════════════════════════════════════════════════

  function testAgregarProducto() {
    console.log('\n🧪 PRUEBAS: agregarProducto()');
    console.log('-'.repeat(50));

    let result = agregarProducto({
      nombre: 'Nuevo Producto',
      codigo: 'NUE001',
      categoria: 'Test',
      precio_compra: 1000,
      precio_venta: 2000
    });
    TestRunner.assert(
      result.status === 'success',
      'Producto válido retorna success',
      `Status: ${result.status}`
    );

    result = agregarProducto(null);
    TestRunner.assert(
      result.status === 'error' && result.message.includes('No se recibieron datos'),
      'Sin datos retorna error',
      `Mensaje: ${result.message}`
    );

    result = agregarProducto({ nombre: '', codigo: 'C001', categoria: 'A' });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('nombre'),
      'Sin nombre retorna error',
      `Mensaje: ${result.message}`
    );

    result = agregarProducto({ nombre: 'Test', codigo: '', categoria: 'A' });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('código'),
      'Sin código retorna error',
      `Mensaje: ${result.message}`
    );

    result = agregarProducto({ nombre: 'Test', codigo: 'C002', categoria: '' });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('categoría'),
      'Sin categoría retorna error',
      `Mensaje: ${result.message}`
    );

    result = agregarProducto({ nombre: 'Test', codigo: 'LAP001', categoria: 'A' });
    TestRunner.assert(
      result.status === 'warning' && result.message.includes('Ya existe'),
      'Código duplicado retorna warning',
      `Mensaje: ${result.message}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: buscarProducto()
  // ═══════════════════════════════════════════════════════════════════════

  function testBuscarProducto() {
    console.log('\n🧪 PRUEBAS: buscarProducto()');
    console.log('-'.repeat(50));

    let result = buscarProducto('id-PROD-001');
    TestRunner.assert(
      result.status === 'success' && result.data.length > 0 && result.data[0].nombre === 'Laptop HP 15',
      'Encuentra por ID',
      `Resultados: ${result.data.length}`
    );

    result = buscarProducto('laptop');
    TestRunner.assert(
      result.status === 'success' && result.data.length > 0,
      'Encuentra por nombre parcial (case insensitive)',
      `Resultados: ${result.data.length}`
    );

    result = buscarProducto('');
    TestRunner.assert(
      result.status === 'warning' && result.message.includes('Especifique'),
      'Query vacío retorna warning',
      `Mensaje: ${result.message}`
    );

    result = buscarProducto('xyz999noexiste');
    TestRunner.assert(
      result.status === 'warning' && result.message.includes('no encontrado'),
      'Producto no encontrado retorna warning',
      `Mensaje: ${result.message}`
    );

    result = buscarProducto('001');
    TestRunner.assert(
      result.status === 'success' && result.data.length >= 2,
      'Retorna múltiples coincidencias',
      `Resultados: ${result.data.length}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: registrarVentaPOS()
  // ═══════════════════════════════════════════════════════════════════════

  function testRegistrarVentaPOS() {
    console.log('\n🧪 PRUEBAS: registrarVentaPOS()');
    console.log('-'.repeat(50));

    let result = registrarVentaPOS(null);
    TestRunner.assert(
      result.status === 'error' && result.message.includes('No se recibieron datos'),
      'Sin datos retorna error',
      `Mensaje: ${result.message}`
    );

    result = registrarVentaPOS({ items: [] });
    TestRunner.assert(
      result.status === 'warning' && result.message.includes('No hay productos'),
      'Sin items retorna warning',
      `Mensaje: ${result.message}`
    );

    result = registrarVentaPOS({ items: [{ cantidad: 1, precio: 1000 }] });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('incompleto'),
      'Item sin producto_id retorna error',
      `Mensaje: ${result.message}`
    );

    result = registrarVentaPOS({ items: [{ producto_id: 'id-1', cantidad: 0, precio: 1000 }] });
    TestRunner.assert(
      result.status === 'error' && (result.message.includes('incompleto') || result.message.includes('cantidad debe ser mayor')),
      'Cantidad 0 retorna error',
      `Mensaje: ${result.message}`
    );

    result = registrarVentaPOS({ items: [{ producto_id: 'id-1', cantidad: 1, precio: -100 }] });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('precio no puede ser negativo'),
      'Precio negativo retorna error',
      `Mensaje: ${result.message}`
    );

    result = registrarVentaPOS({ 
      items: [{ producto_id: 'id-PROD-001', cantidad: 5, precio: 1200000 }],
      cliente: 'Test Client',
      metodoPago: 'efectivo'
    });
    TestRunner.assert(
      result.status === 'success',
      'Venta válida retorna success',
      `ID: ${result.id_venta}`
    );

    result = registrarVentaPOS({ 
      items: [{ producto_id: 'id-PROD-001', cantidad: 100, precio: 1200000 }]
    });
    TestRunner.assert(
      result.status === 'warning' && result.message.includes('Stock insuficiente'),
      'Stock insuficiente retorna warning',
      `Mensaje: ${result.message}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: registrarCompraPOS()
  // ═══════════════════════════════════════════════════════════════════════

  function testRegistrarCompraPOS() {
    console.log('\n🧪 PRUEBAS: registrarCompraPOS()');
    console.log('-'.repeat(50));

    let result = registrarCompraPOS(null);
    TestRunner.assert(
      result.status === 'error' && result.message.includes('No se recibieron datos'),
      'Sin datos retorna error',
      `Mensaje: ${result.message}`
    );

    result = registrarCompraPOS({ items: [] });
    TestRunner.assert(
      result.status === 'warning' && result.message.includes('No hay productos'),
      'Sin items retorna warning',
      `Mensaje: ${result.message}`
    );

    result = registrarCompraPOS({ items: [{ cantidad: 1 }] });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('incompleto'),
      'Item incompleto retorna error',
      `Mensaje: ${result.message}`
    );

    result = registrarCompraPOS({ items: [{ producto_id: 'id-PROD-001', cantidad: -5, precio: 1000 }] });
    TestRunner.assert(
      result.status === 'error' && result.message.includes('cantidad debe ser mayor'),
      'Cantidad negativa retorna error',
      `Mensaje: ${result.message}`
    );

    result = registrarCompraPOS({ 
      items: [{ producto_id: 'id-PROD-001', cantidad: 10, precio: 800000 }],
      proveedor: 'Test Proveedor',
      metodoPago: 'efectivo'
    });
    TestRunner.assert(
      result.status === 'success',
      'Compra válida retorna success',
      `ID: ${result.compraId}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: getData()
  // ═══════════════════════════════════════════════════════════════════════

  function testGetData() {
    console.log('\n🧪 PRUEBAS: getData()');
    console.log('-'.repeat(50));

    let result = getData('Productos');
    TestRunner.assert(
      result.status === 'success' && result.data.length > 0,
      'Retorna datos de Productos',
      `Registros: ${result.data.length}`
    );

    result = getData('Categorias');
    TestRunner.assert(
      result.status === 'success',
      'Retorna datos de Categorias',
      `Registros: ${result.data.length}`
    );

    result = getData('HojaInexistente');
    TestRunner.assert(
      result.status === 'error',
      'Hoja inexistente retorna error',
      `Status: ${result.status}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: getVentaDetalle()
  // ═══════════════════════════════════════════════════════════════════════

  function testGetVentaDetalle() {
    console.log('\n🧪 PRUEBAS: getVentaDetalle()');
    console.log('-'.repeat(50));

    const ventaResult = registrarVentaPOS({ 
      items: [{ producto_id: 'id-PROD-001', cantidad: 2, precio: 1200000 }],
      cliente: 'Test Client'
    });
    
    const idVenta = ventaResult.id_venta;

    let result = getVentaDetalle(idVenta);
    TestRunner.assert(
      result.status === 'success' && result.venta,
      'Venta encontrada retorna success',
      `ID: ${result.venta.id_venta}`
    );

    result = getVentaDetalle('V-INVALID');
    TestRunner.assert(
      result.status === 'error' && result.message.includes('no encontrada'),
      'Venta inexistente retorna error',
      `Mensaje: ${result.message}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 EJECUTOR PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  function runUnitTests() {
    console.clear();
    TestRunner.reset();
    
    console.log('🚀 INICIANDO PRUEBAS UNITARIAS (CON MOCKS)');
    console.log('='.repeat(60));
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    testGenerateUniqueAppId();
    testGetColumnIndex();
    testFindProductById();
    testAgregarCategoria();
    testAgregarProducto();
    testBuscarProducto();
    testRegistrarVentaPOS();
    testRegistrarCompraPOS();
    testGetData();
    testGetVentaDetalle();

    const summary = TestRunner.summary();
    
    return {
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      results: TestRunner.results
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📤 EXPORTAR AL GLOBAL
  // ═══════════════════════════════════════════════════════════════════════

  globalScope.runUnitTests = runUnitTests;
  globalScope.TestRunner = TestRunner;

  console.log('✅ Pruebas unitarias cargadas con MOCKS.');
  console.log('📝 Ejecuta: runUnitTests() o runOnlyUnitTests()');

})();

function runOnlyUnitTests() {
  return runUnitTests();
}
