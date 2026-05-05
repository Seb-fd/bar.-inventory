// ================================================================
// THE HERMIT COCKTAIL BAR - SISTEMA DE CUENTAS ABIERTAS
// ================================================================

const CuentasManager = {
  cuentasAbiertas: [],
  cuentaActiva: null,
  syncInterval: null,
  _initialized: false,
  STORAGE_KEY: "hermit_cuentas_abiertas",
  ULTIMA_SINCRONIZACION_KEY: "hermit_ultima_sincronizacion",

  init() {
    if (this._initialized) return;
    this._initialized = true;
    this.cargarDesdeLocalStorage();
    this.iniciarSincronizacion();
    this.restaurarCuentasDesdeBackend();
  },

  cargarDesdeLocalStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.cuentasAbiertas = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error cargando cuentas desde localStorage:", e);
      this.cuentasAbiertas = [];
    }
  },

  guardarEnLocalStorage() {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.cuentasAbiertas = this.cuentasAbiertas.filter(c => {
        if (c.estado === "abierta") return true;
        if (c.cierre) {
          const cierreTime = new Date(c.cierre).getTime();
          return cierreTime > oneDayAgo;
        }
        return true;
      });
      
      const cleanData = this.cuentasAbiertas.map(c => {
        const { _syncedCount, ...rest } = c;
        return rest;
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanData));
      localStorage.setItem(this.ULTIMA_SINCRONIZACION_KEY, Date.now().toString());
    } catch (e) {
      console.error("Error guardando en localStorage:", e);
    }
  },

  iniciarSincronizacion() {
    this.syncInterval = setInterval(() => {
      this.sincronizarConBackend();
    }, 30000);
  },

  detenerSincronizacion() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  },

  async sincronizarConBackend() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    try {
      const cuentasPendientes = this.cuentasAbiertas.filter(c => c.estado === "abierta");
      
      for (const cuenta of cuentasPendientes) {
        if (!cuenta._syncedCount) cuenta._syncedCount = 0;
        const items = cuenta.items || [];
        const pendingItems = items.slice(cuenta._syncedCount);
        
        for (const item of pendingItems) {
          try {
            await callGoogleScript("agregarItemCuenta", {
              id_cuenta: cuenta.id_cuenta,
              item: item
            });
            cuenta._syncedCount++;
          } catch (e) {
            console.log("Error sincronizando item:", item.id);
            break;
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }
  },

  async restaurarCuentasDesdeBackend() {
    try {
      const result = await callGoogleScript("obtenerCuentas", { estado: "abierta" });
      if (result.status === "success" && result.data) {
        result.data.forEach(cuenta => {
          const existe = this.cuentasAbiertas.find(c => c.id_cuenta === cuenta.id_cuenta);
          if (!existe) {
            this.cuentasAbiertas.push(cuenta);
          }
        });
        this.guardarEnLocalStorage();
      }
    } catch (e) {
      console.log("Restaurando desde backend (offline):", e.message);
    }
  },

  generarIdCuenta() {
    return "CTA-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
  },

  async abrirCuenta(data) {
    const nuevaCuenta = {
      id_cuenta: this.generarIdCuenta(),
      id_mesa: data.id_mesa,
      nombre_mesa: data.nombre_mesa,
      id_silla: data.id_silla || null,
      inicio: new Date().toISOString(),
      estado: "abierta",
      items: [],
      subtotal: 0,
      descuento: 0,
      total: 0,
      observaciones: "",
      ultima_actualizacion: new Date().toISOString()
    };

    this.cuentasAbiertas.push(nuevaCuenta);
    this.cuentaActiva = nuevaCuenta.id_cuenta;
    this.guardarEnLocalStorage();

    try {
      await callGoogleScript("abrirCuenta", data);
    } catch (e) {
      console.log("Cuenta guardada localmente (offline):", e.message);
    }

    return nuevaCuenta;
  },

  agregarItem(idCuenta, item) {
    const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
    if (!cuenta) return null;

    const nuevoItem = {
      id: "ITEM-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6),
      tipo: item.tipo,
      producto_id: item.producto_id || null,
      receta_id: item.receta_id || null,
      nombre: item.nombre,
      cantidad: item.cantidad,
      cantidad_oz: item.cantidad_oz || 0,
      precio_unitario: item.precio_unitario,
      subtotal: item.cantidad * item.precio_unitario,
      notas: item.notas || "",
      timestamp: new Date().toISOString(),
      ingredientes: item.ingredientes || []
    };

    cuenta.items.push(nuevoItem);
    cuenta.subtotal = cuenta.items.reduce((sum, i) => sum + i.subtotal, 0);
    cuenta.total = cuenta.subtotal - cuenta.descuento;
    cuenta.ultima_actualizacion = new Date().toISOString();

    this.guardarEnLocalStorage();
    this.actualizarUI();

    return cuenta;
  },

  removerItem(idCuenta, itemId) {
    const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
    if (!cuenta) return null;

    cuenta.items = cuenta.items.filter(i => i.id !== itemId);
    cuenta.subtotal = cuenta.items.reduce((sum, i) => sum + i.subtotal, 0);
    cuenta.total = cuenta.subtotal - cuenta.descuento;
    cuenta.ultima_actualizacion = new Date().toISOString();

    this.guardarEnLocalStorage();
    this.actualizarUI();

    return cuenta;
  },

  actualizarCantidad(idCuenta, itemId, nuevaCantidad) {
    const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
    if (!cuenta) return null;

    const item = cuenta.items.find(i => i.id === itemId);
    if (!item) return null;

    item.cantidad = nuevaCantidad;
    item.subtotal = item.cantidad * item.precio_unitario;
    cuenta.subtotal = cuenta.items.reduce((sum, i) => sum + i.subtotal, 0);
    cuenta.total = cuenta.subtotal - cuenta.descuento;
    cuenta.ultima_actualizacion = new Date().toISOString();

    this.guardarEnLocalStorage();
    this.actualizarUI();

    return cuenta;
  },

  aplicarDescuento(idCuenta, montoDescuento) {
    const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
    if (!cuenta) return null;

    cuenta.descuento = montoDescuento;
    cuenta.total = cuenta.subtotal - cuenta.descuento;
    cuenta.ultima_actualizacion = new Date().toISOString();

    this.guardarEnLocalStorage();
    this.actualizarUI();

    return cuenta;
  },

  async cerrarCuenta(idCuenta, datosPago) {
    const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
    if (!cuenta) return { status: "error", message: "Cuenta no encontrada" };

    const itemsParaDescontar = cuenta.items.map(item => ({
      tipo: item.tipo,
      producto_id: item.producto_id,
      receta_id: item.receta_id,
      cantidad: item.cantidad,
      cantidad_oz: item.cantidad_oz
    }));

    try {
      await descontarInventarioPorVenta(itemsParaDescontar);
    } catch (e) {
      console.error("Error descontando inventario:", e);
    }

    cuenta.estado = "cerrada";
    cuenta.forma_pago = datosPago?.metodo_pago || "efectivo";
    cuenta.monto_recibido = datosPago?.monto_recibido || 0;
    cuenta.cambio = datosPago?.cambio || 0;
    cuenta.cierre = new Date().toISOString();

    this.guardarEnLocalStorage();

    try {
      await callGoogleScript("cerrarCuenta", {
        id_cuenta: idCuenta,
        estado: "cerrada",
        descuento: cuenta.descuento,
        items: cuenta.items,
        nombre_mesa: cuenta.nombre_mesa,
        forma_pago: cuenta.forma_pago,
        monto_recibido: cuenta.monto_recibido,
        cambio: cuenta.cambio
      });
    } catch (e) {
      console.log("Cuenta cerrada localmente:", e.message);
    }

    if (this.cuentaActiva === idCuenta) {
      this.cuentaActiva = null;
    }

    this.actualizarUI();
    return { status: "success", cuenta: cuenta };
  },

  async cancelarCuenta(idCuenta) {
    const cuenta = this.cuentasAbiertas.find(c => c.id_cuenta === idCuenta);
    if (!cuenta) return { status: "error", message: "Cuenta no encontrada" };

    cuenta.estado = "cancelada";
    cuenta.ultima_actualizacion = new Date().toISOString();

    this.guardarEnLocalStorage();

    try {
      await callGoogleScript("eliminarCuenta", { id_cuenta: idCuenta });
    } catch (e) {
      console.log("Cuenta cancelada localmente:", e.message);
    }

    if (this.cuentaActiva === idCuenta) {
      this.cuentaActiva = null;
    }

    this.actualizarUI();
    return { status: "success" };
  },

  getCuentasAbiertas() {
    return this.cuentasAbiertas.filter(c => c.estado === "abierta");
  },

  getCuentaActiva() {
    if (!this.cuentaActiva) return null;
    return this.cuentasAbiertas.find(c => c.id_cuenta === this.cuentaActiva);
  },

  setCuentaActiva(idCuenta) {
    this.cuentaActiva = idCuenta;
    this.actualizarUI();
  },

  getCuentasPorMesa(idMesa) {
    return this.cuentasAbiertas.filter(c => c.id_mesa === idMesa && c.estado === "abierta");
  },

  actualizarUI() {
    const cuentaActiva = this.getCuentaActiva();
    const totalElement = document.getElementById("cuentaActivaTotal");
    if (totalElement && cuentaActiva) {
      totalElement.textContent = "$" + cuentaActiva.total.toFixed(2);
    }
    
    document.dispatchEvent(new CustomEvent("cuentasActualizadas", {
      detail: { cuentas: this.getCuentasAbiertas() }
    }));
  },

  obtenerResumenDia() {
    const hoy = new Date().toISOString().split("T")[0];
    const cuentasCerradas = this.cuentasAbiertas.filter(c => 
      c.estado === "cerrada" && c.cierre && c.cierre.startsWith(hoy)
    );
    
    return {
      totalVentas: cuentasCerradas.reduce((sum, c) => sum + c.total, 0),
      totalCuentas: cuentasCerradas.length,
      ticketPromedio: cuentasCerradas.length > 0 
        ? cuentasCerradas.reduce((sum, c) => sum + c.total, 0) / cuentasCerradas.length 
        : 0
    };
  }
};

function resetearCuentasLocal() {
  if (!confirm("¿Limpiar cuentas del navegador?\n\nEsto NO elimina las cuentas del servidor (Google Sheet).\nSolo limpia los datos locales del navegador.\n\n¿Continuar?")) return;
  
  try {
    CuentasManager.detenerSincronizacion();
    localStorage.removeItem("hermit_cuentas_abiertas");
    localStorage.removeItem("hermit_ultima_sincronizacion");
    CuentasManager.cuentasAbiertas = [];
    CuentasManager.cuentaActiva = null;
    CuentasManager._initialized = false;
    CuentasManager.guardarEnLocalStorage();
    CuentasManager.actualizarUI();
    console.log("[CUENTAS] Local storage limpiado");
    alert("Cuentas del navegador limpiadas.\nRecarga la página.");
    location.reload();
  } catch (e) {
    console.error("[CUENTAS] Error:", e);
  }
}

async function descontarInventarioPorVenta(items) {
  try {
    const result = await callGoogleScript("descontarInventarioPorVenta", { items });
    return result;
  } catch (e) {
    console.error("Error descontando inventario:", e);
    throw e;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!CuentasManager._initialized) {
    CuentasManager.init();
    CuentasManager._initialized = true;
  }
});