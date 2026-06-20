/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRUEBAS UNITARIAS - script.js (Funciones del Frontend)
 * Funciones core del sistema
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cómo ejecutar:
 * 1. Abrir consola del navegador en la página de la aplicación
 * 2. Copiar y pegar TODO este código en la consola
 * 3. Ejecutar: runFrontendTests()
 */

(function() {
  'use strict';

  const globalScope = typeof window !== 'undefined' ? window : global;

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 COPIAR FUNCIONES DE script.js PARA TESTING (SIN DEPENDENCIAS DOM)
  // ═══════════════════════════════════════════════════════════════════════

  // Función filterByDate
  globalScope.filterByDate = function(data, fechaInicio, fechaFin, dateField) {
    if (!fechaInicio && !fechaFin) return data;

    return data.filter((item) => {
      if (!item[dateField]) return false;
      const itemDate = new Date(item[dateField]);
      const fechaIni = fechaInicio ? new Date(fechaInicio) : null;
      const fechaFn = fechaFin ? new Date(fechaFin) : null;

      if (fechaFn) fechaFn.setHours(23, 59, 59, 999);

      if (fechaIni && fechaFn) return itemDate >= fechaIni && itemDate <= fechaFn;
      else if (fechaIni) return itemDate >= fechaIni;
      else if (fechaFn) return itemDate <= fechaFn;
      return true;
    });
  };

  // Función formatearCOP
  globalScope.formatearCOP = function(numero) {
    if (numero === null || numero === undefined) return '0';
    return Math.round(numero).toLocaleString('es-CO');
  };

  // Función limpiarNumero
  globalScope.limpiarNumero = function(valor) {
    if (!valor) return 0;
    const limpio = String(valor).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(limpio);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Función generarIDUnico
  globalScope.generarIDUnico = function(prefijo = 'ID') {
    return prefijo + '-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Mock de inventario para pruebas
  let mockInventario = [
    { id: 'PROD-001', nombre: 'Vodka Smirnoff', código: 'VOD001', categoría: 'Vodka', precio_compra: 45000, precio_venta: 80000, stock: 10 },
    { id: 'PROD-002', nombre: 'Ron Havana Club', código: 'RON001', categoría: 'Ron', precio_compra: 55000, precio_venta: 90000, stock: 5 },
    { id: 'PROD-003', nombre: 'Whisky Jack Daniels', código: 'WHS001', categoría: 'Whisky', precio_compra: 120000, precio_venta: 200000, stock: 3 },
    { id: 'PROD-004', nombre: 'Tequila Don Julio', código: 'TEQ001', categoría: 'Tequila', precio_compra: 180000, precio_venta: 280000, stock: 0 },
    { id: 'PROD-005', nombre: 'Ginebra Tanqueray', código: 'GIN001', categoría: 'Ginebra', precio_compra: 90000, precio_venta: 150000, stock: 8 }
  ];

  // Función filtrarInventarioData (lógica sin DOM)
  globalScope.filtrarInventarioData = function(inventario, filtroTexto, filtroCategoria, orden) {
    let resultado = [...inventario];

    // Filtro por texto
    if (filtroTexto && filtroTexto.trim() !== '') {
      const texto = filtroTexto.toLowerCase();
      resultado = resultado.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.código && p.código.toLowerCase().includes(texto))
      );
    }

    // Filtro por categoría
    if (filtroCategoria && filtroCategoria !== '') {
      resultado = resultado.filter(p => p.categoría === filtroCategoria);
    }

    // Ordenar
    if (orden) {
      switch (orden) {
        case 'nombre-asc':
          resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
          break;
        case 'nombre-desc':
          resultado.sort((a, b) => b.nombre.localeCompare(a.nombre));
          break;
        case 'stock-asc':
          resultado.sort((a, b) => a.stock - b.stock);
          break;
        case 'stock-desc':
          resultado.sort((a, b) => b.stock - a.stock);
          break;
      }
    }

    return resultado;
  };

  // Función calcularTotalCarrito
  globalScope.calcularTotalCarrito = function(items, descuentoGlobal = 0) {
    if (!items || items.length === 0) return 0;

    let subtotal = items.reduce((sum, item) => {
      const precio = parseFloat(item.precio) || 0;
      const cantidad = parseInt(item.cantidad) || 0;
      return sum + (precio * cantidad);
    }, 0);

    const descuento = subtotal * (descuentoGlobal / 100);
    return subtotal - descuento;
  };

  // Función validarItemsCarrito
  globalScope.validarItemsCarrito = function(items) {
    if (!items || items.length === 0) {
      return { valido: false, mensaje: 'El carrito está vacío' };
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.producto_id && !item.nombre) {
        return { valido: false, mensaje: `Item ${i + 1}: producto no especificado` };
      }
      if (!item.cantidad || item.cantidad <= 0) {
        return { valido: false, mensaje: `Item ${i + 1}: cantidad inválida` };
      }
      if (!item.precio || item.precio < 0) {
        return { valido: false, mensaje: `Item ${i + 1}: precio inválido` };
      }
    }

    return { valido: true, mensaje: 'Carrito válido' };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 TEST RUNNER
  // ═══════════════════════════════════════════════════════════════════════

  const FrontendTestRunner = {
    passed: 0,
    failed: 0,
    results: [],

    reset() {
      this.passed = 0;
      this.failed = 0;
      this.results = [];
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
      console.log(`📊 RESUMEN DE PRUEBAS - script.js (Frontend)`);
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
  // 🧪 PRUEBAS: filterByDate()
  // ═══════════════════════════════════════════════════════════════════════

  function testFilterByDate() {
    console.log('\n🧪 PRUEBAS: filterByDate()');
    console.log('-'.repeat(50));

    const datos = [
      { fecha: '2024-01-01', valor: 100 },
      { fecha: '2024-01-15', valor: 200 },
      { fecha: '2024-02-01', valor: 300 },
      { fecha: '2024-02-15', valor: 400 }
    ];

    // Sin filtros
    let result = filterByDate(datos, null, null, 'fecha');
    FrontendTestRunner.assert(
      result.length === 4,
      'Sin filtros retorna todos los datos',
      `Resultados: ${result.length}`
    );

    // Filtrar por fecha inicio
    result = filterByDate(datos, '2024-01-15', null, 'fecha');
    FrontendTestRunner.assert(
      result.length === 3,
      'Filtro solo fecha inicio funciona',
      `Resultados: ${result.length}`
    );

    // Filtrar por fecha fin
    result = filterByDate(datos, null, '2024-01-31', 'fecha');
    FrontendTestRunner.assert(
      result.length === 2,
      'Filtro solo fecha fin funciona',
      `Resultados: ${result.length}`
    );

    // Filtrar rango completo
    result = filterByDate(datos, '2024-01-10', '2024-02-10', 'fecha');
    FrontendTestRunner.assert(
      result.length === 2,
      'Filtro rango completo funciona',
      `Resultados: ${result.length}`
    );

    // Fechas fuera de rango
    result = filterByDate(datos, '2024-03-01', '2024-03-31', 'fecha');
    FrontendTestRunner.assert(
      result.length === 0,
      'Sin datos en rango retorna array vacío',
      `Resultados: ${result.length}`
    );

    // useBusinessDate=false mantiene comportamiento original (backward compat)
    result = filterByDate(datos, '2024-01-15', null, 'fecha', false);
    FrontendTestRunner.assert(
      result.length === 3,
      'useBusinessDate=false mantiene backward compatibility',
      `Resultados: ${result.length}`
    );
  }

  function testFilterByDateBusinessDate() {
    console.log('\n🧪 PRUEBAS: filterByDate() con useBusinessDate=true');
    console.log('-'.repeat(50));

    // Fechas con timestamp: 2AM del día siguiente pertenece al negocio del día anterior
    const datos = [
      { fecha: '2024-06-20T18:00:00', valor: 100 },  // 6PM Jun 20 -> negocio Jun 20
      { fecha: '2024-06-21T02:00:00', valor: 200 },  // 2AM Jun 21 -> negocio Jun 20
      { fecha: '2024-06-21T17:00:00', valor: 300 },  // 5PM Jun 21 -> negocio Jun 21
      { fecha: '2024-06-22T01:00:00', valor: 400 },  // 1AM Jun 22 -> negocio Jun 21
    ];

    // Filtrar por negocio Jun 20 (debe incluir items 0 y 1)
    let result = filterByDate(datos, '2024-06-20', '2024-06-20', 'fecha', true);
    FrontendTestRunner.assert(
      result.length === 2,
      'useBusinessDate=true: negocio Jun 20 incluye 6PM y 2AM',
      `Resultados: ${result.length}`
    );

    // Filtrar por negocio Jun 21 (debe incluir items 2 y 3)
    result = filterByDate(datos, '2024-06-21', '2024-06-21', 'fecha', true);
    FrontendTestRunner.assert(
      result.length === 2,
      'useBusinessDate=true: negocio Jun 21 incluye 5PM y 1AM siguiente',
      `Resultados: ${result.length}`
    );

    // useBusinessDate=false usa fecha calendario (extrae YYYY-MM-DD sin conversión)
    const datosCal = [
      { fecha: '2024-06-20', valor: 100 },
      { fecha: '2024-06-21', valor: 200 },
    ];
    result = filterByDate(datosCal, '2024-06-20', '2024-06-20', 'fecha', false);
    FrontendTestRunner.assert(
      result.length === 1,
      'useBusinessDate=false: calendario Jun 20 solo coincide con Jun 20',
      `Resultados: ${result.length}`
    );
  }

  function testToBusinessDateISO() {
    console.log('\n🧪 PRUEBAS: toBusinessDateISO()');
    console.log('-'.repeat(50));

    // 6PM -> mismo día
    let bd = toBusinessDateISO('2024-06-20T18:00:00');
    FrontendTestRunner.assert(
      bd === '2024-06-20',
      '6PM pertenece al mismo día',
      `Resultado: ${bd}`
    );

    // 2AM -> día anterior
    bd = toBusinessDateISO('2024-06-21T02:00:00');
    FrontendTestRunner.assert(
      bd === '2024-06-20',
      '2AM pertenece al día anterior',
      `Resultado: ${bd}`
    );

    // 4:59AM -> día anterior
    bd = toBusinessDateISO('2024-06-21T04:59:00');
    FrontendTestRunner.assert(
      bd === '2024-06-20',
      '4:59AM pertenece al día anterior',
      `Resultado: ${bd}`
    );

    // 5PM -> mismo día
    bd = toBusinessDateISO('2024-06-20T17:00:00');
    FrontendTestRunner.assert(
      bd === '2024-06-20',
      '5PM pertenece al mismo día',
      `Resultado: ${bd}`
    );

    // Sin argumento (hoy) - solo verificar que retorna string no vacío
    bd = toBusinessDateISO();
    FrontendTestRunner.assert(
      typeof bd === 'string' && bd.length === 10,
      'toBusinessDateISO() sin args retorna YYYY-MM-DD',
      `Resultado: ${bd}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: formatearCOP()
  // ═══════════════════════════════════════════════════════════════════════

  function testFormatearCOP() {
    console.log('\n🧪 PRUEBAS: formatearCOP()');
    console.log('-'.repeat(50));

    let result = formatearCOP(1000);
    FrontendTestRunner.assert(
      result === '1,000',
      'Número simple formateado',
      `Output: ${result}`
    );

    result = formatearCOP(1000000);
    FrontendTestRunner.assert(
      result === '1,000,000',
      'Número grande formateado',
      `Output: ${result}`
    );

    result = formatearCOP(1234.56);
    FrontendTestRunner.assert(
      result === '1,235',
      'Decimal redondeado',
      `Output: ${result}`
    );

    result = formatearCOP(0);
    FrontendTestRunner.assert(
      result === '0',
      'Cero formateado',
      `Output: ${result}`
    );

    result = formatearCOP(null);
    FrontendTestRunner.assert(
      result === '0',
      'null retorna 0',
      `Output: ${result}`
    );

    result = formatearCOP(undefined);
    FrontendTestRunner.assert(
      result === '0',
      'undefined retorna 0',
      `Output: ${result}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: limpiarNumero()
  // ═══════════════════════════════════════════════════════════════════════

  function testLimpiarNumero() {
    console.log('\n🧪 PRUEBAS: limpiarNumero()');
    console.log('-'.repeat(50));

    let result = limpiarNumero('50,000');
    FrontendTestRunner.assert(
      result === 50000,
      'String con comas limpiado',
      `Input: '50,000', Output: ${result}`
    );

    result = limpiarNumero('$100,000');
    FrontendTestRunner.assert(
      result === 100000,
      'Signo pesos eliminado',
      `Output: ${result}`
    );

    result = limpiarNumero(123.45);
    FrontendTestRunner.assert(
      result === 123.45,
      'Número preservado',
      `Output: ${result}`
    );

    result = limpiarNumero('');
    FrontendTestRunner.assert(
      result === 0,
      'String vacío retorna 0',
      `Output: ${result}`
    );

    result = limpiarNumero(null);
    FrontendTestRunner.assert(
      result === 0,
      'null retorna 0',
      `Output: ${result}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: generarIDUnico()
  // ═══════════════════════════════════════════════════════════════════════

  function testGenerarIDUnico() {
    console.log('\n🧪 PRUEBAS: generarIDUnico()');
    console.log('-'.repeat(50));

    let id = generarIDUnico();
    FrontendTestRunner.assert(
      id.startsWith('ID-'),
      'Genera ID con prefijo por defecto',
      `ID: ${id}`
    );

    id = generarIDUnico('VENTA');
    FrontendTestRunner.assert(
      id.startsWith('VENTA-'),
      'Genera ID con prefijo personalizado',
      `ID: ${id}`
    );

    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generarIDUnico());
    }
    FrontendTestRunner.assert(
      ids.size === 100,
      'Genera 100 IDs únicos',
      `Únicos: ${ids.size}/100`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: filtrarInventarioData()
  // ═══════════════════════════════════════════════════════════════════════

  function testFiltrarInventarioData() {
    console.log('\n🧪 PRUEBAS: filtrarInventarioData()');
    console.log('-'.repeat(50));

    // Sin filtros
    let result = filtrarInventarioData(mockInventario, '', '', '');
    FrontendTestRunner.assert(
      result.length === 5,
      'Sin filtros retorna todos los productos',
      `Resultados: ${result.length}`
    );

    // Filtro por texto (nombre)
    result = filtrarInventarioData(mockInventario, 'vodka', '', '');
    FrontendTestRunner.assert(
      result.length === 1 && result[0].nombre === 'Vodka Smirnoff',
      'Filtro por nombre funciona',
      `Resultados: ${result.length}`
    );

    // Filtro por texto (código)
    result = filtrarInventarioData(mockInventario, 'RON', '', '');
    FrontendTestRunner.assert(
      result.length === 1 && result[0].código === 'RON001',
      'Filtro por código funciona',
      `Resultados: ${result.length}`
    );

    // Filtro por categoría
    result = filtrarInventarioData(mockInventario, '', 'Vodka', '');
    FrontendTestRunner.assert(
      result.length === 1,
      'Filtro por categoría funciona',
      `Resultados: ${result.length}`
    );

    // Filtro combinado
    result = filtrarInventarioData(mockInventario, 'vod', 'Vodka', '');
    FrontendTestRunner.assert(
      result.length === 1,
      'Filtros combinados funcionan',
      `Resultados: ${result.length}`
    );

    // Ordenar A-Z
    result = filtrarInventarioData(mockInventario, '', '', 'nombre-asc');
    FrontendTestRunner.assert(
      result[0].nombre === 'Ginebra Tanqueray',
      'Ordenar A-Z funciona',
      `Primer resultado: ${result[0].nombre}`
    );

    // Ordenar Z-A
    result = filtrarInventarioData(mockInventario, '', '', 'nombre-desc');
    FrontendTestRunner.assert(
      result[0].nombre === 'Whisky Jack Daniels',
      'Ordenar Z-A funciona',
      `Primer resultado: ${result[0].nombre}`
    );

    // Ordenar por stock
    result = filtrarInventarioData(mockInventario, '', '', 'stock-asc');
    FrontendTestRunner.assert(
      result[0].stock === 0,
      'Ordenar por stock ascendente funciona',
      `Primer resultado stock: ${result[0].stock}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: calcularTotalCarrito()
  // ═══════════════════════════════════════════════════════════════════════

  function testCalcularTotalCarrito() {
    console.log('\n🧪 PRUEBAS: calcularTotalCarrito()');
    console.log('-'.repeat(50));

    const items = [
      { precio: 10000, cantidad: 2 },
      { precio: 5000, cantidad: 3 },
      { precio: 15000, cantidad: 1 }
    ];

    let total = calcularTotalCarrito(items);
    FrontendTestRunner.assert(
      total === 45000,
      'Cálculo correcto sin descuento',
      `Total: ${total}`
    );

    // Con descuento
    total = calcularTotalCarrito(items, 10);
    FrontendTestRunner.assert(
      total === 40500,
      'Cálculo correcto con descuento 10%',
      `Total: ${total}`
    );

    // Carrito vacío
    total = calcularTotalCarrito([]);
    FrontendTestRunner.assert(
      total === 0,
      'Carrito vacío retorna 0',
      `Total: ${total}`
    );

    // Null
    total = calcularTotalCarrito(null);
    FrontendTestRunner.assert(
      total === 0,
      'Null retorna 0',
      `Total: ${total}`
    );

    // Descuento 100%
    total = calcularTotalCarrito(items, 100);
    FrontendTestRunner.assert(
      total === 0,
      'Descuento 100% retorna 0',
      `Total: ${total}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: validarItemsCarrito()
  // ═══════════════════════════════════════════════════════════════════════

  function testValidarItemsCarrito() {
    console.log('\n🧪 PRUEBAS: validarItemsCarrito()');
    console.log('-'.repeat(50));

    const itemsValidos = [
      { producto_id: 'PROD-001', cantidad: 2, precio: 10000 },
      { nombre: 'Cerveza', cantidad: 1, precio: 5000 }
    ];

    let result = validarItemsCarrito(itemsValidos);
    FrontendTestRunner.assert(
      result.valido === true,
      'Items válidos pasan validación',
      `Mensaje: ${result.mensaje}`
    );

    // Carrito vacío
    result = validarItemsCarrito([]);
    FrontendTestRunner.assert(
      result.valido === false && result.mensaje.includes('vacío'),
      'Carrito vacío rechaza validación',
      `Mensaje: ${result.mensaje}`
    );

    // Null
    result = validarItemsCarrito(null);
    FrontendTestRunner.assert(
      result.valido === false,
      'Null rechazado',
      `Mensaje: ${result.mensaje}`
    );

    // Item sin producto_id ni nombre
    const itemsInvalidos = [{ cantidad: 2, precio: 10000 }];
    result = validarItemsCarrito(itemsInvalidos);
    FrontendTestRunner.assert(
      result.valido === false && result.mensaje.includes('producto'),
      'Item sin producto rechazado',
      `Mensaje: ${result.mensaje}`
    );

    // Cantidad inválida
    const itemsCantidadInvalida = [{ producto_id: 'PROD-001', cantidad: 0, precio: 10000 }];
    result = validarItemsCarrito(itemsCantidadInvalida);
    FrontendTestRunner.assert(
      result.valido === false && result.mensaje.includes('cantidad'),
      'Cantidad 0 rechazada',
      `Mensaje: ${result.mensaje}`
    );

    // Precio negativo
    const itemsPrecioNegativo = [{ producto_id: 'PROD-001', cantidad: 2, precio: -1000 }];
    result = validarItemsCarrito(itemsPrecioNegativo);
    FrontendTestRunner.assert(
      result.valido === false && result.mensaje.includes('precio'),
      'Precio negativo rechazado',
      `Mensaje: ${result.mensaje}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 EJECUTOR PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  function runFrontendTests() {
    console.clear();
    FrontendTestRunner.reset();

    console.log('🚀 INICIANDO PRUEBAS UNITARIAS - script.js (Frontend)');
    console.log('='.repeat(60));
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    testFilterByDate();
    testFilterByDateBusinessDate();
    testToBusinessDateISO();
    testFormatearCOP();
    testLimpiarNumero();
    testGenerarIDUnico();
    testFiltrarInventarioData();
    testCalcularTotalCarrito();
    testValidarItemsCarrito();

    const summary = FrontendTestRunner.summary();

    return {
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      results: FrontendTestRunner.results
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📤 EXPORTAR AL GLOBAL
  // ═══════════════════════════════════════════════════════════════════════

  globalScope.runFrontendTests = runFrontendTests;

  console.log('✅ Pruebas de script.js (frontend) cargadas.');
  console.log('📝 Ejecuta: runFrontendTests()');

})();

function runFrontendTests() {
  return runFrontendTests();
}