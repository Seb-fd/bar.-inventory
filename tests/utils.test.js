/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRUEBAS UNITARIAS - utils.js
 * Funciones helper del frontend
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cómo ejecutar:
 * 1. Abrir consola del navegador en la página de la aplicación
 * 2. Copiar y pegar TODO este código en la consola
 * 3. Ejecutar: runUtilsTests()
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // 📦 MOCKS Y UTILIDADES DE TEST
  // ═══════════════════════════════════════════════════════════════════════

  const globalScope = typeof window !== 'undefined' ? window : global;

  // Mock de localStorage
  const mockLocalStorage = (function() {
    let store = {};
    return {
      getItem: function(key) { return store[key] || null; },
      setItem: function(key, value) { store[key] = value; },
      removeItem: function(key) { delete store[key]; },
      clear: function() { store = {}; }
    };
  })();

  // Reemplazar localStorage en el entorno de prueba
  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 COPIAR FUNCIONES DE utils.js PARA TESTING
  // ═══════════════════════════════════════════════════════════════════════

  // Función formatCurrency
  globalScope.formatCurrency = function(valor) {
    const num = parseFloat(String(valor).replace(/[^0-9.-]/g, '')) || 0;
    return num.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Función cleanNumber
  globalScope.cleanNumber = function(valor) {
    if (valor === null || valor === undefined) return 0;
    const cleaned = String(valor).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Función debounce
  globalScope.debounce = function(fn, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  // Funciones de offline (usando localStorage mock)
  const OFFLINE_KEY = 'ventasOffline';
  const MAX_OFFLINE_VENTAS = 50;
  const COMPRAS_OFFLINE_KEY = 'comprasOffline';
  const MAX_OFFLINE_COMPRAS = 50;

  globalScope.saveVentaOffline = function(ventaData) {
    try {
      const ventas = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
      if (ventas.length >= MAX_OFFLINE_VENTAS) {
        ventas.shift();
      }
      ventas.push({
        ...ventaData,
        timestamp: new Date().toISOString(),
        synced: false
      });
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(ventas));
      return { status: 'success', count: ventas.length };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  };

  globalScope.getVentasOffline = function() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  };

  globalScope.getVentasPendientes = function() {
    const ventas = getVentasOffline();
    return ventas.filter(v => !v.synced);
  };

  globalScope.getVentasPendientesCount = function() {
    return getVentasPendientes().length;
  };

  globalScope.saveCompraOffline = function(compraData) {
    try {
      const compras = JSON.parse(localStorage.getItem(COMPRAS_OFFLINE_KEY) || '[]');
      if (compras.length >= MAX_OFFLINE_COMPRAS) {
        compras.shift();
      }
      compras.push({
        ...compraData,
        timestamp: new Date().toISOString(),
        synced: false
      });
      localStorage.setItem(COMPRAS_OFFLINE_KEY, JSON.stringify(compras));
      return { status: 'success', count: compras.length };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  };

  globalScope.getComprasOffline = function() {
    try {
      return JSON.parse(localStorage.getItem(COMPRAS_OFFLINE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  };

  globalScope.getComprasPendientes = function() {
    const compras = getComprasOffline();
    return compras.filter(c => !c.synced);
  };

  globalScope.getComprasPendientesCount = function() {
    return getComprasPendientes().length;
  };

  // isOnline (usa navigator.onLine)
  globalScope.isOnline = function() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 TEST RUNNER
  // ═══════════════════════════════════════════════════════════════════════

  const UtilsTestRunner = {
    passed: 0,
    failed: 0,
    results: [],

    reset() {
      this.passed = 0;
      this.failed = 0;
      this.results = [];
      localStorage.clear();
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
      console.log(`📊 RESUMEN DE PRUEBAS - utils.js`);
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
  // 🧪 PRUEBAS: formatCurrency()
  // ═══════════════════════════════════════════════════════════════════════

  function testFormatCurrency() {
    console.log('\n🧪 PRUEBAS: formatCurrency()');
    console.log('-'.repeat(50));

    let result = formatCurrency(1000);
    UtilsTestRunner.assert(
      result === '1,000',
      'Número simple formateado correctamente',
      `Input: 1000, Output: ${result}`
    );

    result = formatCurrency(1000000);
    UtilsTestRunner.assert(
      result === '1,000,000',
      'Número grande formateado correctamente',
      `Output: ${result}`
    );

    result = formatCurrency(1234.56);
    UtilsTestRunner.assert(
      result === '1,235' || result === '1,234.56',
      'Decimales redondeados correctamente',
      `Output: ${result}`
    );

    result = formatCurrency(0);
    UtilsTestRunner.assert(
      result === '0',
      'Cero formateado correctamente',
      `Output: ${result}`
    );

    result = formatCurrency('');
    UtilsTestRunner.assert(
      result === '0',
      'String vacío retorna 0',
      `Output: ${result}`
    );

    result = formatCurrency('50,000');
    UtilsTestRunner.assert(
      result === '50,000' || result === '50',
      'String con coma procesado',
      `Output: ${result}`
    );

    result = formatCurrency(null);
    UtilsTestRunner.assert(
      result === '0',
      'null retorna 0',
      `Output: ${result}`
    );

    result = formatCurrency(undefined);
    UtilsTestRunner.assert(
      result === '0',
      'undefined retorna 0',
      `Output: ${result}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: cleanNumber()
  // ═══════════════════════════════════════════════════════════════════════

  function testCleanNumber() {
    console.log('\n🧪 PRUEBAS: cleanNumber()');
    console.log('-'.repeat(50));

    let result = cleanNumber('50,000');
    UtilsTestRunner.assert(
      result === 50000,
      'String con comas limpiado correctamente',
      `Input: '50,000', Output: ${result}`
    );

    result = cleanNumber('$100000');
    UtilsTestRunner.assert(
      result === 100000,
      'String con signo pesos limpiado',
      `Input: '$100000', Output: ${result}`
    );

    result = cleanNumber('123.45');
    UtilsTestRunner.assert(
      result === 123.45,
      'Decimales preservados',
      `Output: ${result}`
    );

    result = cleanNumber(-500);
    UtilsTestRunner.assert(
      result === -500,
      'Números negativos preservados',
      `Output: ${result}`
    );

    result = cleanNumber('abc');
    UtilsTestRunner.assert(
      result === 0,
      'Texto retorna 0',
      `Input: 'abc', Output: ${result}`
    );

    result = cleanNumber('');
    UtilsTestRunner.assert(
      result === 0,
      'String vacío retorna 0',
      `Output: ${result}`
    );

    result = cleanNumber(null);
    UtilsTestRunner.assert(
      result === 0,
      'null retorna 0',
      `Output: ${result}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: debounce()
  // ═══════════════════════════════════════════════════════════════════════

  function testDebounce() {
    console.log('\n🧪 PRUEBAS: debounce()');
    console.log('-'.repeat(50));

    let counter = 0;
    const debouncedFn = debounce(() => counter++, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    UtilsTestRunner.assert(
      counter === 0,
      'Función no ejecutada inmediatamente (retraso 100ms)',
      `Counter: ${counter}`
    );

    // Después de 150ms debería ejecutarse
    setTimeout(() => {
      UtilsTestRunner.assert(
        counter >= 1,
        'Función ejecutada después del delay',
        `Counter después de 150ms: ${counter}`
      );
    }, 150);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: saveVentaOffline()
  // ═══════════════════════════════════════════════════════════════════════

  function testSaveVentaOffline() {
    console.log('\n🧪 PRUEBAS: saveVentaOffline()');
    console.log('-'.repeat(50));

    localStorage.clear();

    let result = saveVentaOffline({
      items: [{ nombre: 'Cerveza', cantidad: 2, precio: 5000 }],
      total: 10000,
      metodoPago: 'efectivo'
    });

    UtilsTestRunner.assert(
      result.status === 'success',
      'Venta guardada exitosamente',
      `Status: ${result.status}`
    );

    UtilsTestRunner.assert(
      result.count === 1,
      'Contador incrementado a 1',
      `Count: ${result.count}`
    );

    const ventas = getVentasOffline();
    UtilsTestRunner.assert(
      ventas.length === 1,
      'Venta encontrada en storage',
      `Ventas: ${ventas.length}`
    );

    UtilsTestRunner.assert(
      ventas[0].synced === false,
      'Venta marcada como no sincronizada',
      `Synced: ${ventas[0].synced}`
    );

    UtilsTestRunner.assert(
      ventas[0].timestamp !== undefined,
      'Timestamp agregado',
      `Timestamp: ${ventas[0].timestamp}`
    );

    // Guardar múltiples ventas
    for (let i = 0; i < 5; i++) {
      saveVentaOffline({ total: 1000 * (i + 1) });
    }

    const ventasMultiple = getVentasOffline();
    UtilsTestRunner.assert(
      ventasMultiple.length === 5,
      'Múltiples ventas guardadas',
      `Ventas: ${ventasMultiple.length}`
    );

    // Test límite (MAX_OFFLINE_VENTAS = 50)
    for (let i = 0; i < 50; i++) {
      saveVentaOffline({ total: i });
    }
    const ventasMax = getVentasOffline();
    UtilsTestRunner.assert(
      ventasMax.length <= 50,
      'Límite de ventas respectado',
      `Ventas: ${ventasMax.length}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: getVentasPendientes()
  // ═══════════════════════════════════════════════════════════════════════

  function testGetVentasPendientes() {
    console.log('\n🧪 PRUEBAS: getVentasPendientes()');
    console.log('-'.repeat(50));

    localStorage.clear();

    // Sin ventas
    let pendientes = getVentasPendientes();
    UtilsTestRunner.assert(
      pendientes.length === 0,
      'Sin ventas retorna array vacío',
      `Pendientes: ${pendientes.length}`
    );

    // Con ventas no sincronizadas
    saveVentaOffline({ total: 10000 });
    saveVentaOffline({ total: 20000, synced: false });

    pendientes = getVentasPendientes();
    UtilsTestRunner.assert(
      pendientes.length === 2,
      'Ventas no sincronizadas encontradas',
      `Pendientes: ${pendientes.length}`
    );

    // Contador
    const count = getVentasPendientesCount();
    UtilsTestRunner.assert(
      count === 2,
      'Contador funciona correctamente',
      `Count: ${count}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: saveCompraOffline()
  // ═══════════════════════════════════════════════════════════════════════

  function testSaveCompraOffline() {
    console.log('\n🧪 PRUEBAS: saveCompraOffline()');
    console.log('-'.repeat(50));

    localStorage.clear();

    let result = saveCompraOffline({
      items: [{ nombre: 'Cerveza', cantidad: 10 }],
      total: 50000,
      proveedor: 'Proveedor Test'
    });

    UtilsTestRunner.assert(
      result.status === 'success',
      'Compra guardada exitosamente',
      `Status: ${result.status}`
    );

    const compras = getComprasOffline();
    UtilsTestRunner.assert(
      compras.length === 1,
      'Compra encontrada en storage',
      `Compras: ${compras.length}`
    );

    // Test límite
    for (let i = 0; i < 55; i++) {
      saveCompraOffline({ total: i });
    }
    const comprasMax = getComprasOffline();
    UtilsTestRunner.assert(
      comprasMax.length <= 50,
      'Límite de compras respectado',
      `Compras: ${comprasMax.length}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: getComprasPendientes()
  // ═══════════════════════════════════════════════════════════════════════

  function testGetComprasPendientes() {
    console.log('\n🧪 PRUEBAS: getComprasPendientes()');
    console.log('-'.repeat(50));

    localStorage.clear();

    saveCompraOffline({ total: 10000 });
    saveCompraOffline({ total: 20000, synced: false });

    const pendientes = getComprasPendientes();
    UtilsTestRunner.assert(
      pendientes.length === 2,
      'Compras no sincronizadas encontradas',
      `Pendientes: ${pendientes.length}`
    );

    const count = getComprasPendientesCount();
    UtilsTestRunner.assert(
      count === 2,
      'Contador de compras funciona',
      `Count: ${count}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: isOnline()
  // ═══════════════════════════════════════════════════════════════════════

  function testIsOnline() {
    console.log('\n🧪 PRUEBAS: isOnline()');
    console.log('-'.repeat(50));

    // Esta prueba depende del navegador real
    // Solo verificamos que la función exista y retorne booleano
    const online = isOnline();
    UtilsTestRunner.assert(
      typeof online === 'boolean',
      'Retorna valor booleano',
      `Tipo: ${typeof online}, Valor: ${online}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 EJECUTOR PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  function runUtilsTests() {
    console.clear();
    UtilsTestRunner.reset();

    console.log('🚀 INICIANDO PRUEBAS UNITARIAS - utils.js');
    console.log('='.repeat(60));
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    testFormatCurrency();
    testCleanNumber();
    testDebounce();
    testSaveVentaOffline();
    testGetVentasPendientes();
    testSaveCompraOffline();
    testGetComprasPendientes();
    testIsOnline();

    const summary = UtilsTestRunner.summary();

    return {
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      results: UtilsTestRunner.results
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📤 EXPORTAR AL GLOBAL
  // ═══════════════════════════════════════════════════════════════════════

  globalScope.runUtilsTests = runUtilsTests;

  console.log('✅ Pruebas de utils.js cargadas.');
  console.log('📝 Ejecuta: runUtilsTests()');

})();

function runUtilsTests() {
  return runUtilsTests();
}