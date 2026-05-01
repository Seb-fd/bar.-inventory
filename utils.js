// utils.js - shared utility functions for Inventory project

// Constants
const MOBILE_BREAKPOINT = 992;
const TABLE_BREAKPOINT = 768;

// Wrapper for fetch that returns JSON and handles errors
async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('fetchJson error:', error);
    throw error;
  }
}

// Loading overlay helpers
function showLoading(message = 'Cargando...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  if (text) text.textContent = message;
  if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

// Currency formatting
function formatCurrency(valor) {
  if (!valor && valor !== 0) return "";
  const numero = Number(valor);
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero);
}

// Clean number (remove non-digits)
function cleanNumber(valor) {
  return Number(String(valor).replace(/[^\d]/g, ""));
}

// Format consecutive (pad with zeros)
function formatConsecutive(valor) {
  if (!valor) return "00001";
  return String(valor).padStart(5, "0");
}

// Debounce utility
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFLINE SUPPORT - Cola de ventas sin conexión
// ═══════════════════════════════════════════════════════════════════════════

const OFFLINE_KEY = 'ventasOffline';
const MAX_OFFLINE_VENTAS = 50;

// Guardar venta en localStorage cuando no hay internet
function saveVentaOffline(ventaData) {
  try {
    const ventas = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    
    const ventaOffline = {
      ...ventaData,
      timestamp: Date.now(),
      synced: false,
      offlineId: 'OFF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
    };
    
    ventas.push(ventaOffline);
    
    // Mantener solo las últimas MAX_OFFLINE_VENTAS
    const ventasFiltradas = ventas.slice(-MAX_OFFLINE_VENTAS);
    
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(ventasFiltradas));
    
    console.log(`[OFFLINE] Venta guardada offline: ${ventaOffline.offlineId}`);
    updateOfflineIndicator();
    
    return ventaOffline.offlineId;
  } catch (e) {
    console.error('[OFFLINE] Error al guardar venta:', e);
    return null;
  }
}

// Obtener todas las ventas offline
function getVentasOffline() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
  } catch (e) {
    console.error('[OFFLINE] Error al obtener ventas:', e);
    return [];
  }
}

// Obtener ventas pendientes de sincronizar
function getVentasPendientes() {
  const ventas = getVentasOffline();
  return ventas.filter(v => !v.synced);
}

// Contar ventas pendientes
function getVentasPendientesCount() {
  return getVentasPendientes().length;
}

// Sincronizar ventas pendientes con el servidor
async function syncVentasOffline() {
  if (!navigator.onLine) {
    console.log('[OFFLINE] Sin conexión, sincronización cancelada');
    return { success: 0, failed: 0 };
  }

  const pendientes = getVentasPendientes();
  if (pendientes.length === 0) {
    console.log('[OFFLINE] No hay ventas pendientes');
    return { success: 0, failed: 0 };
  }

  console.log(`[OFFLINE] Sincronizando ${pendientes.length} ventas...`);
  
  let success = 0;
  let failed = 0;

  for (const venta of pendientes) {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(venta)
      });
      
      const responseData = response.ok ? await response.json().catch(() => ({})) : {};
      
      if (response.ok && (responseData.status === 'success' || responseData.status === undefined)) {
        // Marcar como sincronizada
        const ventas = getVentasOffline();
        const idx = ventas.findIndex(v => v.offlineId === venta.offlineId);
        if (idx !== -1) {
          ventas[idx].synced = true;
          ventas[idx].syncTime = Date.now();
          ventas[idx].serverId = responseData.id_venta || responseData.ventaId;
          delete ventas[idx].lastError;
          delete ventas[idx].retryCount;
          localStorage.setItem(OFFLINE_KEY, JSON.stringify(ventas));
        }
        success++;
        console.log(`[OFFLINE] Sincronizada: ${venta.offlineId}`);
      } else {
        // Guardar detalle del error
        const errorMsg = responseData.message || `HTTP ${response.status}`;
        const ventas = getVentasOffline();
        const idx = ventas.findIndex(v => v.offlineId === venta.offlineId);
        if (idx !== -1) {
          ventas[idx].lastError = errorMsg;
          ventas[idx].retryCount = (ventas[idx].retryCount || 0) + 1;
          ventas[idx].lastRetry = Date.now();
          localStorage.setItem(OFFLINE_KEY, JSON.stringify(ventas));
        }
        failed++;
        console.error(`[OFFLINE] Error al sincronizar ${venta.offlineId}: ${errorMsg}`);
      }
    } catch (e) {
      // Guardar error de conexión
      const ventas = getVentasOffline();
      const idx = ventas.findIndex(v => v.offlineId === venta.offlineId);
      if (idx !== -1) {
        ventas[idx].lastError = e.message;
        ventas[idx].retryCount = (ventas[idx].retryCount || 0) + 1;
        ventas[idx].lastRetry = Date.now();
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(ventas));
      }
      failed++;
      console.error(`[OFFLINE] Falló sincronización de ${venta.offlineId}:`, e.message);
    }
  }

  // Eliminar ventas sincronizadas del storage
  if (success > 0) {
    clearSyncedVentas();
    // Notificar que el inventario debe actualizarse
    window.dispatchEvent(new Event('ventasSincronizadas'));
  }

  updateOfflineIndicator();
  console.log(`[OFFLINE] Sincronización completa: ${success} éxito, ${failed} fallidos`);
  
  return { success, failed };
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFLINE SUPPORT - Compras sin conexión
// ═══════════════════════════════════════════════════════════════════════════

