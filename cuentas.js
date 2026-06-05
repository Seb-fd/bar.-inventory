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
      // Enviar el ID local al backend para mantener consistencia
      const dataConId = { ...data, id_cuenta: nuevaCuenta.id_cuenta };
      const result = await callGoogleScript("abrirCuenta", dataConId);
      
      // Si el backend retorna un ID diferente, actualizar la cuenta local
      if (result.status === "success" && result.id_cuenta && result.id_cuenta !== nuevaCuenta.id_cuenta) {
        // Actualizar ID en la cuenta local
        const cuentaIndex = this.cuentasAbiertas.findIndex(c => c.id_cuenta === nuevaCuenta.id_cuenta);
        if (cuentaIndex !== -1) {
          this.cuentasAbiertas[cuentaIndex].id_cuenta = result.id_cuenta;
          if (this.cuentaActiva === nuevaCuenta.id_cuenta) {
            this.cuentaActiva = result.id_cuenta;
          }
          this.guardarEnLocalStorage();
        }
      }
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

    if (cuenta.estado === "cerrada" || cuenta.estado === "cerrando") {
      return { status: "warning", message: "La cuenta ya está en proceso de cierre o está cerrada" };
    }

    cuenta.estado = "cerrando";
    this.guardarEnLocalStorage();

    try {
      const result = await callGoogleScript("cerrarCuenta", {
        id_cuenta: idCuenta,
        estado: "cerrada",
        descuento: cuenta.descuento,
        items: cuenta.items,
        nombre_mesa: cuenta.nombre_mesa,
        forma_pago: datosPago?.metodo_pago || "efectivo",
        monto_recibido: datosPago?.monto_recibido || 0,
        cambio: datosPago?.cambio || 0
      });

      if (result.status === "warning" && result.message.includes("ya")) {
        cuenta.estado = "cerrada";
        this.guardarEnLocalStorage();
        return result;
      }

      if (result.status !== "success") {
        cuenta.estado = "abierta";
        this.guardarEnLocalStorage();
        return { status: "error", message: result.message || "Error al cerrar cuenta en el servidor" };
      }
    } catch (e) {
      cuenta.estado = "abierta";
      this.guardarEnLocalStorage();
      console.log("Error cerrando cuenta:", e.message);
      return { status: "error", message: "Error de conexión: " + e.message };
    }

    cuenta.estado = "cerrada";
    cuenta.forma_pago = datosPago?.metodo_pago || "efectivo";
    cuenta.monto_recibido = datosPago?.monto_recibido || 0;
    cuenta.cambio = datosPago?.cambio || 0;
    cuenta.cierre = new Date().toISOString();

    this.guardarEnLocalStorage();

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

    // Eliminar del array local
    const idx = this.cuentasAbiertas.findIndex(c => c.id_cuenta === idCuenta);
    if (idx !== -1) {
      this.cuentasAbiertas.splice(idx, 1);
    }

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
      totalElement.textContent = "$" + formatearCOP(cuentaActiva.total);
    }
    
    document.dispatchEvent(new CustomEvent("cuentasActualizadas", {
      detail: { cuentas: this.getCuentasAbiertas() }
    }));
  },

  async obtenerResumenDia() {
    const hoy = new Date().toISOString().split("T")[0];
    
    try {
      const result = await callGoogleScript("obtenerCuentas", { estado: "cerrada" });
      
      if (result.status === "success" && result.data) {
        const cuentasCerradas = result.data.filter(c => {
          const fecha = c.inicio || "";
          return fecha.startsWith(hoy);
        });
        
        const totalVentas = cuentasCerradas.reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
        
        return {
          totalVentas,
          totalCuentas: cuentasCerradas.length,
          ticketPromedio: cuentasCerradas.length > 0 ? totalVentas / cuentasCerradas.length : 0
        };
      }
    } catch (e) {
      console.log("Error obteniendo resumen del backend:", e.message);
    }
    
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

const cuentasRefresh = {
  _updating: false,
  
  _formatCOP(value) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).replace("COP", "");
  },
  
  async sync() {
    if (typeof CuentasManager === "undefined") return;
    if (this._updating) return;
    this._updating = true;
    
    try {
      await CuentasManager.restaurarCuentasDesdeBackend();
    } finally {
      this._updating = false;
    }
  },
  
  renderUI() {
    if (typeof CuentasManager === "undefined") return;
    
    const container1 = document.getElementById("listaCuentasAbiertas");
    const container2 = document.getElementById("mesasCuentasGrid");
    const select = document.getElementById("selectorCuenta");
    
    if (container1 || container2 || select) {
      this._renderCuentas();
    }
    
    if (select) {
      this._renderSelector();
    }
    
    this._renderPanel();
  },
  
  async stats() {
    if (typeof CuentasManager === "undefined") {
      this._updateStatsElements(0, 0, 0);
      return;
    }
    
    try {
      const resumen = await CuentasManager.obtenerResumenDia();
      this._updateStatsElements(resumen.totalVentas, resumen.totalCuentas, resumen.ticketPromedio);
    } catch (e) {
      console.log("Error actualizando stats:", e);
      this._updateStatsElements(0, 0, 0);
    }
  },
  
  async all() {
    await this.sync();
    this.renderUI();
    await this.stats();
  },
  
  _renderCuentas() {
    const container = document.getElementById("listaCuentasAbiertas");
    if (!container) return;
    
    const cuentas = typeof CuentasManager !== "undefined" ? CuentasManager.getCuentasAbiertas() : [];
    
    if (cuentas.length === 0) {
      container.innerHTML = '<div class="cuenta-vacio">No hay cuentas abiertas</div>';
      return;
    }
    
    let html = "";
    cuentas.forEach(cuenta => {
      const tiempo = new Date(cuenta.inicio).toLocaleTimeString();
      html += `
        <div class="cuenta-abierta-item" onclick="seleccionarCuenta('${cuenta.id_cuenta}')">
          <div class="mesa-nombre">${cuenta.nombre_mesa || "Mesa"}</div>
          <div class="cuenta-info">
            <span>${cuenta.items.length} items</span>
            <span>${tiempo}</span>
            <span style="color: var(--hermit-accent); font-weight: bold;">${this._formatCOP(cuenta.total || 0)}</span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },
  
  _renderSelector() {
    const select = document.getElementById("selectorCuenta");
    if (!select) return;
    
    const cuentas = typeof CuentasManager !== "undefined" ? CuentasManager.getCuentasAbiertas() : [];
    
    let html = '<option value="">Seleccionar...</option>';
    cuentas.forEach(c => {
      html += `<option value="${c.id_cuenta}" ${CuentasManager.cuentaActiva === c.id_cuenta ? "selected" : ""}>
        ${c.nombre_mesa || "Mesa"} - $${this._formatCOP(c.total || 0)}
      </option>`;
    });
    select.innerHTML = html;
  },
  
  _renderPanel() {
    const itemsContainer = document.getElementById("cuentaItems");
    const subtotalEl = document.getElementById("cuentaSubtotal");
    const totalEl = document.getElementById("cuentaActivaTotal");
    
    if (!itemsContainer && !subtotalEl && !totalEl) return;
    
    const cuenta = typeof CuentasManager !== "undefined" ? CuentasManager.getCuentaActiva() : null;
    
    if (!cuenta || !cuenta.items || cuenta.items.length === 0) {
      if (itemsContainer) itemsContainer.innerHTML = '<div class="cuenta-vacio">Sin items</div>';
      if (subtotalEl) subtotalEl.textContent = "$0";
      if (totalEl) totalEl.textContent = "$0";
      return;
    }
    
    if (itemsContainer) {
      itemsContainer.innerHTML = cuenta.items.map(item => `
        <div class="cuenta-item-row">
          <div class="cuenta-item-info">
            <span>${item.cantidad}x ${item.nombre}</span>
            <span class="cuenta-item-notas">${item.notas || ""}</span>
          </div>
          <span>${this._formatCOP(item.subtotal || 0)}</span>
        </div>
      `).join("");
    }
    
    if (subtotalEl) subtotalEl.textContent = "$" + this._formatCOP(cuenta.subtotal || 0);
    if (totalEl) totalEl.textContent = "$" + this._formatCOP(cuenta.total || 0);
  },
  
  _updateStatsElements(ventas, cuentas, ticket) {
    const map = {
      "ventasDia": "$" + this._formatCOP(ventas),
      "cuentasPagadas": cuentas,
      "ticketPromedio": "$" + formatearCOP(ticket),
      "kpiVentas": "$" + this._formatCOP(ventas),
      "kpiTicket": "$" + formatearCOP(ticket)
    };
    
    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (!CuentasManager._initialized) {
    CuentasManager.init();
    CuentasManager._initialized = true;
  }
});