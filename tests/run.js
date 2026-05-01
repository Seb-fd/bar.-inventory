/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUNNER PRINCIPAL DE PRUEBAS
 * Ejecuta todas las pruebas: unitarias + integración
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Cómo usar:
 * 1. Cargar este archivo en el navegador O
 * 2. Ejecutar en consola: runAllTests()
 * 
 * O ejecutar por separado:
 * - runUnitTests()        → Solo pruebas unitarias
 * - runIntegrationTests() → Solo pruebas de integración
 */

(function() {
  'use strict';

  const TestRunner = {
    startTime: null,
    endTime: null,

    async runAllTests() {
      console.clear();
      this.startTime = new Date();
      
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║          🧪 SUITE COMPLETA DE PRUEBAS - INVENTARIO                  ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝');
      console.log(`Iniciado: ${this.startTime.toLocaleString()}`);
      console.log('');
      
      let unitResults = null;
      let integrationResults = null;

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 1: PRUEBAS UNITARIAS
      // ═══════════════════════════════════════════════════════════════════════
      
      console.log('\n' + '═'.repeat(70));
      console.log('                    📦 FASE 1: PRUEBAS UNITARIAS');
      console.log('═'.repeat(70) + '\n');

      if (typeof window.runUnitTests === 'function') {
        try {
          unitResults = window.runUnitTests();
        } catch (e) {
          console.error('❌ Error en pruebas unitarias:', e.message);
          unitResults = { passed: 0, failed: 1, total: 1 };
        }
      } else {
        console.log('⚠️  Pruebas unitarias no disponibles.');
        console.log('   Copia y pega el contenido de tests/unit.test.js en la consola.');
        unitResults = { passed: 0, failed: 0, total: 0, skipped: true };
      }

      console.log('\n⏳ Esperando 1 segundo antes de pruebas de integración...\n');
      await new Promise(r => setTimeout(r, 1000));

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 2: PRUEBAS DE INTEGRACIÓN
      // ═══════════════════════════════════════════════════════════════════════
      
      console.log('\n' + '═'.repeat(70));
      console.log('                    🌐 FASE 2: PRUEBAS DE INTEGRACIÓN');
      console.log('═'.repeat(70) + '\n');

      const proceed = confirm('¿Ejecutar pruebas de integración? (Advertencia: modifican datos)');
      
      if (proceed) {
        if (typeof window.runIntegrationTests === 'function') {
          try {
            integrationResults = await window.runIntegrationTests();
          } catch (e) {
            console.error('❌ Error en pruebas de integración:', e.message);
            integrationResults = { passed: 0, failed: 1, total: 1 };
          }
        } else {
          console.log('⚠️  Pruebas de integración no disponibles.');
          integrationResults = { passed: 0, failed: 0, total: 0, skipped: true };
        }
      } else {
        console.log('⏭️  Pruebas de integración omitidas por el usuario');
        integrationResults = { passed: 0, failed: 0, total: 0, skipped: true };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // RESUMEN FINAL
      // ═══════════════════════════════════════════════════════════════════════
      
      this.endTime = new Date();
      const duration = (this.endTime - this.startTime) / 1000;

      this.printSummary(unitResults, integrationResults, duration);

      return { unitResults, integrationResults, duration };
    },

    printSummary(unitResults, integrationResults, duration) {
      const unitPassed = unitResults?.passed || 0;
      const unitFailed = unitResults?.failed || 0;
      const unitTotal = unitResults?.total || 0;

      const intPassed = integrationResults?.passed || 0;
      const intFailed = integrationResults?.failed || 0;
      const intTotal = integrationResults?.total || 0;
      const intSkipped = integrationResults?.skipped ? 1 : 0;

      const totalPassed = unitPassed + intPassed;
      const totalFailed = unitFailed + intFailed;
      const totalTests = unitTotal + intTotal;

      console.log('\n' + '═'.repeat(70));
      console.log('                    📊 RESUMEN FINAL DE PRUEBAS');
      console.log('═'.repeat(70));
      
      console.log(`
┌─────────────────────────────────────────────────────────────────────┐
│  TIPO                  │  PASADAS  │  FALLIDAS  │  TOTALES         │
├─────────────────────────────────────────────────────────────────────┤
│  Unitarias             │    ${this.pad(unitPassed, 5)}  │     ${this.pad(unitFailed, 5)}  │     ${this.pad(unitTotal, 8)}       │
│  Integración           │    ${this.pad(intPassed, 5)}  │     ${this.pad(intFailed, 5)}  │     ${this.pad(intTotal, 8)}${intSkipped > 0 ? ' (' + intSkipped + ' omit)' : ''}      │
├─────────────────────────────────────────────────────────────────────┤
│  TOTALES               │    ${this.pad(totalPassed, 5)}  │     ${this.pad(totalFailed, 5)}  │     ${this.pad(totalTests, 8)}       │
└─────────────────────────────────────────────────────────────────────┘

⏱️  Tiempo total: ${duration.toFixed(2)} segundos

${totalFailed === 0 ? '🎉 ¡TODAS LAS PRUEBAS PASARON!' : '⚠️  ALGUNAS PRUEBAS FALLARON'}
`);
    },

    pad(num, size) {
      return String(num).padStart(size, ' ');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FUNCIONES DE UTILIDAD
  // ═══════════════════════════════════════════════════════════════════════

  function runOnlyUnitTests() {
    console.log('🚀 Ejecutando solo pruebas unitarias...\n');
    if (typeof window.runUnitTests === 'function') {
      return window.runUnitTests();
    } else {
      console.error('❌ unit.test.js no está cargado');
      console.log('📝 Copia y pega el contenido de tests/unit.test.js en la consola');
      return null;
    }
  }

  async function runOnlyIntegrationTests() {
    console.log('🚀 Ejecutando solo pruebas de integración...\n');
    if (typeof window.runIntegrationTests === 'function') {
      return await window.runIntegrationTests();
    } else {
      console.error('❌ integration.test.js no está cargado');
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EXPORTAR AL GLOBAL
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof window !== 'undefined') {
    window.runAllTests = () => TestRunner.runAllTests();
    window.runOnlyUnitTests = runOnlyUnitTests;
    window.runOnlyIntegrationTests = runOnlyIntegrationTests;
  }

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║          🧪 SUITE DE PRUEBAS - INVENTARIO v2.0                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Comandos disponibles:                                              ║
║                                                                    ║
║    runAllTests()           → Ejecutar todas las pruebas           ║
║    runOnlyUnitTests()      → Solo pruebas unitarias               ║
║    runOnlyIntegrationTests() → Solo pruebas de integración        ║
║                                                                    ║
║  IMPORTANTE: Para pruebas unitarias, copia y pega el contenido    ║
║  de tests/unit.test.js en la consola primero.                     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);

})();
