// ================================================================
// THE HERMIT COCKTAIL BAR - RECETAS Y MENÚ
// ================================================================

const RecetasManager = {
  recetas: [],
  productos: [],
  categorias: [],
  filtroActual: "todos",
  terminoBusqueda: "",

async init() {
    console.log("[DEBUG] RecetasManager.init() iniciado");
    await this.cargarRecetas();
    await this.cargarProductos();
    this.generarCategorias();
    this.renderCategorias();
    this.bindCategoryEvents();
    this.render();
    console.log("[DEBUG] RecetasManager.init() completado");
  },

renderCategorias() {
    const container = document.getElementById("categoryTabs");
    if (!container) return;
    
    container.innerHTML = this.categorias.map(cat => `
      <button class="category-tab ${cat === this.filtroActual ? 'active' : ''}" 
        data-cat="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
    `).join("");
  },

  bindCategoryEvents() {
    const container = document.getElementById("categoryTabs");
    if (!container) return;
    
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".category-tab");
      if (btn) {
        this.setFiltro(btn.dataset.cat);
      }
    });
  },

  async cargarRecetas() {
    console.log("[DEBUG] cargarRecetas() llamado - llamando backend...");
    try {
      const result = await callGoogleScript("obtenerRecetas", {});
      console.log("[DEBUG] obtenerRecetas response:", JSON.stringify(result));
      if (result.status === "success") {
        this.recetas = result.data || [];
        console.log("[DEBUG] recetas asignadas:", this.recetas.length);
      } else {
        console.error("[DEBUG] obtenerRecetas error:", result.message);
        this.recetas = [];
      }
    } catch (e) {
      console.error("[DEBUG] Error cargando recetas:", e);
      this.recetas = [];
    }
  },

  async cargarProductos() {
    try {
      const result = await callGoogleScript("obtenerProductos", {});
      if (result.status === "success") {
        this.productos = result.data || [];
      }
    } catch (e) {
      console.error("Error cargando productos:", e);
      this.productos = [];
    }
  },

  generarCategorias() {
    const categoriasSet = new Set();
    this.recetas.forEach(r => {
      if (r.categoria) categoriasSet.add(r.categoria);
    });
    this.categorias = ["todos", ...Array.from(categoriasSet)];
  },

  filtrarRecetas() {
    let filtradas = this.recetas.filter(r => r.disponible !== false);
    
    if (this.filtroActual !== "todos") {
      filtradas = filtradas.filter(r => r.categoria === this.filtroActual);
    }
    
    if (this.terminoBusqueda) {
      const term = this.terminoBusqueda.toLowerCase();
      filtradas = filtradas.filter(r => 
        r.nombre.toLowerCase().includes(term) ||
        (r.descripcion && r.descripcion.toLowerCase().includes(term))
      );
    }
    
    return filtradas;
  },

  async crearReceta(data) {
    try {
      const result = await callGoogleScript("crearReceta", data);
      if (result.status === "success") {
        await this.cargarRecetas();
        this.generarCategorias();
        return result;
      }
      return result;
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },

  async actualizarReceta(data) {
    try {
      const result = await callGoogleScript("actualizarReceta", data);
      if (result.status === "success") {
        await this.cargarRecetas();
      }
      return result;
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },

  async eliminarReceta(id) {
    try {
      const result = await callGoogleScript("eliminarReceta", { id_receta: id });
      if (result.status === "success") {
        await this.cargarRecetas();
        this.generarCategorias();
      }
      return result;
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },

  async toggleDisponibilidad(id) {
    try {
      const receta = this.recetas.find(r => r.id_receta === id);
      if (!receta) return { status: "error", message: "Receta no encontrada" };

      return await this.actualizarReceta({
        id_receta: id,
        disponible: !receta.disponible
      });
    } catch (error) {
      console.error("Error al togglear disponibilidad:", error);
      return { status: "error", message: "Error al actualizar disponibilidad" };
    }
  },

  buscarProducto(id) {
    return this.productos.find(p => String(p.id) === String(id));
  },

  calcularCostoReceta(receta) {
    if (!receta.ingredientes) return 0;
    
    try {
      const ingredientes = typeof receta.ingredientes === "string" 
        ? JSON.parse(receta.ingredientes) 
        : receta.ingredientes;
      
      return ingredientes.reduce((total, ing) => {
        const producto = this.buscarProducto(ing.producto_id);
        if (producto && producto.precio_onza) {
          return total + (ing.cantidad_oz * parseFloat(producto.precio_onza));
        }
        return total;
      }, 0);
    } catch (e) {
      return 0;
    }
  },

  render() {
    const container = document.getElementById("menuGrid");
    if (!container) return;
    
    const recetasFiltradas = this.filtrarRecetas();
    
    if (recetasFiltradas.length === 0) {
      container.innerHTML = '<div class="menu-vacio">No hay recetas disponibles</div>';
      return;
    }
    
    container.innerHTML = recetasFiltradas.map(receta => this.renderCard(receta)).join("");
    
    this.bindCardEvents();
  },

  renderCard(receta) {
    const costo = this.calcularCostoReceta(receta);
    const margen = receta.precio_venta ? ((receta.precio_venta - costo) / receta.precio_venta * 100).toFixed(0) : 0;
    
    return `
      <div class="menu-card" data-id="${receta.id_receta}">
        <div class="menu-card__imagen">
          ${receta.imagen ? `<img src="${receta.imagen}" alt="${receta.nombre}">` : 
            `<div class="menu-card__placeholder"><i class="fas fa-cocktail"></i></div>`}
          <span class="menu-card__badge">${receta.categoria || "Cóctel"}</span>
        </div>
        <div class="menu-card__contenido">
          <h3 class="menu-card__titulo">${receta.nombre}</h3>
          <p class="menu-card__descripcion">${receta.descripcion || ""}</p>
          <div class="menu-card__precio">$${receta.precio_venta || 0}</div>
          <div class="menu-card__costo">Costo: $${costo.toFixed(2)} (${margen}%)</div>
          <div class="menu-card__controles">
            <button class="btn-cantidad btn-menos" data-id="${receta.id_receta}">−</button>
            <span class="menu-card__cantidad" data-id="${receta.id_receta}">0</span>
            <button class="btn-cantidad btn-mas" data-id="${receta.id_receta}">+</button>
          </div>
        </div>
      </div>
    `;
  },

  bindCardEvents() {
    document.querySelectorAll(".btn-mas").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        this.agregarAlPedido(id, 1);
      });
    });
    
    document.querySelectorAll(".btn-menos").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        this.agregarAlPedido(id, -1);
      });
    });
  },

  agregarAlPedido(recetaId, cantidad) {
    const receta = this.recetas.find(r => r.id_receta === recetaId);
    if (!receta) return;

    if (typeof CuentasManager === 'undefined') {
      console.warn("CuentasManager no está disponible");
      return;
    }

    const cuentaActiva = CuentasManager.getCuentaActiva();
    if (!cuentaActiva) {
      alert("Abre una cuenta primero");
      return;
    }

    if (cantidad > 0) {
      const ingredientes = typeof receta.ingredientes === "string" 
        ? JSON.parse(receta.ingredientes) 
        : receta.ingredientes || [];
      CuentasManager.agregarItem(cuentaActiva.id_cuenta, {
        tipo: "receta",
        receta_id: receta.id_receta,
        nombre: receta.nombre,
        cantidad: cantidad,
        cantidad_oz: 0,
        precio_unitario: receta.precio_venta,
        costo: this.calcularCostoReceta(receta),
        ingredientes: ingredientes
      });
    }

    this.actualizarContador(recetaId);
  },

  actualizarContador(recetaId) {
    if (typeof CuentasManager === 'undefined') return;
    const cuentaActiva = CuentasManager.getCuentaActiva();
    if (!cuentaActiva) return;
    
    const count = cuentaActiva.items.filter(i => i.receta_id === recetaId)
      .reduce((sum, i) => sum + i.cantidad, 0);
    
    const counter = document.querySelector(`.menu-card__cantidad[data-id="${recetaId}"]`);
    if (counter) {
      counter.textContent = count;
    }
  },

  setFiltro(categoria) {
    this.filtroActual = categoria;
    this.render();
  },

  setBusqueda(termino) {
    this.terminoBusqueda = termino;
    this.render();
  },

  abrirModalReceta(receta = null) {
    const modal = document.getElementById("recetaModal");
    if (!modal) return;

    const recetaId = document.getElementById("recetaId");
    const recetaNombre = document.getElementById("recetaNombre");
    const recetaCategoria = document.getElementById("recetaCategoria");
    const recetaDescripcion = document.getElementById("recetaDescripcion");
    const recetaPrecio = document.getElementById("recetaPrecio");
    const recetaForm = document.getElementById("recetaForm");

    if (receta) {
      if (recetaId) recetaId.value = receta.id_receta || "";
      if (recetaNombre) recetaNombre.value = receta.nombre || "";
      if (recetaCategoria) recetaCategoria.value = receta.categoria || "Cóctel";
      if (recetaDescripcion) recetaDescripcion.value = receta.descripcion || "";
      if (recetaPrecio) recetaPrecio.value = receta.precio_venta || 0;

      const recetaImagen = document.getElementById("recetaImagen");
      if (recetaImagen) recetaImagen.value = receta.imagen || "";

      const ingredientes = typeof receta.ingredientes === "string"
        ? JSON.parse(receta.ingredientes)
        : receta.ingredientes || [];

      this.renderIngredientesEditor(ingredientes);
    } else {
      if (recetaForm) recetaForm.reset();
      if (recetaId) recetaId.value = "";
      this.renderIngredientesEditor([]);
    }

    modal.style.display = "flex";
    modal.classList.remove("hidden");
  },

  renderIngredientesEditor(ingredientes) {
    const container = document.getElementById("ingredientesEditor");
    if (!container) return;
    
    container.innerHTML = ingredientes.map((ing, i) => `
      <div class="ingrediente-row">
        <input type="text" class="ingrediente-nombre" value="${ing.nombre_producto || ing.nombre || ""}" 
          placeholder="Nombre del ingrediente" data-index="${i}">
        <input type="number" class="ingrediente-cantidad" value="${ing.cantidad_oz || ing.cantidad || ""}" 
          placeholder="oz" step="0.5" data-index="${i}">
        <button class="btn-eliminar-ingrediente" data-index="${i}">×</button>
      </div>
    `).join("");
    
    this._bindIngredientEventsOnce();
  },

  _bindIngredientEventsOnce() {
    if (this._ingredientEventsBound) return;
    this._ingredientEventsBound = true;
    
    const container = document.getElementById("ingredientesEditor");
    if (!container) return;
    
    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-eliminar-ingrediente")) {
        const row = e.target.closest(".ingrediente-row");
        if (row) row.remove();
      }
    });
  },

  async guardarReceta() {
    const recetaId = document.getElementById("recetaId");
    const recetaNombre = document.getElementById("recetaNombre");
    const recetaCategoria = document.getElementById("recetaCategoria");
    const recetaDescripcion = document.getElementById("recetaDescripcion");
    const recetaPrecio = document.getElementById("recetaPrecio");
    const guardarBtn = document.querySelector('#recetaModal .primary-btn');

    if (!recetaId || !recetaNombre || !recetaCategoria || !recetaDescripcion || !recetaPrecio) {
      console.error("Elementos del formulario de receta no encontrados");
      return;
    }

    const originalBtnText = guardarBtn ? guardarBtn.textContent : "Guardar";
    if (guardarBtn) {
      guardarBtn.textContent = "Guardando...";
      guardarBtn.disabled = true;
    }

    try {
      const id = recetaId.value;
      const data = {
        nombre: recetaNombre.value,
        categoria: recetaCategoria.value,
        descripcion: recetaDescripcion.value,
        precio_venta: parseFloat(recetaPrecio.value) || 0,
        imagen: document.getElementById("recetaImagen")?.value || "",
        ingredientes: this.obtenerIngredientesEditor()
      };

      let result;
      if (id) {
        result = await this.actualizarReceta({ id_receta: id, ...data });
      } else {
        result = await this.crearReceta(data);
      }

      if (result.status === "success") {
        const recetaModal = document.getElementById("recetaModal");
        if (recetaModal) {
          recetaModal.style.display = "none";
          recetaModal.classList.add("hidden");
        }
        this.render();
        if (typeof showToast === "function") {
          showToast("Receta guardada correctamente", "success");
        }
      } else {
        if (typeof showToast === "function") {
          showToast("Error: " + result.message, "error");
        } else {
          alert("Error: " + result.message);
        }
      }
    } finally {
      if (guardarBtn) {
        guardarBtn.textContent = originalBtnText;
        guardarBtn.disabled = false;
      }
    }
  },

  obtenerIngredientesEditor() {
    const rows = document.querySelectorAll(".ingrediente-row");
    const ingredientes = [];
    
    rows.forEach((row, i) => {
      const nombre = row.querySelector(".ingrediente-nombre").value;
      const cantidad = parseFloat(row.querySelector(".ingrediente-cantidad").value) || 0;
      
      if (nombre && cantidad > 0) {
        ingredientes.push({
          nombre_producto: nombre,
          cantidad_oz: cantidad
        });
      }
    });
    
    return ingredientes;
  }
};

function initRecetas() {
  if (document.getElementById("menuGrid")) {
    RecetasManager.init();
  }
}

document.addEventListener("DOMContentLoaded", initRecetas);