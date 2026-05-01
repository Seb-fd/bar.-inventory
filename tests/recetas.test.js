/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRUEBAS UNITARIAS - recetas.js (RecetasManager)
 * Gestión de recetas y menú del bar
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cómo ejecutar:
 * 1. Abrir consola del navegador en la página de la aplicación
 * 2. Copiar y pegar TODO este código en la consola
 * 3. Ejecutar: runRecetasTests()
 */

(function() {
  'use strict';

  const globalScope = typeof window !== 'undefined' ? window : global;

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 MOCKS DE RECETASMANAGER
  // ═══════════════════════════════════════════════════════════════════════

  // Datos mock de productos
  const mockProductosRecetas = [
    { id: 'PROD-001', nombre: 'Vodka Smirnoff', precio_compra: 45000 },
    { id: 'PROD-002', nombre: 'Jugo de Naranja', precio_compra: 5000 },
    { id: 'PROD-003', nombre: 'Hielo', precio_compra: 1000 },
    { id: 'PROD-004', nombre: 'Limón', precio_compra: 2000 },
    { id: 'PROD-005', nombre: 'Ginebra Tanqueray', precio_compra: 90000 },
    { id: 'PROD-006', nombre: 'Tónica', precio_compra: 3000 }
  ];

  // Datos mock de recetas
  let mockRecetas = [
    {
      id_receta: 'REC-001',
      nombre: 'Margarita Clásica',
      categoria: 'Cócteles',
      disponible: true,
      precio_venta: 35000,
      ingredientes: [
        { producto_id: 'PROD-001', cantidad: 1, unidad: 'oz' },
        { producto_id: 'PROD-004', cantidad: 0.5, unidad: 'oz' },
        { producto_id: 'PROD-003', cantidad: 1, unidad: 'taza' }
      ]
    },
    {
      id_receta: 'REC-002',
      nombre: 'Gin Tonic Premium',
      categoria: 'Cócteles',
      disponible: true,
      precio_venta: 40000,
      ingredientes: [
        { producto_id: 'PROD-005', cantidad: 1.5, unidad: 'oz' },
        { producto_id: 'PROD-006', cantidad: 1, unidad: 'vaso' },
        { producto_id: 'PROD-003', cantidad: 1, unidad: 'taza' }
      ]
    },
    {
      id_receta: 'REC-003',
      nombre: ' Screwdriver',
      categoria: 'Cócteles',
      disponible: false,
      precio_venta: 25000,
      ingredientes: [
        { producto_id: 'PROD-001', cantidad: 2, unidad: 'oz' },
        { producto_id: 'PROD-002', cantidad: 1, unidad: 'vaso' }
      ]
    },
    {
      id_receta: 'REC-004',
      nombre: 'Michelada',
      categoria: 'Cervezas',
      disponible: true,
      precio_venta: 18000,
      ingredientes: [
        { producto_id: 'PROD-004', cantidad: 1, unidad: 'und' },
        { producto_id: 'PROD-003', cantidad: 0.5, unidad: 'taza' }
      ]
    }
  ];

  // Implementación de RecetasManager para testing (copia simplificada)
  const RecetasManagerTest = {
    recetas: [],
    productos: [],
    filtroActual: 'todos',

    setRecetas(recetas) {
      this.recetas = recetas;
    },

    setProductos(productos) {
      this.productos = productos;
    },

    filtrarRecetas() {
      let filtradas = this.recetas.filter(r => r.disponible !== false);

      if (this.filtroActual !== 'todos') {
        filtradas = filtradas.filter(r => r.categoria === this.filtroActual);
      }

      return filtradas;
    },

    buscarRecetas(termino) {
      if (!termino || termino.trim() === '') {
        return this.filtrarRecetas();
      }

      const texto = termino.toLowerCase();
      return this.filtrarRecetas().filter(r =>
        r.nombre.toLowerCase().includes(texto) ||
        (r.categoria && r.categoria.toLowerCase().includes(texto))
      );
    },

    setFiltro(categoria) {
      this.filtroActual = categoria;
    },

    calcularCostoReceta(receta) {
      if (!receta || !receta.ingredientes) return 0;

      let costoTotal = 0;
      receta.ingredientes.forEach(ing => {
        const producto = this.productos.find(p => p.id === ing.producto_id);
        if (producto) {
          const costoUnitario = producto.precio_compra || 0;
          costoTotal += costoUnitario * ing.cantidad;
        }
      });

      return costoTotal;
    },

    calcularMargen(receta) {
      if (!receta || !receta.precio_venta) return 0;

      const costo = this.calcularCostoReceta(receta);
      const venta = receta.precio_venta;
      const margen = ((venta - costo) / venta) * 100;

      return Math.round(margen * 10) / 10;
    },

    obtenerCategorias() {
      const categorias = new Set();
      this.recetas.forEach(r => {
        if (r.categoria) categorias.add(r.categoria);
      });
      return Array.from(categorias);
    },

    obtenerRecetaPorId(id) {
      return this.recetas.find(r => r.id_receta === id);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 TEST RUNNER
  // ═══════════════════════════════════════════════════════════════════════

  const RecetasTestRunner = {
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
      console.log(`📊 RESUMEN DE PRUEBAS - recetas.js`);
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
  // 🧪 PRUEBAS: filtrarRecetas()
  // ═══════════════════════════════════════════════════════════════════════

  function testFiltrarRecetas() {
    console.log('\n🧪 PRUEBAS: filtrarRecetas()');
    console.log('-'.repeat(50));

    RecetasManagerTest.setRecetas(mockRecetas);
    RecetasManagerTest.setFiltro('todos');

    let result = RecetasManagerTest.filtrarRecetas();
    RecetasTestRunner.assert(
      result.length === 3,
      'Filtro "todos" retorna recetas disponibles',
      `Resultados: ${result.length}`
    );

    // Por categoría
    RecetasManagerTest.setFiltro('Cócteles');
    result = RecetasManagerTest.filtrarRecetas();
    RecetasTestRunner.assert(
      result.length === 2,
      'Filtro por categoría funciona',
      `Resultados: ${result.length}`
    );

    // Solo disponibles
    RecetasManagerTest.setFiltro('todos');
    result = RecetasManagerTest.filtrarRecetas();
    const tieneNoDisponible = result.some(r => r.disponible === false);
    RecetasTestRunner.assert(
      !tieneNoDisponible,
      'Solo retorna recetas disponibles',
      `Tiene no disponibles: ${tieneNoDisponible}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: buscarRecetas()
  // ═══════════════════════════════════════════════════════════════════════

  function testBuscarRecetas() {
    console.log('\n🧪 PRUEBAS: buscarRecetas()');
    console.log('-'.repeat(50));

    RecetasManagerTest.setRecetas(mockRecetas);
    RecetasManagerTest.setFiltro('todos');

    // Buscar por nombre
    let result = RecetasManagerTest.buscarRecetas('margarita');
    RecetasTestRunner.assert(
      result.length === 1 && result[0].nombre === 'Margarita Clásica',
      'Busqueda por nombre funciona',
      `Resultados: ${result.length}`
    );

    // Buscar por categoría
    result = RecetasManagerTest.buscarRecetas('cerveza');
    RecetasTestRunner.assert(
      result.length === 1 && result[0].nombre === 'Michelada',
      'Busqueda por categoría funciona',
      `Resultados: ${result.length}`
    );

    // Case insensitive
    result = RecetasManagerTest.buscarRecetas('GIN');
    RecetasTestRunner.assert(
      result.length === 1,
      'Busqueda case insensitive',
      `Resultados: ${result.length}`
    );

    // Sin resultados
    result = RecetasManagerTest.buscarRecetas('xyzinexistente');
    RecetasTestRunner.assert(
      result.length === 0,
      'Sin resultados retorna array vacío',
      `Resultados: ${result.length}`
    );

    // String vacío retorna filtradas
    result = RecetasManagerTest.buscarRecetas('');
    RecetasTestRunner.assert(
      result.length === 3,
      'String vacío retorna recetas filtradas',
      `Resultados: ${result.length}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: calcularCostoReceta()
  // ═══════════════════════════════════════════════════════════════════════

  function testCalcularCostoReceta() {
    console.log('\n🧪 PRUEBAS: calcularCostoReceta()');
    console.log('-'.repeat(50));

    RecetasManagerTest.setRecetas(mockRecetas);
    RecetasManagerTest.setProductos(mockProductosRecetas);

    // Calcular costo de receta
    const margarita = RecetasManagerTest.obtenerRecetaPorId('REC-001');
    let costo = RecetasManagerTest.calcularCostoReceta(margarita);
    // costo = 1*45000 + 0.5*2000 + 1*1000 = 45000 + 1000 + 1000 = 47000
    RecetasTestRunner.assert(
      costo === 47000,
      'Cálculo de costo correcto',
      `Costo: ${costo}`
    );

    // Gin Tonic Premium
    const ginTonic = RecetasManagerTest.obtenerRecetaPorId('REC-002');
    costo = RecetasManagerTest.calcularCostoReceta(ginTonic);
    // costo = 1.5*90000 + 1*3000 + 1*1000 = 135000 + 3000 + 1000 = 139000
    RecetasTestRunner.assert(
      costo === 139000,
      'Cálculo con decimales correcto',
      `Costo: ${costo}`
    );

    // Receta null
    costo = RecetasManagerTest.calcularCostoReceta(null);
    RecetasTestRunner.assert(
      costo === 0,
      'Receta null retorna 0',
      `Costo: ${costo}`
    );

    // Receta sin ingredientes
    costo = RecetasManagerTest.calcularCostoReceta({ nombre: 'Test' });
    RecetasTestRunner.assert(
      costo === 0,
      'Receta sin ingredientes retorna 0',
      `Costo: ${costo}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: calcularMargen()
  // ═══════════════════════════════════════════════════════════════════════

  function testCalcularMargen() {
    console.log('\n🧪 PRUEBAS: calcularMargen()');
    console.log('-'.repeat(50));

    RecetasManagerTest.setRecetas(mockRecetas);
    RecetasManagerTest.setProductos(mockProductosRecetas);

    // Margen de Margarita (venta 35000, costo 47000)
    const margarita = RecetasManagerTest.obtenerRecetaPorId('REC-001');
    let margen = RecetasManagerTest.calcularMargen(margarita);
    // margen = ((35000 - 47000) / 35000) * 100 = -34.29%
    RecetasTestRunner.assert(
      margen < 0,
      'Margen negativo cuando costo > venta',
      `Margen: ${margen}%`
    );

    // Margen de Michelada (venta 18000, costo bajo)
    const michelada = RecetasManagerTest.obtenerRecetaPorId('REC-004');
    margen = RecetasManagerTest.calcularMargen(michelada);
    // costo = 1*2000 + 0.5*1000 = 2000 + 500 = 2500
    // margen = ((18000 - 2500) / 18000) * 100 = 86.11%
    RecetasTestRunner.assert(
      margen > 80,
      'Margen alto para recetas con bajo costo',
      `Margen: ${margen}%`
    );

    // Receta sin precio
    margen = RecetasManagerTest.calcularMargen({ nombre: 'Test' });
    RecetasTestRunner.assert(
      margen === 0,
      'Receta sin precio retorna 0',
      `Margen: ${margen}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: obtenerCategorias()
  // ═══════════════════════════════════════════════════════════════════════

  function testObtenerCategorias() {
    console.log('\n🧪 PRUEBAS: obtenerCategorias()');
    console.log('-'.repeat(50));

    RecetasManagerTest.setRecetas(mockRecetas);

    const categorias = RecetasManagerTest.obtenerCategorias();
    RecetasTestRunner.assert(
      categorias.length === 2,
      'Retorna categorías únicas',
      `Categorías: ${categorias.length}`
    );

    RecetasTestRunner.assert(
      categorias.includes('Cócteles') && categorias.includes('Cervezas'),
      'Contiene las categorías esperadas',
      `Categorías: ${categorias.join(', ')}`
    );

    // Sin recetas
    RecetasManagerTest.setRecetas([]);
    const categoriasVacio = RecetasManagerTest.obtenerCategorias();
    RecetasTestRunner.assert(
      categoriasVacio.length === 0,
      'Sin recetas retorna array vacío',
      `Categorías: ${categoriasVacio.length}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: obtenerRecetaPorId()
  // ═══════════════════════════════════════════════════════════════════════

  function testObtenerRecetaPorId() {
    console.log('\n🧪 PRUEBAS: obtenerRecetaPorId()');
    console.log('-'.repeat(50));

    RecetasManagerTest.setRecetas(mockRecetas);

    let receta = RecetasManagerTest.obtenerRecetaPorId('REC-001');
    RecetasTestRunner.assert(
      receta && receta.nombre === 'Margarita Clásica',
      'Encuentra receta por ID',
      `Nombre: ${receta?.nombre}`
    );

    // Receta inexistente
    receta = RecetasManagerTest.obtenerRecetaPorId('REC-INEXISTENTE');
    RecetasTestRunner.assert(
      receta === undefined,
      'Retorna undefined para ID inexistente',
      `Resultado: ${receta}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: setFiltro()
  // ═══════════════════════════════════════════════════════════════════════

  function testSetFiltro() {
    console.log('\n🧪 PRUEBAS: setFiltro()');
    console.log('-'.repeat(50));

    RecetasManagerTest.setRecetas(mockRecetas);
    RecetasManagerTest.setFiltro('todos');

    RecetasManagerTest.setFiltro('Cócteles');
    RecetasTestRunner.assert(
      RecetasManagerTest.filtroActual === 'Cócteles',
      'Filtro cambiado correctamente',
      `Filtro: ${RecetasManagerTest.filtroActual}`
    );

    RecetasManagerTest.setFiltro('Cervezas');
    RecetasTestRunner.assert(
      RecetasManagerTest.filtroActual === 'Cervezas',
      'Filtro cambiado a nueva categoría',
      `Filtro: ${RecetasManagerTest.filtroActual}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 EJECUTOR PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  function runRecetasTests() {
    console.clear();
    RecetasTestRunner.reset();

    console.log('🚀 INICIANDO PRUEBAS UNITARIAS - recetas.js');
    console.log('='.repeat(60));
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    testFiltrarRecetas();
    testBuscarRecetas();
    testCalcularCostoReceta();
    testCalcularMargen();
    testObtenerCategorias();
    testObtenerRecetaPorId();
    testSetFiltro();

    const summary = RecetasTestRunner.summary();

    return {
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      results: RecetasTestRunner.results
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📤 EXPORTAR AL GLOBAL
  // ═══════════════════════════════════════════════════════════════════════

  globalScope.runRecetasTests = runRecetasTests;

  console.log('✅ Pruebas de recetas.js cargadas.');
  console.log('📝 Ejecuta: runRecetasTests()');

})();

function runRecetasTests() {
  return runRecetasTests();
}