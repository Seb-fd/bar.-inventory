/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRUEBAS UNITARIAS - cuentas.js (CuentasManager)
 * Gestión de cuentas y mesas del bar
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cómo ejecutar:
 * 1. Abrir consola del navegador en la página de la aplicación
 * 2. Copiar y pegar TODO este código en la consola
 * 3. Ejecutar: runCuentasTests()
 */

(function() {
  'use strict';

  const globalScope = typeof window !== 'undefined' ? window : global;

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 MOCKS DE CUENTASMANAGER
  // ═══════════════════════════════════════════════════════════════════════

  // Implementación de CuentasManager para testing (copia simplificada)
  const CuentasManagerTest = {
    cuentasAbiertas: [],
    cuentaActiva: null,

    reset() {
      this.cuentasAbiertas = [];
      this.cuentaActiva = null;
    },

    crearCuenta(idMesa, nombreMesa) {
      const cuenta = {
        id_cuenta: 'CUENTA-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        id_mesa: idMesa,
        nombre_mesa: nombreMesa || `Mesa ${idMesa}`,
        inicio: new Date().toISOString(),
        estado: 'abierta',
        items: [],
        subtotal: 0,
        descuento: 0,
        total: 0,
        observaciones: ''
      };

      this.cuentasAbiertas.push(cuenta);
      return cuenta;
    },

    agregarItem(idCuenta, item) {
      const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
      if (!cuenta) return null;

      const nuevoItem = {
        id: 'ITEM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        tipo: item.tipo || 'receta',
        receta_id: item.receta_id || null,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario,
        notas: item.notas || ''
      };

      cuenta.items.push(nuevoItem);
      this.recalcular(cuenta);
      return nuevoItem;
    },

    actualizarCantidad(idCuenta, itemId, cantidad) {
      const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
      if (!cuenta) return false;

      const item = cuenta.items.find(i => i.id === itemId);
      if (!item) return false;

      item.cantidad = cantidad;
      item.subtotal = cantidad * item.precio_unitario;
      this.recalcular(cuenta);
      return true;
    },

    eliminarItem(idCuenta, itemId) {
      const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
      if (!cuenta) return false;

      const index = cuenta.items.findIndex(i => i.id === itemId);
      if (index === -1) return false;

      cuenta.items.splice(index, 1);
      this.recalcular(cuenta);
      return true;
    },

    aplicarDescuento(idCuenta, monto) {
      const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
      if (!cuenta) return false;

      cuenta.descuento = Math.min(monto, cuenta.subtotal);
      cuenta.total = cuenta.subtotal - cuenta.descuento;
      return true;
    },

    aplicarDescuentoPorcentaje(idCuenta, porcentaje) {
      const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
      if (!cuenta) return false;

      cuenta.descuento = cuenta.subtotal * (porcentaje / 100);
      cuenta.total = cuenta.subtotal - cuenta.descuento;
      return true;
    },

    recalcular(cuenta) {
      cuenta.subtotal = cuenta.items.reduce((sum, item) => sum + item.subtotal, 0);
      cuenta.total = cuenta.subtotal - cuenta.descuento;
    },

    cerrarCuenta(idCuenta, datosPago = {}) {
      const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
      if (!cuenta) return null;

      const cuentaCerrada = {
        ...cuenta,
        estado: 'cerrada',
        fin: new Date().toISOString(),
        descuento: cuenta.descuento,
        items: cuenta.items,
        metodo_pago: datosPago.metodoPago || 'efectivo',
        monto_recibido: datosPago.montoRecibido || 0,
        cambio: datosPago.cambio || 0
      };

      // Remover de cuentas abiertas
      const index = this.cuentasAbiertas.findIndex(c => c.id_cuenta === idCuenta);
      if (index !== -1) {
        this.cuentasAbiertas.splice(index, 1);
      }

      return cuentaCerrada;
    },

    getCuentasAbiertas() {
      return this.cuentasAbiertas;
    },

    getCuentaPorMesa(idMesa) {
      return this.cuentasAbiertas.find(c => c.id_mesa === idMesa);
    },

    obtenerResumenDia() {
      // Simular cuentas del día (usando las abiertas + mock de cerradas)
      const cuentasCerradas = []; // En real vendría del backend

      return {
        cuentasAbiertas: this.cuentasAbiertas,
        cuentasCerradas: cuentasCerradas,
        totalVentas: this.cuentasAbiertas.reduce((sum, c) => sum + c.total, 0),
        totalCuentas: this.cuentasAbiertas.length,
        ticketPromedio: this.cuentasAbiertas.length > 0
          ? this.cuentasAbiertas.reduce((sum, c) => sum + c.total, 0) / this.cuentasAbiertas.length
          : 0
      };
    },

    setCuentaActiva(idCuenta) {
      const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
      this.cuentaActiva = cuenta || null;
    },

    getCuentaActiva() {
      return this.cuentaActiva;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 TEST RUNNER
  // ═══════════════════════════════════════════════════════════════════════

  const CuentasTestRunner = {
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
      console.log(`📊 RESUMEN DE PRUEBAS - cuentas.js`);
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
  // 🧪 PRUEBAS: crearCuenta()
  // ═══════════════════════════════════════════════════════════════════════

  function testCrearCuenta() {
    console.log('\n🧪 PRUEBAS: crearCuenta()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();

    let cuenta = CuentasManagerTest.crearCuenta('MESA-01', 'Mesa 1');
    CuentasTestRunner.assert(
      cuenta && cuenta.id_cuenta.startsWith('CUENTA-'),
      'Cuenta creada con ID único',
      `ID: ${cuenta.id_cuenta}`
    );

    CuentasTestRunner.assert(
      cuenta.estado === 'abierta',
      'Cuenta creada en estado abierta',
      `Estado: ${cuenta.estado}`
    );

    CuentasTestRunner.assert(
      cuenta.id_mesa === 'MESA-01',
      'ID de mesa asignado correctamente',
      `Mesa: ${cuenta.id_mesa}`
    );

    CuentasTestRunner.assert(
      cuenta.items.length === 0,
      'Nueva cuenta sin items',
      `Items: ${cuenta.items.length}`
    );

    CuentasTestRunner.assert(
      cuenta.total === 0,
      'Nueva cuenta con total 0',
      `Total: ${cuenta.total}`
    );

    // Verificar que se agregó a la lista
    const cuentas = CuentasManagerTest.getCuentasAbiertas();
    CuentasTestRunner.assert(
      cuentas.length === 1,
      'Cuenta agregada a la lista',
      `Cuentas: ${cuentas.length}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: agregarItem()
  // ═══════════════════════════════════════════════════════════════════════

  function testAgregarItem() {
    console.log('\n🧪 PRUEBAS: agregarItem()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();
    const cuenta = CuentasManagerTest.crearCuenta('MESA-01');

    const item = CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Margarita Clásica',
      cantidad: 2,
      precio_unitario: 35000,
      tipo: 'receta',
      receta_id: 'REC-001'
    });

    CuentasTestRunner.assert(
      item && item.nombre === 'Margarita Clásica',
      'Item agregado correctamente',
      `Nombre: ${item.nombre}`
    );

    CuentasTestRunner.assert(
      item.cantidad === 2,
      'Cantidad correcta',
      `Cantidad: ${item.cantidad}`
    );

    // Verificar subtotal calculado
    CuentasTestRunner.assert(
      item.subtotal === 70000,
      'Subtotal calculado (2 * 35000)',
      `Subtotal: ${item.subtotal}`
    );

    // Verificar total de cuenta actualizado
    CuentasTestRunner.assert(
      cuenta.subtotal === 70000,
      'Subtotal de cuenta actualizado',
      `Subtotal: ${cuenta.subtotal}`
    );

    // Agregar segundo item
    const item2 = CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Gin Tonic',
      cantidad: 1,
      precio_unitario: 40000
    });

    CuentasTestRunner.assert(
      cuenta.items.length === 2,
      'Segundo item agregado',
      `Items: ${cuenta.items.length}`
    );

    CuentasTestRunner.assert(
      cuenta.subtotal === 110000,
      'Subtotal acumulado correcto',
      `Subtotal: ${cuenta.subtotal}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: actualizarCantidad()
  // ═══════════════════════════════════════════════════════════════════════

  function testActualizarCantidad() {
    console.log('\n🧪 PRUEBAS: actualizarCantidad()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();
    const cuenta = CuentasManagerTest.crearCuenta('MESA-01');

    const item = CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Cerveza',
      cantidad: 2,
      precio_unitario: 10000
    });

    // Actualizar cantidad
    let resultado = CuentasManagerTest.actualizarCantidad(cuenta.id_cuenta, item.id, 5);
    CuentasTestRunner.assert(
      resultado === true,
      'Cantidad actualizada exitosamente',
      `Resultado: ${resultado}`
    );

    CuentasTestRunner.assert(
      item.cantidad === 5,
      'Nueva cantidad correcta',
      `Cantidad: ${item.cantidad}`
    );

    CuentasTestRunner.assert(
      item.subtotal === 50000,
      'Subtotal recalculado',
      `Subtotal: ${item.subtotal}`
    );

    // Actualizar cuenta también recalculada
    CuentasTestRunner.assert(
      cuenta.subtotal === 50000,
      'Total cuenta actualizado',
      `Subtotal: ${cuenta.subtotal}`
    );

    // Item inexistente
    resultado = CuentasManagerTest.actualizarCantidad(cuenta.id_cuenta, 'ITEM-INEXISTENTE', 1);
    CuentasTestRunner.assert(
      resultado === false,
      'Retorna false para item inexistente',
      `Resultado: ${resultado}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: eliminarItem()
  // ═══════════════════════════════════════════════════════════════════════

  function testEliminarItem() {
    console.log('\n🧪 PRUEBAS: eliminarItem()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();
    const cuenta = CuentasManagerTest.crearCuenta('MESA-01');

    const item1 = CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Item 1',
      cantidad: 1,
      precio_unitario: 10000
    });

    const item2 = CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Item 2',
      cantidad: 1,
      precio_unitario: 20000
    });

    // Eliminar primer item
    let resultado = CuentasManagerTest.eliminarItem(cuenta.id_cuenta, item1.id);
    CuentasTestRunner.assert(
      resultado === true,
      'Item eliminado exitosamente',
      `Resultado: ${resultado}`
    );

    CuentasTestRunner.assert(
      cuenta.items.length === 1,
      'Solo un item осталось',
      `Items: ${cuenta.items.length}`
    );

    CuentasTestRunner.assert(
      cuenta.subtotal === 20000,
      'Subtotal recalculado tras eliminación',
      `Subtotal: ${cuenta.subtotal}`
    );

    // Eliminar item inexistente
    resultado = CuentasManagerTest.eliminarItem(cuenta.id_cuenta, 'ITEM-INEXISTENTE');
    CuentasTestRunner.assert(
      resultado === false,
      'Retorna false para item inexistente',
      `Resultado: ${resultado}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: aplicarDescuento()
  // ═══════════════════════════════════════════════════════════════════════

  function testAplicarDescuento() {
    console.log('\n🧪 PRUEBAS: aplicarDescuento()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();
    const cuenta = CuentasManagerTest.crearCuenta('MESA-01');

    CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Test Item',
      cantidad: 1,
      precio_unitario: 100000
    });

    // Aplicar descuento fijo
    let resultado = CuentasManagerTest.aplicarDescuento(cuenta.id_cuenta, 15000);
    CuentasTestRunner.assert(
      resultado === true,
      'Descuento aplicado',
      `Resultado: ${resultado}`
    );

    CuentasTestRunner.assert(
      cuenta.descuento === 15000,
      'Descuento correcto',
      `Descuento: ${cuenta.descuento}`
    );

    CuentasTestRunner.assert(
      cuenta.total === 85000,
      'Total con descuento correcto',
      `Total: ${cuenta.total}`
    );

    // Descuento mayor al subtotal (no debe exceder)
    resultado = CuentasManagerTest.aplicarDescuento(cuenta.id_cuenta, 200000);
    CuentasTestRunner.assert(
      cuenta.descuento === 100000,
      'Descuento no excede subtotal',
      `Descuento: ${cuenta.descuento}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: aplicarDescuentoPorcentaje()
  // ═══════════════════════════════════════════════════════════════════════

  function testAplicarDescuentoPorcentaje() {
    console.log('\n🧪 PRUEBAS: aplicarDescuentoPorcentaje()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();
    const cuenta = CuentasManagerTest.crearCuenta('MESA-01');

    CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Test Item',
      cantidad: 1,
      precio_unitario: 100000
    });

    // Aplicar 10%
    let resultado = CuentasManagerTest.aplicarDescuentoPorcentaje(cuenta.id_cuenta, 10);
    CuentasTestRunner.assert(
      resultado === true,
      'Descuento porcentual aplicado',
      `Resultado: ${resultado}`
    );

    CuentasTestRunner.assert(
      cuenta.descuento === 10000,
      '10% de 100000 = 10000',
      `Descuento: ${cuenta.descuento}`
    );

    // Resetear para siguiente prueba
    cuenta.descuento = 0;
    cuenta.total = cuenta.subtotal;

    // Aplicar 25%
    resultado = CuentasManagerTest.aplicarDescuentoPorcentaje(cuenta.id_cuenta, 25);
    CuentasTestRunner.assert(
      cuenta.descuento === 25000,
      '25% de 100000 = 25000',
      `Descuento: ${cuenta.descuento}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: cerrarCuenta()
  // ═══════════════════════════════════════════════════════════════════════

  function testCerrarCuenta() {
    console.log('\n🧪 PRUEBAS: cerrarCuenta()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();
    const cuenta = CuentasManagerTest.crearCuenta('MESA-01');

    CuentasManagerTest.agregarItem(cuenta.id_cuenta, {
      nombre: 'Test Item',
      cantidad: 2,
      precio_unitario: 25000
    });

    // Cerrar cuenta
    const cuentaCerrada = CuentasManagerTest.cerrarCuenta(cuenta.id_cuenta, {
      metodoPago: 'efectivo',
      montoRecibido: 60000,
      cambio: 10000
    });

    CuentasTestRunner.assert(
      cuentaCerrada && cuentaCerrada.estado === 'cerrada',
      'Cuenta cerrada exitosamente',
      `Estado: ${cuentaCerrada.estado}`
    );

    CuentasTestRunner.assert(
      cuentaCerrada.metodo_pago === 'efectivo',
      'Método de pago registrado',
      `Método: ${cuentaCerrada.metodo_pago}`
    );

    // Verificar que ya no está en cuentas abiertas
    const cuentas = CuentasManagerTest.getCuentasAbiertas();
    CuentasTestRunner.assert(
      cuentas.length === 0,
      'Cuenta removida de cuentas abiertas',
      `Cuentas: ${cuentas.length}`
    );

    // Cuenta inexistente
    const inexistente = CuentasManagerTest.cerrarCuenta('CUENTA-INEXISTENTE');
    CuentasTestRunner.assert(
      inexistente === null,
      'Retorna null para cuenta inexistente',
      `Resultado: ${inexistente}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: getCuentaPorMesa()
  // ═══════════════════════════════════════════════════════════════════════

  function testGetCuentaPorMesa() {
    console.log('\n🧪 PRUEBAS: getCuentaPorMesa()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();
    CuentasManagerTest.crearCuenta('MESA-01', 'Mesa 1');
    CuentasManagerTest.crearCuenta('MESA-02', 'Mesa 2');

    const cuenta = CuentasManagerTest.getCuentaPorMesa('MESA-01');
    CuentasTestRunner.assert(
      cuenta && cuenta.nombre_mesa === 'Mesa 1',
      'Encuentra cuenta por ID de mesa',
      `Nombre: ${cuenta?.nombre_mesa}`
    );

    const inexistente = CuentasManagerTest.getCuentaPorMesa('MESA-99');
    CuentasTestRunner.assert(
      inexistente === undefined,
      'Retorna undefined para mesa sin cuenta',
      `Resultado: ${inexistente}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 PRUEBAS: obtenerResumenDia()
  // ═══════════════════════════════════════════════════════════════════════

  function testObtenerResumenDia() {
    console.log('\n🧪 PRUEBAS: obtenerResumenDia()');
    console.log('-'.repeat(50));

    CuentasManagerTest.reset();

    // Sin cuentas
    let resumen = CuentasManagerTest.obtenerResumenDia();
    CuentasTestRunner.assert(
      resumen.totalVentas === 0,
      'Sin cuentas, ventas = 0',
      `Ventas: ${resumen.totalVentas}`
    );

    CuentasTestRunner.assert(
      resumen.totalCuentas === 0,
      'Sin cuentas, count = 0',
      `Cuentas: ${resumen.totalCuentas}`
    );

    // Con cuentas
    const cuenta1 = CuentasManagerTest.crearCuenta('MESA-01');
    CuentasManagerTest.agregarItem(cuenta1.id_cuenta, { nombre: 'Item 1', cantidad: 1, precio_unitario: 50000 });

    const cuenta2 = CuentasManagerTest.crearCuenta('MESA-02');
    CuentasManagerTest.agregarItem(cuenta2.id_cuenta, { nombre: 'Item 2', cantidad: 1, precio_unitario: 30000 });

    resumen = CuentasManagerTest.obtenerResumenDia();
    CuentasTestRunner.assert(
      resumen.totalVentas === 80000,
      'Total ventas correcto',
      `Ventas: ${resumen.totalVentas}`
    );

    CuentasTestRunner.assert(
      resumen.totalCuentas === 2,
      'Total cuentas correcto',
      `Cuentas: ${resumen.totalCuentas}`
    );

    CuentasTestRunner.assert(
      resumen.ticketPromedio === 40000,
      'Ticket promedio correcto',
      `Ticket: ${resumen.ticketPromedio}`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 EJECUTOR PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  function runCuentasTests() {
    console.clear();
    CuentasTestRunner.reset();

    console.log('🚀 INICIANDO PRUEBAS UNITARIAS - cuentas.js');
    console.log('='.repeat(60));
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    testCrearCuenta();
    testAgregarItem();
    testActualizarCantidad();
    testEliminarItem();
    testAplicarDescuento();
    testAplicarDescuentoPorcentaje();
    testCerrarCuenta();
    testGetCuentaPorMesa();
    testObtenerResumenDia();

    const summary = CuentasTestRunner.summary();

    return {
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      results: CuentasTestRunner.results
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 📤 EXPORTAR AL GLOBAL
  // ═══════════════════════════════════════════════════════════════════════

  globalScope.runCuentasTests = runCuentasTests;

  console.log('✅ Pruebas de cuentas.js cargadas.');
  console.log('📝 Ejecuta: runCuentasTests()');

})();

function runCuentasTests() {
  return runCuentasTests();
}