const COMPRAS_OFFLINE_KEY = 'comprasOffline';
const MAX_OFFLINE_COMPRAS = 50;

// Guardar compra en localStorage cuando no hay internet
function saveCompraOffline(compraData) {
  try {
    const compras = JSON.parse(localStorage.getItem(COMPRAS_OFFLINE_KEY) || '[]');
    
    const compraOffline = {
      ...compraData,
      timestamp: Date.now(),
      synced: false,
      offlineId: 'OFFC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
    };
    
    compras.push(compraOffline);
    
    const comprasFiltradas = compras.slice(-MAX_OFFLINE_COMPRAS);
    
    localStorage.setItem(COMPRAS_OFFLINE_KEY, JSON.stringify(comprasFiltradas));
    
    console.log(`[OFFLINE] Compra guardada offline: ${compraOffline.offlineId}`);
    updateOfflineIndicator();
    
    return compraOffline.offlineId;
  } catch (e) {
    console.error('[OFFLINE] Error al guardar compra:', e);
    return null;
  }
}

// Obtener todas las compras offline
function getComprasOffline() {
  try {
    return JSON.parse(localStorage.getItem(COMPRAS_OFFLINE_KEY) || '[]');
  } catch (e) {
    console.error('[OFFLINE] Error al obtener compras:', e);
    return [];
  }
}

// Obtener compras pendientes de sincronizar
function getComprasPendientes() {
  const compras = getComprasOffline();
  return compras.filter(c => !c.synced);
}

// Contar compras pendientes
function getComprasPendientesCount() {
  return getComprasPendientes().length;
}

// Sincronizar compras pendientes con el servidor
async function syncComprasOffline() {
  if (!navigator.onLine) {
    console.log('[OFFLINE] Sin conexión, sincronización de compras cancelada');
    return { success: 0, failed: 0 };
  }

  const pendientes = getComprasPendientes();
  if (pendientes.length === 0) {
    console.log('[OFFLINE] No hay compras pendientes');
    return { success: 0, failed: 0 };
  }

  console.log(`[OFFLINE] Sincronizando ${pendientes.length} compras...`);
  
  let success = 0;
  let failed = 0;

  for (const compra of pendientes) {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(compra)
      });
      
      const responseData = response.ok ? await response.json().catch(() => ({})) : {};
      
      if (response.ok && (responseData.status === 'success' || responseData.status === undefined)) {
        const compras = getComprasOffline();
        const idx = compras.findIndex(c => c.offlineId === compra.offlineId);
        if (idx !== -1) {
          compras[idx].synced = true;
          compras[idx].syncTime = Date.now();
          compras[idx].serverId = responseData.compraId;
          delete compras[idx].lastError;
          delete compras[idx].retryCount;
          localStorage.setItem(COMPRAS_OFFLINE_KEY, JSON.stringify(compras));
        }
        success++;
        console.log(`[OFFLINE] Sincronizada compra: ${compra.offlineId}`);
      } else {
        const errorMsg = responseData.message || `HTTP ${response.status}`;
        const compras = getComprasOffline();
        const idx = compras.findIndex(c => c.offlineId === compra.offlineId);
        if (idx !== -1) {
          compras[idx].lastError = errorMsg;
          compras[idx].retryCount = (compras[idx].retryCount || 0) + 1;
          compras[idx].lastRetry = Date.now();
          localStorage.setItem(COMPRAS_OFFLINE_KEY, JSON.stringify(compras));
        }
        failed++;
        console.error(`[OFFLINE] Error al sincronizar compra ${compra.offlineId}: ${errorMsg}`);
      }
    } catch (e) {
      const compras = getComprasOffline();
      const idx = compras.findIndex(c => c.offlineId === compra.offlineId);
      if (idx !== -1) {
        compras[idx].lastError = e.message;
        compras[idx].retryCount = (compras[idx].retryCount || 0) + 1;
        compras[idx].lastRetry = Date.now();
        localStorage.setItem(COMPRAS_OFFLINE_KEY, JSON.stringify(compras));
      }
      failed++;
      console.error(`[OFFLINE] Falló sincronización de compra ${compra.offlineId}:`, e.message);
    }
  }

  console.log(`[OFFLINE] Sincronización de compras completa: ${success} éxito, ${failed} fallidos`);
  
  return { success, failed };
}

