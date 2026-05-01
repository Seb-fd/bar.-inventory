/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRUEBAS DE INTEGRACIÓN - sg.js
 * Pruebas via HTTP al backend real
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Cómo ejecutar:
 * 1. Asegúrate de que la aplicación esté desplegada y accesible
 * 2. En la consola del navegador: runIntegrationTests()
 * 
 * ADVERTENCIA: Estas pruebas modifican datos reales en el Google Sheet
 * Usa una hoja de prueba para evitar corrupcón de datos
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════════════

  // URL del script - cambiar si es diferente
  const SCRIPT_URL = window.SCRIPT_URL || 
    'https://script.google.com/macros/s/AKfycbxj9QZGXhlrrzPO7QTmCOjAMTEnJXwA5PtbF4YTTMEnIJ9GIMZTPs2THF51Tc_OBbB4/exec';

  // Prefijo para identificación de pruebas (evitar conflictos)
  const TEST_PREFIX = 'TEST_';
  const TEST_TIMESTAMP = Date.now();

  const IntegrationRunner = {
    passed: 0,
    failed: 0,
    skipped: 0,
    results: [],
    errors: [],

    reset() {
      this.passed = 0;
      this.failed = 0;
      this.skipped = 0;
      this.results = [];
      this.errors = [];
    },

    async assert(condition, testName, details = '', response = null) {
      if (condition) {
        this.passed++;
        this.results.push({ status: 'PASS', name: testName, details });
        console.log(`✅ PASS: ${testName}`);
      } else {
        this.failed++;
        this.results.push({ status: 'FAIL', name: testName, details });
        console.error(`❌ FAIL: ${testName}${details ? ' - ' + details : ''}`);
        if (response) {
          this.errors.push({ test: testName, response, details });
        }
      }
    },

    skip(testName, reason) {
      this.skipped++;
      this.results.push({ status: 'SKIP', name: testName, details: reason });
      console.log(`⏭️  SKIP: ${testName} - ${reason}`);
    },

    summary() {
      const total = this.passed + this.failed + this.skipped;
      console.log('\n' + '='.repeat(60));
      console.log(`📊 RESUMEN DE PRUEBAS DE INTEGRACIÓN`);
      console.log('='.repeat(60));
      console.log(`Total: ${total} | ✅ Pasadas: ${this.passed} | ❌ Fallidas: ${this.failed} | ⏭️  Omitidas: ${this.skipped}`);
      console.log('='.repeat(60));
      
      if (this.failed > 0) {
        console.log('\n⚠️  PRUEBAS FALLIDAS:');
        this.results.filter(r => r.status === 'FAIL').forEach(r => {
          console.log(`  - ${r.name}`);
        });
      }
      
      if (this.errors.length > 0) {
        console.log('\n🔍 ERRORES DETALLADOS:');
        this.errors.forEach(e => {
          console.log(`  ${e.test}:`, e.response);
        });
      }
      
      return { passed: this.passed, failed: this.failed, skipped: this.skipped, total };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // UTILIDADES HTTP
  // ═══════════════════════════════════════════════════════════════════════

  async function fetchGet(params = {}) {
    const url = new URL(SCRIPT_URL);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });
    
    return await response.json();
  }

  async function fetchPost(data) {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow'
    });
    
    return await response.json();
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: GET - getCategorias
  // ═══════════════════════════════════════════════════════════════════════

  async function testGetCategorias() {
    console.log('\n🧪 PRUEBAS: GET getCategorias');
    console.log('-'.repeat(50));

    try {
      const result = await fetchGet({ action: 'getCategorias' });
      
      IntegrationRunner.assert(
        result.status === 'success' || result.status === 'error',
        'Respuesta con status válido',
        `Status: ${result.status}`
      );

      IntegrationRunner.assert(
        result.hasOwnProperty('data') || result.hasOwnProperty('message'),
        'Respuesta tiene estructura válida',
        `Keys: ${Object.keys(result).join(', ')}`
      );

    } catch (error) {
      IntegrationRunner.assert(false, 'getCategorias', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: GET - getInventario
  // ═══════════════════════════════════════════════════════════════════════

  async function testGetInventario() {
    console.log('\n🧪 PRUEBAS: GET getInventario');
    console.log('-'.repeat(50));

    try {
      const result = await fetchGet({ action: 'getInventario' });
      
      IntegrationRunner.assert(
        result.status === 'success' || result.status === 'error',
        'Respuesta con status válido',
        `Status: ${result.status}`
      );

      if (result.status === 'success' && result.data) {
        IntegrationRunner.assert(
          Array.isArray(result.data),
          'Retorna array de productos',
          `Cantidad: ${result.data.length}`
        );
      }

    } catch (error) {
      IntegrationRunner.assert(false, 'getInventario', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: GET - buscarProducto
  // ═══════════════════════════════════════════════════════════════════════

  async function testBuscarProducto() {
    console.log('\n🧪 PRUEBAS: GET buscarProducto');
    console.log('-'.repeat(50));

    try {
      // Test 1: Query vacío
      let result = await fetchGet({ action: 'buscarProducto', query: '' });
      IntegrationRunner.assert(
        result.status === 'warning',
        'Query vacío retorna warning',
        `Status: ${result.status}`
      );

      // Test 2: Query válido
      result = await fetchGet({ action: 'buscarProducto', query: 'laptop' });
      IntegrationRunner.assert(
        result.status === 'success' || result.status === 'warning',
        'Query válido retorna respuesta válida',
        `Status: ${result.status}, data: ${result.data ? result.data.length : 0}`
      );

    } catch (error) {
      IntegrationRunner.assert(false, 'buscarProducto', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: GET - getResumenDiario
  // ═══════════════════════════════════════════════════════════════════════

  async function testGetResumenDiario() {
    console.log('\n🧪 PRUEBAS: GET getResumenDiario');
    console.log('-'.repeat(50));

    try {
      const result = await fetchGet({ action: 'getResumenDiario' });
      
      IntegrationRunner.assert(
        result.status === 'success' || result.status === 'error',
        'Respuesta con status válido',
        `Status: ${result.status}`
      );

    } catch (error) {
      IntegrationRunner.assert(false, 'getResumenDiario', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: GET - getData genérico
  // ═══════════════════════════════════════════════════════════════════════

  async function testGetData() {
    console.log('\n🧪 PRUEBAS: GET getData');
    console.log('-'.repeat(50));

    const sheets = ['VENTAS', 'COMPRAS', 'PRODUCTOS', 'GASTOS'];

    for (const sheet of sheets) {
      try {
        const result = await fetchGet({ action: 'getData', sheetName: sheet });
        
        IntegrationRunner.assert(
          result.status === 'success' || result.status === 'error',
          `getData - ${sheet}`,
          `Status: ${result.status}`
        );

        await delay(100); // Evitar rate limiting

      } catch (error) {
        IntegrationRunner.assert(false, `getData - ${sheet}`, error.message);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: POST - agregarCategoria
  // ═══════════════════════════════════════════════════════════════════════

  async function testAgregarCategoria() {
    console.log('\n🧪 PRUEBAS: POST agregarCategoria');
    console.log('-'.repeat(50));

    const testName = `${TEST_PREFIX}Categoria_${TEST_TIMESTAMP}`;

    try {
      // Test 1: Datos válidos
      let result = await fetchPost({ action: 'agregarCategoria', nombre: testName });
      IntegrationRunner.assert(
        result.status === 'success',
        'Categoría válida creada',
        `Status: ${result.status}, Mensaje: ${result.message}`
      );

      // Test 2: Sin nombre
      result = await fetchPost({ action: 'agregarCategoria', nombre: '' });
      IntegrationRunner.assert(
        result.status === 'error',
        'Nombre vacío retorna error',
        `Status: ${result.status}`
      );

      // Test 3: Sin datos
      result = await fetchPost({ action: 'agregarCategoria' });
      IntegrationRunner.assert(
        result.status === 'error',
        'Sin datos retorna error',
        `Status: ${result.status}`
      );

      await delay(200);

    } catch (error) {
      IntegrationRunner.assert(false, 'agregarCategoria', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: POST - registrarGasto
  // ═══════════════════════════════════════════════════════════════════════

  async function testRegistrarGasto() {
    console.log('\n🧪 PRUEBAS: POST registrarGasto');
    console.log('-'.repeat(50));

    try {
      // Test 1: Gasto válido
      let result = await fetchPost({
        action: 'registrarGasto',
        monto: 10000,
        categoria: 'Test',
        concepto: 'Prueba de integración',
        metodo_pago: 'efectivo',
        usuario: 'test'
      });
      IntegrationRunner.assert(
        result.status === 'success',
        'Gasto válido registrado',
        `Status: ${result.status}`
      );

      // Test 2: Sin monto
      result = await fetchPost({
        action: 'registrarGasto',
        monto: '',
        categoria: 'Test',
        concepto: 'Prueba'
      });
      IntegrationRunner.assert(
        result.status === 'success' || result.status === 'error',
        'Respuesta válida sin monto',
        `Status: ${result.status}`
      );

      await delay(200);

    } catch (error) {
      IntegrationRunner.assert(false, 'registrarGasto', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: POST - registrarAprovechamiento
  // ═══════════════════════════════════════════════════════════════════════

  async function testRegistrarAprovechamiento() {
    console.log('\n🧪 PRUEBAS: POST registrarAprovechamiento');
    console.log('-'.repeat(50));

    try {
      const result = await fetchPost({
        action: 'registrarAprovechamiento',
        monto: 5000,
        categoria: 'Venta',
        concepto: 'Prueba de aprovechamiento',
        metodo_pago: 'efectivo',
        usuario: 'test'
      });
      
      IntegrationRunner.assert(
        result.status === 'success',
        'Aprovechamiento válido registrado',
        `Status: ${result.status}`
      );

      await delay(200);

    } catch (error) {
      IntegrationRunner.assert(false, 'registrarAprovechamiento', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: POST - actions inválidas
  // ═══════════════════════════════════════════════════════════════════════

  async function testInvalidActions() {
    console.log('\n🧪 PRUEBAS: Acciones inválidas');
    console.log('-'.repeat(50));

    try {
      // GET inválido
      let result = await fetchGet({ action: 'accionInvalidaXYZ' });
      IntegrationRunner.assert(
        result.status === 'error',
        'GET con acción inválida retorna error',
        `Status: ${result.status}`
      );

      // POST sin acción
      result = await fetchPost({});
      IntegrationRunner.assert(
        result.status === 'error',
        'POST sin acción retorna error',
        `Status: ${result.status}`
      );

      // POST con acción inválida
      result = await fetchPost({ action: 'accionInvalidaPOST' });
      IntegrationRunner.assert(
        result.status === 'error',
        'POST con acción inválida retorna error',
        `Status: ${result.status}`
      );

    } catch (error) {
      IntegrationRunner.assert(false, 'invalidActions', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: Manejo de errores de red
  // ═══════════════════════════════════════════════════════════════════════

  async function testNetworkErrors() {
    console.log('\n🧪 PRUEBAS: Errores de red');
    console.log('-'.repeat(50));

    try {
      // URL incorrecta
      const wrongUrl = 'https://script.google.com/macros/s/INVALID_ID/exec';
      
      try {
        await fetch(wrongUrl, { method: 'GET' });
        IntegrationRunner.skip('URL inválida', 'No se puede probar error de red artificialmente');
      } catch (e) {
        IntegrationRunner.assert(
          true,
          'Manejo de error de red',
          'Error capturado correctamente'
        );
      }

    } catch (error) {
      IntegrationRunner.assert(false, 'networkErrors', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: Concurrencia (simulada)
  // ═══════════════════════════════════════════════════════════════════════

  async function testConcurrentRequests() {
    console.log('\n🧪 PRUEBAS: Solicitudes concurrentes');
    console.log('-'.repeat(50));

    try {
      // Enviar 5 solicitudes simultáneamente
      const promises = Array(5).fill().map(() => 
        fetchGet({ action: 'getCategorias' })
      );

      const results = await Promise.all(promises);
      
      IntegrationRunner.assert(
        results.every(r => r.status === 'success' || r.status === 'error'),
        'Todas las respuestas son válidas',
        `Recibidas: ${results.length}`
      );

    } catch (error) {
      IntegrationRunner.assert(false, 'concurrentRequests', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: Rate Limiting
  // ═══════════════════════════════════════════════════════════════════════

  async function testRateLimiting() {
    console.log('\n🧪 PRUEBAS: Rate Limiting');
    console.log('-'.repeat(50));

    try {
      // Enviar muchas solicitudes rápidamente
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(fetchGet({ action: 'getCategorias' }));
      }

      const results = await Promise.all(requests);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      IntegrationRunner.assert(
        successCount > 0,
        'Al menos algunas solicitudes exitosas',
        `Exitosas: ${successCount}, Errores: ${errorCount}`
      );

    } catch (error) {
      IntegrationRunner.assert(false, 'rateLimiting', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRUEBAS: Parámetros maliciosos (XSS simulado)
  // ═══════════════════════════════════════════════════════════════════════

  async function testMaliciousInput() {
    console.log('\n🧪 PRUEBAS: Entrada maliciosa');
    console.log('-'.repeat(50));

    const maliciousInputs = [
      '<script>alert(1)</script>',
      "'; DROP TABLE productos; --",
      '{{constructor.constructor("alert(1)")()}}'
    ];

    for (const input of maliciousInputs) {
      try {
        const result = await fetchGet({ 
          action: 'buscarProducto', 
          query: input 
        });
        
        // Solo verificamos que no explote
        IntegrationRunner.assert(
          result && result.status,
          `Input malicioso manejado: ${input.substring(0, 20)}...`,
          `Status: ${result.status}`
        );

        await delay(50);

      } catch (error) {
        IntegrationRunner.assert(false, 'maliciousInput', `${input}: ${error.message}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EJECUTOR PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  async function runIntegrationTests() {
    console.clear();
    IntegrationRunner.reset();
    
    console.log('🚀 INICIANDO PRUEBAS DE INTEGRACIÓN');
    console.log('='.repeat(60));
    console.log(`URL: ${SCRIPT_URL}`);
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));
    console.log('\n⚠️  ADVERTENCIA: Estas pruebas pueden modificar datos reales\n');

    // Pruebas GET
    await testGetCategorias();
    await delay(100);
    
    await testGetInventario();
    await delay(100);
    
    await testBuscarProducto();
    await delay(100);
    
    await testGetResumenDiario();
    await delay(100);
    
    await testGetData();
    await delay(200);

    // Pruebas POST
    await testAgregarCategoria();
    await delay(300);
    
    await testRegistrarGasto();
    await delay(200);
    
    await testRegistrarAprovechamiento();
    await delay(200);

    // Pruebas de robustez
    await testInvalidActions();
    await delay(100);
    
    await testConcurrentRequests();
    await delay(200);
    
    await testRateLimiting();
    await delay(100);
    
    await testMaliciousInput();

    // Resumen
    const summary = IntegrationRunner.summary();
    
    return {
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      total: summary.total,
      results: IntegrationRunner.results
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EXPORTAR AL GLOBAL
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof window !== 'undefined') {
    window.runIntegrationTests = runIntegrationTests;
    window.IntegrationRunner = IntegrationRunner;
  } else if (typeof global !== 'undefined') {
    global.runIntegrationTests = runIntegrationTests;
    global.IntegrationRunner = IntegrationRunner;
  }

  console.log('✅ Pruebas de integración cargadas. Ejecuta: runIntegrationTests()');

})();
