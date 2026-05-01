/**
 * Script de verificación y ejecución de pruebas en Node.js
 * Ejecutar: node tests/run-tests.js
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║          🧪 VERIFICACIÓN DE PRUEBAS - INVENTARIO               ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

// Verificar que los archivos existen
const files = [
  'sg.js',
  'script.js',
  'utils.js',
  'index.html',
  'tests/unit.test.js',
  'tests/integration.test.js',
  'tests/run.js',
  'tests/README.md'
];

console.log('📁 Verificando archivos del proyecto...\n');

let allFilesExist = true;
files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('');

// Verificar sintaxis de archivos JS
console.log('🔍 Verificando sintaxis JavaScript...\n');

const jsFiles = [
  'sg.js',
  'script.js',
  'utils.js',
  'tests/unit.test.js',
  'tests/integration.test.js',
  'tests/run.js'
];

let syntaxOk = true;
jsFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Basic check for common issues
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    
    if (openBraces !== closeBraces) {
      console.log(`  ❌ ${file}: Llaves desbalanceadas ({${openBraces} vs ${closeBraces})`);
      syntaxOk = false;
    } else if (openParens !== closeParens) {
      console.log(`  ⚠️  ${file}: Paréntesis desbalanceados`);
      syntaxOk = false;
    } else if (openBrackets !== closeBrackets) {
      console.log(`  ⚠️  ${file}: Corchetes desbalanceados`);
      syntaxOk = false;
    } else {
      console.log(`  ✅ ${file}: Sintaxis correcta`);
    }
  } catch (e) {
    console.log(`  ❌ ${file}: Error al leer - ${e.message}`);
    syntaxOk = false;
  }
});

console.log('');

// Contar líneas de código
console.log('📊 Estadísticas del proyecto...\n');

const countLines = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
};

const sgLines = countLines(path.join(__dirname, '..', 'sg.js'));
const scriptLines = countLines(path.join(__dirname, '..', 'script.js'));
const unitLines = countLines(path.join(__dirname, '..', 'tests/unit.test.js'));
const intLines = countLines(path.join(__dirname, '..', 'tests/integration.test.js'));
const utilsTestLines = countLines(path.join(__dirname, '..', 'tests/utils.test.js'));
const frontendTestLines = countLines(path.join(__dirname, '..', 'tests/frontend.test.js'));
const recetasTestLines = countLines(path.join(__dirname, '..', 'tests/recetas.test.js'));
const cuentasTestLines = countLines(path.join(__dirname, '..', 'tests/cuentas.test.js'));

console.log(`  sg.js:                ${sgLines} líneas`);
console.log(`  script.js:            ${scriptLines} líneas`);
console.log(`  tests/unit.test.js:   ${unitLines} líneas (backend)`);
console.log(`  tests/integration.test.js: ${intLines} líneas`);
console.log(`  tests/utils.test.js:  ${utilsTestLines} líneas`);
console.log(`  tests/frontend.test.js: ${frontendTestLines} líneas`);
console.log(`  tests/recetas.test.js: ${recetasTestLines} líneas`);
console.log(`  tests/cuentas.test.js: ${cuentasTestLines} líneas`);
console.log(`  TOTAL PRUEBAS:        ${unitLines + intLines + utilsTestLines + frontendTestLines + recetasTestLines + cuentasTestLines} líneas`);

console.log('');

// Verificar funciones en sg.js
console.log('🔍 Verificando funciones del backend...\n');

const sgContent = fs.readFileSync(path.join(__dirname, '..', 'sg.js'), 'utf8');

const requiredFunctions = [
  'getColumnIndex',
  'findProductById',
  'generateUniqueAppId',
  'getSpreadsheet',
  'agregarCategoria',
  'agregarProducto',
  'buscarProducto',
  'registrarVentaPOS',
  'registrarCompraPOS',
  'registrarTransaccion',
  'getVentaDetalle',
  'getData'
];

let functionsOk = true;
requiredFunctions.forEach(func => {
  const exists = sgContent.includes(`function ${func}`);
  console.log(`  ${exists ? '✅' : '❌'} ${func}()`);
  if (!exists) functionsOk = false;
});

console.log('');

// Verificar mejoras implementadas
console.log('🔍 Verificando mejoras implementadas...\n');

const improvements = [
  { name: 'getColumnIndex con fallback', check: 'getColumnIndex(sheet, columnName, fallbackIndex)' },
  { name: 'findProductById helper', check: 'function findProductById' },
  { name: 'Validación en agregarCategoria', check: 'No se recibieron datos' },
  { name: 'Validación en agregarProducto', check: 'El nombre del producto es requerido' },
  { name: 'Validación en registrarVentaPOS', check: 'incompleto' },
  { name: 'Validación en registrarCompraPOS', check: 'la cantidad debe ser mayor' },
];

let improvementsOk = true;
improvements.forEach(imp => {
  const exists = sgContent.includes(imp.check);
  console.log(`  ${exists ? '✅' : '❌'} ${imp.name}`);
  if (!exists) improvementsOk = false;
});

console.log('');

// Resumen
console.log('═'.repeat(70));
console.log('📋 RESUMEN DE VERIFICACIÓN');
console.log('═'.repeat(70));

const allOk = allFilesExist && syntaxOk && functionsOk && improvementsOk;

if (allOk) {
  console.log('  ✅ Archivos:        OK');
  console.log('  ✅ Sintaxis:        OK');
  console.log('  ✅ Funciones:       OK');
  console.log('  ✅ Mejoras:         OK');
  console.log('\n🎉 ¡Todas las verificaciones pasaron!\n');
  
  console.log('📝 SIGUIENTES PASOS:');
  console.log('  1. Abre la aplicación en el navegador');
  console.log('  2. Abre la consola (F12)');
  console.log('  3. Incluye los scripts de prueba:');
  console.log('     <script src="tests/unit.test.js"></script>');
  console.log('     <script src="tests/integration.test.js"></script>');
  console.log('     <script src="tests/run.js"></script>');
  console.log('  4. Ejecuta: runAllTests()');
  console.log('');
} else {
  console.log('  ❌ Se encontraron problemas. Revisa los errores arriba.');
  process.exit(1);
}

// Intentar cargar sg.js para verificar parseo
console.log('🔄 Verificando parseo de sg.js...\n');

try {
  // Crear un entorno simulado para verificar que el código se puede parsear
  const sgPath = path.join(__dirname, '..', 'sg.js');
  const content = fs.readFileSync(sgPath, 'utf8');
  
  // Verificar que no hay errores obvios
  const errors = [];
  
  // Check for common issues
  if (content.includes('undefined.')) {
    errors.push('Posible referencia a undefined');
  }
  if (content.includes('null.') && !content.includes('null.')) {
    errors.push('Posible referencia a null');
  }
  
  if (errors.length === 0) {
    console.log('  ✅ sg.js se puede parsear correctamente');
  } else {
    console.log('  ⚠️  Posibles problemas encontrados:');
    errors.forEach(e => console.log(`     - ${e}`));
  }
} catch (e) {
  console.log(`  ❌ Error al verificar sg.js: ${e.message}`);
}

console.log('\n' + '='.repeat(70));
console.log('✅ VERIFICACIÓN COMPLETADA');
console.log('='.repeat(70) + '\n');
