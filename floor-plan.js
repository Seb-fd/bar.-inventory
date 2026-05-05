// ================================================================
// THE HERMIT COCKTAIL BAR - FLOOR PLAN MANAGER
// ================================================================

const FloorPlanManager = {
  canvas: null,
  ctx: null,
  mesas: [],
  zonas: [],
  isDragging: false,
  selectedMesa: null,
  dragOffset: { x: 0, y: 0 },
  scale: 1,
  panOffset: { x: 0, y: 0 },
  isPanning: false,
  modoEdicion: false,
  fondoImagen: null,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error("Canvas no encontrado:", canvasId);
      return;
    }
    this.ctx = this.canvas.getContext("2d");
    this.setupCanvas();
    this.bindEvents();
    this.loadData();
  },

  setupCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = 500;
  },

  bindEvents() {
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.onMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.onWheel.bind(this));
    this.canvas.addEventListener("click", this.onClick.bind(this));
    
    window.addEventListener("resize", () => {
      this.setupCanvas();
      this.render();
    });
  },

  async loadData() {
    try {
      const zonasRes = await callGoogleScript("obtenerZonas", {});
      if (zonasRes.status === "success") {
        this.zonas = zonasRes.data || [];
      }
      
      const mesasRes = await callGoogleScript("obtenerMesas", {});
      if (mesasRes.status === "success" && mesasRes.data && mesasRes.data.length > 0) {
        this.mesas = mesasRes.data;
      } else if (mesasRes.status === "error") {
        console.error("[FloorPlan] Error al cargar mesas:", mesasRes.message);
        this.mesas = [];
      } else {
        console.log("[FloorPlan] No hay mesas en backend - crea manualmente");
        this.mesas = [];
      }
      
      // NO crear default automaticamente - el usuario debe crear manualmente
      
      this.render();
    } catch (e) {
      console.error("Error cargando datos:", e);
      this.mesas = [];
      this.render();
    }
  },

  async initDefaultLayout() {
    const defaultMesas = [
      {
        id_mesa: "stool-1",
        nombre: "Stool 1",
        capacidad: 1,
        forma: "circular",
        posicion_x: 150,
        posicion_y: 120,
        ancho: 50,
        alto: 50,
        estado: "disponible",
        id_zona: "barra",
        observaciones: "Stool frente a barra"
      },
      {
        id_mesa: "stool-2",
        nombre: "Stool 2",
        capacidad: 1,
        forma: "circular",
        posicion_x: 220,
        posicion_y: 120,
        ancho: 50,
        alto: 50,
        estado: "disponible",
        id_zona: "barra",
        observaciones: "Stool frente a barra"
      },
      {
        id_mesa: "stool-3",
        nombre: "Stool 3",
        capacidad: 1,
        forma: "circular",
        posicion_x: 290,
        posicion_y: 120,
        ancho: 50,
        alto: 50,
        estado: "disponible",
        id_zona: "barra",
        observaciones: "Stool frente a barra"
      },
      {
        id_mesa: "stool-4",
        nombre: "Stool 4",
        capacidad: 1,
        forma: "circular",
        posicion_x: 360,
        posicion_y: 120,
        ancho: 50,
        alto: 50,
        estado: "disponible",
        id_zona: "barra",
        observaciones: "Stool frente a barra"
      },
      {
        id_mesa: "stool-5",
        nombre: "Stool 5",
        capacidad: 1,
        forma: "circular",
        posicion_x: 430,
        posicion_y: 120,
        ancho: 50,
        alto: 50,
        estado: "disponible",
        id_zona: "barra",
        observaciones: "Stool frente a barra"
      },
      {
        id_mesa: "mesa-1",
        nombre: "Mesa 2p",
        capacidad: 2,
        forma: "circular",
        posicion_x: 100,
        posicion_y: 250,
        ancho: 80,
        alto: 80,
        estado: "disponible",
        id_zona: "salon",
        observaciones: "Mesa redonda para 2 personas"
      },
      {
        id_mesa: "mesa-2",
        nombre: "Mesa 4p-1",
        capacidad: 4,
        forma: "circular",
        posicion_x: 200,
        posicion_y: 380,
        ancho: 100,
        alto: 100,
        estado: "disponible",
        id_zona: "salon",
        observaciones: "Mesa redonda para 4 personas"
      },
      {
        id_mesa: "mesa-3",
        nombre: "Mesa 4p-2",
        capacidad: 4,
        forma: "circular",
        posicion_x: 400,
        posicion_y: 380,
        ancho: 100,
        alto: 100,
        estado: "disponible",
        id_zona: "salon",
        observaciones: "Mesa redonda para 4 personas"
      },
      {
        id_mesa: "mesa-4",
        nombre: "Mesa Lounge",
        capacidad: 4,
        forma: "rectangular",
        posicion_x: 350,
        posicion_y: 250,
        ancho: 140,
        alto: 70,
        estado: "disponible",
        id_zona: "salon",
        observaciones: "Mesa lineal/alargada estilo lounge"
      }
    ];

    const existingRes = await callGoogleScript("obtenerMesas", {});
    if (existingRes.status === "success" && existingRes.data && existingRes.data.length > 0) {
      this.mesas = existingRes.data;
      console.log("[DEBUG] Mesas cargadas desde backend:", this.mesas.length);
      return;
    }

    for (const mesa of defaultMesas) {
      try {
        const result = await callGoogleScript("crearMesa", mesa);
        if (result.status !== "success") {
          console.error("Error creando mesa:", mesa.id_mesa, result);
        }
      } catch (e) {
        console.error("Error creando mesa (excepción):", mesa.id_mesa, e);
      }
    }
  },

  render() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    ctx.save();
    ctx.translate(this.panOffset.x, this.panOffset.y);
    ctx.scale(this.scale, this.scale);
    
    this.drawGrid(ctx, w, h);
    this.drawZonas(ctx);
    this.drawMesas(ctx);
    
    ctx.restore();
    
    if (this.selectedMesa) {
      this.drawToolbar();
    }
  },

  drawGrid(ctx, w, h) {
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    
    for (let x = 0; x < w / this.scale; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h / this.scale);
      ctx.stroke();
    }
    for (let y = 0; y < h / this.scale; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w / this.scale, y);
      ctx.stroke();
    }
  },

  drawZonas(ctx) {
    if (this.fondoImagen) {
      ctx.drawImage(this.fondoImagen, 
        -this.panOffset.x / this.scale, 
        -this.panOffset.y / this.scale, 
        this.canvas.width / this.scale, 
        this.canvas.height / this.scale
      );
    }
    
    this.zonas.forEach(zona => {
      if (!zona || !zona.activa) return;
      
      ctx.fillStyle = zona.color + "20";
      ctx.strokeStyle = zona.color;
      ctx.lineWidth = 2;
      
      ctx.fillRect(zona.x || 0, zona.y || 0, zona.ancho || 300, zona.alto || 200);
      ctx.strokeRect(zona.x || 0, zona.y || 0, zona.ancho || 300, zona.alto || 200);
      
      ctx.fillStyle = zona.color;
      ctx.font = "14px Inter";
      ctx.fillText(zona.nombre || "Zona", (zona.x || 0) + 10, (zona.y || 0) + 20);
    });
  },

  drawMesas(ctx) {
    this.mesas.forEach(mesa => {
      const x = mesa.posicion_x || 50;
      const y = mesa.posicion_y || 50;
      const ancho = mesa.ancho || 80;
      const alto = mesa.alto || 80;
      
      const color = this.getColorEstado(mesa.estado);
      
      ctx.fillStyle = color + "40";
      ctx.strokeStyle = color;
      ctx.lineWidth = this.selectedMesa === mesa.id_mesa ? 3 : 2;
      
      if (mesa.forma === "rectangular") {
        ctx.beginPath();
        ctx.roundRect(x, y, ancho, alto, 8);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x + ancho / 2, y + alto / 2, ancho / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      ctx.fillStyle = "#333";
      ctx.font = "bold 14px Inter";
      ctx.textAlign = "center";
      ctx.fillText(mesa.nombre || "Mesa", x + ancho / 2, y + alto / 2 - 5);
      
      ctx.font = "12px Inter";
      ctx.fillText(mesa.capacidad + " seats", x + ancho / 2, y + alto / 2 + 15);
      
      this.drawSillas(ctx, mesa, x, y, ancho, alto);
    });
  },

  drawSillas(ctx, mesa, x, y, ancho, alto) {
    const numSillas = mesa.capacidad || 4;
    const radio = mesa.forma === "rectangular" ? ancho / 2 : ancho / 2;
    
    for (let i = 0; i < numSillas; i++) {
      const angle = (i / numSillas) * Math.PI * 2 - Math.PI / 2;
      const sx = x + ancho / 2 + Math.cos(angle) * (radio + 15);
      const sy = y + alto / 2 + Math.sin(angle) * (radio + 15);
      
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#fff";
      ctx.font = "10px Inter";
      ctx.textAlign = "center";
      ctx.fillText(i + 1, sx, sy + 3);
    }
  },

  getColorEstado(estado) {
    const colores = {
      disponible: "#27ae60",
      ocupada: "#e74c3c",
      reservada: "#f39c12",
      mantenimiento: "#95a5a6"
    };
    return colores[estado] || "#3498db";
  },

  onMouseDown(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const mx = (screenX - this.panOffset.x) / this.scale;
    const my = (screenY - this.panOffset.y) / this.scale;
    
    const toolbarY = this.canvas.height - 60;
    if (screenY >= toolbarY) return;
    
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.dragOffset = { x: e.clientX - this.panOffset.x, y: e.clientY - this.panOffset.y };
      return;
    }
    
    const clickedMesa = this.getMesaAt(mx, my);
    
    if (clickedMesa) {
      this.selectedMesa = clickedMesa.id_mesa;
      this.isDragging = true;
      this.dragOffset = { x: mx - clickedMesa.posicion_x, y: my - clickedMesa.posicion_y };
      this.render();
    } else {
      this.selectedMesa = null;
      this.render();
    }
  },

  onMouseMove(e) {
    if (this.isPanning) {
      this.panOffset = { x: e.clientX - this.dragOffset.x, y: e.clientY - this.dragOffset.y };
      this.render();
      return;
    }
    
    if (this.isDragging && this.selectedMesa) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - this.panOffset.x) / this.scale;
      const my = (e.clientY - rect.top - this.panOffset.y) / this.scale;
      
      const mesa = this.mesas.find(m => m.id_mesa === this.selectedMesa);
      if (mesa) {
        mesa.posicion_x = mx - this.dragOffset.x;
        mesa.posicion_y = my - this.dragOffset.y;
        
        mesa.posicion_x = Math.max(0, Math.min(mesa.posicion_x, this.canvas.width / this.scale - 100));
        mesa.posicion_y = Math.max(0, Math.min(mesa.posicion_y, this.canvas.height / this.scale - 100));
        
        this.render();
      }
    }
  },

  onMouseUp(e) {
    if (this.isDragging && this.selectedMesa) {
      const mesa = this.mesas.find(m => m.id_mesa === this.selectedMesa);
      if (mesa) {
        this.saveMesaPosition(mesa);
      }
    }
    this.isDragging = false;
    this.isPanning = false;
  },

  onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.scale = Math.max(0.5, Math.min(2, this.scale * delta));
    this.render();
  },

  onClick(e) {
    if (this.isDragging || this.isPanning) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const toolbarY = this.canvas.height - 60;
    if (my >= toolbarY && my <= toolbarY + 50 && this.selectedMesa) {
      let x = 160;
      const buttons = ["openAccount", "changeState", "edit", "delete"];
      for (let i = 0; i < buttons.length; i++) {
        if (mx >= x && mx <= x + 110 && my >= toolbarY + 10 && my <= toolbarY + 40) {
          this.handleToolbarAction(buttons[i]);
          return;
        }
        x += 120;
      }
    }
  },

  handleToolbarAction(action) {
    const mesaId = this.selectedMesa;
    const mesa = this.mesas.find(m => m.id_mesa === mesaId);
    if (!mesa) return;

    switch(action) {
      case "openAccount":
        if (typeof abrirCuentaMesa === "function") {
          abrirCuentaMesa(mesaId);
        } else {
          console.error("abrirCuentaMesa no está disponible. Verifica que cuentas.js esté cargado.");
        }
        break;
      case "changeState":
        const estados = ["disponible", "ocupada", "reservada", "mantenimiento"];
        const idx = estados.indexOf(mesa.estado || "disponible");
        const nuevoEstado = estados[(idx + 1) % estados.length];
        this.actualizarMesaEstado(mesaId, nuevoEstado);
        break;
      case "edit":
        this.modoEdicion = !this.modoEdicion;
        this.render();
        break;
      case "delete":
        if (confirm(`¿Eliminar "${mesa.nombre}"?`)) {
          this.eliminarMesa(mesaId);
          this.selectedMesa = null;
        }
        break;
    }
  },

  getMesaAt(x, y) {
    for (let i = this.mesas.length - 1; i >= 0; i--) {
      const mesa = this.mesas[i];
      const mx = mesa.posicion_x || 0;
      const my = mesa.posicion_y || 0;
      const ancho = mesa.ancho || 80;
      const alto = mesa.alto || 80;
      
      if (mesa.forma === "circular") {
        const cx = mx + ancho / 2;
        const cy = my + alto / 2;
        const radio = ancho / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= radio) return mesa;
      } else {
        if (x >= mx && x <= mx + ancho && y >= my && y <= my + alto) {
          return mesa;
        }
      }
    }
    return null;
  },

  async saveMesaPosition(mesa) {
    try {
      await callGoogleScript("actualizarMesa", {
        id_mesa: mesa.id_mesa,
        posicion_x: Math.round(mesa.posicion_x),
        posicion_y: Math.round(mesa.posicion_y)
      });
    } catch (e) {
      console.error("Error guardando posición:", e);
    }
  },

  drawToolbar() {
    const ctx = this.ctx;
    const toolbarY = this.canvas.height - 60;
    
    ctx.fillStyle = "#1a1a1a";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.fillRect(10, toolbarY, this.canvas.width - 20, 50);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = "#7CFF5A";
    ctx.font = "bold 14px Inter";
    ctx.textAlign = "left";
    ctx.fillText("Herramientas:", 20, toolbarY + 20);
    
    const buttons = [
      { label: "Abrir Cuenta", icon: "fa-plus", color: "#7CFF5A" },
      { label: "Cambiar Estado", icon: "fa-exchange-alt", color: "#3498db" },
      { label: "Editar", icon: "fa-edit", color: "#f39c12" },
      { label: "Eliminar", icon: "fa-trash", color: "#e74c3c" }
    ];
    
    let x = 160;
    buttons.forEach((btn, i) => {
      ctx.fillStyle = btn.color + "30";
      ctx.fillRect(x, toolbarY + 10, 110, 30);
      ctx.strokeStyle = btn.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, toolbarY + 10, 110, 30);
      ctx.fillStyle = btn.color;
      ctx.font = "bold 12px Inter";
      ctx.textAlign = "center";
      ctx.fillText(btn.label, x + 55, toolbarY + 30);
      x += 120;
    });
  },

  async agregarMesa(data) {
    try {
      const result = await callGoogleScript("crearMesa", data);
      if (result.status === "success") {
        await this.loadData();
        return result;
      }
      return result;
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },

  async actualizarMesaEstado(idMesa, estado) {
    try {
      const result = await callGoogleScript("actualizarMesa", {
        id_mesa: idMesa,
        estado: estado
      });
      if (result.status === "success") {
        await this.loadData();
      }
      return result;
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },

  async eliminarMesa(idMesa) {
    try {
      const result = await callGoogleScript("eliminarMesa", { id_mesa: idMesa });
      if (result.status === "success") {
        await this.loadData();
      }
      return result;
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },

  setModoEdicion(valor) {
    this.modoEdicion = valor;
    this.render();
  },

  zoomIn() {
    this.scale = Math.min(2, this.scale * 1.2);
    this.render();
  },

  zoomOut() {
    this.scale = Math.max(0.5, this.scale * 0.8);
    this.render();
  },

  resetView() {
    this.scale = 1;
    this.panOffset = { x: 0, y: 0 };
    this.selectedMesa = null;
    this.render();
  },

  async cargarFondo(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.fondoImagen = img;
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};

function initFloorPlan() {
  if (document.getElementById("floorPlanCanvas")) {
    FloorPlanManager.init("floorPlanCanvas");
  }
}

document.addEventListener("DOMContentLoaded", initFloorPlan);