// Sincronizar todo (ventas + compras)
async function syncAllOffline() {
  const ventasResult = await syncVentasOffline();
  const comprasResult = await syncComprasOffline();
  
  return {
    ventas: ventasResult,
    compras: comprasResult,
    totalSuccess: ventasResult.success + comprasResult.success,
    totalFailed: ventasResult.failed + comprasResult.failed
  };
}

// Eliminar venta sincronizada del storage
function clearSyncedVentas() {
  try {
    const ventas = getVentasOffline();
    const pendientes = ventas.filter(v => !v.synced);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(pendientes));
    updateOfflineIndicator();
    console.log('[OFFLINE] Ventas sincronizadas eliminadas del storage');
  } catch (e) {
    console.error('[OFFLINE] Error al limpiar:', e);
  }
}

// Verificar si hay conexión
function isOnline() {
  return navigator.onLine;
}

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIO OFFLINE - Cache local del inventario
// ═══════════════════════════════════════════════════════════════════════════

const INVENTARIO_KEY = 'inventarioCache';
const MAX_INVENTARIO_AGE = 24 * 60 * 60 * 1000; // 24 horas

// Guardar inventario en localStorage
function saveInventarioOffline(inventarioData) {
  try {
    const data = {
      data: inventarioData,
      timestamp: Date.now()
    };
    localStorage.setItem(INVENTARIO_KEY, JSON.stringify(data));
    console.log('[INVENTARIO] Guardado en localStorage');
  } catch (e) {
    console.error('[INVENTARIO] Error al guardar:', e);
  }
}

// Obtener inventario de localStorage
function getInventarioOffline() {
  try {
    const stored = JSON.parse(localStorage.getItem(INVENTARIO_KEY));
    if (!stored || !stored.data) return null;
    
    // Verificar si los datos son muy antiguos
    if (Date.now() - stored.timestamp > MAX_INVENTARIO_AGE) {
      console.log('[INVENTARIO] Datos locales muy antiguos, ignorando');
      return null;
    }
    
    return stored.data;
  } catch (e) {
    console.error('[INVENTARIO] Error al leer:', e);
    return null;
  }
}

// Actualizar indicador visual de ventas pendientes
function updateOfflineIndicator() {
  const count = getVentasPendientesCount();
  
  // Actualizar indicador en sección de ventas
  const indicatorVentas = document.getElementById('offlineIndicatorVentas');
  const countVentas = document.getElementById('offlineCountVentas');
  if (indicatorVentas && countVentas) {
    countVentas.textContent = count;
    if (count > 0) {
      indicatorVentas.classList.remove('hidden');
    } else {
      indicatorVentas.classList.add('hidden');
    }
  }
}

// Inicializar listeners de conexión
function initOfflineSupport() {
  // Listener para cuando vuelve la conexión
  window.addEventListener('online', () => {
    console.log('[OFFLINE] Conexión restaurada!');
    syncAllOffline();
  });
  
  // Listener para cuando se pierde la conexión
  window.addEventListener('offline', () => {
    console.log('[OFFLINE] Conexión perdida');
  });
  
  // Actualizar indicador al cargar
  updateOfflineIndicator();
  
  // Intentar sincronizar al cargar si hay conexión
  if (navigator.onLine) {
    setTimeout(syncAllOffline, 2000);
  }
}

// Export utilities (for browsers, attach to window)
window.utils = {
  MOBILE_BREAKPOINT,
  TABLE_BREAKPOINT,
  fetchJson,
  showLoading,
  hideLoading,
  formatCurrency,
  cleanNumber,
  formatConsecutive,
  debounce,
  // Offline support - Ventas
  saveVentaOffline,
  getVentasOffline,
  getVentasPendientes,
  getVentasPendientesCount,
  syncVentasOffline,
  clearSyncedVentas,
  isOnline,
  updateOfflineIndicator,
  initOfflineSupport,
  // Offline support - Compras
  saveCompraOffline,
  getComprasOffline,
  getComprasPendientes,
  getComprasPendientesCount,
  syncComprasOffline,
  syncAllOffline,
  // Inventario offline
  saveInventarioOffline,
  getInventarioOffline,
};
