const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwdp3wBAQEpf2gPJKa0nfiAOlHAeLXV3bMsyE5JiO1x-9thWS6v7W33q4OC4MvNflpY/exec";

console.log("script.js loaded successfully");

window.SCRIPT_URL = SCRIPT_URL;

if (!SCRIPT_URL) {
  console.error(
    "CRITICAL: SCRIPT_URL is not defined. Network requests will fail.",
  );
  alert("Error de configuración: URL del script no encontrada.");
}

async function callGoogleScript(action, data = {}) {
  try {
    const params = new URLSearchParams({ action });
    // Include action inside the POST body as well for robust recognition on the Apps Script side
    const payload = Object.assign({ action }, data);
    const response = await fetch(`${SCRIPT_URL}?${params}`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    return await response.json();
  } catch (error) {
    console.error(`Error en callGoogleScript (${action}):`, error);
    throw error;
  }
}

const mobileToggle = document.getElementById("mobileToggle");
const sidebar = document.querySelector(".sidebar");
let inventarioCargado = false;
let inventarioCache = [];
let etiquetaSugerenciaIndex = -1;
const etiquetaItems = [];
const MAX_ETIQUETAS = 50;

// Variables de autenticación inicializadas tempranamente
let currentUserRole = null; // 'admin' | 'ventas'
let loginSelectedRole = "ventas";

// Paginación
let inventarioPagina = 1;
let inventarioPorPagina = 20;
let gastosPagina = 1;
let gastosPorPagina = 20;
let conciliacionPagina = 1;
let conciliacionPorPagina = 20;
let resumenPagina = 1;
let resumenPorPagina = 20;

// Crear botón móvil si no existe
if (!mobileToggle) {
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "mobile-toggle hidden";
  toggleBtn.id = "mobileToggle";
  toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
  document.body.appendChild(toggleBtn);
}

const mobileToggleBtn = document.getElementById("mobileToggle");

// Valores por defecto para evitar errores antes de que utils.js cargue
const MOBILE_BP = typeof utils !== "undefined" ? utils.MOBILE_BREAKPOINT : 992;
const TABLE_BP = typeof utils !== "undefined" ? utils.TABLE_BREAKPOINT : 768;

if (mobileToggleBtn && sidebar) {
  // Verificar ancho de pantalla y rol de usuario
  function checkMobile() {
    const isMobile = window.innerWidth <= MOBILE_BP;
    const isAdmin = currentUserRole === "admin";

    // Solo mostrar botón hamburguesa si es admin Y está en móvil
    if (isMobile && isAdmin) {
      mobileToggleBtn.classList.remove("hidden");
    } else {
      mobileToggleBtn.classList.add("hidden");
      sidebar.classList.remove("active");
    }
  }

  // Inicializar - solo si currentUserRole ya está definido
  if (typeof currentUserRole !== "undefined") {
    checkMobile();
  }

  // Redimensionamiento
  window.addEventListener("resize", checkMobile);

  // Toggle del menú
  mobileToggleBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    sidebar.classList.toggle("active");
  });

  // Cerrar menú al hacer clic fuera
  document.addEventListener("click", function (e) {
    if (
      window.innerWidth <= MOBILE_BP &&
      sidebar.classList.contains("active") &&
      !sidebar.contains(e.target) &&
      !mobileToggleBtn.contains(e.target)
    ) {
      sidebar.classList.remove("active");
    }
  });

  // Cerrar menú al hacer clic en enlace
  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", function () {
      if (window.innerWidth <= MOBILE_BP) {
        sidebar.classList.remove("active");
      }
    });
  });
}

// Optimizar tablas para móviles
function optimizeTablesForMobile() {
  const tableContainers = document.querySelectorAll(".data-table-container");

  tableContainers.forEach((container) => {
    const table = container.querySelector(".data-table");
    const hint = container.querySelector(".scroll-hint");

    if (table && window.innerWidth <= TABLE_BP) {
      // Mostrar hint de scroll
      if (hint) {
        hint.classList.remove("hidden");
      }

      // Verificar si la tabla es más ancha que el contenedor
      const tableWidth = table.scrollWidth;
      const containerWidth = container.clientWidth;

      if (tableWidth > containerWidth && hint) {
        hint.classList.remove("hidden");
      } else if (hint) {
        hint.classList.add("hidden");
      }
    } else if (hint) {
      // Ocultar hint en pantallas grandes
      hint.classList.add("hidden");
    }
  });
}

// Inicializar optimización de tablas
optimizeTablesForMobile();

// Re-optimizar al redimensionar
window.addEventListener("resize", optimizeTablesForMobile);

// Ajustar botones para evitar texto desbordado
function adjustButtons() {
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((btn) => {
    const text = btn.textContent || btn.innerText;
    if (text.length > 30) {
      btn.style.fontSize = "0.8rem";
      btn.style.padding = "var(--space-2) var(--space-3)";
    }
  });
}

// Ajustar después de cargar la página
setTimeout(adjustButtons, 500);

let productDataCache = {};
let resumenDataCache = {};
let ultimaVentaData = null;
let resumenFinancieroChart,
  tendenciasChart,
  metodosPagoChart,
  topProductosChart,
  gastosCategoriaChart,
  inventarioCategoriaChart,
  clienteFrecuenteChart;

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  // checkPersistedLogin() se encarga de llamar a loadInitialData() o mostrar el login
  checkPersistedLogin();
  setupForms();

  // Listener para cuando se sincronizan ventas offline - recargar inventario
  window.addEventListener("ventasSincronizadas", () => {
    console.log(
      "[INVENTARIO] Ventas sincronizadas, actualizando inventario...",
    );
    if (typeof loadInventario === "function") {
      loadInventario();
    }
  });

  // Cerrar modales al presionar Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarTodosLosModales();
    }
  });

  // Agregar onclick para cerrar modales al hacer click por fuera
  document.querySelectorAll(".factura-overlay").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  });
});

// Función para cerrar modales al hacer click por fuera
function cerrarModalAlClickOutside(event) {
  if (
    event.target.classList.contains("factura-overlay") ||
    event.target.classList.contains("modal-overlay")
  ) {
    event.target.classList.add("hidden");
  }
}

// Cerrar todos los modales visibles (para tecla Escape)
function cerrarTodosLosModales() {
  const modales = document.querySelectorAll(
    ".factura-overlay:not(.hidden), .modal-overlay:not(.hidden)",
  );
  modales.forEach((modal) => {
    modal.classList.add("hidden");
  });

  // También cerrar modal de sincronización si está abierto
  document.getElementById("sincronizacionModal")?.classList.add("hidden");
}

// Loading functions migrated to utils.js
const mostrarLoading = utils.showLoading;
const ocultarLoading = utils.hideLoading;

// ================= LOGIN & AUTH =================
const ADMIN_PASSWORD = "14155585";

function selectRole(role) {
  loginSelectedRole = role;
  const btnVentas = document.getElementById("btnRoleVentas");
  const btnAdmin = document.getElementById("btnRoleAdmin");
  const adminPassBlock = document.getElementById("adminPassBlock");

  if (role === "ventas") {
    btnVentas.classList.add("active");
    btnAdmin.classList.remove("active");
    if (adminPassBlock) adminPassBlock.classList.add("hidden");
  } else {
    btnAdmin.classList.add("active");
    btnVentas.classList.remove("active");
    if (adminPassBlock) adminPassBlock.classList.remove("hidden");
    const loginPass = document.getElementById("loginPass");
    if (loginPass) loginPass.focus();
  }
}

function doLogin() {
  const adminPassBlock = document.getElementById("adminPassBlock");
  const loginPass = document.getElementById("loginPass");
  const loginStatus = document.getElementById("loginStatus");

  if (loginSelectedRole === "admin") {
    const pass = loginPass ? loginPass.value : "";
    if (pass !== ADMIN_PASSWORD) {
      if (loginStatus) {
        loginStatus.style.display = "block";
        loginStatus.className = "status-message error";
        loginStatus.innerHTML =
          "<i class='fas fa-times-circle'></i> Contraseña incorrecta";
      }
      return;
    }
  }

  aplicarLogin(loginSelectedRole);
}

function initLogin() {
  const loginOverlay = document.getElementById("loginOverlay");
  if (loginOverlay) {
    loginOverlay.classList.remove("hidden");
    loginOverlay.style.display = "flex";
  }

  const loginPassInput = document.getElementById("loginPass");

  // Enter para loguear
  if (loginPassInput) {
    loginPassInput.onkeyup = (e) => {
      if (e.key === "Enter") doLogin();
    };
  }
}

function aplicarLogin(role) {
  currentUserRole = role;
  localStorage.setItem("gitanas_role", role);

  const loginOverlay = document.getElementById("loginOverlay");
  const sidebar = document.querySelector(".sidebar");
  const floatLogoutBtn = document.getElementById("floatLogoutBtn");
  const mainContent = document.querySelector(".main-content");

  if (loginOverlay) {
    loginOverlay.classList.add("hidden");
    loginOverlay.style.display = "none";
  }

  loadInitialData();

  if (role === "ventas") {
    if (sidebar) sidebar.classList.add("hidden");
    if (mainContent) mainContent.classList.add("sidebar-hidden");
    if (floatLogoutBtn) floatLogoutBtn.classList.remove("hidden");
    irASeccion("ventas");
  } else {
    if (sidebar) sidebar.classList.remove("hidden");
    if (mainContent) mainContent.classList.remove("sidebar-hidden");
    if (floatLogoutBtn) floatLogoutBtn.classList.add("hidden");
    irASeccion("dashboard");
  }
}

function logout() {
  currentUserRole = null;
  localStorage.removeItem("gitanas_role");
  location.reload(); // Forma más limpia de resetear todo el estado
}

function irASeccion(id) {
  const navLinks = document.querySelectorAll(".sidebar-nav a");
  const sections = document.querySelectorAll(".main-content .content-section");

  // Activar link
  navLinks.forEach((l) => {
    if (l.getAttribute("data-section") === id) l.classList.add("active");
    else l.classList.remove("active");
  });

  // Mostrar sección
  sections.forEach((s) => {
    if (s.id === id) {
      s.classList.add("active");
      if (id === "dashboard") handleLoadDashboard();
      if (id === "inventario") loadInventario();
      if (id === "ventas") prepararPOS();
      if (id === "compras") prepararCompras();
      if (id === "gastos") loadGastos();
      if (id === "resumenes") loadSummary("Ventas");
      if (id === "cierre") prepararCierreCaja();
      if (id === "conciliacion") loadConciliacion();
      if (id === "etiquetas") prepararGeneradorEtiquetas();
    } else {
      s.classList.remove("active");
    }
  });
}

function initBarSection(section) {
  console.log("[DEBUG] initBarSection llamada con:", section);
  switch (section) {
    case "menu":
      if (typeof RecetasManager !== "undefined") {
        RecetasManager.init().then(() => RecetasManager.render());
      }
      actualizarSelectorCuentas();
      break;
    case "floorPlan":
      if (
        typeof FloorPlanManager !== "undefined" &&
        document.getElementById("floorPlanCanvas")
      ) {
        FloorPlanManager.init("floorPlanCanvas");
      }
      break;
    case "cuentas":
      renderCuentasMesas();
      break;
    case "dashboard":
      actualizarDashboardBar();
      break;
    case "recetas":
      if (typeof RecetasManager !== "undefined") {
        RecetasManager.init().then(() => {
          if (typeof renderRecetasTabla === "function") {
            renderRecetasTabla();
          }
        });
      }
      break;
  }
}

function checkPersistedLogin() {
  // Inicializar eventos de logout globalmente
  const floatLogoutBtn = document.getElementById("floatLogoutBtn");
  if (floatLogoutBtn) floatLogoutBtn.onclick = logout;

  const sidebarLogout = document.getElementById("sidebarLogout");
  if (sidebarLogout) sidebarLogout.onclick = logout;

  const savedRole = localStorage.getItem("gitanas_role");
  if (savedRole) {
    aplicarLogin(savedRole);
    // Verificar visibilidad del botón hamburguesa después del login
    if (mobileToggleBtn && sidebar) {
      checkMobile();
    }
  } else {
    initLogin();
    // Mostrar explícitamente el overlay de login
    const loginOverlay = document.getElementById("loginOverlay");
    if (loginOverlay) {
      loginOverlay.classList.remove("hidden");
      loginOverlay.style.display = "flex";
    }
  }
}

function setupNavigation() {
  const navLinks = document.querySelectorAll(".sidebar-nav a");
  const sections = document.querySelectorAll(".main-content .content-section");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("data-section");
      console.log("[DEBUG] Nav click - targetId:", targetId);

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      sections.forEach((section) => {
        if (section.id === targetId) {
          section.classList.add("active");

          if (targetId === "dashboard") {
            handleLoadDashboard();
          }

          if (targetId === "inventario") {
            loadInventario();
          }

          if (targetId === "ventas") {
            prepararPOS();
          }

          if (targetId === "compras") {
            prepararCompras();
          }

          if (targetId === "gastos") {
            limpiarFiltrosGastos();
            loadGastos();
          }

          if (targetId === "cierre") {
            prepararCierreCaja();
          }

          if (targetId === "conciliacion") {
            limpiarFiltrosConciliacion();
            loadConciliacion();
          }

          if (targetId === "resumenes") {
            limpiarFiltrosResumen();
            document.getElementById("resumenTable").classList.remove("hidden");
            document
              .getElementById("historialCierresTable")
              .classList.add("hidden");
            loadSummary("Ventas");
          }

          if (targetId === "etiquetas") {
            prepararGeneradorEtiquetas();
          }

          if (targetId === "menu") {
            initBarSection("menu");
          }

          if (targetId === "floorPlan") {
            initBarSection("floorPlan");
          }

          if (targetId === "cuentas") {
            initBarSection("cuentas");
          }

          if (targetId === "recetas") {
            initBarSection("recetas");
          }
        } else {
          section.classList.remove("active");
        }
      });
    });
  });
}

async function loadInitialData() {
  try {
    const data = await utils.fetchJson(`${SCRIPT_URL}?action=getCategorias`);

    if (data.status === "success") {
      populateCategories(data.data);
    } else {
      displayStatus(
        "statusProducto",
        "warning",
        `No se pudieron cargar las categorías: ${data.message}.`,
      );
      populateCategories([]);
    }

    // Verificar si hay una última factura para mostrar el botón
    verificarUltimaFactura();
  } catch (error) {
    displayStatus(
      "statusProducto",
      "error",
      `Error de conexión al cargar categorías: ${error.message}`,
    );
    populateCategories([]);
  }
}

function populateCategories(categories) {
  const selectProducto = document.getElementById("p_categoria");
  selectProducto.innerHTML = "";

  if (categories.length === 0) {
    selectProducto.innerHTML =
      '<option value="" disabled selected>No hay categorías registradas</option>';
    document.getElementById("listaCategorias").innerHTML =
      "<li>No hay categorías.</li>";
    return;
  }

  selectProducto.innerHTML =
    '<option value="" disabled selected>Seleccione una categoría</option>';

  const listHtml = categories
    .map((cat) => {
      const name = cat.nombre || `(ID ${cat.id})`;
      selectProducto.innerHTML += `<option value="${name}">${name}</option>`;
      return `<li>${name}</li>`;
    })
    .join("");

  document.getElementById("listaCategorias").innerHTML = listHtml;
}

function setupForms() {
  // Configuración
  document
    .getElementById("iniciarDBBtn")
    ?.addEventListener("click", () => handleConfigAction("iniciar"));
  document
    .getElementById("btnRefrescarGastos")
    ?.addEventListener("click", loadGastos);

  document.getElementById("gastoForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    registrarGasto();
  });

  document.getElementById("aprovechoForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    registrarAprovecho();
  });

  document.getElementById("resetDBBtn")?.addEventListener("click", () => {
    if (
      window.confirm(
        "¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.",
      )
    ) {
      handleConfigAction("resetear");
    }
  });

  // Categorías y Productos
  document
    .getElementById("categoriaForm")
    .addEventListener("submit", (e) =>
      handlePostAction(e, "agregarCategoria", "statusCategoria"),
    );
  document
    .getElementById("productoForm")
    .addEventListener("submit", (e) =>
      handlePostAction(e, "agregarProducto", "statusProducto"),
    );

  // Compras/Ventas
  const coQuery = document.getElementById("co_query");

  if (coQuery) {
    coQuery.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      coMostrarSugerencias(query);
    });

    coQuery.addEventListener("keydown", (e) => {
      const suggestions = document.querySelectorAll(
        "#coSugerencias .pos-suggestion-item",
      );
      if (!suggestions.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        coSugerenciaIndex = (coSugerenciaIndex + 1) % suggestions.length;
        coActualizarSeleccionSugerencia(suggestions);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        coSugerenciaIndex =
          (coSugerenciaIndex - 1 + suggestions.length) % suggestions.length;
        coActualizarSeleccionSugerencia(suggestions);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (coSugerenciaIndex > -1) {
          suggestions[coSugerenciaIndex].click();
        } else {
          const query = coQuery.value.trim();
          if (query) {
            handleQueryFilter(query, "co");
            coCerrarSugerencias();
          }
        }
      } else if (e.key === "Escape") {
        coCerrarSugerencias();
      }
    });

    document.addEventListener("click", (e) => {
      if (
        !coQuery.contains(e.target) &&
        !document.getElementById("coSugerencias")?.contains(e.target)
      ) {
        coCerrarSugerencias();
      }
    });
  }

  document
    .getElementById("compraForm")
    ?.addEventListener("submit", (e) => handleTransactionPost(e, "compra"));
  const vQuery = document.getElementById("v_query");
  if (vQuery) {
    vQuery.addEventListener("input", (e) =>
      handleQueryFilter(e.target.value, "v"),
    );
  }

  const ventaForm = document.getElementById("ventaForm");
  if (ventaForm) {
    ventaForm.addEventListener("submit", (e) =>
      handleTransactionPost(e, "venta"),
    );
  }

  // Resúmenes
  document.getElementById("resumenVentasBtn")?.addEventListener("click", () => {
    document.getElementById("resumenTable").classList.remove("hidden");
    document.getElementById("historialCierresTable").classList.add("hidden");
    limpiarFiltrosResumen();
    loadSummary("Ventas");
  });
  document
    .getElementById("resumenComprasBtn")
    ?.addEventListener("click", () => {
      document.getElementById("resumenTable").classList.remove("hidden");
      document.getElementById("historialCierresTable").classList.add("hidden");
      limpiarFiltrosResumen();
      loadSummary("Compras");
    });

  document
    .getElementById("resumenCierresBtn")
    ?.addEventListener("click", () => {
      // Ocultar tabla genérica y mostrar la de cierres
      document.getElementById("resumenTable").classList.add("hidden");
      document
        .getElementById("historialCierresTable")
        .classList.remove("hidden");
      loadHistorialCierres();
    });

  // Dashboard
  document
    .getElementById("cargarInventarioBtn")
    .addEventListener("click", loadInventario);
  document
    .getElementById("cargarDatosGraficosBtn")
    .addEventListener("click", handleLoadDashboard);
  document
    .getElementById("cierreForm")
    ?.addEventListener("submit", ejecutarCierre);
  document
    .getElementById("c_base")
    ?.addEventListener("input", actualizarCalculoCierre);
  document
    .getElementById("c_real")
    ?.addEventListener("input", actualizarCalculoCierre);
  document
    .getElementById("c_banco_base")
    ?.addEventListener("input", actualizarCalculoCierre);
  document
    .getElementById("c_banco_real")
    ?.addEventListener("input", actualizarCalculoCierre);

  // Formatear inputs de dinero automáticamente
  document.querySelectorAll(".money-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const valor = utils.cleanNumber(e.target.value);
      e.target.value = utils.formatCurrency(valor);
    });
  });

  // Domicilio de entrega (opcional) - show/hide inputs
  const domicilioChk = document.getElementById("domicilioCheckbox");
  const domicilioInputs = document.getElementById("domicilioInputs");
  if (domicilioChk && domicilioInputs) {
    domicilioChk.addEventListener("change", (e) => {
      if (e.target.checked) {
        domicilioInputs.classList.remove("hidden");
      } else {
        domicilioInputs.classList.add("hidden");
        // Limpiar valores al desmarcar
        const direccionInput = document.getElementById("domicilioDireccion");
        const valorInput = document.getElementById("domicilioValor");
        if (direccionInput) direccionInput.value = "";
        if (valorInput) valorInput.value = "";
      }
      // Actualizar total y cambio al marcar/desmarcar
      actualizarComision();
      posActualizarCambio();
    });
  }

  // Actualizar total y cambio cuando cambia el valor del domicilio
  const domicilioValorInput = document.getElementById("domicilioValor");
  if (domicilioValorInput) {
    domicilioValorInput.addEventListener("input", () => {
      actualizarComision();
      posActualizarCambio();
    });
  }

  // ================= COMPRAS POS EVENT LISTENERS =================
  const coInput = document.getElementById("coBuscar");
  if (coInput) {
    coInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      coBuscarProducto(query);
    });

    coInput.addEventListener("keydown", (e) => {
      const suggestions = document.querySelectorAll(
        "#coSugerencias .pos-suggestion-item",
      );
      if (!suggestions.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        coSugerenciaIndex = (coSugerenciaIndex + 1) % suggestions.length;
        coActualizarSeleccionSugerencia(suggestions);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        coSugerenciaIndex =
          (coSugerenciaIndex - 1 + suggestions.length) % suggestions.length;
        coActualizarSeleccionSugerencia(suggestions);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (coSugerenciaIndex > -1) {
          suggestions[coSugerenciaIndex].click();
        } else {
          const query = coInput.value.trim();
          if (query) {
            const producto = inventarioCache.find(
              (p) =>
                String(p.codigo).toLowerCase() === query.toLowerCase() ||
                String(p.id).toLowerCase() === query.toLowerCase(),
            );
            if (producto) {
              coSeleccionarProducto(producto.id);
            }
          }
        }
        coSugerenciaIndex = -1;
        coCerrarSugerencias();
      } else if (e.key === "Escape") {
        coSugerenciaIndex = -1;
        coCerrarSugerencias();
      }
    });
  }

  // Cerrar sugerencias de compras al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#coBuscar") && !e.target.closest("#coSugerencias")) {
      const container = document.getElementById("coSugerencias");
      if (container) container.classList.add("hidden");
    }
  });

  // Event listener para descuento global de compras
  const coDescGlobal = document.getElementById("coDescuentoGlobal");
  if (coDescGlobal) {
    coDescGlobal.addEventListener("change", function () {
      coVenta.descuento_global_pct = Number(this.value);
      coRecalcular();
    });
  }

  // Event listener para método de pago de compras
  const coMetodoPago = document.getElementById("coMetodoPago");
  const coBloqueEfectivo = document.getElementById("coBloqueEfectivo");
  if (coMetodoPago && coBloqueEfectivo) {
    coMetodoPago.addEventListener("change", () => {
      const metodo = coMetodoPago.value;
      if (metodo === "efectivo") {
        coBloqueEfectivo.classList.remove("hidden");
      } else {
        coBloqueEfectivo.classList.add("hidden");
        const montoInput = document.getElementById("coMontoRecibido");
        const coCambio = document.getElementById("coCambio");
        if (montoInput) montoInput.value = "";
        if (coCambio) coCambio.textContent = "0";
      }
    });
  }

  // Event listener para monto recibido de compras
  const coMontoInput = document.getElementById("coMontoRecibido");
  if (coMontoInput) {
    coMontoInput.addEventListener("input", coActualizarCambio);
  }

  // Envío de compras - show/hide inputs
  const coEnvioChk = document.getElementById("coEnvioCheckbox");
  const coEnvioInputs = document.getElementById("coEnvioInputs");
  if (coEnvioChk && coEnvioInputs) {
    coEnvioChk.addEventListener("change", (e) => {
      if (e.target.checked) {
        coEnvioInputs.classList.remove("hidden");
      } else {
        coEnvioInputs.classList.add("hidden");
        const direccionInput = document.getElementById("coEnvioDireccion");
        const valorInput = document.getElementById("coEnvioValor");
        if (direccionInput) direccionInput.value = "";
        if (valorInput) valorInput.value = "";
      }
      coActualizarResumen();
      coActualizarCambio();
    });
  }

  // Actualizar total y cambio cuando cambia el valor del envío
  const coEnvioValorInput = document.getElementById("coEnvioValor");
  if (coEnvioValorInput) {
    coEnvioValorInput.addEventListener("input", () => {
      coActualizarResumen();
      coActualizarCambio();
    });
  }
}

// ================= DASHBOARD FUNCTIONS =================

function aplicarFiltroDashboard() {
  const dashFechaInicio = document.getElementById("dashFechaInicio");
  const dashFechaFin = document.getElementById("dashFechaFin");
  const filtroActivo = document.getElementById("filtroActivo");

  if (!dashFechaInicio || !dashFechaFin) return;

  const fechaInicio = dashFechaInicio.value;
  const fechaFin = dashFechaFin.value;

  if (!fechaInicio && !fechaFin) {
    alert("Por favor seleccione al menos una fecha.");
    return;
  }

  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    alert("La fecha inicial no puede ser mayor que la fecha final.");
    return;
  }

  let mensajeFiltro = "Filtro activo: ";
  if (fechaInicio && fechaFin) {
    mensajeFiltro += `Del ${new Date(fechaInicio).toLocaleDateString()} al ${new Date(fechaFin).toLocaleDateString()}`;
  } else if (fechaInicio) {
    mensajeFiltro += `Desde el ${new Date(fechaInicio).toLocaleDateString()}`;
  } else {
    mensajeFiltro += `Hasta el ${new Date(fechaFin).toLocaleDateString()}`;
  }

  filtroActivo.innerHTML = `<i class="fas fa-filter"></i> ${mensajeFiltro}`;
  filtroActivo.style.display = "block";

  calcularResumenFinanciero(fechaInicio, fechaFin);
}

function limpiarFiltroDashboard() {
  const dashFechaInicio = document.getElementById("dashFechaInicio");
  const dashFechaFin = document.getElementById("dashFechaFin");
  const filtroActivo = document.getElementById("filtroActivo");

  if (dashFechaInicio) dashFechaInicio.value = "";
  if (dashFechaFin) dashFechaFin.value = "";
  if (filtroActivo) filtroActivo.style.display = "none";
  calcularResumenFinanciero(null, null);
}

async function handleLoadDashboard() {
  try {
    await calcularResumenFinanciero(null, null);
    await cargarDatosGraficos();
    actualizarDashboardBar();
    renderGraficosBar();
  } catch (error) {
    console.error("Error al cargar dashboard:", error);
    displayStatus(
      "statusDashboard",
      "error",
      "Error al cargar el dashboard. Por favor recargue la página.",
    );
  }
}

function handleDashboardRangoChange() {
  const rangoSelect = document.getElementById("dashboardRango");
  if (!rangoSelect) return;
  const rango = rangoSelect.value;
  const hoy = new Date();
  let fechaInicio, fechaFin;

  switch (rango) {
    case "hoy":
      fechaInicio = hoy.toISOString().split("T")[0];
      fechaFin = hoy.toISOString().split("T")[0];
      break;
    case "semana":
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      fechaInicio = inicioSemana.toISOString().split("T")[0];
      fechaFin = hoy.toISOString().split("T")[0];
      break;
    case "mes":
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      fechaFin = hoy.toISOString().split("T")[0];
      break;
  }

  document.getElementById("dashFechaInicio").value = fechaInicio;
  document.getElementById("dashFechaFin").value = fechaFin;
  aplicarFiltroDashboard();
}

async function calcularResumenFinanciero(fechaInicio = null, fechaFin = null) {
  displayStatus("statusDashboard", "info", "Calculando resumen financiero...");

  try {
    const [ventasData, comprasData, productosData, detalleData] =
      await Promise.all([
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=COMPRAS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=PRODUCTOS`),
        utils.fetchJson(
          `${SCRIPT_URL}?action=getData&sheetName=Ventas_Detalle`,
        ),
      ]);

    const [gastosData, aprovechosData] = await Promise.all([
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
      utils.fetchJson(
        `${SCRIPT_URL}?action=getData&sheetName=APROVECHAMIENTOS`,
      ),
    ]);

    let totalGastos = 0;
    let gastosEfectivo = 0;
    let gastosNequi = 0;
    if (gastosData.status === "success" && gastosData.data) {
      const filteredGastos = filterByDate(
        gastosData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      totalGastos = filteredGastos.reduce(
        (sum, g) => sum + Number(g.monto || 0),
        0,
      );
      filteredGastos.forEach((g) => {
        const metodo = String(g.metodo_pago || "").toLowerCase();
        if (metodo === "efectivo") {
          gastosEfectivo += Number(g.monto || 0);
        } else {
          gastosNequi += Number(g.monto || 0);
        }
      });
    }

    let totalAprovechamientos = 0;
    let aprovechosEfectivo = 0;
    let aprovechosNequi = 0;
    if (aprovechosData.status === "success" && aprovechosData.data) {
      const filteredAprovechos = filterByDate(
        aprovechosData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      totalAprovechamientos = filteredAprovechos.reduce(
        (sum, a) => sum + Number(a.monto || 0),
        0,
      );
      filteredAprovechos.forEach((a) => {
        const medio = String(a.metodo_pago || "").toLowerCase();
        const monto = Number(a.monto || 0);
        if (medio === "efectivo") {
          aprovechosEfectivo += monto;
        } else {
          aprovechosNequi += monto;
        }
      });
    }

    let totalComprasFacturadas = 0;
    let comprasEfectivo = 0;
    let comprasNequi = 0;
    if (comprasData.status === "success" && comprasData.data) {
      const filteredCompras = filterByDate(
        comprasData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      totalComprasFacturadas = filteredCompras.reduce(
        (sum, c) => sum + Number(c.total_final || 0),
        0,
      );
      filteredCompras.forEach((c) => {
        const metodo = String(c.metodo_pago || "").toLowerCase();
        if (metodo === "efectivo") {
          comprasEfectivo += Number(c.total_final || 0);
        } else {
          comprasNequi += Number(c.total_final || 0);
        }
      });
    }

    // Valor Total Inventario - SIEMPRE sin filtro
    let valorTotalInventario = 0;
    if (productosData.status === "success" && productosData.data) {
      valorTotalInventario = productosData.data.reduce((sum, p) => {
        const precioBotella = parseFloat(p.precio_botella) || 0;
        const contenidoOz = parseFloat(p.contenido_oz) || 1;
        const stockOz = parseFloat(p.stock) || 0;
        return sum + (stockOz * precioBotella / contenidoOz);
      }, 0);
    }

    let totalIngresosCaja = 0;
    let ingresosEfectivo = 0;
    let ingresosNequi = 0;
    let pendientePorCobrar = 0;
    const ventasIngresadasIds = new Set();

    if (ventasData.status === "success" && ventasData.data) {
      const filteredVentas = filterByDate(
        ventasData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredVentas.forEach((v) => {
        const total = Number(v.total_final || 0);
        const valIng = String(v.ingresado || "").toUpperCase();
        const isIngresado =
          v.ingresado === true || valIng === "TRUE" || valIng === "YES";

        if (isIngresado) {
          totalIngresosCaja += total;
          ventasIngresadasIds.add(String(v.id_venta));
          const medio = String(v.metodo_pago || "").toUpperCase();
          if (medio === "EFECTIVO") ingresosEfectivo += total;
          else ingresosNequi += total;
        } else {
          pendientePorCobrar += total;
        }
      });
    }

    totalIngresosCaja += totalAprovechamientos;
    ingresosEfectivo += aprovechosEfectivo;
    ingresosNequi += aprovechosNequi;

    let totalCOGS_Real = 0;
    if (
      detalleData.status === "success" &&
      detalleData.data &&
      productosData.status === "success"
    ) {
      const costosMap = {};
      productosData.data.forEach((p) => {
        const precioBotella = parseFloat(p.precio_botella) || 0;
        const contenidoOz = parseFloat(p.contenido_oz) || 1;
        costosMap[p.id] = precioBotella / contenidoOz;
      });

      const ventasFiltradasIds = new Set();
      if (ventasData.status === "success" && ventasData.data) {
        const filteredVentas = filterByDate(
          ventasData.data,
          fechaInicio,
          fechaFin,
          "fecha",
        );
        filteredVentas.forEach((v) => {
          const valIng = String(v.ingresado || "").toUpperCase();
          const isIngresado =
            v.ingresado === true || valIng === "TRUE" || valIng === "YES";
          if (isIngresado) ventasFiltradasIds.add(String(v.id_venta));
        });
      }

      detalleData.data.forEach((item) => {
        const ventaID = String(item.venta_id || item.id_venta);
        if (ventasFiltradasIds.has(ventaID)) {
          const costoUnitario = costosMap[item.producto_id] || 0;
          totalCOGS_Real += (parseFloat(item.cantidad) || 0) * costoUnitario;
        }
      });
    }

    const saldoEfectivo =
      ingresosEfectivo + aprovechosEfectivo - gastosEfectivo - comprasEfectivo;
    const saldoNequi = ingresosNequi - gastosNequi - comprasNequi;
    const utilidadNeta = totalIngresosCaja - totalCOGS_Real - totalGastos;
    const margenRendimiento =
      totalIngresosCaja > 0 ? (utilidadNeta / totalIngresosCaja) * 100 : 0;

    if (document.getElementById("totalCostoVenta")) {
      document.getElementById("totalCostoVenta").textContent =
        `$${formatearCOP(totalCOGS_Real)}`;
    }
    if (document.getElementById("totalGastos")) {
      document.getElementById("totalGastos").textContent =
        `$${formatearCOP(totalGastos)}`;
    }
    if (document.getElementById("totalSaldoEfectivo")) {
      document.getElementById("totalSaldoEfectivo").textContent =
        `$${formatearCOP(saldoEfectivo)}`;
      document.getElementById("totalSaldoEfectivo").style.color =
        saldoEfectivo < 0 ? "red" : "inherit";
    }
    if (document.getElementById("totalSaldoNequi")) {
      document.getElementById("totalSaldoNequi").textContent =
        `$${formatearCOP(saldoNequi)}`;
    }
    document.getElementById("totalVentas").textContent =
      `$${formatearCOP(totalIngresosCaja)}`;
    document.getElementById("totalGanancias").textContent =
      `$${formatearCOP(utilidadNeta)}`;
    if (document.getElementById("totalRendimiento")) {
      document.getElementById("totalRendimiento").textContent =
        `${margenRendimiento.toFixed(1)}%`;
    }
    document.getElementById("totalValorInventario").textContent =
      `$${formatearCOP(valorTotalInventario)}`;
    document.getElementById("totalPendiente").textContent =
      `$${formatearCOP(pendientePorCobrar)}`;
    document.getElementById("totalCompras").textContent =
      `$${formatearCOP(totalComprasFacturadas)}`;

    const filtroActivo = document.getElementById("filtroActivo");
    if (
      filtroActivo.style.display !== "none" &&
      filtroActivo.innerHTML !== ""
    ) {
      displayStatus(
        "statusDashboard",
        "success",
        `Dashboard actualizado con filtro de fechas`,
      );
    } else {
      displayStatus(
        "statusDashboard",
        "success",
        `Dashboard actualizado correctamente`,
      );
    }

    // Actualizar nuevos gráficos con los filtros
    renderNuevosGraficos(fechaInicio, fechaFin);

    return { totalIngresosCaja, utilidadNeta, totalCOGS_Real };
  } catch (error) {
    console.error(error);
    displayStatus("statusDashboard", "error", `Error: ${error.message}`);
  }
}

function filterByDate(data, fechaInicio, fechaFin, dateField) {
  if (!fechaInicio && !fechaFin) return data;

  return data.filter((item) => {
    if (!item[dateField]) return false;
    const itemDate = new Date(item[dateField]);
    const fechaIni = fechaInicio ? new Date(fechaInicio) : null;
    const fechaFn = fechaFin ? new Date(fechaFin) : null;

    if (fechaFn) fechaFn.setHours(23, 59, 59, 999);

    if (fechaIni && fechaFn) return itemDate >= fechaIni && itemDate <= fechaFn;
    else if (fechaIni) return itemDate >= fechaIni;
    else if (fechaFn) return itemDate <= fechaFn;
    return true;
  });
}

async function cargarDatosGraficos() {
  try {
    // SIEMPRE usar datos frescos y corregidos (ignorar resumen_diario que puede tener datos incorrectos)
    await renderChartsFromRawData();

    // Renderizar nuevos gráficos
    renderNuevosGraficos();
  } catch (error) {
    displayStatus(
      "statusDashboard",
      "error",
      `Error al cargar gráficos: ${error.message}`,
    );
  }
}

async function renderChartsFromRawData() {
  try {
    const [ventasData, detalleData, productosData] = await Promise.all([
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=Ventas_Detalle`),
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=PRODUCTOS`),
    ]);

    // Agrupar por fecha
    const ventasPorFecha = {};
    const cogsPorFecha = {};
    const ventasIdsPorFecha = {};

    if (ventasData.status === "success" && ventasData.data) {
      ventasData.data.forEach((venta) => {
        const ing = String(venta.ingresado || "").toUpperCase();
        const esIngresado =
          venta.ingresado === true || ing === "TRUE" || ing === "YES";
        if (esIngresado) {
          const fecha = new Date(venta.fecha).toLocaleDateString();
          const monto = Number(venta.total_final || 0);
          if (!ventasIdsPorFecha[fecha]) {
            ventasIdsPorFecha[fecha] = [];
          }
          ventasIdsPorFecha[fecha].push(String(venta.id_venta));
          ventasPorFecha[fecha] = (ventasPorFecha[fecha] || 0) + monto;
        }
      });
    }

    // Calcular COGS por fecha
    const productosMap = {};
    if (productosData.status === "success" && productosData.data) {
      productosData.data.forEach((p) => {
        // Por ID
        productosMap[p.id] = {
          precio_botella: parseFloat(p.precio_botella) || 0,
          contenido_oz: parseFloat(p.contenido_oz) || 1,
        };
        // También por código si existe
        if (p.código) {
          productosMap[p.código] = {
            precio_botella: parseFloat(p.precio_botella) || 0,
            contenido_oz: parseFloat(p.contenido_oz) || 1,
          };
        }
      });
    }

    if (detalleData.status === "success" && detalleData.data) {
      Object.keys(ventasIdsPorFecha).forEach((fecha) => {
        let cogs = 0;
        const idsVenta = ventasIdsPorFecha[fecha] || [];

        idsVenta.forEach((idVenta) => {
          detalleData.data
            .filter((item) => String(item.id_venta) === idVenta)
            .forEach((item) => {
              // Intentar por producto_id primero
              let producto = productosMap[item.producto_id];

              // Si no encuentra, intentar por código
              if (!producto && item.codigo_producto) {
                producto = productosMap[item.codigo_producto];
              }

              let costoUnitario = 0;
              if (producto && producto.precio_botella) {
                const precioBotella = parseFloat(producto.precio_botella) || 0;
                const contenidoOz = parseFloat(producto.contenido_oz) || 1;
                costoUnitario = precioBotella / contenidoOz;
              }

              if (!costoUnitario) {
                // Debug: mostrar productos no encontrados
                console.debug("Producto no encontrado:", {
                  producto_id: item.producto_id,
                  codigo_producto: item.codigo_producto,
                  precio_unitario: item.precio_unitario,
                  fecha: fecha,
                });
                costoUnitario = 0;
              }

              cogs += (parseInt(item.cantidad) || 0) * costoUnitario;
            });
        });

        cogsPorFecha[fecha] = cogs;
      });
    }

    // Usar solo fechas de ventas
    const todasFechas = Object.keys(ventasPorFecha).sort(
      (a, b) => new Date(a) - new Date(b),
    );

    const datosResumen = todasFechas.map((fecha) => ({
      fecha: fecha,
      total_ventas: ventasPorFecha[fecha] || 0,
      total_compras: cogsPorFecha[fecha] || 0,
      ganancia: (ventasPorFecha[fecha] || 0) - (cogsPorFecha[fecha] || 0),
    }));

    renderCharts(datosResumen);
  } catch (error) {
    console.error("Error al procesar datos para gráficos:", error);
    displayStatus(
      "statusDashboard",
      "warning",
      "No hay datos suficientes para generar gráficos.",
    );
  }
}

function renderCharts(resumenData) {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js no está cargado");
    return;
  }
  const labels = resumenData.map((row) => {
    if (row.fecha instanceof Date) {
      return row.fecha.toLocaleDateString();
    }
    return row.fecha;
  });

  const ventas = resumenData.map((row) => row.total_ventas || 0);
  const compras = resumenData.map((row) => row.total_compras || 0);
  const ganancias = resumenData.map((row) => row.ganancia || 0);

  // 1. Gráfico de Resumen Financiero
  const ctx1 = document
    .getElementById("resumenFinancieroChart")
    ?.getContext("2d");
  if (!ctx1) return;
  if (resumenFinancieroChart) resumenFinancieroChart.destroy();
  resumenFinancieroChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ventas",
          data: ventas,
          backgroundColor: "rgba(0, 123, 255, 0.7)",
          borderColor: "rgba(0, 123, 255, 1)",
          borderWidth: 1,
        },
        {
          label: "Costos (COGS)",
          data: compras,
          backgroundColor: "rgba(23, 162, 184, 0.7)",
          borderColor: "rgba(23, 162, 184, 1)",
          borderWidth: 1,
        },
        {
          label: "Ganancias",
          data: ganancias,
          type: "line",
          fill: false,
          backgroundColor: "rgba(40, 167, 69, 0.7)",
          borderColor: "rgba(40, 167, 69, 1)",
          borderWidth: 2,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Resumen Financiero - Ventas, Costos y Ganancias",
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Monto ($)",
          },
        },
      },
    },
  });

  // 2. Gráfico de Tendencias
  const ctx2 = document.getElementById("tendenciasChart")?.getContext("2d");
  if (!ctx2) return;
  if (tendenciasChart) tendenciasChart.destroy();
  tendenciasChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ventas Acumuladas",
          data: ventas.reduce(
            (acc, curr, i) => [...acc, (acc[i - 1] || 0) + curr],
            [],
          ),
          borderColor: "rgba(0, 123, 255, 1)",
          backgroundColor: "rgba(0, 123, 255, 0.1)",
          tension: 0.1,
          fill: true,
        },
        {
          label: "Costos Acumulados",
          data: compras.reduce(
            (acc, curr, i) => [...acc, (acc[i - 1] || 0) + curr],
            [],
          ),
          borderColor: "rgba(23, 162, 184, 1)",
          backgroundColor: "rgba(23, 162, 184, 0.1)",
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Tendencias Acumuladas - Ventas vs Costos",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Monto Acumulado ($)",
          },
        },
      },
    },
  });
}

// ================= NUEVOS GRÁFICOS =================

async function renderNuevosGraficos(fechaInicio = null, fechaFin = null) {
  try {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js no está cargado");
      return;
    }
    const [ventasData, gastosData, productosData, detalleData] =
      await Promise.all([
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=PRODUCTOS`),
        utils.fetchJson(
          `${SCRIPT_URL}?action=getData&sheetName=Ventas_Detalle`,
        ),
      ]);

    // Función para filtrar por fecha
    const filterByDate = (data, fi, ff, dateField) => {
      if (!fi && !ff) return data;
      return data.filter((row) => {
        const fecha = new Date(row[dateField]);
        if (fi && new Date(fi) > fecha) return false;
        if (ff && new Date(ff) < fecha) return false;
        return true;
      });
    };

    const ventasFiltradas = filterByDate(
      ventasData.data || [],
      fechaInicio,
      fechaFin,
      "fecha",
    );
    const gastosFiltrados = filterByDate(
      gastosData.data || [],
      fechaInicio,
      fechaFin,
      "fecha",
    );
    const productos = productosData.data || [];
    const detalle = detalleData.data || [];

    // 1. Gráfico de Métodos de Pago
    const metodos = {};
    ventasFiltradas.forEach((v) => {
      const metodo = v.metodo_pago || "Otro";
      metodos[metodo] = (metodos[metodo] || 0) + (v.total_final || 0);
    });

    const ctxMetodos = document
      .getElementById("metodosPagoChart")
      ?.getContext("2d");
    if (ctxMetodos) {
      if (metodosPagoChart) metodosPagoChart.destroy();
      metodosPagoChart = new Chart(ctxMetodos, {
        type: "doughnut",
        data: {
          labels: Object.keys(metodos),
          datasets: [
            {
              data: Object.values(metodos),
              backgroundColor: [
                "#22c55e",
                "#3b82f6",
                "#8b5cf6",
                "#f59e0b",
                "#ef4444",
                "#ec4899",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "Ventas por Método de Pago" },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: $${formatearCOP(ctx.raw)}`,
              },
            },
          },
        },
      });
    }

    // 2. Gráfico Top Productos
    const productosVendidos = {};
    detalle.forEach((item) => {
      productosVendidos[item.producto_id] =
        (productosVendidos[item.producto_id] || 0) +
        parseInt(item.cantidad || 0);
    });

    const topProductos = Object.entries(productosVendidos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, cantidad]) => {
        const prod = productos.find((p) => p.id === id);
        return { nombre: prod?.nombre || id, cantidad };
      });

    const ctxTop = document
      .getElementById("topProductosChart")
      ?.getContext("2d");
    if (ctxTop) {
      if (topProductosChart) topProductosChart.destroy();
      topProductosChart = new Chart(ctxTop, {
        type: "bar",
        data: {
          labels: topProductos.map((p) => p.nombre.substring(0, 15)),
          datasets: [
            {
              label: "Cantidad Vendida",
              data: topProductos.map((p) => p.cantidad),
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: {
            title: { display: true, text: "Top 10 Productos Más Vendidos" },
          },
          scales: {
            x: {
              beginAtZero: true,
              title: { display: true, text: "Cantidad" },
            },
          },
        },
      });
    }

    // 3. Gráfico Gastos por Categoría
    const categoriasGastos = {};
    gastosFiltrados.forEach((g) => {
      const cat = g.categoria || "Otro";
      categoriasGastos[cat] = (categoriasGastos[cat] || 0) + (g.monto || 0);
    });

    const ctxGastos = document
      .getElementById("gastosCategoriaChart")
      ?.getContext("2d");
    if (ctxGastos) {
      if (gastosCategoriaChart) gastosCategoriaChart.destroy();
      gastosCategoriaChart = new Chart(ctxGastos, {
        type: "pie",
        data: {
          labels: Object.keys(categoriasGastos),
          datasets: [
            {
              data: Object.values(categoriasGastos),
              backgroundColor: [
                "#ef4444",
                "#f97316",
                "#eab308",
                "#84cc16",
                "#22c55e",
                "#14b8a6",
                "#0ea5e9",
                "#6366f1",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "Gastos por Categoría" },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: $${formatearCOP(ctx.raw)}`,
              },
            },
          },
        },
      });
    }

    // 4. Gráfico Inventario por Categoría
    const inventarioCategoria = {};
    productos.forEach((p) => {
      const cat = p.categoría || "Sin Categoría";
      const valor = (p.stock || 0) * (p.precio_compra || 0);
      inventarioCategoria[cat] = (inventarioCategoria[cat] || 0) + valor;
    });

    const ctxInv = document
      .getElementById("inventarioCategoriaChart")
      ?.getContext("2d");
    if (ctxInv) {
      if (inventarioCategoriaChart) inventarioCategoriaChart.destroy();
      inventarioCategoriaChart = new Chart(ctxInv, {
        type: "bar",
        data: {
          labels: Object.keys(inventarioCategoria),
          datasets: [
            {
              label: "Valor Inventario ($)",
              data: Object.values(inventarioCategoria),
              backgroundColor: "rgba(139, 92, 246, 0.7)",
              borderColor: "rgba(139, 92, 246, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "Valor de Inventario por Categoría" },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Valor ($)" },
            },
          },
        },
      });
    }

    // 5. Gráfico Cliente Frecuente
    // Función para normalizar cliente (prioridad: documento > teléfono > nombre)
    const getClienteKey = (venta) => {
      if (venta.cliente_documento)
        return "DOC:" + String(venta.cliente_documento).trim();
      if (venta.cliente_telefono)
        return "TEL:" + String(venta.cliente_telefono).trim();
      return (
        "NOM:" + (venta.cliente || "Consumidor Final").toLowerCase().trim()
      );
    };

    const getClienteNombre = (venta) => {
      return venta.cliente || "Consumidor Final";
    };

    // Agrupar ventas por cliente
    const clientesAgrupados = {};
    ventasFiltradas.forEach((v) => {
      const key = getClienteKey(v);
      if (!clientesAgrupados[key]) {
        clientesAgrupados[key] = {
          nombre: getClienteNombre(v),
          documento: v.cliente_documento || "",
          telefono: v.cliente_telefono || "",
          totalCompras: 0,
          cantidadVentas: 0,
        };
      }
      clientesAgrupados[key].totalCompras += v.total_final || 0;
      clientesAgrupados[key].cantidadVentas += 1;
    });

    // Ordenar por total de compras y tomar top 10
    const topClientes = Object.entries(clientesAgrupados)
      .sort((a, b) => b[1].totalCompras - a[1].totalCompras)
      .slice(0, 10)
      .map(([key, data]) => ({
        nombre: data.nombre,
        info: data.documento
          ? `Doc: ${data.documento}`
          : data.telefono
            ? `Tel: ${data.telefono}`
            : "",
        total: data.totalCompras,
        ventas: data.cantidadVentas,
      }));

    const ctxCliente = document
      .getElementById("clienteFrecuenteChart")
      ?.getContext("2d");
    if (ctxCliente) {
      if (clienteFrecuenteChart) clienteFrecuenteChart.destroy();
      clienteFrecuenteChart = new Chart(ctxCliente, {
        type: "bar",
        data: {
          labels: topClientes.map((c) => c.nombre.substring(0, 20)),
          datasets: [
            {
              label: "Total Comprado ($)",
              data: topClientes.map((c) => c.total),
              backgroundColor: "rgba(34, 197, 94, 0.7)",
              borderColor: "rgba(34, 197, 94, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: {
            title: { display: true, text: "Top 10 Clientes por Compras" },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const cliente = topClientes[ctx.dataIndex];
                  return `$${formatearCOP(cliente.total)} (${cliente.ventas} compras)`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              title: { display: true, text: "Total ($)" },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error al renderizar nuevos gráficos:", error);
  }
}

// ================= GRÁFICOS DEL BAR =================

async function renderGraficosBar() {
  try {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js no está cargado");
      return;
    }
    // Obtener datos de cuentas abiertas
    const cuentasAbiertas =
      typeof CuentasManager !== "undefined"
        ? CuentasManager.getCuentasAbiertas()
        : [];

    // 1. Gráfico de Ventas por Hora
    const ventasPorHora = {};
    for (let i = 0; i < 24; i++) {
      ventasPorHora[i] = 0;
    }
    cuentasAbiertas.forEach((cuenta) => {
      if (cuenta.inicio) {
        const hora = new Date(cuenta.inicio).getHours();
        ventasPorHora[hora] = (ventasPorHora[hora] || 0) + (cuenta.total || 0);
      }
    });

    const ctxHora = document
      .getElementById("ventasHoraChart")
      ?.getContext("2d");
    if (ctxHora) {
      if (ventasHoraChartInstance) ventasHoraChartInstance.destroy();
      ventasHoraChartInstance = new Chart(ctxHora, {
        type: "bar",
        data: {
          labels: Object.keys(ventasPorHora).map((h) => `${h}:00`),
          datasets: [
            {
              label: "Ventas ($)",
              data: Object.values(ventasPorHora),
              backgroundColor: "rgba(124, 255, 90, 0.7)",
              borderColor: "#7CFF5A",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: "Ventas por Hora" } },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Ventas ($)" },
            },
            x: { title: { display: true, text: "Hora" } },
          },
        },
      });
    }

    // 2. Gráfico de Top Cócteles
    const cocktailsVendidos = {};
    cuentasAbiertas.forEach((cuenta) => {
      (cuenta.items || []).forEach((item) => {
        if (item.nombre) {
          cocktailsVendidos[item.nombre] =
            (cocktailsVendidos[item.nombre] || 0) + (item.cantidad || 1);
        }
      });
    });

    const topCocktails = Object.entries(cocktailsVendidos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const ctxCocktails = document
      .getElementById("topCocktailsChart")
      ?.getContext("2d");
    if (ctxCocktails) {
      if (topCocktailsChartInstance) topCocktailsChartInstance.destroy();
      topCocktailsChartInstance = new Chart(ctxCocktails, {
        type: "doughnut",
        data: {
          labels: topCocktails.map(([nombre]) => nombre),
          datasets: [
            {
              data: topCocktails.map(([, cantidad]) => cantidad),
              backgroundColor: [
                "#7CFF5A",
                "#FF6B6B",
                "#4F46E5",
                "#FFB347",
                "#8b5cf6",
                "#22c55e",
                "#ef4444",
                "#3b82f6",
                "#f59e0b",
                "#ec4899",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: "Top Cócteles Vendidos" } },
        },
      });
    }

    // 3. Gráfico de Sales Mix (por categoría de receta)
    const salesMix = {};
    cuentasAbiertas.forEach((cuenta) => {
      (cuenta.items || []).forEach((item) => {
        const categoria = item.categoria || "Otros";
        salesMix[categoria] = (salesMix[categoria] || 0) + (item.subtotal || 0);
      });
    });

    const ctxSales = document.getElementById("salesMixChart")?.getContext("2d");
    if (ctxSales) {
      if (salesMixChartInstance) salesMixChartInstance.destroy();
      salesMixChartInstance = new Chart(ctxSales, {
        type: "pie",
        data: {
          labels: Object.keys(salesMix),
          datasets: [
            {
              data: Object.values(salesMix),
              backgroundColor: [
                "#7CFF5A",
                "#FF6B6B",
                "#4F46E5",
                "#FFB347",
                "#8b5cf6",
                "#22c55e",
                "#ef4444",
                "#3b82f6",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "Sales Mix por Categoría" },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: $${formatearCOP(ctx.raw)}`,
              },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error al renderizar gráficos del bar:", error);
  }
}

// Declarar variables para los gráficos del bar
let ventasHoraChartInstance = null;
let topCocktailsChartInstance = null;
let salesMixChartInstance = null;

// ================= REST OF THE FUNCTIONS (sin cambios) =================

async function handlePostAction(e, action, statusDivId) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = e.submitter;

  if (submitBtn) {
    submitBtn.disabled = true;
  }
  displayStatus(statusDivId, "info", `Procesando...`);

  const data = {};
  Array.from(form.elements).forEach((input) => {
    if (input.id && (input.id.startsWith("p_") || input.id.startsWith("c_"))) {
      let valor = input.value;

      // Si es campo de dinero, limpiar antes de enviar
      if (input.classList.contains("money-input")) {
        valor = limpiarNumero(valor);
      }

      data[input.id.replace(/p_|c_/, "")] = valor;
    }
  });
  data.action = action;

  try {
    const responseData = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (responseData.status === "success") {
      displayStatus(statusDivId, "success", responseData.message);
      form.reset();
      if (action === "agregarCategoria") {
        loadInitialData();
      }
    } else {
      displayStatus(statusDivId, "error", responseData.message);
    }
  } catch (error) {
    displayStatus(statusDivId, "error", `Error de conexión: ${error.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }
}

async function handleQueryFilter(query, prefix) {
  const detailDiv = document.getElementById(`${prefix}_product_details`);
  const submitBtn = document.getElementById(`${prefix}_submit_btn`);
  const idInput = document.getElementById(`${prefix}_producto_id`);

  detailDiv.classList.add("hidden");
  detailDiv.innerHTML = "";
  idInput.value = "";
  submitBtn.disabled = true;

  if (query.length < 2) return;

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=buscarProducto&query=${encodeURIComponent(query)}`,
    );

    if (data.status === "success" && data.data && data.data.length > 0) {
      const product = data.data[0];
      productDataCache[product.id] = product;
      updateProductDetails(product, detailDiv, prefix);
      idInput.value = product.id;
      submitBtn.disabled = false;
    } else {
      detailDiv.classList.remove("hidden");
      detailDiv.innerHTML = `<p style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> ${
        data.message || "No se encontraron productos."
      }</p>`;
    }
  } catch (error) {
    detailDiv.classList.remove("hidden");
    detailDiv.innerHTML = `<p style="color:var(--danger-color);">Error de búsqueda: ${error.message}</p>`;
  }
}

function updateProductDetails(product, detailDiv, prefix) {
  detailDiv.classList.remove("hidden");

  const isCompra = prefix === "co";
  const priceLabel = isCompra ? "Precio Compra Actual" : "Precio Venta Actual";
  const basePrice = isCompra ? product.precio_compra : product.precio_venta;

  const stockStyle =
    product.stock < 5
      ? 'style="font-weight:bold; color:var(--danger-color);"'
      : 'style="font-weight:bold; color:var(--secondary-color);"';

  detailDiv.innerHTML = `
                <p><b>ID:</b> ${product.id} | <b>Producto:</b> ${
                  product.nombre
                } (Cód: ${product.código})</p>
                <p><b>Categoría:</b> ${product.categoría}</p>
                <p><b>Stock Actual:</b> <span ${stockStyle}>${
                  product.stock
                }</span></p>
                <p><b>${priceLabel}:</b> $${formatearCOP(basePrice)}</p>
            `;

  const priceInput = document.getElementById(
    `${prefix}_precio_${isCompra ? "compra" : "venta"}`,
  );
  priceInput.value = parseFloat(basePrice);

  // 👇 SOLO PARA VENTAS: selector de precio
  if (!isCompra) {
    const priceSelect = document.getElementById("v_precio_tipo");

    const prices = {
      precio_venta: product.precio_venta,
      precio_venta_2: product.precio_venta_2 || product.precio_venta,
      precio_venta_3: product.precio_venta_3 || product.precio_venta,
      precio_venta_4: product.precio_venta_4 || product.precio_venta,
    };

    priceSelect.onchange = () => {
      const selected = priceSelect.value;
      priceInput.value = parseFloat(prices[selected]);
    };

    // Disparar cambio inicial
    priceSelect.dispatchEvent(new Event("change"));
  }

  if (!isCompra && product.stock < 5) {
    detailDiv.innerHTML += `
                    <p class="status-message warning" style="display:block; margin-top:10px;">
                        Stock bajo. Solo quedan ${product.stock} unidades.
                    </p>`;
  }
}

async function handleTransactionPost(e, type) {
  e.preventDefault();
  const form = e.target;
  const prefix = type === "compra" ? "co" : "v";
  const statusDivId = type === "compra" ? "statusCompra" : "statusVenta";

  const submitBtn = document.getElementById(`${prefix}_submit_btn`);
  submitBtn.disabled = true;
  displayStatus(statusDivId, "info", `Registrando ${type}...`);

  const productoId = document.getElementById(`${prefix}_producto_id`).value;

  if (!productoId) {
    displayStatus(
      statusDivId,
      "error",
      `No hay producto seleccionado. Busque y seleccione uno.`,
    );
    submitBtn.disabled = false;
    return;
  }

  const transaccionData = {
    action: "registrarTransaccion",
    producto_id: productoId,
    cantidad: document.getElementById(`${prefix}_cantidad`).value,
    precio: limpiarNumero(
      document.getElementById(
        `${prefix}_precio_${type === "compra" ? "compra" : "venta"}`,
      ).value,
    ),
    type: type,
    extra_data: document.getElementById(
      `${prefix}_${type === "compra" ? "proveedor" : "cliente"}`,
    ).value,
  };

  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(transaccionData),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      displayStatus(statusDivId, "success", data.message);
      form.reset();
      delete productDataCache[productoId];
      document
        .getElementById(`${prefix}_product_details`)
        .classList.add("hidden");
    } else {
      displayStatus(statusDivId, "error", data.message);
    }
  } catch (error) {
    displayStatus(statusDivId, "error", `Error de conexión: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
  }
}

async function loadInventario() {
  displayStatus("statusInventario", "info", "Cargando datos de inventario...");
  const tableBody = document.getElementById("inventarioTableBody");
  tableBody.innerHTML = '<tr><td colspan="9">Cargando...</td></tr>';

  try {
    // Intentar cargar del servidor
    const data = await utils.fetchJson(`${SCRIPT_URL}?action=getInventario`);

    if (
      data &&
      data.status === "success" &&
      data.data &&
      data.data.length > 0
    ) {
      inventarioCache = data.data;
      inventarioCargado = true;

      // Guardar en localStorage para uso offline
      utils.saveInventarioOffline(data.data);

      // Poblar select de categorías
      const categoriaSelect = document.getElementById(
        "inventarioFiltroCategoria",
      );
      const categorias = [
        ...new Set(data.data.map((p) => p.categoría).filter(Boolean)),
      ].sort();
      categoriaSelect.innerHTML =
        '<option value="">Todas las categorías</option>' +
        categorias.map((c) => `<option value="${c}">${c}</option>`).join("");

      displayStatus(
        "statusInventario",
        "success",
        `Inventario cargado: ${data.data.length} productos.`,
      );

      posProductCache = {};
      data.data.forEach((p) => {
        posProductCache[p.código] = p;
        posProductCache[p.id] = p;
      });

      filtrarInventario();
      return; // Éxito
    } else {
      const mensaje = data?.message || "No hay productos en inventario.";
      displayStatus("statusInventario", "warning", mensaje);
      tableBody.innerHTML =
        '<tr><td colspan="9">No hay productos en inventario.</td></tr>';
    }
  } catch (error) {
    console.debug("[INVENTARIO] Sin conexión, intentando localStorage...");
  }

  // Si falló la conexión, intentar localStorage
  const offlineData = utils.getInventarioOffline();
  if (offlineData && offlineData.length > 0) {
    inventarioCache = offlineData;
    inventarioCargado = true;

    posProductCache = {};
    offlineData.forEach((p) => {
      posProductCache[p.código] = p;
      posProductCache[p.id] = p;
    });

    // Poblar categorías para el filtro
    const categoriaSelect = document.getElementById(
      "inventarioFiltroCategoria",
    );
    const categorias = [
      ...new Set(offlineData.map((p) => p.categoría).filter(Boolean)),
    ].sort();
    categoriaSelect.innerHTML =
      '<option value="">Todas las categorías</option>' +
      categorias.map((c) => `<option value="${c}">${c}</option>`).join("");

    displayStatus(
      "statusInventario",
      "warning",
      "Inventario cargado offline (sin conexión)",
    );
    filtrarInventario();
    return;
  }

  // No hay datos disponibles
  displayStatus(
    "statusInventario",
    "error",
    "Sin conexión y sin inventario guardado",
  );
  tableBody.innerHTML =
    '<tr><td colspan="9">Sin conexión y sin inventario guardado.</td></tr>';
}

function filtrarInventario() {
  const tableBody = document.getElementById("inventarioTableBody");
  const filtro = document
    .getElementById("inventarioFiltro")
    .value.toLowerCase();
  const filtroCategoria = document.getElementById(
    "inventarioFiltroCategoria",
  ).value;

  if (!inventarioCache || inventarioCache.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="9">No hay productos en inventario.</td></tr>';
    actualizarPaginacionInventario(0, 0, 0);
    return;
  }

  const filtered = inventarioCache.filter((p) => {
    const matchBusqueda =
      !filtro ||
      String(p.nombre).toLowerCase().includes(filtro) ||
      String(p.código).toLowerCase().includes(filtro) ||
      String(p.id).toLowerCase().includes(filtro);
    const matchCategoria = !filtroCategoria || p.categoría === filtroCategoria;
    return matchBusqueda && matchCategoria;
  });

  // Ordenamiento
  const ordenarPor =
    document.getElementById("inventarioOrdenar")?.value || "nombre-asc";
  filtered.sort((a, b) => {
    switch (ordenarPor) {
      case "nombre-asc":
        return String(a.nombre || "").localeCompare(String(b.nombre || ""));
      case "nombre-desc":
        return String(b.nombre || "").localeCompare(String(a.nombre || ""));
      case "fecha-recientes":
        return new Date(b.fecha_creado || 0) - new Date(a.fecha_creado || 0);
      case "fecha-antiguos":
        return new Date(a.fecha_creado || 0) - new Date(b.fecha_creado || 0);
      default:
        return String(a.nombre || "").localeCompare(String(b.nombre || ""));
    }
  });

  // Paginación
  inventarioPorPagina = parseInt(
    document.getElementById("inventarioPageSize")?.value || 20,
  );
  const totalItems = filtered.length;
  const totalPaginas = Math.ceil(totalItems / inventarioPorPagina);
  if (inventarioPagina > totalPaginas) inventarioPagina = 1;

  const inicio = (inventarioPagina - 1) * inventarioPorPagina;
  const fin = Math.min(inicio + inventarioPorPagina, totalItems);
  const paginated = filtered.slice(inicio, fin);

  actualizarPaginacionInventario(inicio + 1, fin, totalItems);

  tableBody.innerHTML =
    paginated.length === 0
      ? '<tr><td colspan="9">No hay productos que coincidan con los filtros.</td></tr>'
      : paginated
          .map((p) => {
            const stockStyle =
              p.stock < 5
                ? 'style="color: var(--danger-color); font-weight: bold;"'
                : "";
            const pv1 = Number(p.precio_venta) || 0;
            const pv2 = Number(p.precio_venta_2) || 0;
            const pv3 = Number(p.precio_venta_3) || 0;
            const pv4 = Number(p.precio_venta_4) || 0;
            const pc = Number(p.precio_compra) || 0;
            return `
          <tr onclick="mostrarInventarioDetalle('${p.id}')" style="cursor: pointer;">
            <td>${p.nombre}</td>
            <td>${p.código}</td>
            <td>${p.categoría}</td>
            <td ${stockStyle}>${p.stock}</td>
            <td>$${formatearCOP(pc)}</td>
            <td>$${formatearCOP(pv1)}</td>
            <td>$${formatearCOP(pv2)}</td>
            <td>$${formatearCOP(pv3)}</td>
            <td>$${formatearCOP(pv4)}</td>
          </tr>
        `;
          })
          .join("");
}

function actualizarPaginacionInventario(start, end, total) {
  document.getElementById("inventarioStart").textContent = start;
  document.getElementById("inventarioEnd").textContent = end;
  document.getElementById("inventarioTotal").textContent = total;
  document.getElementById("inventarioPageInfo").textContent =
    `Página ${inventarioPagina}`;
}

function cambiarPaginaInventario(delta) {
  const filtro = document
    .getElementById("inventarioFiltro")
    .value.toLowerCase();
  const filtroCategoria = document.getElementById(
    "inventarioFiltroCategoria",
  ).value;
  const ordenarPor =
    document.getElementById("inventarioOrdenar")?.value || "nombre-asc";

  const filtered = inventarioCache.filter((p) => {
    const matchBusqueda =
      !filtro ||
      String(p.nombre).toLowerCase().includes(filtro) ||
      String(p.código).toLowerCase().includes(filtro) ||
      String(p.id).toLowerCase().includes(filtro);
    const matchCategoria = !filtroCategoria || p.categoría === filtroCategoria;
    return matchBusqueda && matchCategoria;
  });

  filtered.sort((a, b) => {
    switch (ordenarPor) {
      case "nombre-asc":
        return String(a.nombre || "").localeCompare(String(b.nombre || ""));
      case "nombre-desc":
        return String(b.nombre || "").localeCompare(String(a.nombre || ""));
      case "fecha-recientes":
        return new Date(b.fecha_creado || 0) - new Date(a.fecha_creado || 0);
      case "fecha-antiguos":
        return new Date(a.fecha_creado || 0) - new Date(b.fecha_creado || 0);
      default:
        return String(a.nombre || "").localeCompare(String(b.nombre || ""));
    }
  });

  inventarioPorPagina = parseInt(
    document.getElementById("inventarioPageSize")?.value || 20,
  );
  const totalPaginas = Math.ceil(filtered.length / inventarioPorPagina);

  if (delta === 0 || delta === undefined) {
    inventarioPagina = 1;
  } else {
    inventarioPagina += delta;
  }
  if (inventarioPagina < 1) inventarioPagina = 1;
  if (inventarioPagina > totalPaginas) inventarioPagina = totalPaginas;

  filtrarInventario();
}

function limpiarFiltrosInventario() {
  document.getElementById("inventarioFiltro").value = "";
  document.getElementById("inventarioFiltroCategoria").value = "";
  document.getElementById("inventarioOrdenar").value = "nombre-asc";
  inventarioPagina = 1;
  filtrarInventario();
}

let resumenCache = { data: [], tipo: "" };

async function loadSummary(type) {
  const sheetName = type === "Ventas" ? "VENTAS" : "COMPRAS";
  const isVenta = type === "Ventas";
  displayStatus("statusResumen", "info", `Cargando resumen de ${sheetName}...`);
  const table = document.getElementById("resumenTable");
  const tableHead = table.querySelector("thead");
  const tableBody = document.getElementById("resumenTableBody");
  table.classList.add("hidden");
  tableBody.innerHTML = "";

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=${sheetName}`,
    );

    if (data.status === "success" && data.data.length > 0) {
      displayStatus(
        "statusResumen",
        "success",
        `${data.data.length} ${sheetName} registradas.`,
      );
      table.classList.remove("hidden");

      // Cachear datos para mostrar detalles
      resumenCache = { data: data.data, tipo: type };

      aplicarFiltrosResumen(isVenta);
    } else {
      displayStatus(
        "statusResumen",
        "warning",
        `No hay datos en la pestaña ${sheetName}.`,
      );
    }
  } catch (error) {
    displayStatus(
      "statusResumen",
      "error",
      `Error al cargar resumen: ${error.message}`,
    );
  }
}

function aplicarFiltrosResumen(isVenta) {
  const tableBody = document.getElementById("resumenTableBody");
  const tableHead = document.querySelector("#resumenTable thead");
  const filtroFecha = document.getElementById("resumenFiltroFecha").value;
  const filtroMetodo = document.getElementById("resumenFiltroMetodo").value;

  if (!resumenCache.data || resumenCache.data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="9">No hay datos.</td></tr>';
    actualizarPaginacionResumen(0, 0, 0);
    return;
  }

  const filtered = resumenCache.data.filter((row) => {
    const fecha = new Date(row.fecha);
    const fechaStr = fecha.toISOString().split("T")[0];
    const matchFecha = !filtroFecha || fechaStr === filtroFecha;
    const matchMetodo = !filtroMetodo || row.metodo_pago === filtroMetodo;
    return matchFecha && matchMetodo;
  });

  // Ordenamiento
  const ordenarPor =
    document.getElementById("resumenOrdenar")?.value || "fecha-desc";
  filtered.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    const totalA = parseFloat(a.total_final) || 0;
    const totalB = parseFloat(b.total_final) || 0;
    switch (ordenarPor) {
      case "fecha-desc":
        return fechaB - fechaA;
      case "fecha-asc":
        return fechaA - fechaB;
      case "total-desc":
        return totalB - totalA;
      case "total-asc":
        return totalA - totalB;
      default:
        return fechaB - fechaA;
    }
  });

  // Paginación
  resumenPorPagina = parseInt(
    document.getElementById("resumenPageSize")?.value || 20,
  );
  const totalItems = filtered.length;
  const totalPaginas = Math.ceil(totalItems / resumenPorPagina);
  if (resumenPagina > totalPaginas) resumenPagina = 1;

  const inicio = (resumenPagina - 1) * resumenPorPagina;
  const fin = Math.min(inicio + resumenPorPagina, totalItems);
  const paginated = filtered.slice(inicio, fin);

  actualizarPaginacionResumen(inicio + 1, fin, totalItems);

  // Definir columnas segun el tipo
  const columnas = isVenta
    ? [
        { key: "consecutivo", label: "#" },
        { key: "fecha", label: "Fecha" },
        { key: "cliente", label: "Cliente" },
        { key: "metodo_pago", label: "Pago" },
        { key: "descuento_global_pct", label: "Dcto %" },
        { key: "total_final", label: "Total" },
        { key: "ingresado", label: "Caja?" },
        { key: "monto_recibido", label: "Recibido" },
        { key: "cambio", label: "Cambio" },
      ]
    : [
        { key: "consecutivo", label: "#" },
        { key: "fecha", label: "Fecha" },
        { key: "proveedor", label: "Proveedor" },
        { key: "metodo_pago", label: "Pago" },
        { key: "descuento_global_pct", label: "Dcto %" },
        { key: "total_final", label: "Total" },
        { key: "monto_recibido", label: "Recibido" },
        { key: "cambio", label: "Cambio" },
      ];

  // Crear encabezados
  tableHead.innerHTML = `
<tr>
  ${columnas.map((col) => `<th>${col.label}</th>`).join("")}
</tr>
`;

  if (paginated.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="9">No hay datos que coincidan con los filtros.</td></tr>';
    return;
  }

  // Crear filas
  tableBody.innerHTML = paginated
    .map((row) => {
      const idField = isVenta ? "id_venta" : "id_compra";
      const clickHandler = isVenta
        ? `onclick="mostrarFactura('${row[idField]}')"`
        : `onclick="mostrarCompra('${row[idField]}')"`;
      return `
      <tr ${clickHandler} style="cursor:pointer;">
        ${columnas
          .map((col) => {
            let value = row[col.key] ?? "";

            if (col.key === "consecutivo") {
              value = formatearConsecutivo(value);
            }

            if (col.key === "fecha" && value) {
              value = new Date(value).toLocaleDateString();
            }

            if (
              col.key === "total_final" ||
              col.key === "monto_recibido" ||
              col.key === "cambio"
            ) {
              value = formatearCOP(value);
            }

            if (col.key === "ingresado") {
              const valIng = String(value || "").toUpperCase();
              const isIng =
                value === true || valIng === "TRUE" || valIng === "YES";
              value = `<span class="badge ${isIng ? "badge-success" : "badge-warning"}">${isIng ? "SI" : "NO"}</span>`;
            }

            return `<td>${value}</td>`;
          })
          .join("")}
      </tr>
    `;
    })
    .join("");
}

function actualizarPaginacionResumen(start, end, total) {
  document.getElementById("resumenStart").textContent = start;
  document.getElementById("resumenEnd").textContent = end;
  document.getElementById("resumenTotal").textContent = total;
  document.getElementById("resumenPageInfo").textContent =
    `Página ${resumenPagina}`;
}

function cambiarPaginaResumen(delta) {
  const filtroFecha = document.getElementById("resumenFiltroFecha").value;
  const filtroMetodo = document.getElementById("resumenFiltroMetodo").value;
  const isVenta = resumenCache.tipo === "Ventas";
  const ordenarPor =
    document.getElementById("resumenOrdenar")?.value || "fecha-desc";

  const filtered = resumenCache.data.filter((row) => {
    const fecha = new Date(row.fecha);
    const fechaStr = fecha.toISOString().split("T")[0];
    const matchFecha = !filtroFecha || fechaStr === filtroFecha;
    const matchMetodo = !filtroMetodo || row.metodo_pago === filtroMetodo;
    return matchFecha && matchMetodo;
  });

  // Aplicar mismo ordenamiento que en aplicarFiltrosResumen
  filtered.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    const totalA = parseFloat(a.total_final) || 0;
    const totalB = parseFloat(b.total_final) || 0;
    switch (ordenarPor) {
      case "fecha-desc":
        return fechaB - fechaA;
      case "fecha-asc":
        return fechaA - fechaB;
      case "total-desc":
        return totalB - totalA;
      case "total-asc":
        return totalA - totalB;
      default:
        return fechaB - fechaA;
    }
  });

  resumenPorPagina = parseInt(
    document.getElementById("resumenPageSize")?.value || 20,
  );
  const totalPaginas = Math.ceil(filtered.length / resumenPorPagina);

  // If delta is 0, reset to page 1 (used by page size change)
  if (delta === 0) {
    resumenPagina = 1;
  } else {
    resumenPagina += delta;
  }
  if (resumenPagina < 1) resumenPagina = 1;
  if (resumenPagina > totalPaginas) resumenPagina = totalPaginas;

  aplicarFiltrosResumen(isVenta);
}

function filtrarResumen() {
  const isVenta = resumenCache.tipo === "Ventas";
  aplicarFiltrosResumen(isVenta);
}

function limpiarFiltrosResumen() {
  document.getElementById("resumenFiltroFecha").value = "";
  document.getElementById("resumenFiltroMetodo").value = "";
  document.getElementById("resumenOrdenar").value = "fecha-desc";
  resumenPagina = 1;
  filtrarResumen();
}

async function handleConfigAction(action) {
  const statusConfig = document.getElementById("statusConfig");
  setButtonState(true);
  displayStatus("statusConfig", "info", `Procesando la acción de ${action}...`);

  try {
    const data = await utils.fetchJson(`${SCRIPT_URL}?action=${action}`);

    if (data.status === "success") {
      displayStatus("statusConfig", "success", data.message);
      loadInitialData();
    } else {
      displayStatus("statusConfig", "error", data.message);
    }
  } catch (error) {
    displayStatus(
      "statusConfig",
      "error",
      `Error de conexión: ${error.message}.`,
    );
  } finally {
    setButtonState(false);
  }
}

function setButtonState(disabled) {
  document.getElementById("iniciarDBBtn").disabled = disabled;
  document.getElementById("resetDBBtn").disabled = disabled;
}

function displayStatus(elementId, type, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = "block";
  el.className = `status-message ${type}`;
  el.innerHTML = `<i class="fas fa-${
    type === "success"
      ? "check"
      : type === "error"
        ? "times"
        : type === "warning"
          ? "exclamation-triangle"
          : "info"
  }-circle"></i> ${message}`;

  // Auto-ocultar mensajes de éxito e info después de 3 segundos
  if (type === "success" || type === "info") {
    setTimeout(() => {
      if (el) el.style.display = "none";
    }, 3000);
  }
}

// ================= CACHE DE PRODUCTOS =================
let posProductCache = {};

// ================= POS RÁPIDO =================

const posVenta = {
  items: [],
  subtotal: 0,
  descuento_global_pct: 0,
  total_con_descuento: 0,
};

const posInput = document.getElementById("posBuscar");
const posTabla = document.getElementById("posTabla");
const posTotal = document.getElementById("posTotal");

let posSugerenciaIndex = -1;
let coSugerenciaIndex = -1;

if (posInput) {
  posInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    posMostrarSugerencias(query);
  });

  posInput.addEventListener("keydown", (e) => {
    const suggestions = document.querySelectorAll(
      "#posSugerencias .pos-suggestion-item",
    );
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      posSugerenciaIndex = (posSugerenciaIndex + 1) % suggestions.length;
      posActualizarSeleccionSugerencia(suggestions);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      posSugerenciaIndex =
        (posSugerenciaIndex - 1 + suggestions.length) % suggestions.length;
      posActualizarSeleccionSugerencia(suggestions);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (posSugerenciaIndex > -1) {
        suggestions[posSugerenciaIndex].click();
      } else {
        const query = posInput.value.trim();
        if (query) {
          posBuscarProducto(query);
          posInput.value = "";
          posCerrarSugerencias();
        }
      }
    } else if (e.key === "Escape") {
      posCerrarSugerencias();
    }
  });

  // Cerrar sugerencias al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (
      !posInput.contains(e.target) &&
      !document.getElementById("posSugerencias").contains(e.target)
    ) {
      posCerrarSugerencias();
    }
  });
}

function posMostrarSugerencias(query) {
  const container = document.getElementById("posSugerencias");
  if (!container) return;
  if (!inventarioCache) return;

  if (query.length < 2) {
    posCerrarSugerencias();
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matches = inventarioCache
    .filter(
      (p) =>
        String(p.nombre).toLowerCase().includes(lowerQuery) ||
        String(p.código).toLowerCase().includes(lowerQuery),
    )
    .slice(0, 10); // Limitar a 10 sugerencias

  if (matches.length === 0) {
    posCerrarSugerencias();
    return;
  }

  posSugerenciaIndex = -1;
  container.innerHTML = matches
    .map(
      (p, index) => `
    <div class="pos-suggestion-item" onclick="posSeleccionarSugerencia('${p.id}')">
      <div class="name">${p.nombre}</div>
      <div class="meta">
        <span>Código: ${p.código}</span>
        <span>Stock: ${p.stock}</span>
      </div>
    </div>
  `,
    )
    .join("");

  container.classList.remove("hidden");
}

function posActualizarSeleccionSugerencia(suggestions) {
  suggestions.forEach((s, i) => {
    if (i === posSugerenciaIndex) {
      s.classList.add("selected");
      s.scrollIntoView({ block: "nearest" });
    } else {
      s.classList.remove("selected");
    }
  });
}

function posSeleccionarSugerencia(id) {
  const producto = inventarioCache.find((p) => String(p.id) === String(id));
  if (producto) {
    posAgregarProducto(producto);
    posInput.value = "";
    posCerrarSugerencias();
    posInput.focus();
  }
}

function posCerrarSugerencias() {
  const container = document.getElementById("posSugerencias");
  if (container) container.classList.add("hidden");
  posSugerenciaIndex = -1;
}

// ================= COMPRAS POS =================

let coVenta = {
  items: [],
  subtotal: 0,
  total_con_descuento: 0,
  descuento_global_pct: 0,
};

async function prepararCompras() {
  const coInput = document.getElementById("coBuscar");

  if (!inventarioCargado) {
    if (coInput) coInput.disabled = true;
    displayStatus(
      "statusCompras",
      "info",
      "Cargando inventario para compras...",
    );
    await loadInventario();
    displayStatus("statusCompras", "success", "Inventario listo.");
    if (coInput) coInput.disabled = false;
  } else {
    if (coInput) coInput.disabled = false;
  }

  // Resetear estado de compras
  coVenta = {
    items: [],
    subtotal: 0,
    total_con_descuento: 0,
    descuento_global_pct: 0,
  };
  coRender();

  // Focus en el buscador
  if (coInput) {
    setTimeout(() => {
      coInput.focus();
    }, 100);
  }
}

function coBuscarProducto(query) {
  const lowerQuery = query.toLowerCase();
  const matches = inventarioCache
    .filter(
      (p) =>
        String(p.nombre).toLowerCase().includes(lowerQuery) ||
        String(p.código).toLowerCase().includes(lowerQuery) ||
        String(p.id).toLowerCase() === lowerQuery,
    )
    .slice(0, 10);

  const container = document.getElementById("coSugerencias");
  if (!container) return;

  if (matches.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.innerHTML = matches
    .map(
      (p) => `
      <div class="pos-suggestion-item" onclick="coSeleccionarProducto('${p.id}')">
        <div class="name">${p.nombre}</div>
        <div class="meta">
          <span>Codigo: ${p.código}</span>
          <span>Stock: ${p.stock}</span>
        </div>
      </div>
    `,
    )
    .join("");

  container.classList.remove("hidden");
}

function coSeleccionarProducto(id) {
  const producto = inventarioCache.find((p) => String(p.id) === String(id));
  if (!producto) return;

  // Agregar producto al carrito con cantidad 1 y precio de compra
  const precioCompra = producto.precio_compra || producto.precio || 0;

  coVenta.items.push({
    producto_id: producto.id,
    nombre: producto.nombre,
    codigo: producto.código,
    cantidad: 1,
    precio_unitario: precioCompra,
    subtotal_original: precioCompra,
    subtotal_final: precioCompra,
    precios: producto.precios || {},
    precio_tipo: "venta",
  });

  coRecalcular();
  coRender();

  // Cerrar sugerencias
  const container = document.getElementById("coSugerencias");
  if (container) container.classList.add("hidden");

  // Limpiar input
  const input = document.getElementById("coBuscar");
  if (input) input.value = "";
}

function coRender() {
  const coTabla = document.getElementById("coTabla");
  if (!coTabla) return;

  coTabla.innerHTML = "";

  coVenta.items.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.codigo}</td>
      <td>
        <input
          type="text"
          value="${formatearCOP(item.precio_unitario)}"
          onchange="coCambiarPrecio(${index}, this.value)"
          class="money-input"
          style="width:90px"
          min="0"
        />
      </td>
      <td>
        <input
          type="number"
          min="1"
          value="${item.cantidad}"
          onchange="coCambiarCantidad(${index}, this.value)"
          style="width:60px"
        />
      </td>
      <td>$${formatearCOP(item.subtotal_final)}</td>
      <td>
        <button class="btn danger-btn" onclick="coEliminar(${index})">Eliminar</button>
      </td>
    `;
    coTabla.appendChild(tr);
  });

  // Render mobile cards
  const cartCards = document.getElementById("coCartCards");
  if (cartCards) {
    if (coVenta.items.length === 0) {
      cartCards.innerHTML = `
        <div class="cart-card-empty">
          <i class="fas fa-shopping-cart"></i>
          <p>El carrito está vacío</p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem;">Busca un producto para comenzar</p>
        </div>
      `;
    } else {
      cartCards.innerHTML = coVenta.items
        .map(
          (item, index) => `
        <div class="cart-card">
          <div class="cart-card-header">
            <div>
              <div class="cart-card-title">${item.nombre}</div>
              <div class="cart-card-code">Código: ${item.codigo}</div>
            </div>
            <button class="cart-card-delete" onclick="coEliminar(${index})" title="Eliminar">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="cart-card-body">
            <div class="cart-card-row">
              <span class="cart-card-label">Precio:</span>
              <div class="cart-card-controls">
                <input type="text" value="${formatearCOP(item.precio_unitario)}" onchange="coCambiarPrecio(${index}, this.value)" class="money-input" />
              </div>
            </div>
            <div class="cart-card-row">
              <span class="cart-card-label">Cantidad:</span>
              <div class="cart-card-controls">
                <button class="qty-btn minus" onclick="coCambiarCantidadMobile(${index}, -1)">-</button>
                <input type="number" value="${item.cantidad}" min="1" onchange="coCambiarCantidad(${index}, this.value)" />
                <button class="qty-btn plus" onclick="coCambiarCantidadMobile(${index}, 1)">+</button>
              </div>
            </div>
          </div>
          <div class="cart-card-footer">
            <span>Subtotal:</span>
            <span class="cart-card-subtotal">$${formatearCOP(item.subtotal_final)}</span>
          </div>
        </div>
      `,
        )
        .join("");
    }
  }
}

function coCambiarCantidad(index, cantidad) {
  coVenta.items[index].cantidad = parseInt(cantidad) || 1;
  coVenta.items[index].subtotal_original =
    coVenta.items[index].precio_unitario * coVenta.items[index].cantidad;
  coVenta.items[index].subtotal_final = coVenta.items[index].subtotal_original;
  coRecalcular();
  coRender();
}

function coCambiarCantidadMobile(index, delta) {
  const item = coVenta.items[index];
  const nuevaCantidad = Math.max(1, item.cantidad + delta);
  item.cantidad = nuevaCantidad;
  item.subtotal_original = item.precio_unitario * item.cantidad;
  item.subtotal_final = item.subtotal_original;
  coRecalcular();
  coRender();
}

function coCambiarPrecio(index, precio) {
  coVenta.items[index].precio_unitario = utils.cleanNumber(precio) || 0;
  coVenta.items[index].subtotal_original =
    coVenta.items[index].precio_unitario * coVenta.items[index].cantidad;
  coVenta.items[index].subtotal_final = coVenta.items[index].subtotal_original;
  coRecalcular();
  coRender();
}

function coEliminar(index) {
  coVenta.items.splice(index, 1);
  coRecalcular();
  coRender();
}

function coRecalcular() {
  let subtotalBase = 0;

  coVenta.items.forEach((item) => {
    item.subtotal_original = item.precio_unitario * item.cantidad;
    item.subtotal_final = item.subtotal_original;
    subtotalBase += item.subtotal_final;
  });

  coVenta.subtotal = subtotalBase;

  const descuentoGlobalMonto =
    subtotalBase * (coVenta.descuento_global_pct / 100);
  const subtotalConDescuento = subtotalBase - descuentoGlobalMonto;
  coVenta.total_con_descuento = subtotalConDescuento;

  coActualizarResumen();
}

function coActualizarResumen() {
  const subtotalSpan = document.getElementById("coSubtotal");
  const totalSpan = document.getElementById("coTotal");

  // Obtener valor del envío
  const coEnvioInput = document.getElementById("coEnvioValor");
  let envioMonto = 0;
  if (coEnvioInput) {
    envioMonto = Number(utils.cleanNumber(coEnvioInput.value || 0)) || 0;
  }

  // Mostrar/ocultar fila de envío en resumen
  const coEnvioRow = document.getElementById("coEnvioRow");
  const coEnvioDisplay = document.getElementById("coEnvio");
  if (coEnvioRow && coEnvioDisplay) {
    coEnvioDisplay.textContent = formatearCOP(envioMonto);
    coEnvioRow.style.display = envioMonto > 0 ? "flex" : "none";
  }

  if (subtotalSpan) {
    subtotalSpan.textContent = formatearCOP(coVenta.subtotal);
  }

  if (totalSpan) {
    // Total incluye envío
    const totalConEnvio = coVenta.total_con_descuento + envioMonto;
    totalSpan.textContent = formatearCOP(totalConEnvio);
  }

  // Actualizar cambio
  coActualizarCambio();
}

function coActualizarCambio() {
  const montoInput = document.getElementById("coMontoRecibido");
  const coCambio = document.getElementById("coCambio");
  const metodo = document.getElementById("coMetodoPago").value;

  if (!montoInput || !coCambio) return;
  if (metodo !== "efectivo") {
    coCambio.textContent = "0";
    return;
  }

  // Obtener valor del envío
  const coEnvioInput = document.getElementById("coEnvioValor");
  let envioMonto = 0;
  if (coEnvioInput) {
    envioMonto = Number(utils.cleanNumber(coEnvioInput.value || 0)) || 0;
  }

  const recibido = limpiarNumero(montoInput.value);
  const totalFinal = coVenta.total_con_descuento + envioMonto;
  const cambio = recibido - totalFinal;

  coCambio.textContent = cambio >= 0 ? formatearCOP(cambio) : "0";
}

async function coConfirmarCompra() {
  if (coVenta.items.length === 0) {
    alert("No hay productos en la compra.");
    return;
  }

  const montoRecibidoInput = document.getElementById("coMontoRecibido");
  const proveedorInput = document.getElementById("coProveedor");
  const proveedorTelefonoInput = document.getElementById("coProveedorTelefono");
  const metodoPago = document.getElementById("coMetodoPago").value;

  let montoRecibido = limpiarNumero(montoRecibidoInput?.value) || 0;
  const totalFinal = coVenta.total_con_descuento;

  if (metodoPago === "efectivo") {
    if (!montoRecibido || montoRecibido < totalFinal) {
      alert("Monto recibido insuficiente.");
      return;
    }
  } else {
    montoRecibido = totalFinal;
  }

  const confirmBtn = document.querySelector(
    'button[onclick="coConfirmarCompra()"]',
  );
  if (confirmBtn) confirmBtn.disabled = true;

  mostrarLoading("Registrando compra...");

  const compraData = {
    action: "registrarCompraPOS",
    proveedor: proveedorInput?.value || "Sin proveedor",
    proveedorTelefono: proveedorTelefonoInput?.value || "",
    montoRecibido: montoRecibido,
    items: coVenta.items.map((item) => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio: item.precio_unitario,
    })),
    descuento_global_pct: coVenta.descuento_global_pct,
    metodoPago: metodoPago,
    // Envío
    envio: document.getElementById("coEnvioCheckbox")?.checked || false,
    direccion_entrega: document.getElementById("coEnvioDireccion")?.value || "",
    valor_envio: (() => {
      const el = document.getElementById("coEnvioValor");
      return el ? limpiarNumero(el.value) || 0 : 0;
    })(),
  };

  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(compraData),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      coVenta.items = [];
      coVenta.subtotal = 0;
      coVenta.total_con_descuento = 0;
      coVenta.descuento_global_pct = 0;

      coRender();

      if (montoRecibidoInput) montoRecibidoInput.value = "";
      if (proveedorInput) proveedorInput.value = "";
      if (proveedorTelefonoInput) proveedorTelefonoInput.value = "";

      // Resetear campos de envío
      const coEnvioChk = document.getElementById("coEnvioCheckbox");
      const coEnvioDir = document.getElementById("coEnvioDireccion");
      const coEnvioVal = document.getElementById("coEnvioValor");
      const coEnvioInputs = document.getElementById("coEnvioInputs");
      if (coEnvioChk) coEnvioChk.checked = false;
      if (coEnvioDir) coEnvioDir.value = "";
      if (coEnvioVal) coEnvioVal.value = "";
      if (coEnvioInputs) coEnvioInputs.classList.add("hidden");

      const metodoPagoSelect = document.getElementById("coMetodoPago");
      const descGlobalSelect = document.getElementById("coDescuentoGlobal");
      if (metodoPagoSelect) {
        metodoPagoSelect.value = "efectivo";
        metodoPagoSelect.dispatchEvent(new Event("change"));
      }
      if (descGlobalSelect) {
        descGlobalSelect.value = "0";
      }

      coActualizarResumen();

      // Recargar inventario inmediatamente
      await loadInventario();

      alert("Compra registrada correctamente.");
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error al registrar compra:", error);

    // Guardar compra offline si hay error de conexión
    const offlineId = utils.saveCompraOffline(compraData);

    if (offlineId) {
      // Limpiar el POS compras como si la compra hubiera sido exitosa
      coVenta.items = [];
      coVenta.subtotal = 0;
      coVenta.total_con_descuento = 0;
      coVenta.descuento_global_pct = 0;

      coRender();

      if (montoRecibidoInput) montoRecibidoInput.value = "";
      if (proveedorInput) proveedorInput.value = "";
      if (proveedorTelefonoInput) proveedorTelefonoInput.value = "";

      const coEnvioChk = document.getElementById("coEnvioCheckbox");
      const coEnvioDir = document.getElementById("coEnvioDireccion");
      const coEnvioVal = document.getElementById("coEnvioValor");
      const coEnvioInputs = document.getElementById("coEnvioInputs");
      if (coEnvioChk) coEnvioChk.checked = false;
      if (coEnvioDir) coEnvioDir.value = "";
      if (coEnvioVal) coEnvioVal.value = "";
      if (coEnvioInputs) coEnvioInputs.classList.add("hidden");

      const metodoPagoSelect = document.getElementById("coMetodoPago");
      const descGlobalSelect = document.getElementById("coDescuentoGlobal");
      if (metodoPagoSelect) {
        metodoPagoSelect.value = "efectivo";
        metodoPagoSelect.dispatchEvent(new Event("change"));
      }
      if (descGlobalSelect) {
        descGlobalSelect.value = "0";
      }

      coActualizarResumen();
      await loadInventario();

      showToast(
        `Compra guardada offline (ID: ${offlineId}). Se sincronizará automáticamente.`,
        "warning",
      );
    } else {
      showToast("Error al registrar compra: " + error.message, "error");
    }
  } finally {
    const confirmBtn = document.querySelector(
      'button[onclick="coConfirmarCompra()"]',
    );
    if (confirmBtn) confirmBtn.disabled = false;
    ocultarLoading();
  }
}

// ================= COMPRAS SUGERENCIAS =================

function coMostrarSugerencias(query) {
  const container = document.getElementById("coSugerencias");
  if (!container) return;

  if (query.length < 2) {
    coCerrarSugerencias();
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matches = inventarioCache
    .filter(
      (p) =>
        String(p.nombre).toLowerCase().includes(lowerQuery) ||
        String(p.código).toLowerCase().includes(lowerQuery),
    )
    .slice(0, 10);

  if (matches.length === 0) {
    coCerrarSugerencias();
    return;
  }

  // Reuse the exact same CSS classes from pos-suggestions for matching UI
  coSugerenciaIndex = -1;
  container.innerHTML = matches
    .map(
      (p, index) => `
    <div class="pos-suggestion-item" onclick="coSeleccionarSugerencia('${p.id}')">
      <div class="name">${p.nombre}</div>
      <div class="meta">
        <span>Código: ${p.código}</span>
        <span>Stock: ${p.stock}</span>
      </div>
    </div>
  `,
    )
    .join("");

  container.classList.remove("hidden");
}

function coActualizarSeleccionSugerencia(suggestions) {
  suggestions.forEach((s, i) => {
    if (i === coSugerenciaIndex) {
      s.classList.add("selected");
      s.scrollIntoView({ block: "nearest" });
    } else {
      s.classList.remove("selected");
    }
  });
}

function coSeleccionarSugerencia(id) {
  const producto = inventarioCache.find((p) => String(p.id) === String(id));
  if (producto) {
    document.getElementById("co_query").value =
      producto.código || producto.nombre; // Just to see something in the input box
    handleQueryFilter(producto.id, "co"); // Force search by ID
    coCerrarSugerencias();
  }
}

function coCerrarSugerencias() {
  document.getElementById("coSugerencias")?.classList.add("hidden");
  if (typeof coSugerenciaIndex !== "undefined") {
    coSugerenciaIndex = -1;
  }
}

function posBuscarProducto(query) {
  const producto = posProductCache[query];

  if (!producto) {
    alert("Producto no encontrado");
    return;
  }

  posAgregarProducto(producto);
}

function posAgregarProducto(producto) {
  const item = posVenta.items.find((i) => i.producto_id === producto.id);

  const precios = {
    precio_venta: Number(producto.precio_venta) || 0,
    precio_venta_2: Number(producto.precio_venta_2) || 0,
    precio_venta_3: Number(producto.precio_venta_3) || 0,
    precio_venta_4: Number(producto.precio_venta_4) || 0,
  };

  if (item) {
    item.cantidad += 1;
  } else {
    posVenta.items.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      codigo: producto.código,
      cantidad: 1,
      precio_tipo: "precio_venta",
      precios,
      precio_unitario: precios.precio_venta,
      descuento_pct: 0,
      subtotal_original: 0,
      subtotal_final: 0,
    });
  }

  posRecalcular();
  posRender();
}

function posRecalcular() {
  let subtotalBase = 0;

  posVenta.items.forEach((item) => {
    item.precio_unitario = item.precios[item.precio_tipo];

    item.subtotal_original = item.precio_unitario * item.cantidad;

    const descuentoItem = item.subtotal_original * (item.descuento_pct / 100);

    item.subtotal_final = item.subtotal_original - descuentoItem;

    subtotalBase += item.subtotal_final;
  });

  // ✅ Guardar subtotal SIN descuento global
  posVenta.subtotal = subtotalBase;

  // ✅ Calcular descuento global
  const descuentoGlobalMonto =
    subtotalBase * (posVenta.descuento_global_pct / 100);

  const subtotalConDescuento = subtotalBase - descuentoGlobalMonto;

  // ✅ Guardar subtotal con descuento
  posVenta.total_con_descuento = subtotalConDescuento;

  actualizarComision();
}

function posRender() {
  posTabla.innerHTML = "";

  posVenta.items.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.codigo}</td>

      <td>
        <select onchange="posCambiarPrecio(${index}, this.value)">
          ${Object.entries(item.precios)
            .filter(([, v]) => v > 0)
            .map(
              ([key, value]) =>
                `<option value="${key}" ${
                  item.precio_tipo === key ? "selected" : ""
                }>$${formatearCOP(value)}</option>`,
            )
            .join("")}
        </select>
      </td>


      <td>
        <input
          type="number"
          min="0"
          value="${item.cantidad}"
          onchange="posActualizarCantidad(${index}, this.value)"
          style="width:60px"
        />
      </td>

      <td>
        <select onchange="posCambiarDescuento(${index}, this.value)">
          ${[0, 5, 10, 15, 20, 25, 30]
            .map(
              (p) =>
                `<option value="${p}" ${
                  item.descuento_pct == p ? "selected" : ""
                }>${p}%</option>`,
            )
            .join("")}
        </select>
      </td>


      <td>$${formatearCOP(item.subtotal_final)}</td>

      <td>
        <button
          class="btn danger-btn"
          onclick="posEliminarConfirmado(${index})"
        >
          Eliminar
        </button>

      </td>
    `;
    posTabla.appendChild(tr);
  });

  // Render mobile cards
  const cartCards = document.getElementById("posCartCards");
  if (cartCards) {
    if (posVenta.items.length === 0) {
      cartCards.innerHTML = `
        <div class="cart-card-empty">
          <i class="fas fa-shopping-cart"></i>
          <p>El carrito está vacío</p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem;">Busca un producto para comenzar</p>
        </div>
      `;
    } else {
      cartCards.innerHTML = posVenta.items
        .map(
          (item, index) => `
        <div class="cart-card">
          <div class="cart-card-header">
            <div>
              <div class="cart-card-title">${item.nombre}</div>
              <div class="cart-card-code">Código: ${item.codigo}</div>
            </div>
            <button class="cart-card-delete" onclick="posEliminarConfirmado(${index})" title="Eliminar">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="cart-card-body">
            <div class="cart-card-row">
              <span class="cart-card-label">Precio:</span>
              <div class="cart-card-controls">
                <select onchange="posCambiarPrecio(${index}, this.value)">
                  ${Object.entries(item.precios)
                    .filter(([, v]) => v > 0)
                    .map(
                      ([key, value]) =>
                        `<option value="${key}" ${
                          item.precio_tipo === key ? "selected" : ""
                        }>$${formatearCOP(value)}</option>`,
                    )
                    .join("")}
                </select>
              </div>
            </div>
            <div class="cart-card-row">
              <span class="cart-card-label">Cantidad:</span>
              <div class="cart-card-controls">
                <button class="qty-btn minus" onclick="posCambiarCantidadMobile(${index}, -1)">-</button>
                <input type="number" value="${item.cantidad}" min="0" onchange="posActualizarCantidad(${index}, this.value)" />
                <button class="qty-btn plus" onclick="posCambiarCantidadMobile(${index}, 1)">+</button>
              </div>
            </div>
            <div class="cart-card-row">
              <span class="cart-card-label">Descuento:</span>
              <div class="cart-card-controls">
                <select onchange="posCambiarDescuento(${index}, this.value)">
                  ${[0, 5, 10, 15, 20, 25, 30]
                    .map(
                      (p) =>
                        `<option value="${p}" ${
                          item.descuento_pct == p ? "selected" : ""
                        }>${p}%</option>`,
                    )
                    .join("")}
                </select>
              </div>
            </div>
          </div>
          <div class="cart-card-footer">
            <span>Subtotal:</span>
            <span class="cart-card-subtotal">$${formatearCOP(item.subtotal_final)}</span>
          </div>
        </div>
      `,
        )
        .join("");
    }
  }
}

function posEliminar(index) {
  posVenta.items.splice(index, 1);
  posRecalcular();
  posRender();
}

function posCambiarPrecio(index, tipo) {
  const item = posVenta.items[index];
  item.precio_tipo = tipo;

  posRecalcular();
  posRender();
}

function posCambiarDescuento(index, porcentaje) {
  posVenta.items[index].descuento_pct = Number(porcentaje);
  posRecalcular();
  posRender();
}

function posActualizarCantidad(index, value) {
  const cantidad = Number(value);

  if (cantidad === 0) {
    if (confirm("¿Deseas eliminar este producto del POS?")) {
      posEliminar(index);
      return;
    } else {
      posVenta.items[index].cantidad = 1;
    }
  } else if (cantidad > 0) {
    posVenta.items[index].cantidad = cantidad;
  }

  posRecalcular();
  posRender();
}

function posCambiarCantidadMobile(index, delta) {
  const item = posVenta.items[index];
  const nuevaCantidad = Math.max(0, item.cantidad + delta);
  if (nuevaCantidad === 0) {
    if (confirm("¿Deseas eliminar este producto del POS?")) {
      posEliminar(index);
      return;
    }
  }
  item.cantidad = nuevaCantidad;
  posRecalcular();
  posRender();
}

function posEliminarConfirmado(index) {
  if (confirm("¿Seguro que deseas eliminar este producto?")) {
    posEliminar(index);
  }
}

async function prepararPOS() {
  const posInput = document.getElementById("posBuscar");

  if (!inventarioCargado) {
    if (posInput) posInput.disabled = true;
    displayStatus(
      "statusVentas",
      "info",
      "Cargando inventario para la venta...",
    );
    await loadInventario();
    displayStatus("statusVentas", "success", "Inventario listo.");
    if (posInput) posInput.disabled = false;
  } else {
    // Si ya está cargado, asegurar que esté habilitado
    if (posInput) posInput.disabled = false;
  }

  posVenta.items = [];
  posVenta.subtotal = 0;
  posVenta.total_con_descuento = 0;
  posVenta.descuento_global_pct = 0;
  document.getElementById("posDescuentoGlobal").value = 0;

  const montoRecibidoInput = document.getElementById("posMontoRecibido");
  if (montoRecibidoInput) montoRecibidoInput.value = "";

  posRender();
  actualizarComision();

  // Verificar si hay una última factura para mostrar el botón
  verificarUltimaFactura();

  // 🔥 Forzar foco después de render y activación de sección
  setTimeout(() => {
    const input = document.getElementById("posBuscar");
    if (input) {
      input.focus();
      input.select(); // opcional: selecciona texto si lo hubiera
    }
  }, 150);
  document.getElementById("posMetodoPago").dispatchEvent(new Event("change"));
}

async function posConfirmarVenta() {
  if (posVenta.items.length === 0) {
    alert("No hay productos en la venta.");
    return;
  }

  const montoRecibidoInput = document.getElementById("posMontoRecibido");
  const clienteInput = document.getElementById("posCliente");
  const metodoPago = document.getElementById("posMetodoPago").value;
  const clienteDocumentoInput = document.getElementById("posClienteDocumento");
  const clienteTelefonoInput = document.getElementById("posClienteTelefono");

  let montoRecibido = limpiarNumero(montoRecibidoInput.value);
  const comision = calcularComision(posVenta.total_con_descuento, metodoPago);
  const totalFinal = posVenta.total_con_descuento + comision;

  // ✅ Validación de monto antes de cualquier cambio visual
  if (metodoPago === "efectivo") {
    if (!montoRecibido || montoRecibido < totalFinal) {
      alert("Monto recibido insuficiente.");
      return;
    }
  } else {
    // Si no es efectivo, forzamos el monto al total real
    montoRecibido = totalFinal;
  }

  const confirmBtn = document.querySelector(
    'button[onclick="posConfirmarVenta()"]',
  );
  if (confirmBtn) confirmBtn.disabled = true;

  mostrarLoading("Registrando venta...");

  const ventaData = {
    action: "registrarVentaPOS",
    cliente: clienteInput?.value || "Mostrador",
    clienteDocumento: clienteDocumentoInput?.value || "",
    clienteTelefono: clienteTelefonoInput?.value || "",
    montoRecibido: montoRecibido,
    items: posVenta.items.map((item) => ({
      producto_id: item.producto_id,
      nombre_producto: item.nombre,
      codigo_producto: item.codigo,
      cantidad: item.cantidad,
      precio: item.precio_unitario,
      descuento_item_pct: item.descuento_pct,
      subtotal_final: item.subtotal_final,
    })),
    descuento_global_pct: posVenta.descuento_global_pct,
    metodoPago: metodoPago,
    comision: comision,
    // 🔥 Crédito / Normal
    ingresado: metodoPago === "efectivo" || metodoPago === "transferencia",
  };

  // Domicilio de entrega (opcional) - incluir si está visible
  const domicilioChk = document.getElementById("domicilioCheckbox");
  const domicilioDir = document.getElementById("domicilioDireccion");
  const domicilioValor = document.getElementById("domicilioValor");
  if (domicilioChk) {
    ventaData.domicilio = domicilioChk.checked;
  } else {
    ventaData.domicilio = false;
  }
  ventaData.direccion_entrega = domicilioDir ? domicilioDir.value : "";
  ventaData.valor_domicilio = domicilioValor
    ? limpiarNumero(domicilioValor.value) || 0
    : 0;
  ventaData.usuario = currentUserRole;

  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(ventaData),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      posVenta.items = [];
      posVenta.subtotal = 0;
      posVenta.total_con_descuento = 0;
      posVenta.descuento_global_pct = 0;

      posRender();

      if (montoRecibidoInput) montoRecibidoInput.value = "";
      if (clienteInput) clienteInput.value = "";
      if (clienteDocumentoInput) clienteDocumentoInput.value = "";
      if (clienteTelefonoInput) clienteTelefonoInput.value = "";

      const metodoPagoSelect = document.getElementById("posMetodoPago");
      const descGlobalSelect = document.getElementById("posDescuentoGlobal");
      if (metodoPagoSelect) {
        metodoPagoSelect.value = "efectivo";
        metodoPagoSelect.dispatchEvent(new Event("change"));
      }
      if (descGlobalSelect) {
        descGlobalSelect.value = "0";
      }

      // Resetear campos de domicilio
      const domicilioChk = document.getElementById("domicilioCheckbox");
      const domicilioDir = document.getElementById("domicilioDireccion");
      const domicilioVal = document.getElementById("domicilioValor");
      const domicilioInputs = document.getElementById("domicilioInputs");
      if (domicilioChk) domicilioChk.checked = false;
      if (domicilioDir) domicilioDir.value = "";
      if (domicilioVal) domicilioVal.value = "";
      if (domicilioInputs) domicilioInputs.classList.add("hidden");

      actualizarComision();

      // Recargar inventario inmediatamente
      await loadInventario();

      // Guardar ID de la última venta en localStorage
      const idVentaGuardar = data.id_venta || data.ventaId;
      if (idVentaGuardar) {
        localStorage.setItem("ultimaVentaId", idVentaGuardar);
        const btnReabrir = document.getElementById("btnReabrirUltimaFactura");
        if (btnReabrir) btnReabrir.classList.remove("hidden");
      }

      // Optimización: Usar los datos devueltos directamente para mostrar factura (sin llamada adicional)
      if (data.venta && data.items) {
        ultimaVentaData = { venta: data.venta, items: data.items };
        localStorage.setItem(
          "ultimaVentaData",
          JSON.stringify(ultimaVentaData),
        );
        mostrarFacturaDesdeDatos(data.venta, data.items);
      } else {
        // Fallback: si por alguna razón no hay datos, llamar al método tradicional
        mostrarLoading("Generando factura...");
        await mostrarFactura(idVentaGuardar);
      }

      const input = document.getElementById("posBuscar");
      if (input) input.focus();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error al registrar venta:", error);

    // Guardar venta offline si hay error de conexión
    const offlineId = utils.saveVentaOffline(ventaData);

    if (offlineId) {
      // Guardar valores necesarios ANTES de limpiar posVenta
      const subtotalGuardar = posVenta.subtotal;
      const totalConDescuentoGuardar = posVenta.total_con_descuento;
      const descuentoGlobalGuardar = posVenta.descuento_global_pct;

      // Limpiar el POS como si la venta hubiera sido exitosa
      posVenta.items = [];
      posVenta.subtotal = 0;
      posVenta.total_con_descuento = 0;
      posVenta.descuento_global_pct = 0;

      posRender();

      if (montoRecibidoInput) montoRecibidoInput.value = "";
      if (clienteInput) clienteInput.value = "";
      if (clienteDocumentoInput) clienteDocumentoInput.value = "";
      if (clienteTelefonoInput) clienteTelefonoInput.value = "";

      const metodoPagoSelect = document.getElementById("posMetodoPago");
      const descGlobalSelect = document.getElementById("posDescuentoGlobal");
      if (metodoPagoSelect) {
        metodoPagoSelect.value = "efectivo";
        metodoPagoSelect.dispatchEvent(new Event("change"));
      }
      if (descGlobalSelect) {
        descGlobalSelect.value = "0";
      }

      const domicilioChk = document.getElementById("domicilioCheckbox");
      const domicilioDir = document.getElementById("domicilioDireccion");
      const domicilioVal = document.getElementById("domicilioValor");
      const domicilioInputs = document.getElementById("domicilioInputs");
      if (domicilioChk) domicilioChk.checked = false;
      if (domicilioDir) domicilioDir.value = "";
      if (domicilioVal) domicilioVal.value = "";
      if (domicilioInputs) domicilioInputs.classList.add("hidden");

      actualizarComision();
      await loadInventario();

      // Generar factura desde datos offline
      const comision = calcularComision(
        totalConDescuentoGuardar || 0,
        metodoPago,
      );
      const valorDomicilio = ventaData.valor_domicilio || 0;
      const totalVenta =
        (totalConDescuentoGuardar || 0) + comision + valorDomicilio;

      const ventaOffline = {
        id_venta: offlineId,
        cliente: clienteInput?.value || "Mostrador",
        cliente_documento: clienteDocumentoInput?.value || "",
        cliente_telefono: clienteTelefonoInput?.value || "",
        fecha: new Date().toISOString(),
        subtotal: subtotalGuardar || 0,
        comision: comision,
        total_final: totalVenta,
        metodo_pago: metodoPago,
        monto_recibido: montoRecibido,
        cambio: montoRecibido - totalVenta,
        descuento_global_pct: descuentoGlobalGuardar || 0,
        domicilio: ventaData.domicilio ? "TRUE" : "FALSE",
        direccion_entrega: ventaData.direccion_entrega || "",
        valor_domicilio: valorDomicilio,
        consecutivo: "OFF-" + offlineId.slice(-8),
        ingreso:
          metodoPago === "efectivo" || metodoPago === "transferencia"
            ? "TRUE"
            : "FALSE",
        offline: true,
      };

      ultimaVentaData = {
        venta: ventaOffline,
        items: ventaData.items,
        offline: true,
      };
      localStorage.setItem("ultimaVentaData", JSON.stringify(ultimaVentaData));
      mostrarFacturaDesdeDatos(ventaOffline, ventaData.items);

      // Mostrar botón de última factura
      const btnReabrir = document.getElementById("btnReabrirUltimaFactura");
      if (btnReabrir) btnReabrir.classList.remove("hidden");

      showToast(
        `Venta guardada offline (ID: ${offlineId}). Factura generada.`,
        "warning",
      );
    } else {
      showToast("Error al registrar venta: " + error.message, "error");
    }
  } finally {
    const confirmBtn = document.querySelector(
      'button[onclick="posConfirmarVenta()"]',
    );
    if (confirmBtn) confirmBtn.disabled = false;
    ocultarLoading(); // 🔥 SIEMPRE se oculta
  }
}

const posMontoInput = document.getElementById("posMontoRecibido");
const posCambio = document.getElementById("posCambio");

function posActualizarCambio() {
  const montoInput = document.getElementById("posMontoRecibido");
  const posCambio = document.getElementById("posCambio");
  const metodo = document.getElementById("posMetodoPago").value;

  if (!montoInput || !posCambio) return;
  if (metodo !== "efectivo") {
    posCambio.textContent = "0";
    return;
  }

  const recibido = limpiarNumero(montoInput.value);

  // Calcular total incluyendo comisión y domicilio
  const comision = calcularComision(posVenta.total_con_descuento, metodo);

  // Obtener valor del domicilio
  const domicilioInput = document.getElementById("domicilioValor");
  let domicilioMonto = 0;
  if (domicilioInput) {
    domicilioMonto = Number(utils.cleanNumber(domicilioInput.value || 0)) || 0;
  }

  const totalFinal = posVenta.total_con_descuento + comision + domicilioMonto;
  const cambio = recibido - totalFinal;

  posCambio.textContent = cambio >= 0 ? formatearCOP(cambio) : "0";
}

if (posMontoInput) {
  posMontoInput.addEventListener("input", posActualizarCambio);
}

function calcularComision(total, metodo) {
  const porcentaje = obtenerPorcentajeMetodo(metodo);
  return total * (porcentaje / 100);
}

function obtenerPorcentajeMetodo(metodo) {
  switch (metodo) {
    case "tarjeta":
      return 5;
    case "sistecredito":
      return 4;
    case "addi":
      return 6.5;
    default:
      return 0;
  }
}

const metodoPagoSelect = document.getElementById("posMetodoPago");
const bloqueEfectivo = document.getElementById("bloqueEfectivo");

if (metodoPagoSelect && bloqueEfectivo) {
  metodoPagoSelect.addEventListener("change", () => {
    const metodo = metodoPagoSelect.value;

    if (metodo === "efectivo") {
      bloqueEfectivo.classList.remove("hidden");
    } else {
      bloqueEfectivo.classList.add("hidden");

      // Reset visual
      const montoInput = document.getElementById("posMontoRecibido");
      const posCambio = document.getElementById("posCambio");

      if (montoInput) montoInput.value = "";
      if (posCambio) posCambio.textContent = "0";
    }

    actualizarComision();
  });
}

function actualizarComision() {
  const metodo = document.getElementById("posMetodoPago").value;

  const subtotalBase = posVenta.subtotal; // 🔥 SIN descuento
  const subtotalConDescuento = posVenta.total_con_descuento; // 🔥 CON descuento

  const porcentaje = obtenerPorcentajeMetodo(metodo);
  const comision = calcularComision(subtotalConDescuento, metodo);
  const totalFinal = subtotalConDescuento + comision;

  // ===== ELEMENTOS =====
  const subtotalSpan = document.getElementById("posSubtotal");
  const subtotalConDescSpan = document.getElementById(
    "posSubtotalConDescuento",
  );
  const subtotalDescuentoRow = document.getElementById(
    "posSubtotalDescuentoRow",
  );

  // Determinar qué mostrar
  // - "Subtotal con descuento" se muestra cuando hay descuento global > 0%
  const descuentoGlobalPct = posVenta.descuento_global_pct || 0;
  const hayDescuentoEnItems = posVenta.items.some(
    (item) => (item.descuento_pct || 0) > 0,
  );
  const hayDescuento = descuentoGlobalPct > 0 || hayDescuentoEnItems;
  const hayComision = porcentaje > 0;
  // Solo mostrar "Subtotal con descuento" cuando hay descuento global > 0%
  const mostrarSubtotalConDescuento = descuentoGlobalPct > 0;

  const comisionDetalleContainer = document.getElementById(
    "posComisionDetalleContainer",
  );
  const comisionDetalleSpan = document.getElementById("posComisionDetalle");
  const comisionPorcentajeSpan = document.getElementById(
    "posComisionPorcentaje",
  );

  const comisionPagoContainer = document.getElementById("posComisionContainer");
  const comisionPagoSpan = document.getElementById("posComision");

  const totalSpan = document.getElementById("posTotal");

  // Domicilio en resumen (si aplica)
  let domicilioMonto = 0;
  const domicilioInput = document.getElementById("domicilioValor");
  if (domicilioInput) {
    const raw = domicilioInput.value || "0";
    domicilioMonto = Number(utils.cleanNumber(raw)) || 0;
  }
  const domicilioRow = document.getElementById("posDomicilioRow");
  const domicilioDisplay = document.getElementById("posDomicilio");
  if (domicilioRow && domicilioDisplay) {
    domicilioDisplay.textContent = formatearCOP(domicilioMonto);
    domicilioRow.style.display = domicilioMonto > 0 ? "flex" : "none";
  }

  // 🔥 ACTUALIZAR SUBTOTAL BASE (SIEMPRE visible)
  if (subtotalSpan) {
    subtotalSpan.textContent = formatearCOP(subtotalBase);
  }

  // 🔥 SUBTOTAL CON DESCUENTO - solo mostrar si hay descuento Y comisión (como en factura)
  if (subtotalDescuentoRow && subtotalConDescSpan) {
    if (mostrarSubtotalConDescuento) {
      subtotalDescuentoRow.classList.remove("hidden");
      subtotalConDescSpan.textContent = formatearCOP(subtotalConDescuento);
    } else {
      subtotalDescuentoRow.classList.add("hidden");
    }
  }

  // 🔥 COMISIÓN
  if (porcentaje > 0) {
    if (comisionDetalleContainer) {
      comisionDetalleContainer.classList.remove("hidden");
      comisionDetalleSpan.textContent = formatearCOP(comision);

      if (comisionPorcentajeSpan) {
        comisionPorcentajeSpan.textContent = porcentaje;
      }
    }

    if (comisionPagoContainer) {
      comisionPagoContainer.classList.remove("hidden");
      comisionPagoSpan.textContent = formatearCOP(comision);
    }
  } else {
    if (comisionDetalleContainer) {
      comisionDetalleContainer.classList.add("hidden");
    }

    if (comisionPorcentajeSpan) {
      comisionPorcentajeSpan.textContent = 0;
    }

    if (comisionPagoContainer) {
      comisionPagoContainer.classList.add("hidden");
    }
  }

  // Calcular total final incluyendo domicilio siempre
  // (domicilioMonto ya fue definido arriba)
  const totalConDomicilio = totalFinal + domicilioMonto;
  totalSpan.textContent = formatearCOP(totalConDomicilio);

  // 🔥 ACTUALIZAR CAMBIO AUTOMÁTICAMENTE
  posActualizarCambio();
}

// Migrating utility functions to utils.js
const formatearCOP = utils.formatCurrency;
const limpiarNumero = utils.cleanNumber;
const formatearConsecutivo = utils.formatConsecutive;

// 🔹 Formatea mientras el usuario escribe
function formatearInputMoneda(input) {
  let cursorPos = input.selectionStart;

  let valor = input.value.replace(/\D/g, "");

  if (!valor) {
    input.value = "";
    return;
  }

  let numero = Number(valor);

  input.value = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero);

  // Mantener cursor al final (modo simple estable)
  input.setSelectionRange(input.value.length, input.value.length);
}

// 🔹 Activar autoformato para todos los inputs con clase money-input
document.addEventListener("input", function (e) {
  if (e.target.classList.contains("money-input")) {
    formatearInputMoneda(e.target);
  }
});

document
  .getElementById("posDescuentoGlobal")
  .addEventListener("change", function () {
    posVenta.descuento_global_pct = Number(this.value);
    posRecalcular();
    posRender();
  });

async function mostrarFactura(idVenta) {
  if (!idVenta) {
    console.error("ID de venta inválido:", idVenta);
    alert("No se pudo obtener el ID de la venta.");
    return;
  }

  mostrarLoading("Cargando factura...");

  // 🔥 Permite que el navegador pinte el loader antes de continuar
  await new Promise((resolve) => setTimeout(resolve, 50));

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getVentaDetalle&id=${idVenta}`,
    );

    if (data.status !== "success") {
      alert(data.message);
      return;
    }

    const { venta, items } = data;
    ultimaVentaData = { venta, items };
    // 🔥 Formatear consecutivo a 5 dígitos
    const numeroBase = venta.consecutivo || venta.id_venta || 0;
    const consecutivoFormateado = String(numeroBase).padStart(5, "0");

    const subtotalBase = Number(venta.subtotal || 0);
    const descuentoGlobalPct = Number(venta.descuento_global_pct || 0);
    const comisionValor = Number(venta.comision || 0);
    const totalFinal = Number(venta.total_final || 0);
    const montoRecibido = Number(venta.monto_recibido || 0);
    const cambio = Number(venta.cambio || 0);
    const metodoPago = (venta.metodo_pago || "").toLowerCase();

    const montoDescuentoGlobal = subtotalBase * (descuentoGlobalPct / 100);
    const subtotalConDescuento = subtotalBase - montoDescuentoGlobal;

    let comisionPct = 0;
    if (subtotalConDescuento > 0 && comisionValor > 0) {
      comisionPct = (comisionValor / subtotalConDescuento) * 100;
    }

    const hayDescuento = descuentoGlobalPct > 0;
    const hayComision = comisionValor > 0;

    // Domicilio - el total_final ya incluye el domicilio, solo mostrar info
    const domicilioValor = parseFloat(venta.valor_domicilio) || 0;
    const domicilioDireccion = String(venta.direccion_entrega || "");
    const hayDomicilio = domicilioValor > 0;

    // El total_final ya incluye domicilio, no sumar de nuevo
    const totalFinalMostrar = totalFinal;

    let html = `
      <div class="factura-header-brand">
        <img src="img/logo.png" class="logo">
        <div class="factura-business-name">GITANAS</div>
        <div class="factura-nit">NIT: 1085334745-2</div>
        <div class="factura-address">Dirección: Calle 15 #26 - 88 Centro</div>
        <div class="factura-whatsapp">WhatsApp: 316 785 2058</div>
        <div class="factura-iva">No somos responsables de IVA</div>
      </div>

      <div class="factura-info-grid">
        <div class="info-item">
          <span class="info-label">Recibo de Venta:</span>
          <span class="info-value">#${consecutivoFormateado}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Fecha:</span>
          <span class="info-value">${new Date(venta.fecha).toLocaleString()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Cliente:</span>
          <span class="info-value">${venta.cliente || "Consumidor Final"}</span>
        </div>
        ${
          String(venta.cliente_documento || "")
            ? `
        <div class="info-item">
          <span class="info-label">Documento:</span>
          <span class="info-value">${venta.cliente_documento}</span>
        </div>`
            : ""
        }
        
        ${
          venta.cliente_telefono && String(venta.cliente_telefono).trim() !== ""
            ? `
        <div class="info-item">
          <span class="info-label">Teléfono:</span>
          <span class="info-value">${venta.cliente_telefono}</span>
        </div>`
            : ""
        }
        <div class="info-item">
          <span class="info-label">Método de Pago:</span>
          <span class="info-value">${venta.metodo_pago}</span>
        </div>
        ${
          hayDomicilio && domicilioDireccion
            ? `
        <div class="info-item">
          <span class="info-label">Dirección:</span>
          <span class="info-value">${domicilioDireccion}</span>
        </div>`
            : ""
        }
      </div>

      <div class="factura-table-wrapper">
        <table class="factura-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant</th>
              <th>Precio</th>
              <th>Dcto</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach((item) => {
      html += `
        <tr>
          <td>
            <div class="product-name">${item.nombre_producto || ""}</div>
            <div class="product-code">${item.codigo_producto || ""}</div>
          </td>
          <td>${item.cantidad || 0}</td>
          <td>$${formatearCOP(item.precio_unitario || 0)}</td>
          <td>${item.descuento_item_pct || 0}%</td>
          <td>$${formatearCOP(item.subtotal_final || 0)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>

      <div class="factura-summary">
    `;

    // 🔥 CASO SIMPLE: sin descuento ni comisión
    if (!hayDescuento && !hayComision) {
      if (hayDomicilio) {
        html += `
          <div class="summary-row">
            <span>Domicilio:</span>
            <span>$${formatearCOP(domicilioValor)}</span>
          </div>
        `;
      }
      html += `
        <div class="summary-row total">
          <span>Total Final:</span>
          <span>$${formatearCOP(totalFinalMostrar)}</span>
        </div>
      `;
    } else {
      html += `
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>$${formatearCOP(subtotalBase)}</span>
        </div>
      `;

      if (hayDescuento) {
        html += `
          <div class="summary-row">
            <span>Descuento Global (${descuentoGlobalPct}%):</span>
            <span>-$${formatearCOP(montoDescuentoGlobal)}</span>
          </div>
        `;
      }

      if (hayDescuento && hayComision) {
        html += `
          <div class="summary-row">
            <span>Subtotal con descuento:</span>
            <span>$${formatearCOP(subtotalConDescuento)}</span>
          </div>
        `;
      }

      if (hayComision) {
        html += `
          <div class="summary-row">
            <span>Comisión ${venta.metodo_pago} (${comisionPct.toFixed(2)}%):</span>
            <span>$${formatearCOP(comisionValor)}</span>
          </div>
        `;
      }

      if (hayDomicilio) {
        html += `
          <div class="summary-row">
            <span>Domicilio:</span>
            <span>$${formatearCOP(domicilioValor)}</span>
          </div>
        `;
      }

      html += `
        <div class="summary-row total">
          <span>Total Final:</span>
          <span>$${formatearCOP(totalFinalMostrar)}</span>
        </div>
      `;
    }

    // 🔥 Mostrar recibido y cambio solo si es efectivo
    if (metodoPago === "efectivo") {
      html += `
        <div class="summary-row payment-detail">
          <span>Recibido:</span>
          <span>$${formatearCOP(montoRecibido)}</span>
        </div>
        <div class="summary-row payment-detail">
          <span>Cambio:</span>
          <span>$${formatearCOP(cambio)}</span>
        </div>
      `;
    }

    html += `
      </div>
      
      <div class="factura-footer">
        <p>¡Gracias por su compra!</p>
        <p>Vuelva pronto</p>
      </div>
    `;

    document.getElementById("facturaContenido").innerHTML = html;

    abrirFactura();
  } catch (error) {
    console.error("Error al cargar factura:", error);
    alert("Error al cargar factura.");
  } finally {
    ocultarLoading();
  }
}

// ================= MOSTRAR FACTURA DESDE DATOS (OPTIMIZADO - SIN LLAMADA API) =================
function mostrarFacturaDesdeDatos(venta, items) {
  mostrarLoading("Generando factura...");

  ultimaVentaData = { venta, items };

  // Formatear consecutivo a 5 dígitos
  const numeroBase = venta.consecutivo || venta.id_venta || 0;
  const consecutiveFormateado = String(numeroBase).padStart(5, "0");

  const subtotalBase = Number(venta.subtotal || 0);
  const descuentoGlobalPct = Number(venta.descuento_global_pct || 0);
  const comisionValor = Number(venta.comision || 0);
  const totalFinal = Number(venta.total_final || 0);
  const montoRecibido = Number(venta.monto_recibido || 0);
  const cambio = Number(venta.cambio || 0);
  const metodoPago = (venta.metodo_pago || "").toLowerCase();

  const montoDescuentoGlobal = subtotalBase * (descuentoGlobalPct / 100);
  const subtotalConDescuento = subtotalBase - montoDescuentoGlobal;

  let comisionPct = 0;
  if (subtotalConDescuento > 0 && comisionValor > 0) {
    comisionPct = (comisionValor / subtotalConDescuento) * 100;
  }

  const hayDescuento = descuentoGlobalPct > 0;
  const hayComision = comisionValor > 0;
  const domicilioValor = parseFloat(venta.valor_domicilio) || 0;
  const domicilioDireccion = String(venta.direccion_entrega || "");
  const hayDomicilio = domicilioValor > 0;
  const totalFinalMostrar = totalFinal;

  let html = `
    <div class="factura-header-brand">
      <img src="img/logo.png" class="logo">
      <div class="factura-business-name">GITANAS</div>
      <div class="factura-nit">NIT: 1085334745-2</div>
      <div class="factura-address">Dirección: Calle 15 #26 - 88 Centro</div>
      <div class="factura-whatsapp">WhatsApp: 316 785 2058</div>
      <div class="factura-iva">No somos responsables de IVA</div>
    </div>

    <div class="factura-info-grid">
      <div class="info-item">
        <span class="info-label">Recibo de Venta:</span>
        <span class="info-value">#${consecutiveFormateado}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Fecha:</span>
        <span class="info-value">${new Date(venta.fecha).toLocaleString()}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Cliente:</span>
        <span class="info-value">${venta.cliente || "Consumidor Final"}</span>
      </div>
      ${
        String(venta.cliente_documento || "")
          ? `
      <div class="info-item">
        <span class="info-label">Documento:</span>
        <span class="info-value">${venta.cliente_documento}</span>
      </div>`
          : ""
      }
      ${
        venta.cliente_telefono && String(venta.cliente_telefono).trim() !== ""
          ? `
      <div class="info-item">
        <span class="info-label">Teléfono:</span>
        <span class="info-value">${venta.cliente_telefono}</span>
      </div>`
          : ""
      }
      <div class="info-item">
        <span class="info-label">Método de Pago:</span>
        <span class="info-value">${venta.metodo_pago}</span>
      </div>
      ${
        hayDomicilio && domicilioDireccion
          ? `
      <div class="info-item">
        <span class="info-label">Dirección:</span>
        <span class="info-value">${domicilioDireccion}</span>
      </div>`
          : ""
      }
    </div>

    <div class="factura-table-wrapper">
      <table class="factura-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant</th>
            <th>Precio</th>
            <th>Dcto</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach((item) => {
    html += `
      <tr>
        <td>
          <div class="product-name">${item.nombre_producto || ""}</div>
          <div class="product-code">${item.codigo_producto || ""}</div>
        </td>
        <td>${item.cantidad || 0}</td>
        <td>$${formatearCOP(item.precio_unitario || 0)}</td>
        <td>${item.descuento_item_pct || 0}%</td>
        <td>$${formatearCOP(item.subtotal_final || 0)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>

    <div class="factura-summary">
  `;

  // Caso simple: sin descuento ni comisión
  if (!hayDescuento && !hayComision) {
    if (hayDomicilio) {
      html += `
        <div class="summary-row">
          <span>Domicilio:</span>
          <span>$${formatearCOP(domicilioValor)}</span>
        </div>
      `;
    }
    html += `
      <div class="summary-row total">
        <span>Total Final:</span>
        <span>$${formatearCOP(totalFinalMostrar)}</span>
      </div>
    `;
  } else {
    html += `
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>$${formatearCOP(subtotalBase)}</span>
      </div>
    `;

    if (hayDescuento) {
      html += `
        <div class="summary-row">
          <span>Descuento Global (${descuentoGlobalPct}%):</span>
          <span>-$${formatearCOP(montoDescuentoGlobal)}</span>
        </div>
      `;
    }

    if (hayDescuento && hayComision) {
      html += `
        <div class="summary-row">
          <span>Subtotal con descuento:</span>
          <span>$${formatearCOP(subtotalConDescuento)}</span>
        </div>
      `;
    }

    if (hayComision) {
      html += `
        <div class="summary-row">
          <span>Comisión ${venta.metodo_pago} (${comisionPct.toFixed(2)}%):</span>
          <span>$${formatearCOP(comisionValor)}</span>
        </div>
      `;
    }

    if (hayDomicilio) {
      html += `
        <div class="summary-row">
          <span>Domicilio:</span>
          <span>$${formatearCOP(domicilioValor)}</span>
        </div>
      `;
    }

    html += `
      <div class="summary-row total">
        <span>Total Final:</span>
        <span>$${formatearCOP(totalFinalMostrar)}</span>
      </div>
    `;
  }

  // Mostrar recibido y cambio solo si es efectivo
  if (metodoPago === "efectivo") {
    html += `
      <div class="summary-row payment-detail">
        <span>Recibido:</span>
        <span>$${formatearCOP(montoRecibido)}</span>
      </div>
      <div class="summary-row payment-detail">
        <span>Cambio:</span>
        <span>$${formatearCOP(cambio)}</span>
      </div>
    `;
  }

  html += `
    </div>
    
    <div class="factura-footer">
      <p>¡Gracias por su compra!</p>
      <p>Vuelva pronto</p>
    </div>
  `;

  document.getElementById("facturaContenido").innerHTML = html;
  abrirFactura();
  ocultarLoading();
}

// ================= REABRIR ÚLTIMA FACTURA =================
function reabrirUltimaFactura() {
  // Leer de localStorage si no hay en memoria
  if (!ultimaVentaData) {
    const savedData = localStorage.getItem("ultimaVentaData");
    if (savedData) {
      try {
        ultimaVentaData = JSON.parse(savedData);
      } catch (e) {
        console.error("Error al parsear:", e);
      }
    }
  }

  // Si hay datos guardados, siempre usar mostrarFacturaDesdeDatos
  // Esto funciona tanto para ventas offline como para ventas online recientes
  if (ultimaVentaData && ultimaVentaData.venta && ultimaVentaData.items) {
    mostrarFacturaDesdeDatos(ultimaVentaData.venta, ultimaVentaData.items);
    return;
  }

  // Solo si no hay datos guardados y hay conexión, intentar del servidor
  if (navigator.onLine) {
    const ultimaVentaId = localStorage.getItem("ultimaVentaId");
    if (ultimaVentaId) {
      mostrarFactura(ultimaVentaId);
      return;
    }
  }

  showToast("No hay una factura anterior para mostrar.", "info");
}

function verificarUltimaFactura() {
  // Primero: intentar leer de localStorage si no hay en memoria
  if (!ultimaVentaData) {
    const savedData = localStorage.getItem("ultimaVentaData");
    if (savedData) {
      try {
        ultimaVentaData = JSON.parse(savedData);
      } catch (e) {
        console.error("Error al parsear ultimaVentaData:", e);
      }
    }
  }

  const btnReabrir = document.getElementById("btnReabrirUltimaFactura");
  const tieneDatos = ultimaVentaData && ultimaVentaData.venta;

  if (btnReabrir) {
    if (tieneDatos) {
      btnReabrir.classList.remove("hidden");
    } else {
      btnReabrir.classList.add("hidden");
    }
  }
}

function cerrarFactura() {
  document.getElementById("facturaModal").classList.add("hidden");
}

function abrirFactura() {
  const modal = document.getElementById("facturaModal");
  modal.classList.remove("hidden");

  // Mostrar/ocultar botón de domicilio según si hay datos
  const btnDomicilio = document.getElementById("btnImprimirDomicilio");
  if (btnDomicilio && ultimaVentaData) {
    const { venta } = ultimaVentaData;
    const domicilioValor = Number(venta.valor_domicilio) || 0;
    const domicilioDireccion = String(venta.direccion_entrega || "");
    const hayDomicilio = domicilioValor > 0 && domicilioDireccion;

    if (hayDomicilio) {
      btnDomicilio.classList.remove("hidden");
    } else {
      btnDomicilio.classList.add("hidden");
    }
  }
}

function imprimirFacturaTermica() {
  if (!ultimaVentaData) {
    alert("No hay datos de factura disponibles.");
    return;
  }

  const contenido = generarHTMLTermico(ultimaVentaData);

  const ventana = window.open("", "PRINT", "height=600,width=400");

  ventana.document.write(contenido);
  ventana.document.close();

  ventana.focus();

  setTimeout(() => {
    ventana.print();
    ventana.close();
  }, 500);
}

function imprimirTicketDomicilio() {
  if (!ultimaVentaData) {
    alert("No hay datos de factura disponibles.");
    return;
  }

  const { venta, items } = ultimaVentaData;

  // Verificar si tiene domicilio
  const domicilioValor = Number(venta.valor_domicilio) || 0;
  const domicilioDireccion = String(venta.direccion_entrega || "");
  const hayDomicilio = domicilioValor > 0 && domicilioDireccion;

  if (!hayDomicilio) {
    alert("Esta venta no tiene datos de domicilio.");
    return;
  }

  // Calcular total sin domicilio
  const totalConDomicilio = Number(venta.total_final) || 0;
  const totalSinDomicilio = totalConDomicilio - domicilioValor;

  // Preguntar qué debe cobrar el mensajero
  const opciones = [
    `Total ($${formatearCOP(totalConDomicilio)})`,
    `Solo domicilio ($${formatearCOP(domicilioValor)})`,
    "Nada",
  ];

  const mensaje =
    "¿Qué debe cobrar el mensajero?\n\n" +
    opciones.map((opt, i) => `${i + 1}. ${opt}`).join("\n");

  let opcion = prompt(mensaje, "1");

  if (opcion === null) return; // Cancelado

  const seleccion = parseInt(opcion);

  let mostrarTotal = true;
  let mostrarDomicilio = true;

  if (seleccion === 1) {
    // Mostrar total y domicilio
    mostrarTotal = true;
    mostrarDomicilio = true;
  } else if (seleccion === 2) {
    // Solo domicilio
    mostrarTotal = false;
    mostrarDomicilio = true;
  } else if (seleccion === 3) {
    // Nada
    mostrarTotal = false;
    mostrarDomicilio = false;
  } else {
    alert("Opción inválida. Seleccione 1, 2 o 3.");
    return;
  }

  const html = `
  <html>
    <head>
      <title>Ticket Domicilio</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { width: 72mm; font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 4mm; color: black; }
        .logo { width: 40mm; display: block; margin: 0 auto 5px auto; filter: grayscale(1); }
        h2 { text-align: center; margin: 5px 0; font-size: 16px; }
        hr { border: none; border-top: 1px dashed black; margin: 8px 0; }
        .domicilio-titulo { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 5px; }
        .domicilio-direccion { font-size: 14px; font-weight: bold; text-align: center; }
        .cliente-datos { font-size: 14px; text-align: center; margin: 5px 0; }
        .cliente-datos div { margin: 3px 0; font-weight: bold; }
        .total-line { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; font-weight: bold; }
        .domicilio-monto { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
        .total-grande { font-size: 18px; font-weight: bold; text-align: center; margin: 10px 0; }
      </style>
    </head>
    <body>
      <img src="img/logo.png" class="logo">
      <h2>GITANAS</h2>
      <hr>
      
      <div class="domicilio-titulo">ENTREGA A DOMICILIO</div>
      <div class="domicilio-direccion">${domicilioDireccion}</div>
      
      <div class="cliente-datos">
        ${venta.cliente ? `<div>Cliente: ${venta.cliente}</div>` : ""}
        ${
          venta.cliente_telefono
            ? `<div>Telefono: ${venta.cliente_telefono}</div>`
            : ""
        }
      </div>
      
      <hr>
      ${
        mostrarTotal && mostrarDomicilio
          ? `
      <div class="total-line">
        <span>Total pedido:</span>
        <span>$${formatearCOP(totalSinDomicilio)}</span>
      </div>
      <div class="domicilio-monto">
        Domicilio: $${formatearCOP(domicilioValor)}
      </div>
      <div class="total-grande">
        TOTAL: $${formatearCOP(totalConDomicilio)}
      </div>`
          : ""
      }
      ${
        !mostrarTotal && mostrarDomicilio
          ? `
      <div class="domicilio-monto">
        Domicilio: $${formatearCOP(domicilioValor)}
      </div>`
          : ""
      }
      ${
        !mostrarTotal && !mostrarDomicilio
          ? `<div style="text-align:center; font-size:18px; font-weight:bold;">Pagado</div>`
          : ""
      }
    </body>
  </html>
  `;

  const ventana = window.open("", "PRINT", "height=600,width=400");

  ventana.document.write(html);
  ventana.document.close();

  ventana.focus();

  setTimeout(() => {
    ventana.print();
    ventana.close();
  }, 500);
}

function generarHTMLTermico(data) {
  const { venta, items } = data;

  const subtotalBase = Number(venta.subtotal || 0);
  const descuentoGlobalPct = Number(venta.descuento_global_pct || 0);
  const comisionValor = Number(venta.comision || 0);
  const totalFinal = Number(venta.total_final || 0);
  const montoRecibido = Number(venta.monto_recibido || 0);
  const cambio = Number(venta.cambio || 0);
  const metodoPago = (venta.metodo_pago || "").toLowerCase();
  const metodoPagoLabel = metodoPago
    ? metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1)
    : "No especificado";

  const montoDescuentoGlobal = subtotalBase * (descuentoGlobalPct / 100);
  const subtotalConDescuento = subtotalBase - montoDescuentoGlobal;

  let comisionPct = 0;
  if (subtotalConDescuento > 0 && comisionValor > 0) {
    comisionPct = (comisionValor / subtotalConDescuento) * 100;
  }

  const hayDescuento = descuentoGlobalPct > 0;
  const hayComision = comisionValor > 0;

  // Domicilio - el total_final ya incluye el domicilio, solo mostrar info
  const domicilioValor = Number(venta.valor_domicilio) || 0;
  const domicilioDireccion = String(venta.direccion_entrega || "");
  const hayDomicilio = domicilioValor > 0;

  // El total_final ya incluye domicilio, no sumar de nuevo
  const totalFinalMostrar = totalFinal;

  let itemsHTML = "";

  items.forEach((item) => {
    const precioUnitario = Number(item.precio_unitario || 0);
    const cantidad = Number(item.cantidad || 0);
    const descuentoItemPct = Number(item.descuento_item_pct || 0);
    const subtotalBruto = cantidad * precioUnitario;
    const montoDescuentoItem = subtotalBruto * (descuentoItemPct / 100);
    const subtotalCalculado = subtotalBruto - montoDescuentoItem;
    const hayDescuentoItem = descuentoItemPct > 0;

    itemsHTML += `
    <div class="item">
      <div class="linea-flex">
        <span><strong>${item.nombre_producto || ""}</strong></span>
        <span>${item.codigo_producto || ""}</span>
      </div>
      <div class="linea-flex">
        <span>Cant: ${cantidad} x $${formatearCOP(precioUnitario)}</span>
        <span>$${formatearCOP(subtotalCalculado)}</span>
      </div>
      ${hayDescuentoItem ? `<div class="linea-flex" style="font-size:10px;"><span>Dcto prod:</span><span>${descuentoItemPct}%</span></div>` : ""}
    </div>
  `;
  });

  return `
  <html>
    <head>
      <title>Ticket</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { width: 72mm; font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 4mm; color: black; }
        .logo { width: 40mm; display: block; margin: 0 auto 5px auto; filter: grayscale(1); }
        h2 { text-align: center; margin: 5px 0; font-size: 16px; }
        .center { text-align: center; margin-bottom: 2px; }
        .item { margin-bottom: 8px; }
        .linea-flex { display: flex; justify-content: space-between; align-items: baseline; }
        hr { border: none; border-top: 1px dashed black; margin: 5px 0; }
        .totales { margin-top: 5px; border-top: 1px dashed black; padding-top: 5px; }
        .bold { font-weight: bold; }
        .datos-cliente { margin: 8px 0; font-size: 11px; }
      </style>
    </head>
    <body>
      <img src="img/logo.png" class="logo">
      <h2>GITANAS</h2>
      <div class="center">NIT: 1085334745-2</div>
      <div class="center">Dirección: Calle 15 #26 - 88 Centro</div>
      <div class="center">WhatsApp: 316 758 2058</div>
      <div class="center">No somos responsables de IVA</div>
      <hr>
      <div class="center bold">Recibo de Venta #${formatearConsecutivo(venta.consecutivo)}</div>
      <div class="center">${new Date(venta.fecha).toLocaleString()}</div>
      
      <div class="datos-cliente">
        <div class="linea-flex">
          <span>CLIENTE:</span>
          <span>${venta.cliente || "Consumidor Final"}</span>
        </div>
        ${
          String(venta.cliente_documento || "")
            ? `
        <div class="linea-flex">
          <span>DOCUMENTO:</span>
          <span>${venta.cliente_documento}</span>
        </div>`
            : ""
        }
        ${
          String(venta.cliente_telefono || "")
            ? `
        <div class="linea-flex">
          <span>TELÉFONO:</span>
          <span>${venta.cliente_telefono}</span>
        </div>`
            : ""
        }
       ${
         hayDomicilio && domicilioDireccion
           ? `
        <div class="linea-flex">
          <span>DIRECCIÓN:</span>
          <span>${domicilioDireccion}</span>
        </div>`
           : ""
       }
      </div>

      <hr>
      <div class="bold" style="margin-bottom:5px;">DESCRIPCIÓN</div>
      ${itemsHTML}

      <div class="totales">
        ${
          !hayDescuento && !hayComision
            ? `
          ${
            hayDomicilio
              ? `
          <div class="linea-flex">
            <span>Domicilio</span>
            <span>$${formatearCOP(domicilioValor)}</span>
          </div>`
              : ""
          }
          <div class="linea-flex bold" style="font-size:14px;">
            <span>TOTAL</span>
            <span>$${formatearCOP(totalFinalMostrar)}</span>
          </div>
        `
            : `
          <div class="linea-flex">
            <span>Subtotal</span>
            <span>$${formatearCOP(subtotalBase)}</span>
          </div>
          ${
            hayDescuento
              ? `
          <div class="linea-flex">
            <span>Descuento (${descuentoGlobalPct}%)</span>
            <span>-$${formatearCOP(montoDescuentoGlobal)}</span>
          </div>`
              : ""
          }
          ${
            hayComision
              ? `
          <div class="linea-flex">
            <span>Comisión (${metodoPagoLabel})</span>
            <span>$${formatearCOP(comisionValor)}</span>
          </div>`
              : ""
          }
          ${
            hayDomicilio
              ? `
          <div class="linea-flex">
            <span>Domicilio</span>
            <span>$${formatearCOP(domicilioValor)}</span>
          </div>`
              : ""
          }
          <div class="linea-flex bold" style="font-size:14px; margin-top:4px;">
            <span>TOTAL A PAGAR</span>
            <span>$${formatearCOP(totalFinalMostrar)}</span>
          </div>
        `
        }
      </div>

      <hr>
      <div class="linea-flex">
        <span>MÉTODO DE PAGO:</span>
        <span class="bold">${metodoPagoLabel.toUpperCase()}</span>
      </div>

      ${
        metodoPago === "efectivo"
          ? `
        <div class="linea-flex">
          <span>RECIBIDO:</span>
          <span>$${formatearCOP(montoRecibido)}</span>
        </div>
        <div class="linea-flex">
          <span>CAMBIO:</span>
          <span>$${formatearCOP(cambio)}</span>
        </div>
      `
          : ""
      }

      <hr>
      <div class="center" style="margin-top:10px;">
        ¡Gracias por su compra!<br>
        Vuelva pronto
      </div>
    </body>
  </html>
  `;
}

// ================= GASTOS =================

function mostrarModalGasto() {
  document.getElementById("gastoModal").classList.remove("hidden");
  document.getElementById("g_monto").focus();
}

function cerrarModalGasto() {
  document.getElementById("gastoModal").classList.add("hidden");
  document.getElementById("gastoForm").reset();
}

async function registrarGasto() {
  const monto = limpiarNumero(document.getElementById("g_monto").value);
  const categoria = document.getElementById("g_categoria").value;
  const concepto = document.getElementById("g_concepto").value;
  const metodoPago = document.getElementById("g_metodo_pago").value;

  if (!monto || monto <= 0) {
    alert("Por favor ingrese un monto válido.");
    return;
  }

  mostrarLoading("Registrando gasto...");
  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registrarGasto",
        monto,
        categoria,
        concepto,
        metodo_pago: metodoPago,
        usuario: currentUserRole,
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      cerrarModalGasto();
      displayStatus(
        "statusGastos",
        "success",
        "Gasto registrado correctamente.",
      );
      loadGastos();
    } else {
      alert(data.message);
    }
  } catch (error) {
    alert("Error al registrar gasto: " + error.message);
  } finally {
    ocultarLoading();
  }
}

function mostrarModalAprovecho() {
  document.getElementById("aprovechoModal").classList.remove("hidden");
}

function cerrarModalAprovecho() {
  document.getElementById("aprovechoModal").classList.add("hidden");
  document.getElementById("aprovechoForm").reset();
}

async function registrarAprovecho() {
  const monto = limpiarNumero(document.getElementById("a_monto").value);
  const categoria = document.getElementById("a_categoria").value;
  const concepto = document.getElementById("a_concepto").value;
  const metodoPago = document.getElementById("a_metodo_pago").value;

  if (!monto || monto <= 0) {
    alert("Por favor ingrese un monto válido.");
    return;
  }

  mostrarLoading("Registrando aprovechamiento...");
  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registrarAprovechamiento",
        monto,
        categoria,
        concepto,
        metodo_pago: metodoPago,
        usuario: currentUserRole,
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      cerrarModalAprovecho();
      displayStatus(
        "statusGastos",
        "success",
        "Aprovechamiento registrado correctamente.",
      );
      loadGastos();
    } else {
      alert(data.message);
    }
  } catch (error) {
    alert("Error al registrar: " + error.message);
  } finally {
    ocultarLoading();
  }
}

let gastosCache = [];

async function loadGastos() {
  const tableBody = document.getElementById("gastosTableBody");
  if (!tableBody) return;

  displayStatus(
    "statusGastos",
    "info",
    "Cargando gastos y aprovechamientos...",
  );
  tableBody.innerHTML = "";

  try {
    const [gastosData, aprovechosData] = await Promise.all([
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
      utils.fetchJson(
        `${SCRIPT_URL}?action=getData&sheetName=APROVECHAMIENTOS`,
      ),
    ]);

    let rows = [];

    if (gastosData.status === "success" && gastosData.data) {
      const gastos = gastosData.data.map((g) => ({
        ...g,
        tipo: "Gasto",
        monto: -Math.abs(parseFloat(g.monto) || 0),
      }));
      rows = rows.concat(gastos);
    }

    if (aprovechosData.status === "success" && aprovechosData.data) {
      const aprovechos = aprovechosData.data.map((a) => ({
        ...a,
        tipo: "Aprovecho",
        monto: Math.abs(parseFloat(a.monto) || 0),
      }));
      rows = rows.concat(aprovechos);
    }

    rows.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    gastosCache = rows;

    const totalRegistros = rows.length;
    displayStatus(
      "statusGastos",
      "success",
      `${totalRegistros} registros cargados.`,
    );
    aplicarFiltrosGastos();
  } catch (error) {
    displayStatus(
      "statusGastos",
      "error",
      `Error al cargar datos: ${error.message}`,
    );
  }
}

function aplicarFiltrosGastos() {
  const tableBody = document.getElementById("gastosTableBody");
  const filtroFecha = document.getElementById("gastosFiltroFecha").value;
  const filtroTipo = document.getElementById("gastosFiltroTipo").value;
  const filtroMetodo = document.getElementById("gastosFiltroMetodo").value;

  if (!gastosCache || gastosCache.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8">No hay registros.</td></tr>';
    actualizarPaginacionGastos(0, 0, 0);
    return;
  }

  const filtered = gastosCache.filter((r) => {
    const fecha = new Date(r.fecha);
    const fechaStr = fecha.toISOString().split("T")[0];
    const matchFecha = !filtroFecha || fechaStr === filtroFecha;
    const matchTipo = !filtroTipo || r.tipo === filtroTipo;
    const matchMetodo = !filtroMetodo || r.metodo_pago === filtroMetodo;
    return matchFecha && matchTipo && matchMetodo;
  });

  // Ordenamiento
  const ordenarPor =
    document.getElementById("gastosOrdenar")?.value || "fecha-desc";
  filtered.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    const montoA = parseFloat(a.monto) || 0;
    const montoB = parseFloat(b.monto) || 0;
    switch (ordenarPor) {
      case "fecha-desc":
        return fechaB - fechaA;
      case "fecha-asc":
        return fechaA - fechaB;
      case "monto-desc":
        return montoB - montoA;
      case "monto-asc":
        return montoA - montoB;
      default:
        return fechaB - fechaA;
    }
  });

  // Paginación
  gastosPorPagina = parseInt(
    document.getElementById("gastosPageSize")?.value || 20,
  );
  const totalItems = filtered.length;
  const totalPaginas = Math.ceil(totalItems / gastosPorPagina);
  if (gastosPagina > totalPaginas) gastosPagina = 1;

  const inicio = (gastosPagina - 1) * gastosPorPagina;
  const fin = Math.min(inicio + gastosPorPagina, totalItems);
  const paginated = filtered.slice(inicio, fin);

  actualizarPaginacionGastos(inicio + 1, fin, totalItems);

  if (paginated.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="8">No hay registros que coincidan con los filtros.</td></tr>';
    return;
  }

  tableBody.innerHTML = paginated
    .map(
      (r) => `
      <tr>
        <td onclick="mostrarDetalleGasto('${r.id_gasto || r.id_aprovecho}')" style="cursor:pointer"><span class="badge ${r.tipo === "Gasto" ? "badge-danger" : "badge-success"}">${r.tipo}</span></td>
        <td onclick="mostrarDetalleGasto('${r.id_gasto || r.id_aprovecho}')" style="cursor:pointer">${new Date(r.fecha).toLocaleString()}</td>
        <td onclick="mostrarDetalleGasto('${r.id_gasto || r.id_aprovecho}')" style="cursor:pointer">${r.categoria}</td>
        <td onclick="mostrarDetalleGasto('${r.id_gasto || r.id_aprovecho}')" style="cursor:pointer">${r.concepto}</td>
        <td onclick="mostrarDetalleGasto('${r.id_gasto || r.id_aprovecho}')" style="cursor:pointer">${r.metodo_pago === "efectivo" ? "Efectivo" : r.metodo_pago === "nequi" ? "Nequi" : r.metodo_pago}</td>
        <td onclick="mostrarDetalleGasto('${r.id_gasto || r.id_aprovecho}')" style="cursor:pointer; color: ${r.tipo === "Gasto" ? "var(--danger-color)" : "var(--success-color)"}; font-weight: bold;">$${formatearCOP(r.monto)}</td>
        <td onclick="mostrarDetalleGasto('${r.id_gasto || r.id_aprovecho}')" style="cursor:pointer">${r.usuario || ""}</td>
        <td style="text-align:center;">
          <button class="btn-icon danger" onclick="eliminarGasto('${r.id_gasto || r.id_aprovecho}', '${r.tipo === "Gasto" ? "gasto" : "aprovecho"}')" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `,
    )
    .join("");
}

function actualizarPaginacionGastos(start, end, total) {
  document.getElementById("gastosStart").textContent = start;
  document.getElementById("gastosEnd").textContent = end;
  document.getElementById("gastosTotal").textContent = total;
  document.getElementById("gastosPageInfo").textContent =
    `Página ${gastosPagina}`;
}

function cambiarPaginaGastos(delta) {
  const filtroFecha = document.getElementById("gastosFiltroFecha").value;
  const filtroTipo = document.getElementById("gastosFiltroTipo").value;
  const filtroMetodo = document.getElementById("gastosFiltroMetodo").value;
  const ordenarPor =
    document.getElementById("gastosOrdenar")?.value || "fecha-desc";

  const filtered = gastosCache.filter((r) => {
    const fecha = new Date(r.fecha);
    const fechaStr = fecha.toISOString().split("T")[0];
    const matchFecha = !filtroFecha || fechaStr === filtroFecha;
    const matchTipo = !filtroTipo || r.tipo === filtroTipo;
    const matchMetodo = !filtroMetodo || r.metodo_pago === filtroMetodo;
    return matchFecha && matchTipo && matchMetodo;
  });

  filtered.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    const montoA = parseFloat(a.monto) || 0;
    const montoB = parseFloat(b.monto) || 0;
    switch (ordenarPor) {
      case "fecha-desc":
        return fechaB - fechaA;
      case "fecha-asc":
        return fechaA - fechaB;
      case "monto-desc":
        return montoB - montoA;
      case "monto-asc":
        return montoA - montoB;
      default:
        return fechaB - fechaA;
    }
  });

  gastosPorPagina = parseInt(
    document.getElementById("gastosPageSize")?.value || 20,
  );
  const totalPaginas = Math.ceil(filtered.length / gastosPorPagina);

  if (delta === 0) {
    gastosPagina = 1;
  } else {
    gastosPagina += delta;
  }
  if (gastosPagina < 1) gastosPagina = 1;
  if (gastosPagina > totalPaginas) gastosPagina = totalPaginas;

  aplicarFiltrosGastos();
}

function limpiarFiltrosGastos() {
  document.getElementById("gastosFiltroFecha").value = "";
  document.getElementById("gastosFiltroTipo").value = "";
  document.getElementById("gastosFiltroMetodo").value = "";
  document.getElementById("gastosOrdenar").value = "fecha-desc";
  gastosPagina = 1;
  aplicarFiltrosGastos();
}

// ================= CONCILIACIÓN =================

let conciliacionCache = [];

async function loadConciliacion() {
  displayStatus(
    "statusConciliacion",
    "info",
    "Buscando ventas pendientes de conciliación...",
  );
  const table = document.getElementById("conciliacionTable");
  const tableBody = document.getElementById("conciliacionTableBody");
  const tableHead = table?.querySelector("thead");

  if (!table || !tableBody || !tableHead) return;

  table.classList.add("hidden");
  tableBody.innerHTML = "";

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=VENTAS`,
    );

    if (data.status === "success" && data.data) {
      const pendientes = data.data.filter((v) => {
        const val = String(v.ingresado || "").toUpperCase();
        return (
          v.ingresado === false ||
          val === "FALSE" ||
          val === "NO" ||
          val === "" ||
          !v.ingresado
        );
      });

      if (pendientes.length === 0) {
        displayStatus(
          "statusConciliacion",
          "success",
          "No hay ventas pendientes de conciliación.",
        );
        return;
      }

      displayStatus(
        "statusConciliacion",
        "info",
        `Hay ${pendientes.length} ventas pendientes.`,
      );

      conciliacionCache = pendientes;
      table.classList.remove("hidden");

      tableHead.innerHTML = `
        <tr>
          <th>#</th>
          <th>Fecha</th>
          <th>Metodo</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Acción</th>
        </tr>
      `;

      aplicarFiltrosConciliacion();
    }
  } catch (error) {
    displayStatus(
      "statusConciliacion",
      "error",
      `Error al cargar: ${error.message}`,
    );
  }
}

function aplicarFiltrosConciliacion() {
  const tableBody = document.getElementById("conciliacionTableBody");
  const filtroFecha = document.getElementById("conciliacionFiltroFecha").value;
  const filtroMetodo = document.getElementById(
    "conciliacionFiltroMetodo",
  ).value;

  if (!conciliacionCache || conciliacionCache.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6">No hay ventas pendientes.</td></tr>';
    actualizarPaginacionConciliacion(0, 0, 0);
    return;
  }

  const filtered = conciliacionCache.filter((v) => {
    const fecha = new Date(v.fecha);
    const fechaStr = fecha.toISOString().split("T")[0];
    const matchFecha = !filtroFecha || fechaStr === filtroFecha;
    const matchMetodo = !filtroMetodo || v.metodo_pago === filtroMetodo;
    return matchFecha && matchMetodo;
  });

  // Ordenamiento
  const ordenarPor =
    document.getElementById("conciliacionOrdenar")?.value || "fecha-desc";
  filtered.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    const totalA = parseFloat(a.total_final) || 0;
    const totalB = parseFloat(b.total_final) || 0;
    switch (ordenarPor) {
      case "fecha-desc":
        return fechaB - fechaA;
      case "fecha-asc":
        return fechaA - fechaB;
      case "total-desc":
        return totalB - totalA;
      case "total-asc":
        return totalA - totalB;
      default:
        return fechaB - fechaA;
    }
  });

  // Paginación
  conciliacionPorPagina = parseInt(
    document.getElementById("conciliacionPageSize")?.value || 20,
  );
  const totalItems = filtered.length;
  const totalPaginas = Math.ceil(totalItems / conciliacionPorPagina);
  if (conciliacionPagina > totalPaginas) conciliacionPagina = 1;

  const inicio = (conciliacionPagina - 1) * conciliacionPorPagina;
  const fin = Math.min(inicio + conciliacionPorPagina, totalItems);
  const paginated = filtered.slice(inicio, fin);

  actualizarPaginacionConciliacion(inicio + 1, fin, totalItems);

  if (paginated.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6">No hay ventas que coincidan con los filtros.</td></tr>';
    return;
  }

  tableBody.innerHTML = paginated
    .map(
      (v) => `
      <tr onclick="mostrarFactura('${v.id_venta}')" style="cursor: pointer;">
        <td>${v.consecutivo ? formatearConsecutivo(v.consecutivo) : "-"}</td>
        <td>${new Date(v.fecha).toLocaleDateString()}</td>
        <td>${v.metodo_pago}</td>
        <td>$${formatearCOP(v.total_final)}</td>
        <td><span class="badge badge-warning">Pendiente</span></td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-sm primary-btn" onclick="conciliarVenta('${v.id_venta}')">
            <i class="fas fa-check"></i> Conciliar
          </button>
        </td>
      </tr>
    `,
    )
    .join("");
}

function actualizarPaginacionConciliacion(start, end, total) {
  document.getElementById("conciliacionStart").textContent = start;
  document.getElementById("conciliacionEnd").textContent = end;
  document.getElementById("conciliacionTotal").textContent = total;
  document.getElementById("conciliacionPageInfo").textContent =
    `Página ${conciliacionPagina}`;
}

function cambiarPaginaConciliacion(delta) {
  const filtroFecha = document.getElementById("conciliacionFiltroFecha").value;
  const filtroMetodo = document.getElementById(
    "conciliacionFiltroMetodo",
  ).value;
  const ordenarPor =
    document.getElementById("conciliacionOrdenar")?.value || "fecha-desc";

  const filtered = conciliacionCache.filter((v) => {
    const fecha = new Date(v.fecha);
    const fechaStr = fecha.toISOString().split("T")[0];
    const matchFecha = !filtroFecha || fechaStr === filtroFecha;
    const matchMetodo = !filtroMetodo || v.metodo_pago === filtroMetodo;
    return matchFecha && matchMetodo;
  });

  filtered.sort((a, b) => {
    const fechaA = new Date(a.fecha || 0);
    const fechaB = new Date(b.fecha || 0);
    const totalA = parseFloat(a.total_final) || 0;
    const totalB = parseFloat(b.total_final) || 0;
    switch (ordenarPor) {
      case "fecha-desc":
        return fechaB - fechaA;
      case "fecha-asc":
        return fechaA - fechaB;
      case "total-desc":
        return totalB - totalA;
      case "total-asc":
        return totalA - totalB;
      default:
        return fechaB - fechaA;
    }
  });

  conciliacionPorPagina = parseInt(
    document.getElementById("conciliacionPageSize")?.value || 20,
  );
  const totalPaginas = Math.ceil(filtered.length / conciliacionPorPagina);

  if (delta === 0) {
    conciliacionPagina = 1;
  } else {
    conciliacionPagina += delta;
  }
  if (conciliacionPagina < 1) conciliacionPagina = 1;
  if (conciliacionPagina > totalPaginas) conciliacionPagina = totalPaginas;

  aplicarFiltrosConciliacion();
}

function limpiarFiltrosConciliacion() {
  document.getElementById("conciliacionFiltroFecha").value = "";
  document.getElementById("conciliacionFiltroMetodo").value = "";
  document.getElementById("conciliacionOrdenar").value = "fecha-desc";
  conciliacionPagina = 1;
  aplicarFiltrosConciliacion();
}

async function conciliarVenta(idVenta) {
  if (!confirm("¿Confirma que el dinero de esta venta ya ingresó a su cuenta?"))
    return;

  mostrarLoading("Actualizando estado...");
  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "conciliarVenta",
        id_venta: idVenta,
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      displayStatus(
        "statusConciliacion",
        "success",
        "Venta conciliada correctamente.",
      );
      loadConciliacion();
      handleLoadDashboard(); // Refrescar totales
    } else {
      alert(data.message);
    }
  } catch (error) {
    alert("Error al conciliar venta: " + error.message);
  } finally {
    ocultarLoading();
  }
}
// ================= CIERRE DE CAJA =================

let cierreActual = {
  ventasEfectivo: 0,
  ventasBanco: 0,
  gastos: 0,
  gastosBanco: 0,
  aprovechamientos: 0,
};

async function prepararCierreCaja() {
  mostrarLoading("Preparando datos de cierre...");
  try {
    const hoyISO = new Date().toISOString().split("T")[0];
    const [ventasData, gastosData, aprovechosData] = await Promise.all([
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
      utils.fetchJson(
        `${SCRIPT_URL}?action=getData&sheetName=APROVECHAMIENTOS`,
      ),
    ]);

    let vEfectivo = 0;
    let vBanco = 0;
    let gastosEfectivo = 0;
    let gastosBanco = 0;
    let aprovechosEfectivo = 0;
    let aprovechosBanco = 0;

    // Calcular ventas del día (solo las conciliadas)
    if (ventasData.status === "success" && ventasData.data) {
      ventasData.data.forEach((v) => {
        const fechaVentaISO = new Date(v.fecha).toISOString().split("T")[0];
        const isIngresado =
          v.ingresado === true || String(v.ingresado).toUpperCase() === "TRUE";

        if (fechaVentaISO === hoyISO && isIngresado) {
          const total = parseFloat(v.total_final) || 0;
          const metodo = String(v.metodo_pago || "").toLowerCase();

          if (metodo === "efectivo") {
            vEfectivo += total;
          } else {
            // Tarjeta, Nequi, Addi, Sistecredito, transferencia
            vBanco += total;
          }
        }
      });
    }

    // Calcular gastos del día por método de pago
    if (gastosData.status === "success" && gastosData.data) {
      gastosData.data.forEach((g) => {
        const fechaGasto = new Date(g.fecha).toLocaleDateString();
        if (fechaGasto === hoy) {
          const monto = parseFloat(g.monto) || 0;
          const metodo = String(g.metodo_pago || "").toLowerCase();

          if (metodo === "efectivo") {
            gastosEfectivo += monto;
          } else {
            // Nequi, tarjeta, transferencia, etc.
            gastosBanco += monto;
          }
        }
      });
    }

    // Calcular aprovechamientos del día por método de pago
    if (aprovechosData.status === "success" && aprovechosData.data) {
      aprovechosData.data.forEach((a) => {
        const fechaAprovecho = new Date(a.fecha).toLocaleDateString();
        if (fechaAprovecho === hoy) {
          const monto = parseFloat(a.monto) || 0;
          const metodo = String(a.metodo_pago || "").toLowerCase();

          if (metodo === "efectivo") {
            aprovechosEfectivo += monto;
          } else {
            // Nequi, tarjeta, transferencia, etc.
            aprovechosBanco += monto;
          }
        }
      });
    }

    const totalIngresos =
      vEfectivo + vBanco + aprovechosEfectivo + aprovechosBanco;
    const totalEgresos = gastosEfectivo + gastosBanco;
    const totalEfectivo = vEfectivo + aprovechosEfectivo - gastosEfectivo;
    const totalBanco = vBanco + aprovechosBanco - gastosBanco;

    cierreActual = {
      ventasEfectivo: vEfectivo,
      ventasBanco: vBanco,
      gastosEfectivo: gastosEfectivo,
      gastosBanco: gastosBanco,
      aprovechosEfectivo: aprovechosEfectivo,
      aprovechosBanco: aprovechosBanco,
      aprovechamientos: aprovechosEfectivo + aprovechosBanco,
    };

    // UI - Actualizar todos los campos (con verificación de existencia)
    const cierreVentasEfectivo = document.getElementById(
      "cierreVentasEfectivo",
    );
    const cierreGastosEfectivo = document.getElementById(
      "cierreGastosEfectivo",
    );
    const cierreAprovechosEfectivo = document.getElementById(
      "cierreAprovechosEfectivo",
    );
    const cierreAprovechosNequi = document.getElementById(
      "cierreAprovechosNequi",
    );
    const cierreVentasBanco = document.getElementById("cierreVentasBanco");
    const cierreGastosBanco = document.getElementById("cierreGastosBanco");
    const cierreTotalIngresos = document.getElementById("cierreTotalIngresos");
    const cierreTotalEgresos = document.getElementById("cierreTotalEgresos");

    if (cierreVentasEfectivo)
      cierreVentasEfectivo.textContent = `$${formatearCOP(vEfectivo)}`;
    if (cierreGastosEfectivo)
      cierreGastosEfectivo.textContent = `$${formatearCOP(gastosEfectivo)}`;
    if (cierreAprovechosEfectivo)
      cierreAprovechosEfectivo.textContent = `$${formatearCOP(aprovechosEfectivo)}`;
    if (cierreAprovechosNequi)
      cierreAprovechosNequi.textContent = `$${formatearCOP(aprovechosBanco)}`;
    if (cierreVentasBanco)
      cierreVentasBanco.textContent = `$${formatearCOP(vBanco)}`;
    if (cierreGastosBanco)
      cierreGastosBanco.textContent = `$${formatearCOP(gastosBanco)}`;
    if (cierreTotalIngresos)
      cierreTotalIngresos.textContent = `$${formatearCOP(totalIngresos)}`;
    if (cierreTotalEgresos)
      cierreTotalEgresos.textContent = `$${formatearCOP(totalEgresos)}`;

    document.getElementById("c_base").value = "";
    document.getElementById("c_real").value = "";
    document.getElementById("c_banco_base").value = "";
    document.getElementById("c_banco_real").value = "";

    actualizarCalculoCierre();
    loadHistorialCierres();
  } catch (error) {
    alert("Error al preparar cierre: " + error.message);
  } finally {
    ocultarLoading();
  }
}

function actualizarCalculoCierre() {
  const base =
    parseFloat(
      document.getElementById("c_base").value.replace(/[^0-9]/g, ""),
    ) || 0;
  const real =
    parseFloat(
      document.getElementById("c_real").value.replace(/[^0-9]/g, ""),
    ) || 0;
  const baseBk =
    parseFloat(
      document.getElementById("c_banco_base").value.replace(/[^0-9]/g, ""),
    ) || 0;
  const realBk =
    parseFloat(
      document.getElementById("c_banco_real").value.replace(/[^0-9]/g, ""),
    ) || 0;

  // Cálculos Efectivo: Base + Ventas Efectivo + Aprovechos Efectivo - Gastos Efectivo
  const esperadoEf =
    base +
    cierreActual.ventasEfectivo +
    cierreActual.aprovechosEfectivo -
    cierreActual.gastosEfectivo;
  const diferenciaEf = real - esperadoEf;

  // Cálculos Banco: Base + Ventas Banco + Aprovechos Banco - Gastos Banco
  const esperadoBk =
    baseBk +
    cierreActual.ventasBanco +
    cierreActual.aprovechosBanco -
    cierreActual.gastosBanco;
  const diferenciaBk = realBk - esperadoBk;

  // UI Efectivo
  document.getElementById("cierreEsperado").textContent =
    `$${formatearCOP(esperadoEf)}`;
  const diffElemEf = document.getElementById("cierreDiferencia");
  diffElemEf.textContent = `$${formatearCOP(diferenciaEf)}`;
  diffElemEf.style.color =
    diferenciaEf === 0
      ? "inherit"
      : diferenciaEf > 0
        ? "var(--success-color)"
        : "var(--danger-color)";

  // UI Banco
  document.getElementById("cierreBancoEsperado").textContent =
    `$${formatearCOP(esperadoBk)}`;
  const diffElemBk = document.getElementById("cierreBancoDiferencia");
  diffElemBk.textContent = `$${formatearCOP(diferenciaBk)}`;
  diffElemBk.style.color =
    diferenciaBk === 0
      ? "inherit"
      : diferenciaBk > 0
        ? "var(--success-color)"
        : "var(--danger-color)";
}

async function ejecutarCierre(e) {
  e.preventDefault();

  const baseEf =
    parseFloat(
      document.getElementById("c_base").value.replace(/[^0-9]/g, ""),
    ) || 0;
  const realEf =
    parseFloat(
      document.getElementById("c_real").value.replace(/[^0-9]/g, ""),
    ) || 0;
  const baseBk =
    parseFloat(
      document.getElementById("c_banco_base").value.replace(/[^0-9]/g, ""),
    ) || 0;
  const realBk =
    parseFloat(
      document.getElementById("c_banco_real").value.replace(/[^0-9]/g, ""),
    ) || 0;

  const esperadoEf =
    baseEf +
    cierreActual.ventasEfectivo +
    cierreActual.aprovechosEfectivo -
    cierreActual.gastosEfectivo;
  const diferenciaEf = realEf - esperadoEf;
  const esperadoBk =
    baseBk +
    cierreActual.ventasBanco +
    cierreActual.aprovechosBanco -
    cierreActual.gastosBanco;
  const diferenciaBk = realBk - esperadoBk;

  if (!confirm("¿Confirma que desea guardar este cierre de caja completo?"))
    return;

  mostrarLoading("Guardando cierre...");
  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "registrarCierre",
        base_efectivo: baseEf,
        base_banco: baseBk,
        ventas_efectivo: cierreActual.ventasEfectivo,
        ventas_banco: cierreActual.ventasBanco,
        gastos_efectivo: cierreActual.gastosEfectivo,
        gastos_banco: cierreActual.gastosBanco,
        aprovechamientos: cierreActual.aprovechamientos,
        efectivo_esperado: esperadoEf,
        efectivo_real: realEf,
        efectivo_diferencia: diferenciaEf,
        banco_esperado: esperadoBk,
        banco_real: realBk,
        banco_diferencia: diferenciaBk,
        usuario: "Admin",
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      alert("¡Cierre guardado con éxito!");
      loadHistorialCierres();
      irASeccion("dashboard");
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    alert("Error al ejecutar cierre: " + error.message);
  } finally {
    ocultarLoading();
  }
}

async function loadHistorialCierres() {
  const table = document.getElementById("historialCierresTable");
  const tbody = document.getElementById("historialCierresBody");
  if (!tbody || !table) return;

  displayStatus("statusResumen", "info", "Cargando historial de cierres...");
  document.getElementById("resumenTable").classList.add("hidden");
  table.classList.add("hidden");
  tbody.innerHTML = "";

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=CIERRES`,
    );

    if (data.status === "success" && data.data && data.data.length > 0) {
      displayStatus(
        "statusResumen",
        "success",
        `${data.data.length} cierres registrados.`,
      );
      table.classList.remove("hidden");
      const cierres = data.data.reverse();

      tbody.innerHTML = cierres
        .map((c) => {
          const difEf = parseFloat(c.efectivo_diferencia) || 0;
          const difBk = parseFloat(c.banco_diferencia) || 0;

          return `
          <tr onclick="mostrarDetalleCierre('${c.id_cierre}')" style="cursor:pointer">
            <td>${new Date(c.fecha).toLocaleDateString()}</td>
            <td>$${formatearCOP(c.base_efectivo)}</td>
            <td>$${formatearCOP(c.efectivo_real)}</td>
            <td style="color:${difEf === 0 ? "inherit" : difEf > 0 ? "var(--success-color)" : "var(--danger-color)"}">
              $${formatearCOP(difEf)}
            </td>
            <td>$${formatearCOP(c.base_banco)}</td>
            <td>$${formatearCOP(c.banco_real)}</td>
            <td style="color:${difBk === 0 ? "inherit" : difBk > 0 ? "var(--success-color)" : "var(--danger-color)"}">
              $${formatearCOP(difBk)}
            </td>
            <td>${c.usuario || "Admin"}</td>
          </tr>
        `;
        })
        .join("");
    } else if (data.status === "success") {
      displayStatus("statusResumen", "warning", "No hay cierres registrados.");
    } else {
      displayStatus(
        "statusResumen",
        "error",
        `Error del servidor: ${data.message || "Desconocido"}`,
      );
    }
  } catch (error) {
    displayStatus(
      "statusResumen",
      "error",
      `Error al cargar historial: ${error.message}`,
    );
    tbody.innerHTML = `<tr><td colspan="8">Error al cargar historial: ${error.message}</td></tr>`;
  }
}

async function mostrarDetalleCierre(idCierre) {
  mostrarLoading("Cargando detalle...");
  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=CIERRES`,
    );
    if (data.status !== "success") throw new Error(data.message);

    const cierre = data.data.find(
      (c) => String(c.id_cierre) === String(idCierre),
    );
    if (!cierre) throw new Error("Cierre no encontrado.");

    const con = document.getElementById("cierreDetalleContenido");
    const vEfectivo = parseFloat(cierre.ventas_efectivo) || 0;
    const vBanco = parseFloat(cierre.ventas_banco) || 0;
    const aprovechos = parseFloat(cierre.aprovechamientos) || 0;
    const gEfectivo = parseFloat(cierre.gastos_efectivo) || 0;
    const gBanco = parseFloat(cierre.gastos_banco) || 0;
    const vTot = vEfectivo + vBanco + aprovechos;
    const eTot = gEfectivo + gBanco;

    con.innerHTML = `
      <div class="factura-info">
        <p><strong>ID Cierre:</strong> ${cierre.id_cierre}</p>
        <p><strong>Fecha:</strong> ${new Date(cierre.fecha).toLocaleString()}</p>
        <p><strong>Usuario:</strong> ${cierre.usuario || "Admin"}</p>
      </div>

      <div class="detail-block" style="margin-top:20px">
        <h4 style="border-bottom: 2px solid var(--primary-color); padding-bottom:5px;">
          <i class="fas fa-money-bill-wave"></i> Balance Efectivo
        </h4>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
          <p>Base Inicial: <strong>$${formatearCOP(cierre.base_efectivo)}</strong></p>
          <p>Ventas Efectivo: <strong>$${formatearCOP(vEfectivo)}</strong></p>
          <p>Aprovechamientos: <strong style="color:var(--success-color)">$${formatearCOP(aprovechos)}</strong></p>
          <p>Gastos Efectivo: <strong style="color:var(--danger-color)">-$${formatearCOP(gEfectivo)}</strong></p>
          <p>Esperado en Caja: <strong>$${formatearCOP(cierre.efectivo_esperado)}</strong></p>
          <p>Real Contado: <strong>$${formatearCOP(cierre.efectivo_real)}</strong></p>
          <p>Diferencia: <strong style="color:${parseFloat(cierre.efectivo_diferencia) < 0 ? "var(--danger-color)" : "var(--success-color)"}">
            $${formatearCOP(cierre.efectivo_diferencia)}
          </strong></p>
        </div>
      </div>

      <div class="detail-block" style="margin-top:20px">
        <h4 style="border-bottom: 2px solid var(--primary-color); padding-bottom:5px;">
          <i class="fas fa-university"></i> Balance Bancario (Nequi/Otros)
        </h4>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
          <p>Saldo Inicial: <strong>$${formatearCOP(cierre.base_banco)}</strong></p>
          <p>Ventas Banco: <strong>$${formatearCOP(vBanco)}</strong></p>
          <p>Gastos Banco: <strong style="color:var(--danger-color)">-$${formatearCOP(gBanco)}</strong></p>
          <p>Esperado en App: <strong>$${formatearCOP((parseFloat(cierre.base_banco) || 0) + vBanco - gBanco)}</strong></p>
          <p>Real Verificado: <strong>$${formatearCOP(cierre.banco_real)}</strong></p>
          <p>Diferencia: <strong style="color:${parseFloat(cierre.banco_diferencia) < 0 ? "var(--danger-color)" : "var(--success-color)"}">
            $${formatearCOP(cierre.banco_diferencia)}
          </strong></p>
        </div>
      </div>

      <div style="margin-top:25px; padding:15px; background:var(--gray-50); border-radius:8px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; text-align:center;">
          <div>
            <p style="margin:0; font-size:0.85em; color:var(--gray-600);">Total Ingresos</p>
            <p style="margin:5px 0 0 0; font-size:1.3em; font-weight:bold; color:var(--success-color);">$${formatearCOP(vTot)}</p>
          </div>
          <div>
            <p style="margin:0; font-size:0.85em; color:var(--gray-600);">Total Egresos</p>
            <p style="margin:5px 0 0 0; font-size:1.3em; font-weight:bold; color:var(--danger-color);">$${formatearCOP(eTot)}</p>
          </div>
          <div>
            <p style="margin:0; font-size:0.85em; color:var(--gray-600);">Ventas del Día</p>
            <p style="margin:5px 0 0 0; font-size:1.3em; font-weight:bold;">$${formatearCOP(vEfectivo + vBanco)}</p>
          </div>
        </div>
      </div>

      <div style="margin-top:25px; padding:15px; background:var(--gray-50); border-radius:8px; text-align:center;">
        <h3 style="margin:0">Ventas Totales del Día: $${formatearCOP(vTot)}</h3>
      </div>
    `;

    document.getElementById("cierreDetalleModal").classList.remove("hidden");
  } catch (error) {
    alert("Error al cargar detalle: " + error.message);
  } finally {
    ocultarLoading();
  }
}

function cerrarCierreDetalle() {
  document.getElementById("cierreDetalleModal").classList.add("hidden");
}

// Cerrar modal al hacer clic fuera del contenido
[
  "cierreDetalleModal",
  "facturaModal",
  "gastoDetalleModal",
  "inventarioDetalleModal",
  "gastoModal",
  "aprovechoModal",
  "detalleVentasModal",
  "detalleGananciasModal",
  "detalleMargenModal",
  "detalleInventarioModal",
  "detalleEfectivoModal",
  "detalleNequiModal",
  "detalleGastosModal",
  "detalleComprasModal",
  "detalleCostoVendaModal",
  "detallePendienteModal",
  "graficoDetalleModal",
].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", function (e) {
    if (e.target === this) {
      if (id === "cierreDetalleModal") cerrarCierreDetalle();
      if (id === "facturaModal") cerrarFactura();
      if (id === "gastoDetalleModal") cerrarGastoDetalle();
      if (id === "inventarioDetalleModal") cerrarInventarioDetalle();
      if (id === "gastoModal") cerrarModalGasto();
      if (id === "aprovechoModal") cerrarModalAprovecho();
      if (id === "detalleVentasModal") cerrarDetalleVentas();
      if (id === "detalleGananciasModal") cerrarDetalleGanancias();
      if (id === "detalleMargenModal") cerrarDetalleMargen();
      if (id === "detalleInventarioModal") cerrarDetalleInventario();
      if (id === "detalleEfectivoModal") cerrarDetalleEfectivo();
      if (id === "detalleNequiModal") cerrarDetalleNequi();
      if (id === "detalleGastosModal") cerrarDetalleGastos();
      if (id === "detalleComprasModal") cerrarDetalleCompras();
      if (id === "detalleCostoVentaModal") cerrarDetalleCostoVenta();
      if (id === "detallePendienteModal") cerrarDetallePendiente();
      if (id === "graficoDetalleModal") cerrarGraficoDetalle();
    }
  });
});

// Cerrar modales con la tecla Escape
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    cerrarFactura?.();
    cerrarCierreDetalle?.();
    cerrarModalGasto?.();
    cerrarGastoDetalle?.();
    cerrarInventarioDetalle?.();
    cerrarModalAprovecho?.();
    cerrarDetalleVentas?.();
    cerrarDetalleGanancias?.();
    cerrarDetalleMargen?.();
    cerrarDetalleInventario?.();
    cerrarDetalleEfectivo?.();
    cerrarDetalleNequi?.();
    cerrarDetalleGastos?.();
    cerrarDetalleCompras?.();
    cerrarDetalleCostoVenta?.();
    cerrarDetallePendiente?.();
    cerrarGraficoDetalle?.();
  }
});

async function mostrarDetalleGasto(idGasto) {
  mostrarLoading("Cargando detalle...");
  try {
    const [gastosData, aprovechosData] = await Promise.all([
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
      utils.fetchJson(
        `${SCRIPT_URL}?action=getData&sheetName=APROVECHAMIENTOS`,
      ),
    ]);

    let registro = null;
    let tipo = "";

    if (gastosData.status === "success" && gastosData.data) {
      registro = gastosData.data.find(
        (g) => String(g.id_gasto) === String(idGasto),
      );
      if (registro) tipo = "Gasto";
    }

    if (
      !registro &&
      aprovechosData.status === "success" &&
      aprovechosData.data
    ) {
      registro = aprovechosData.data.find(
        (a) => String(a.id_aprovecho) === String(idGasto),
      );
      if (registro) tipo = "Aprovecho";
    }

    if (!registro) throw new Error("Registro no encontrado.");

    const esGasto = tipo === "Gasto";
    const titulo = esGasto ? "Detalle de Gasto" : "Detalle de Aprovechamiento";
    const colorMonto = esGasto ? "var(--danger-color)" : "var(--success-color)";
    const montoMostrar = esGasto
      ? `-$${formatearCOP(registro.monto)}`
      : `$${formatearCOP(registro.monto)}`;

    document.getElementById("gastoDetalleTitulo").innerHTML =
      `<i class="fas fa-file-invoice-dollar"></i> ${titulo}`;

    const con = document.getElementById("gastoDetalleContenido");
    con.innerHTML = `
      <div class="detail-block">
        <p><strong>Tipo:</strong> <span class="badge ${esGasto ? "badge-danger" : "badge-success"}">${tipo}</span></p>
        <p><strong>Fecha:</strong> ${new Date(registro.fecha).toLocaleString()}</p>
        <p><strong>Categoría:</strong> ${registro.categoria}</p>
        <p><strong>Método:</strong> ${registro.metodo_pago === "efectivo" ? "Efectivo" : registro.metodo_pago === "nequi" ? "Nequi" : registro.metodo_pago}</p>
        <p><strong>Usuario:</strong> ${registro.usuario || "Admin"}</p>
      </div>
      
      <div class="detail-block" style="text-align:center; padding: 25px;">
        <h2 style="border:none; justify-content:center; margin:0; padding:0; color:${colorMonto}; font-size: 2rem;">
          ${montoMostrar}
        </h2>
        <p style="margin-top:10px; font-weight:700; color:var(--gray-600);">${registro.concepto}</p>
      </div>
    `;

    document.getElementById("gastoDetalleModal").classList.remove("hidden");
  } catch (error) {
    alert("Error al cargar detalle: " + error.message);
  } finally {
    ocultarLoading();
  }
}

function cerrarGastoDetalle() {
  document.getElementById("gastoDetalleModal").classList.add("hidden");
}

function mostrarInventarioDetalle(idProducto) {
  const producto = inventarioCache.find(
    (p) => String(p.id) === String(idProducto),
  );
  if (!producto) {
    alert("Producto no encontrado.");
    return;
  }

  const pv1 = Number(producto.precio_venta) || 0;
  const pv2 = Number(producto.precio_venta_2) || 0;
  const pv3 = Number(producto.precio_venta_3) || 0;
  const pv4 = Number(producto.precio_venta_4) || 0;
  const pc = Number(producto.precio_compra) || 0;
  const stock = Number(producto.stock) || 0;
  const utilidad1 = pc > 0 ? pv1 - pc : 0;
  const utilidad2 = pc > 0 ? pv2 - pc : 0;

  const contenido = document.getElementById("inventarioDetalleContenido");
  contenido.innerHTML = `
    <div class="detail-block">
      <p><strong>ID:</strong> ${producto.id}</p>
      <p><strong>Nombre:</strong> ${producto.nombre}</p>
      <p><strong>Código:</strong> ${producto.código}</p>
      <p><strong>Categoría:</strong> ${producto.categoría}</p>
    </div>
    
    <div class="detail-block" style="margin-top: 20px;">
      <h4 style="border-bottom: 2px solid var(--primary-color); padding-bottom: 5px;">
        <i class="fas fa-box"></i> Stock
      </h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
        <p><strong>Cantidad:</strong></p>
        <p style="font-size: 1.2em; ${stock < 5 ? "color: var(--danger-color);" : ""}">${stock} unidades</p>
      </div>
    </div>

    <div class="detail-block" style="margin-top: 20px;">
      <h4 style="border-bottom: 2px solid var(--primary-color); padding-bottom: 5px;">
        <i class="fas fa-dollar-sign"></i> Precios
      </h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
        <p>Precio Compra:</p>
        <p><strong>$${formatearCOP(pc)}</strong></p>
        
        <p>Precio Venta 1:</p>
        <p><strong>$${formatearCOP(pv1)}</strong> <span style="font-size: 0.85em; color: var(--success-color);">+$${formatearCOP(utilidad1)}</span></p>
        
        <p>Precio Venta 2:</p>
        <p><strong>$${formatearCOP(pv2)}</strong> <span style="font-size: 0.85em; color: var(--success-color);">+$${formatearCOP(utilidad2)}</span></p>
        
        <p>Precio Venta 3:</p>
        <p><strong>$${formatearCOP(pv3)}</strong></p>
        
        <p>Precio Venta 4:</p>
        <p><strong>$${formatearCOP(pv4)}</strong></p>
      </div>
    </div>

    <div style="margin-top: 20px; padding: 15px; background: var(--gray-50); border-radius: 8px; text-align: center;">
      <p style="margin: 0; color: var(--gray-600);">Margen de ganancia (Precio Venta 1)</p>
      <p style="margin: 5px 0 0 0; font-size: 1.5em; font-weight: bold; color: var(--success-color);">
        ${pc > 0 ? (((pv1 - pc) / pc) * 100).toFixed(1) : 0}%
      </p>
    </div>
  `;

  document.getElementById("inventarioDetalleModal").classList.remove("hidden");
}

function cerrarInventarioDetalle() {
  document.getElementById("inventarioDetalleModal").classList.add("hidden");
}

async function eliminarGasto(id, tipo) {
  const tipoLabel = tipo === "gasto" ? "gasto" : "aprovechamiento";
  if (!confirm(`¿Estás seguro de eliminar este ${tipoLabel}?`)) return;

  mostrarLoading("Eliminando...");
  try {
    const data = await utils.fetchJson(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "eliminarGasto",
        id: id,
        tipo: tipo,
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    if (data.status === "success") {
      displayStatus(
        "statusGastos",
        "success",
        `${tipoLabel.charAt(0).toUpperCase() + tipoLabel.slice(1)} eliminado.`,
      );
      loadGastos();
    } else {
      alert(data.message);
    }
  } catch (error) {
    alert("Error al eliminar: " + error.message);
  } finally {
    ocultarLoading();
  }
}

async function mostrarCompra(idCompra) {
  if (!idCompra) {
    console.error("ID de compra inválido:", idCompra);
    alert("No se pudo obtener el ID de la compra.");
    return;
  }

  const compra = resumenDataCache.find(
    (row) => String(row.id_compra) === String(idCompra),
  );

  if (!compra) {
    alert("Compra no encontrada.");
    return;
  }

  const numeroBase = compra.consecutivo || compra.id_compra || 0;
  const consecutivoFormateado = String(numeroBase).padStart(5, "0");
  const totalFinal = Number(compra.total_final || 0);
  const montoRecibido = Number(compra.monto_recibido || 0);
  const cambio = Number(compra.cambio || 0);
  const metodoPago = (compra.metodo_pago || "").toLowerCase();
  const descuentoGlobalPct = Number(compra.descuento_global_pct || 0);
  const subtotalBase = Number(compra.subtotal || 0);
  const valorEnvio = Number(compra.valor_envio || 0);
  const direccionEnvio = String(compra.direccion_entrega || "");
  const hayEnvio = valorEnvio > 0;

  let html = `
    <div class="factura-header-brand">
      <img src="img/logo.png" class="logo">
      <div class="factura-business-name">GITANAS</div>
      <div class="factura-nit">NIT: 1085334745-2</div>
      <div class="factura-address">Dirección: Calle 15 #26 - 88 Centro</div>
      <div class="factura-whatsapp">WhatsApp: 316 785 2058</div>
      <div class="factura-iva">No somos responsables de IVA</div>
    </div>

    <div class="factura-info-grid">
      <div class="info-item">
        <span class="info-label">Recibo de Compra:</span>
        <span class="info-value">#${consecutivoFormateado}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Fecha:</span>
        <span class="info-value">${new Date(compra.fecha).toLocaleString()}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Proveedor:</span>
        <span class="info-value">${compra.proveedor || "Sin proveedor"}</span>
      </div>
      ${
        String(compra.proveedor_telefono || "")
          ? `
        <div class="info-item">
          <span class="info-label">Teléfono:</span>
          <span class="info-value">${compra.proveedor_telefono}</span>
        </div>
      `
          : ""
      }
    </div>

    <table class="factura-items-table">
      <thead>
        <tr>
          <th>Concepto</th>
          <th style="text-align:right;">Valor</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Subtotal</td>
          <td style="text-align:right;">$${formatearCOP(subtotalBase)}</td>
        </tr>
        ${
          descuentoGlobalPct > 0
            ? `
        <tr>
          <td>Descuento (${descuentoGlobalPct}%)</td>
          <td style="text-align:right;">-$${formatearCOP(subtotalBase * (descuentoGlobalPct / 100))}</td>
        </tr>
        `
            : ""
        }
        ${
          hayEnvio
            ? `
        <tr>
          <td>Envío</td>
          <td style="text-align:right;">$${formatearCOP(valorEnvio)}</td>
        </tr>
        `
            : ""
        }
        <tr class="factura-total-row">
          <td><strong>TOTAL</strong></td>
          <td style="text-align:right;"><strong>$${formatearCOP(totalFinal)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="factura-footer-grid">
      <div class="info-item">
        <span class="info-label">Método de pago:</span>
        <span class="info-value">${metodoPago === "efectivo" ? "Efectivo" : metodoPago === "transferencia" ? "Transferencia" : metodoPago === "credito" ? "Crédito" : metodoPago}</span>
      </div>
      ${
        metodoPago === "efectivo"
          ? `
      <div class="info-item">
        <span class="info-label">Monto recibido:</span>
        <span class="info-value">$${formatearCOP(montoRecibido)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Cambio:</span>
        <span class="info-value">$${formatearCOP(cambio)}</span>
      </div>
      `
          : ""
      }
      ${
        hayEnvio
          ? `
      <div class="info-item" style="grid-column: 1 / -1;">
        <span class="info-label">Dirección de entrega:</span>
        <span class="info-value">${direccionEnvio}</span>
      </div>
      `
          : ""
      }
    </div>
  `;

  const modal = document.getElementById("facturaModal");
  const modalContent = modal.querySelector(".modal-content");
  const closeBtn = modal.querySelector(".close");

  modalContent.innerHTML = `
    <span class="close">&times;</span>
    <h2 style="text-align:center; margin-bottom: 20px;">Recibo de Compra</h2>
    ${html}
    <div style="text-align:center; margin-top: 20px;">
      <button class="btn secondary-btn" onclick="window.print()">
        <i class="fas fa-print"></i> Imprimir
      </button>
    </div>
  `;

  modalContent.querySelector(".close").onclick = () => {
    modal.style.display = "none";
  };

  modal.style.display = "block";
}

// ================= MODALES DE DETALLE DEL DASHBOARD =================

// Funciones de cierre
function cerrarDetalleVentas() {
  document.getElementById("detalleVentasModal").classList.add("hidden");
}
function cerrarDetalleGanancias() {
  document.getElementById("detalleGananciasModal").classList.add("hidden");
}
function cerrarDetalleMargen() {
  document.getElementById("detalleMargenModal").classList.add("hidden");
}
function cerrarDetalleInventario() {
  document.getElementById("detalleInventarioModal").classList.add("hidden");
}
function cerrarDetalleEfectivo() {
  document.getElementById("detalleEfectivoModal").classList.add("hidden");
}
function cerrarDetalleNequi() {
  document.getElementById("detalleNequiModal").classList.add("hidden");
}
function cerrarDetalleGastos() {
  document.getElementById("detalleGastosModal").classList.add("hidden");
}
function cerrarDetalleCompras() {
  document.getElementById("detalleComprasModal").classList.add("hidden");
}
function cerrarDetalleCostoVenta() {
  document.getElementById("detalleCostoVentaModal").classList.add("hidden");
}
function cerrarDetallePendiente() {
  document.getElementById("detallePendienteModal").classList.add("hidden");
}

// ================= MODAL DE GRÁFICOS DEL DASHBOARD =================
let graficoDetalleChart = null;

function cerrarGraficoDetalle() {
  document.getElementById("graficoDetalleModal").classList.add("hidden");
  if (graficoDetalleChart) {
    graficoDetalleChart.destroy();
    graficoDetalleChart = null;
  }
}

async function abrirGraficoDetalle(tipoGrafico) {
  const modal = document.getElementById("graficoDetalleModal");
  const titulo = document.getElementById("graficoDetalleTitulo");
  const infoDiv = document.getElementById("graficoDetalleInfo");
  const canvas = document.getElementById("graficoDetalleCanvas");
  const ctx = canvas.getContext("2d");

  if (graficoDetalleChart) {
    graficoDetalleChart.destroy();
  }

  // Configurar título según tipo
  const config = {
    resumenFinanciero: {
      titulo: "Resumen Financiero",
      icono: "fa-chart-bar",
      color: "rgba(0, 123, 255, 1)",
    },
    tendencias: {
      titulo: "Tendencias de Ventas",
      icono: "fa-chart-line",
      color: "rgba(59, 130, 246, 1)",
    },
    metodosPago: {
      titulo: "Métodos de Pago",
      icono: "fa-chart-pie",
      color: "rgba(139, 92, 246, 1)",
    },
    topProductos: {
      titulo: "Top Productos Vendidos",
      icono: "fa-box",
      color: "rgba(34, 197, 94, 1)",
    },
    gastosCategoria: {
      titulo: "Gastos por Categoría",
      icono: "fa-chart-pie",
      color: "rgba(239, 68, 68, 1)",
    },
    inventarioCategoria: {
      titulo: "Inventario por Categoría",
      icono: "fa-warehouse",
      color: "rgba(139, 92, 246, 1)",
    },
    clienteFrecuente: {
      titulo: "Cliente Frecuente",
      icono: "fa-users",
      color: "rgba(34, 197, 94, 1)",
    },
  };

  const cfg = config[tipoGrafico] || {
    titulo: "Gráfico",
    icono: "fa-chart-bar",
    color: "#333",
  };
  titulo.innerHTML = `<i class="fas ${cfg.icono}"></i> ${cfg.titulo}`;

  modal.classList.remove("hidden");
  infoDiv.innerHTML = "<p>Cargando datos...</p>";

  try {
    // Obtener datos
    const [ventasData, gastosData, productosData, detalleData] =
      await Promise.all([
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=PRODUCTOS`),
        utils.fetchJson(
          `${SCRIPT_URL}?action=getData&sheetName=Ventas_Detalle`,
        ),
      ]);

    const ventas = ventasData.data || [];
    const gastos = gastosData.data || [];
    const productos = productosData.data || [];
    const detalle = detalleData.data || [];

    let chartConfig = null;
    let infoHtml = "";

    switch (tipoGrafico) {
      case "resumenFinanciero":
        // Agrupar por fecha
        const datosPorFecha = {};
        ventas.forEach((v) => {
          const fecha = new Date(v.fecha).toLocaleDateString();
          if (!datosPorFecha[fecha])
            datosPorFecha[fecha] = { ventas: 0, compras: 0, ganancia: 0 };
          datosPorFecha[fecha].ventas += v.total_final || 0;
        });
        const fechas = Object.keys(datosPorFecha)
          .sort((a, b) => new Date(a) - new Date(b))
          .slice(-30);

        chartConfig = {
          type: "bar",
          data: {
            labels: fechas,
            datasets: [
              {
                label: "Ventas",
                data: fechas.map((f) => datosPorFecha[f].ventas),
                backgroundColor: "rgba(0, 123, 255, 0.7)",
              },
              {
                label: "Ganancias",
                type: "line",
                data: fechas.map((f) => datosPorFecha[f].ventas * 0.3),
                borderColor: "rgba(40, 167, 69, 1)",
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: "Resumen de los últimos 30 días" },
            },
          },
        };

        const totalVentas = ventas.reduce(
          (s, v) => s + (v.total_final || 0),
          0,
        );
        const totalVentasCount = ventas.length;
        const avgVenta =
          totalVentasCount > 0 ? totalVentas / totalVentasCount : 0;
        infoHtml = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.85rem; color: #666;">Total Ventas</div>
            <div style="font-size: 1.3rem; font-weight: bold; color: #22c55e;">$${formatearCOP(totalVentas)}</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.85rem; color: #666;">Número de Ventas</div>
            <div style="font-size: 1.3rem; font-weight: bold; color: #3b82f6;">${totalVentasCount}</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.85rem; color: #666;">Promedio por Venta</div>
            <div style="font-size: 1.3rem; font-weight: bold; color: #8b5cf6;">$${formatearCOP(avgVenta)}</div>
          </div>
        </div>`;
        break;

      case "metodosPago":
        const metodos = {};
        ventas.forEach((v) => {
          const m = v.metodo_pago || "Otro";
          metodos[m] = (metodos[m] || 0) + (v.total_final || 0);
        });

        chartConfig = {
          type: "doughnut",
          data: {
            labels: Object.keys(metodos),
            datasets: [
              {
                data: Object.values(metodos),
                backgroundColor: [
                  "#22c55e",
                  "#3b82f6",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                ],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        };

        const totalMetodos = Object.values(metodos).reduce((a, b) => a + b, 0);
        infoHtml = `<div style="display: grid; grid-template-columns: repeat(${Object.keys(metodos).length}, 1fr); gap: 10px; text-align: center;">
          ${Object.entries(metodos)
            .map(
              ([m, v]) =>
                `<div style="background: white; padding: 10px; border-radius: 8px;"><div style="font-size: 0.8rem; color: #666;">${m}</div><div style="font-weight: bold;">$${formatearCOP(v)}</div><div style="font-size: 0.75rem; color: #888;">${((v / totalMetodos) * 100).toFixed(1)}%</div></div>`,
            )
            .join("")}
        </div>`;
        break;

      case "topProductos":
        const prodsVendidos = {};
        detalle.forEach((d) => {
          prodsVendidos[d.producto_id] =
            (prodsVendidos[d.producto_id] || 0) + parseInt(d.cantidad || 0);
        });
        const topProds = Object.entries(prodsVendidos)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([id, cant]) => {
            const prod = productos.find((p) => p.id === id);
            return { nombre: prod?.nombre || id, cantidad: cant };
          });

        chartConfig = {
          type: "bar",
          data: {
            labels: topProds.map((p) => p.nombre.substring(0, 20)),
            datasets: [
              {
                label: "Cantidad",
                data: topProds.map((p) => p.cantidad),
                backgroundColor: "rgba(59, 130, 246, 0.7)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: { title: { display: true, text: "Top 15 Productos" } },
            scales: { x: { beginAtZero: true } },
          },
        };

        const totalTopProds = topProds.reduce((s, p) => s + p.cantidad, 0);
        infoHtml = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; text-align: center;">
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Productos Únicos Vendidos</div><div style="font-size: 1.3rem; font-weight: bold; color: #3b82f6;">${Object.keys(prodsVendidos).length}</div></div>
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Cantidad Total (Top 15)</div><div style="font-size: 1.3rem; font-weight: bold; color: #22c55e;">${totalTopProds}</div></div>
        </div>`;
        break;

      case "gastosCategoria":
        const catsGastos = {};
        gastos.forEach((g) => {
          const c = g.categoria || "Otro";
          catsGastos[c] = (catsGastos[c] || 0) + (g.monto || 0);
        });

        chartConfig = {
          type: "pie",
          data: {
            labels: Object.keys(catsGastos),
            datasets: [
              {
                data: Object.values(catsGastos),
                backgroundColor: [
                  "#ef4444",
                  "#f97316",
                  "#eab308",
                  "#84cc16",
                  "#22c55e",
                  "#14b8a6",
                  "#0ea5e9",
                  "#6366f1",
                ],
              },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        };

        const totalGastos = Object.values(catsGastos).reduce(
          (a, b) => a + b,
          0,
        );
        const mayorGasto = Object.entries(catsGastos).sort(
          (a, b) => b[1] - a[1],
        )[0];
        infoHtml = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; text-align: center;">
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Total Gastos</div><div style="font-size: 1.3rem; font-weight: bold; color: #ef4444;">$${formatearCOP(totalGastos)}</div></div>
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Mayor Gasto</div><div style="font-size: 1rem; font-weight: bold; color: #f97316;">${mayorGasto[0]}</div><div style="font-size: 0.85rem;">$${formatearCOP(mayorGasto[1])}</div></div>
        </div>`;
        break;

      case "inventarioCategoria":
        const invCat = {};
        productos.forEach((p) => {
          const c = p.categoría || "Sin Categoría";
          invCat[c] =
            (invCat[c] || 0) + (p.stock || 0) * (p.precio_compra || 0);
        });

        chartConfig = {
          type: "bar",
          data: {
            labels: Object.keys(invCat),
            datasets: [
              {
                label: "Valor",
                data: Object.values(invCat),
                backgroundColor: "rgba(139, 92, 246, 0.7)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: "Valor de Inventario por Categoría",
              },
            },
          },
        };

        const totalInv = Object.values(invCat).reduce((a, b) => a + b, 0);
        infoHtml = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; text-align: center;">
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Valor Total Inventario</div><div style="font-size: 1.3rem; font-weight: bold; color: #8b5cf6;">$${formatearCOP(totalInv)}</div></div>
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Categorías</div><div style="font-size: 1.3rem; font-weight: bold; color: #3b82f6;">${Object.keys(invCat).length}</div></div>
        </div>`;
        break;

      case "clienteFrecuente":
        const getClienteKey = (v) => {
          if (v.cliente_documento)
            return "DOC:" + String(v.cliente_documento).trim();
          if (v.cliente_telefono)
            return "TEL:" + String(v.cliente_telefono).trim();
          return (
            "NOM:" + (v.cliente || "Consumidor Final").toLowerCase().trim()
          );
        };

        const clientesAgrup = {};
        ventas.forEach((v) => {
          const key = getClienteKey(v);
          if (!clientesAgrup[key])
            clientesAgrup[key] = {
              nombre: v.cliente || "Consumidor",
              total: 0,
              ventas: 0,
            };
          clientesAgrup[key].total += v.total_final || 0;
          clientesAgrup[key].ventas += 1;
        });

        const topClientes = Object.values(clientesAgrup)
          .sort((a, b) => b.total - a.total)
          .slice(0, 15);

        chartConfig = {
          type: "bar",
          data: {
            labels: topClientes.map((c) => c.nombre.substring(0, 20)),
            datasets: [
              {
                label: "Total Comprado",
                data: topClientes.map((c) => c.total),
                backgroundColor: "rgba(34, 197, 94, 0.7)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: { title: { display: true, text: "Top 15 Clientes" } },
            scales: { x: { beginAtZero: true } },
          },
        };

        const clientesUnicos = Object.keys(clientesAgrup).length;
        const totalCliente = ventas.reduce(
          (s, v) => s + (v.total_final || 0),
          0,
        );
        const promedioCliente =
          clientesUnicos > 0 ? totalCliente / clientesUnicos : 0;
        infoHtml = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Clientes Únicos</div><div style="font-size: 1.3rem; font-weight: bold; color: #3b82f6;">${clientesUnicos}</div></div>
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Total Comprado</div><div style="font-size: 1.3rem; font-weight: bold; color: #22c55e;">$${formatearCOP(totalCliente)}</div></div>
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Promedio por Cliente</div><div style="font-size: 1.3rem; font-weight: bold; color: #8b5cf6;">$${formatearCOP(promedioCliente)}</div></div>
        </div>`;
        break;

      case "tendencias":
        const tendencia = {};
        ventas.forEach((v) => {
          const f = new Date(v.fecha).toLocaleDateString();
          tendencia[f] = (tendencia[f] || 0) + (v.total_final || 0);
        });
        const fechasTrend = Object.keys(tendencia)
          .sort((a, b) => new Date(a) - new Date(b))
          .slice(-30);
        const ventasAcum = [];
        let acum = 0;
        fechasTrend.forEach((f) => {
          acum += tendencia[f];
          ventasAcum.push(acum);
        });

        chartConfig = {
          type: "line",
          data: {
            labels: fechasTrend,
            datasets: [
              {
                label: "Ventas Acumuladas",
                data: ventasAcum,
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: "Ventas Acumuladas (últimos 30 días)",
              },
            },
          },
        };

        const primeraFecha = fechasTrend[0] || "-";
        const ultimaFecha = fechasTrend[fechasTrend.length - 1] || "-";
        infoHtml = `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Primera Venta</div><div style="font-weight: bold;">${primeraFecha}</div></div>
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Última Venta</div><div style="font-weight: bold;">${ultimaFecha}</div></div>
          <div style="background: white; padding: 15px; border-radius: 8px;"><div style="font-size: 0.85rem; color: #666;">Días de Operación</div><div style="font-size: 1.3rem; font-weight: bold; color: #3b82f6;">${fechasTrend.length}</div></div>
        </div>`;
        break;

      default:
        infoHtml = "<p>Seleccione un gráfico para ver los detalles.</p>";
    }

    if (chartConfig) {
      graficoDetalleChart = new Chart(ctx, chartConfig);
    }
    infoDiv.innerHTML = infoHtml;
  } catch (error) {
    console.error("Error al cargar gráfico:", error);
    infoDiv.innerHTML = '<p style="color: red;">Error al cargar datos.</p>';
  }
}

// Función para renderizar tabla de datos
function renderTablaDatos(datos, columnas, titulos) {
  if (!datos || datos.length === 0) {
    return '<p style="text-align:center; color: #666;">No hay datos para mostrar.</p>';
  }

  let html = `
    <table class="data-table" style="width: 100%; font-size: 0.85rem;">
      <thead>
        <tr>
          ${titulos.map((t) => `<th>${t}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  datos.forEach((row) => {
    html += "<tr>";
    columnas.forEach((col) => {
      html += `<td>${row[col] || "-"}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  return html;
}

// 1. Detalle Ventas
async function abrirDetalleVentas() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detalleVentasModal").classList.remove("hidden");
  document.getElementById("detalleVentasContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=VENTAS`,
    );
    if (data.status === "success" && data.data) {
      const filteredData = filterByDate(
        data.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      const ventas = filteredData
        .map((v) => ({
          fecha: new Date(v.fecha).toLocaleDateString(),
          cliente: v.cliente || "Consumidor Final",
          metodo: v.metodo_pago || "-",
          total: `$${formatearCOP(v.total_final || 0)}`,
          estado:
            v.ingresado === "TRUE" || v.ingresado === true
              ? "Pagado"
              : "Pendiente",
        }))
        .reverse()
        .slice(0, 50);

      document.getElementById("detalleVentasContenido").innerHTML =
        renderTablaDatos(
          ventas,
          ["fecha", "cliente", "metodo", "total", "estado"],
          ["Fecha", "Cliente", "Método", "Total", "Estado"],
        );
    }
  } catch (e) {
    document.getElementById("detalleVentasContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 2. Detalle Ganancias
async function abrirDetalleGanancias() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detalleGananciasModal").classList.remove("hidden");
  document.getElementById("detalleGananciasContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const [ventasData, detalleData, productosData] = await Promise.all([
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=Ventas_Detalle`),
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=PRODUCTOS`),
    ]);

    if (ventasData.status === "success" && ventasData.data) {
      const filteredVentas = filterByDate(
        ventasData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      const productosMap = {};
      if (productosData.data) {
        productosData.data.forEach((p) => (productosMap[p.id] = p));
      }

      let html = `
        <table class="data-table" style="width: 100%; font-size: 0.85rem;">
          <thead>
            <tr><th>Fecha</th><th>Cliente</th><th>Total Venta</th><th>Costo</th><th>Ganancia</th></tr>
          </thead>
          <tbody>
      `;

      filteredVentas
        .filter((v) => {
          const ing = String(v.ingresado || "").toUpperCase();
          return v.ingresado === true || ing === "TRUE" || ing === "YES";
        })
        .slice(0, 50)
        .forEach((v) => {
          const itemsVenta =
            detalleData.data?.filter((d) => d.id_venta === v.id_venta) || [];
          let costoTotal = 0;
          itemsVenta.forEach((item) => {
            const prod = productosMap[item.producto_id];
            if (prod) {
              costoTotal +=
                (parseFloat(prod.precio_compra) || 0) * parseInt(item.cantidad);
            }
          });
          const ganancia =
            (v.total_final || 0) - costoTotal - (v.comision || 0);
          html += `<tr>
          <td>${new Date(v.fecha).toLocaleDateString()}</td>
          <td>${v.cliente || "Consumidor Final"}</td>
          <td>$${formatearCOP(v.total_final || 0)}</td>
          <td>$${formatearCOP(costoTotal)}</td>
          <td>$${formatearCOP(ganancia)}</td>
        </tr>`;
        });

      html += `</tbody></table>`;
      document.getElementById("detalleGananciasContenido").innerHTML = html;
    }
  } catch (e) {
    document.getElementById("detalleGananciasContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 3. Detalle Margen
async function abrirDetalleMargen() {
  document.getElementById("detalleMargenModal").classList.remove("hidden");

  const totalVentas = document.getElementById("totalVentas").textContent;
  const totalGanancias = document.getElementById("totalGanancias").textContent;
  const margen = document.getElementById("totalRendimiento").textContent;

  document.getElementById("detalleMargenContenido").innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="margin-bottom: 20px;">
        <h4 style="margin-bottom: 10px;">Margen de Ganancia Actual</h4>
        <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${margen}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left;">
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
          <strong>Ingresos Totales</strong>
          <div style="font-size: 1.2rem; color: #16a34a;">${totalVentas}</div>
        </div>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
          <strong>Ganancia Neta</strong>
          <div style="font-size: 1.2rem; color: #4f46e5;">${totalGanancias}</div>
        </div>
      </div>
      <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
        El margen de ganancia se calcula como: (Ganancia Neta / Ingresos Totales) × 100
      </p>
    </div>
  `;
}

// 4. Detalle Inventario
async function abrirDetalleInventario() {
  document.getElementById("detalleInventarioModal").classList.remove("hidden");
  document.getElementById("detalleInventarioContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const data = await utils.fetchJson(`${SCRIPT_URL}?action=getInventario`);
    if (data.status === "success" && data.data) {
      const productos = data.data
        .map((p) => ({
          nombre: p.nombre || "-",
          codigo: p.código || "-",
          stock: p.stock || 0,
          precio_compra: `$${formatearCOP(p.precio_compra || 0)}`,
          valor_total: `$${formatearCOP((p.stock || 0) * (p.precio_compra || 0))}`,
        }))
        .sort(
          (a, b) =>
            parseInt(b.stock) *
              parseFloat(a.precio_compra.replace(/[$,]/g, "")) -
            parseInt(a.stock) *
              parseFloat(b.precio_compra.replace(/[$,]/g, "")),
        );

      document.getElementById("detalleInventarioContenido").innerHTML =
        renderTablaDatos(
          productos,
          ["nombre", "codigo", "stock", "precio_compra", "valor_total"],
          ["Producto", "Código", "Stock", "Costo Unit.", "Valor Total"],
        );
    }
  } catch (e) {
    document.getElementById("detalleInventarioContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 5. Detalle Efectivo
async function abrirDetalleEfectivo() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detalleEfectivoModal").classList.remove("hidden");
  document.getElementById("detalleEfectivoContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const [ventasData, gastosData, comprasData, aprovechosData] =
      await Promise.all([
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=COMPRAS`),
        utils.fetchJson(
          `${SCRIPT_URL}?action=getData&sheetName=APROVECHAMIENTOS`,
        ),
      ]);

    let ventasEfectivo = 0;
    let gastosEfectivo = 0;
    let comprasEfectivo = 0;
    let aprovechosEfectivo = 0;

    let html = `<h4 style="margin-bottom: 15px;">Ingresos en Efectivo (Ventas)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Total</th></tr></thead>
        <tbody>`;

    if (ventasData.data) {
      const filteredVentas = filterByDate(
        ventasData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      // Calcular TODAS las ventas efectivas (sin límite)
      filteredVentas.forEach((v) => {
        const ing = String(v.ingresado || "").toUpperCase();
        const esIngresado =
          v.ingresado === true || ing === "TRUE" || ing === "YES";
        if (esIngresado && (v.metodo_pago || "").toLowerCase() === "efectivo") {
          ventasEfectivo += Number(v.total_final) || 0;
        }
      });

      // Mostrar solo las primeras 30
      filteredVentas
        .filter((v) => {
          const ing = String(v.ingresado || "").toUpperCase();
          const esIngresado =
            v.ingresado === true || ing === "TRUE" || ing === "YES";
          return (
            esIngresado && (v.metodo_pago || "").toLowerCase() === "efectivo"
          );
        })
        .slice(0, 30)
        .forEach((v) => {
          html += `<tr><td>${new Date(v.fecha).toLocaleDateString()}</td><td>${v.cliente || "Consumidor Final"}</td><td>$${formatearCOP(v.total_final || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Ventas</td><td>$${formatearCOP(ventasEfectivo)}</td></tr></tbody></table>`;

    html += `<h4 style="margin-bottom: 15px;">Otros Ingresos (Aprovechamientos)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr></thead>
        <tbody>`;

    if (aprovechosData.data) {
      const filteredAprovechos = filterByDate(
        aprovechosData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredAprovechos.forEach((a) => {
        if ((a.metodo_pago || "").toLowerCase() === "efectivo") {
          aprovechosEfectivo += Number(a.monto) || 0;
        }
      });

      filteredAprovechos
        .filter((a) => (a.metodo_pago || "").toLowerCase() === "efectivo")
        .slice(0, 30)
        .forEach((a) => {
          html += `<tr><td>${new Date(a.fecha).toLocaleDateString()}</td><td>${a.concepto || "-"}</td><td>$${formatearCOP(a.monto || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Aprovechos</td><td>$${formatearCOP(aprovechosEfectivo)}</td></tr></tbody></table>`;

    html += `<h4 style="margin-bottom: 15px;">Egresos en Efectivo (Gastos)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Categoría</th><th>Monto</th></tr></thead>
        <tbody>`;

    if (gastosData.data) {
      const filteredGastos = filterByDate(
        gastosData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredGastos.forEach((g) => {
        if ((g.metodo_pago || "").toLowerCase() === "efectivo") {
          gastosEfectivo += Number(g.monto) || 0;
        }
      });

      filteredGastos
        .filter((g) => (g.metodo_pago || "").toLowerCase() === "efectivo")
        .slice(0, 30)
        .forEach((g) => {
          html += `<tr><td>${new Date(g.fecha).toLocaleDateString()}</td><td>${g.categoria || "-"}</td><td>$${formatearCOP(g.monto || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Gastos</td><td>$${formatearCOP(gastosEfectivo)}</td></tr></tbody></table>`;

    html += `<h4 style="margin-bottom: 15px;">Egresos en Efectivo (Compras)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Proveedor</th><th>Total</th></tr></thead>
        <tbody>`;

    if (comprasData.data) {
      const filteredCompras = filterByDate(
        comprasData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredCompras.forEach((c) => {
        if ((c.metodo_pago || "").toLowerCase() === "efectivo") {
          comprasEfectivo += Number(c.total_final) || 0;
        }
      });

      filteredCompras
        .filter((c) => (c.metodo_pago || "").toLowerCase() === "efectivo")
        .slice(0, 30)
        .forEach((c) => {
          html += `<tr><td>${new Date(c.fecha).toLocaleDateString()}</td><td>${c.proveedor || "-"}</td><td>$${formatearCOP(c.total_final || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Compras</td><td>$${formatearCOP(comprasEfectivo)}</td></tr></tbody></table>`;

    const saldoEfectivo =
      ventasEfectivo + aprovechosEfectivo - gastosEfectivo - comprasEfectivo;
    html += `<div style="text-align:center; font-size: 1.1rem; font-weight:bold; padding: 15px; background: #dcfce7; border-radius: 8px;">Saldo Final: $${formatearCOP(saldoEfectivo)}</div>`;

    document.getElementById("detalleEfectivoContenido").innerHTML = html;
  } catch (e) {
    document.getElementById("detalleEfectivoContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 6. Detalle Nequi
async function abrirDetalleNequi() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detalleNequiModal").classList.remove("hidden");
  document.getElementById("detalleNequiContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const [ventasData, gastosData, comprasData, aprovechosData] =
      await Promise.all([
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=GASTOS`),
        utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=COMPRAS`),
        utils.fetchJson(
          `${SCRIPT_URL}?action=getData&sheetName=APROVECHAMIENTOS`,
        ),
      ]);

    let ventasNequi = 0;
    let gastosNequi = 0;
    let comprasNequi = 0;
    let aprovechosNequi = 0;

    let html = `<h4 style="margin-bottom: 15px;">Ingresos por Transferencia (Ventas)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Total</th></tr></thead>
        <tbody>`;

    if (ventasData.data) {
      const filteredVentas = filterByDate(
        ventasData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredVentas.forEach((v) => {
        const ing = String(v.ingresado || "").toUpperCase();
        const esIngresado =
          v.ingresado === true || ing === "TRUE" || ing === "YES";
        if (esIngresado && (v.metodo_pago || "").toLowerCase() !== "efectivo") {
          ventasNequi += Number(v.total_final) || 0;
        }
      });

      filteredVentas
        .filter((v) => {
          const ing = String(v.ingresado || "").toUpperCase();
          const esIngresado =
            v.ingresado === true || ing === "TRUE" || ing === "YES";
          return (
            esIngresado && (v.metodo_pago || "").toLowerCase() !== "efectivo"
          );
        })
        .slice(0, 50)
        .forEach((v) => {
          html += `<tr><td>${new Date(v.fecha).toLocaleDateString()}</td><td>${v.cliente || "Consumidor Final"}</td><td>$${formatearCOP(v.total_final || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Ventas</td><td>$${formatearCOP(ventasNequi)}</td></tr></tbody></table>`;

    html += `<h4 style="margin-bottom: 15px;">Otros Ingresos (Aprovechamientos)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr></thead>
        <tbody>`;

    if (aprovechosData.data) {
      const filteredAprovechos = filterByDate(
        aprovechosData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredAprovechos.forEach((a) => {
        if ((a.metodo_pago || "").toLowerCase() !== "efectivo") {
          aprovechosNequi += Number(a.monto) || 0;
        }
      });

      filteredAprovechos
        .filter((a) => (a.metodo_pago || "").toLowerCase() !== "efectivo")
        .slice(0, 50)
        .forEach((a) => {
          html += `<tr><td>${new Date(a.fecha).toLocaleDateString()}</td><td>${a.concepto || "-"}</td><td>$${formatearCOP(a.monto || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Aprovechos</td><td>$${formatearCOP(aprovechosNequi)}</td></tr></tbody></table>`;

    html += `<h4 style="margin-bottom: 15px;">Egresos por Transferencia (Gastos)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Categoría</th><th>Monto</th></tr></thead>
        <tbody>`;

    if (gastosData.data) {
      const filteredGastos = filterByDate(
        gastosData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredGastos.forEach((g) => {
        if ((g.metodo_pago || "").toLowerCase() !== "efectivo") {
          gastosNequi += Number(g.monto) || 0;
        }
      });

      filteredGastos
        .filter((g) => (g.metodo_pago || "").toLowerCase() !== "efectivo")
        .slice(0, 50)
        .forEach((g) => {
          html += `<tr><td>${new Date(g.fecha).toLocaleDateString()}</td><td>${g.categoria || "-"}</td><td>$${formatearCOP(g.monto || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Gastos</td><td>$${formatearCOP(gastosNequi)}</td></tr></tbody></table>`;

    html += `<h4 style="margin-bottom: 15px;">Egresos por Transferencia (Compras)</h4>
      <table class="data-table" style="width: 100%; font-size: 0.85rem; margin-bottom: 20px;">
        <thead><tr><th>Fecha</th><th>Proveedor</th><th>Total</th></tr></thead>
        <tbody>`;

    if (comprasData.data) {
      const filteredCompras = filterByDate(
        comprasData.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );

      filteredCompras.forEach((c) => {
        if ((c.metodo_pago || "").toLowerCase() !== "efectivo") {
          comprasNequi += Number(c.total_final) || 0;
        }
      });

      filteredCompras
        .filter((c) => (c.metodo_pago || "").toLowerCase() !== "efectivo")
        .slice(0, 50)
        .forEach((c) => {
          html += `<tr><td>${new Date(c.fecha).toLocaleDateString()}</td><td>${c.proveedor || "-"}</td><td>$${formatearCOP(c.total_final || 0)}</td></tr>`;
        });
    }
    html += `<tr style="font-weight:bold; background:#f3f4f6;"><td colspan="2">Total Compras</td><td>$${formatearCOP(comprasNequi)}</td></tr></tbody></table>`;

    const saldoNequi =
      ventasNequi + aprovechosNequi - gastosNequi - comprasNequi;
    html += `<div style="text-align:center; font-size: 1.1rem; font-weight:bold; padding: 15px; background: #dcfce7; border-radius: 8px;">Saldo Final: $${formatearCOP(saldoNequi)}</div>`;

    document.getElementById("detalleNequiContenido").innerHTML = html;
  } catch (e) {
    document.getElementById("detalleNequiContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 7. Detalle Gastos
async function abrirDetalleGastos() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detalleGastosModal").classList.remove("hidden");
  document.getElementById("detalleGastosContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=GASTOS`,
    );
    if (data.status === "success" && data.data) {
      const filteredData = filterByDate(
        data.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      const gastos = filteredData
        .map((g) => ({
          fecha: new Date(g.fecha).toLocaleDateString(),
          categoria: g.categoria || "-",
          concepto: g.concepto || "-",
          monto: `$${formatearCOP(g.monto || 0)}`,
          metodo: g.metodo_pago || "efectivo",
        }))
        .reverse()
        .slice(0, 50);

      document.getElementById("detalleGastosContenido").innerHTML =
        renderTablaDatos(
          gastos,
          ["fecha", "categoria", "concepto", "monto", "metodo"],
          ["Fecha", "Categoría", "Concepto", "Monto", "Método"],
        );
    }
  } catch (e) {
    document.getElementById("detalleGastosContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 8. Detalle Compras
async function abrirDetalleCompras() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detalleComprasModal").classList.remove("hidden");
  document.getElementById("detalleComprasContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=COMPRAS`,
    );
    if (data.status === "success" && data.data) {
      const filteredData = filterByDate(
        data.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      const compras = filteredData
        .map((c) => ({
          fecha: new Date(c.fecha).toLocaleDateString(),
          proveedor: c.proveedor || "Sin proveedor",
          total: `$${formatearCOP(c.total_final || 0)}`,
          metodo: c.metodo_pago || "-",
        }))
        .reverse()
        .slice(0, 50);

      document.getElementById("detalleComprasContenido").innerHTML =
        renderTablaDatos(
          compras,
          ["fecha", "proveedor", "total", "metodo"],
          ["Fecha", "Proveedor", "Total", "Método"],
        );
    }
  } catch (e) {
    document.getElementById("detalleComprasContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 9. Detalle Costo Venta
async function abrirDetalleCostoVenta() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detalleCostoVentaModal").classList.remove("hidden");
  document.getElementById("detalleCostoVentaContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const [ventasData, detalleData, productosData] = await Promise.all([
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=Ventas_Detalle`),
      utils.fetchJson(`${SCRIPT_URL}?action=getData&sheetName=PRODUCTOS`),
    ]);

    const filteredVentas = filterByDate(
      ventasData.data,
      fechaInicio,
      fechaFin,
      "fecha",
    );
    const ventasIngresadasIds = new Set();
    filteredVentas.forEach((v) => {
      const ing = String(v.ingresado || "").toUpperCase();
      if (v.ingresado === true || ing === "TRUE" || ing === "YES") {
        ventasIngresadasIds.add(String(v.id_venta));
      }
    });

    const productosMap = {};
    if (productosData.data) {
      productosData.data.forEach((p) => (productosMap[p.id] = p));
    }

    const costos = {};
    if (detalleData.data) {
      detalleData.data.forEach((item) => {
        if (ventasIngresadasIds.has(String(item.id_venta))) {
          if (!costos[item.producto_id]) {
            const prod = productosMap[item.producto_id];
            costos[item.producto_id] = {
              nombre: item.nombre_producto || "-",
              cantidad: 0,
              costo_unitario: prod ? prod.precio_compra || 0 : 0,
              costo_total: 0,
            };
          }
          costos[item.producto_id].cantidad += parseInt(item.cantidad) || 0;
        }
      });
    }

    Object.keys(costos).forEach((key) => {
      costos[key].costo_total =
        costos[key].cantidad * costos[key].costo_unitario;
    });

    const lista = Object.values(costos)
      .sort((a, b) => b.costo_total - a.costo_total)
      .slice(0, 50)
      .map((c) => ({
        nombre: c.nombre,
        cantidad: c.cantidad,
        costo_unitario: `$${formatearCOP(c.costo_unitario)}`,
        costo_total: `$${formatearCOP(c.costo_total)}`,
      }));

    document.getElementById("detalleCostoVentaContenido").innerHTML =
      renderTablaDatos(
        lista,
        ["nombre", "cantidad", "costo_unitario", "costo_total"],
        ["Producto", "Cant. Vendida", "Costo Unit.", "Costo Total"],
      );
  } catch (e) {
    document.getElementById("detalleCostoVentaContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// 10. Detalle Pendiente (Por Cobrar)
async function abrirDetallePendiente() {
  const fechaInicio = document.getElementById("dashFechaInicio").value;
  const fechaFin = document.getElementById("dashFechaFin").value;

  document.getElementById("detallePendienteModal").classList.remove("hidden");
  document.getElementById("detallePendienteContenido").innerHTML =
    "<p>Cargando...</p>";

  try {
    const data = await utils.fetchJson(
      `${SCRIPT_URL}?action=getData&sheetName=VENTAS`,
    );
    if (data.status === "success" && data.data) {
      const filteredData = filterByDate(
        data.data,
        fechaInicio,
        fechaFin,
        "fecha",
      );
      const pendientes = filteredData
        .filter((v) => v.ingresado !== "TRUE" && v.ingresado !== true)
        .map((v) => ({
          fecha: new Date(v.fecha).toLocaleDateString(),
          cliente: v.cliente || "Consumidor Final",
          documento: v.cliente_documento || "-",
          telefono: v.cliente_telefono || "-",
          total: `$${formatearCOP(v.total_final || 0)}`,
        }))
        .reverse()
        .slice(0, 50);

      document.getElementById("detallePendienteContenido").innerHTML =
        renderTablaDatos(
          pendientes,
          ["fecha", "cliente", "documento", "telefono", "total"],
          ["Fecha", "Cliente", "Documento", "Teléfono", "Total"],
        );
    }
  } catch (e) {
    document.getElementById("detallePendienteContenido").innerHTML =
      "<p>Error al cargar datos.</p>";
  }
}

// Función para hacer las tarjetas clicables
function inicializarTarjetasDashboard() {
  // Resumen Ejecutivo
  document
    .getElementById("totalVentas")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleVentas);
  document
    .getElementById("totalGanancias")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleGanancias);
  document
    .getElementById("totalRendimiento")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleMargen);
  document
    .getElementById("totalValorInventario")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleInventario);

  // Flujo de Caja
  document
    .getElementById("totalSaldoEfectivo")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleEfectivo);
  document
    .getElementById("totalSaldoNequi")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleNequi);
  document
    .getElementById("totalGastos")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleGastos);
  document
    .getElementById("totalCompras")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleCompras);

  // Costos
  document
    .getElementById("totalCostoVenta")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetalleCostoVenta);
  document
    .getElementById("totalPendiente")
    ?.closest(".stat-card")
    ?.addEventListener("click", abrirDetallePendiente);

  // Agregar cursor pointer
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.style.cursor = "pointer";
  });
}

// Agregar al initialization
document.addEventListener("DOMContentLoaded", () => {
  inicializarTarjetasDashboard();
  inicializarGraficosDashboard();
});

// Función para hacer los gráficos clicables
function inicializarGraficosDashboard() {
  const chartMappings = {
    resumenFinancieroChart: "resumenFinanciero",
    tendenciasChart: "tendencias",
    metodosPagoChart: "metodosPago",
    topProductosChart: "topProductos",
    gastosCategoriaChart: "gastosCategoria",
    inventarioCategoriaChart: "inventarioCategoria",
    clienteFrecuenteChart: "clienteFrecuente",
  };

  Object.entries(chartMappings).forEach(([elementId, tipoGrafico]) => {
    const element = document.getElementById(elementId);
    if (element) {
      const container = element.closest(".chart-container");
      if (container) {
        container.style.cursor = "pointer";
        container.addEventListener("click", () =>
          abrirGraficoDetalle(tipoGrafico),
        );
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS - Notificaciones emergentes
// ═══════════════════════════════════════════════════════════════════════════

function showToast(message, type = "info", duration = 4000) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon =
    {
      success: "fa-check-circle",
      error: "fa-times-circle",
      warning: "fa-exclamation-circle",
      info: "fa-info-circle",
    }[type] || "fa-info-circle";

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Auto remove
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add("hiding");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return toast;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES OFFLINE - Ventas sin conexión
// ═══════════════════════════════════════════════════════════════════════════

// Mostrar modal con ventas offline pendientes
function mostrarVentasOffline() {
  const ventas = utils.getVentasOffline();
  const pendientes = ventas.filter((v) => !v.synced);
  const sincronizadas = ventas.filter((v) => v.synced);

  let html = `
    <div class="modal-overlay" onclick="cerrarModalOffline(event)">
      <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
        <div class="modal-header">
          <h2><i class="fas fa-cloud-upload-alt"></i> Ventas Offline</h2>
          <button class="close-modal" onclick="cerrarModalOfflineDirect()">&times;</button>
        </div>
        <div class="modal-body">
  `;

  if (pendientes.length === 0 && sincronizadas.length === 0) {
    html += `<p style="text-align: center; padding: 20px;">No hay ventas guardadas offline.</p>`;
  } else {
    // Ventas pendientes
    if (pendientes.length > 0) {
      html += `
        <h3 style="color: var(--warning-color); margin-top: 0;">
          <i class="fas fa-clock"></i> Pendientes de sincronizar (${pendientes.length})
        </h3>
        <table class="data-table" style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
      `;

      pendientes.forEach((v) => {
        const fecha = new Date(v.timestamp).toLocaleString();
        const total = v.items.reduce(
          (sum, item) => sum + item.precio * item.cantidad,
          0,
        );

        // Determinar estado
        let estado =
          '<span style="color: var(--warning-color);">⏳ Pendiente</span>';
        if (v.lastError) {
          const retryInfo = v.retryCount ? ` (intento ${v.retryCount})` : "";
          estado = `<span style="color: var(--danger-color);" title="${v.lastError}">❌ Error${retryInfo}</span>`;
        }

        html += `
          <tr>
            <td>${v.offlineId}</td>
            <td>${fecha}</td>
            <td>${v.cliente || "Mostrador"}</td>
            <td>$${formatearCOP(total)}</td>
            <td>${estado}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;

      // Botón sincronizar
      html += `
        <div style="text-align: center; margin-bottom: 20px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn primary-btn" onclick="forceSyncVentas()">
            <i class="fas fa-sync"></i> Sincronizar ahora
          </button>
          <button class="btn secondary-btn" onclick="exportarBackupOffline()">
            <i class="fas fa-download"></i> Exportar Backup
          </button>
        </div>
      `;
    }

    // Ventas sincronizadas
    if (sincronizadas.length > 0) {
      html += `
        <h3 style="color: var(--success-color);">
          <i class="fas fa-check-circle"></i> Sincronizadas (${sincronizadas.length})
        </h3>
        <p style="font-size: 0.9em; color: #666;">Estas ventas ya fueron sincronizadas con el servidor.</p>
      `;
    }
  }

  html += `
        </div>
      </div>
    </div>
  `;

  // Crear modal
  let modal = document.getElementById("offlineModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "offlineModal";
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
}

function cerrarModalOffline(event) {
  if (event.target.classList.contains("modal-overlay")) {
    document.getElementById("offlineModal")?.remove();
  }
}

function cerrarModalOfflineDirect() {
  document.getElementById("offlineModal")?.remove();
}

// Forzar sincronización manual
async function forceSyncVentas() {
  if (!navigator.onLine) {
    showToast("Sin conexión a internet. No se puede sincronizar.", "error");
    return;
  }

  // Mostrar modal de sincronización
  const modal = document.getElementById("sincronizacionModal");
  const contenido = document.getElementById("sincronizacionContenido");
  const btnCerrar = document.getElementById("btnCerrarSync");
  const btnReintentar = document.getElementById("btnReintentarSync");

  // Actualizar título
  const titulo = modal.querySelector("h3");
  if (titulo)
    titulo.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizando...';

  contenido.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
      <p>Sincronizando ventas...</p>
      <p id="syncProgress" style="color: var(--text-light);">Por favor espere</p>
    </div>
  `;

  btnCerrar.disabled = true;
  btnReintentar.classList.add("hidden");
  modal.classList.remove("hidden");

  const result = await utils.syncVentasOffline();

  // Mostrar resultado
  if (result.success > 0) {
    contenido.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <i class="fas fa-check-circle" style="font-size: 48px; color: var(--success-color);"></i>
        <p style="font-size: 18px; margin-top: 15px;">¡Sincronización exitosa!</p>
        <p>${result.success} venta(s) sincronizada(s)</p>
      </div>
    `;
    if (titulo)
      titulo.innerHTML = '<i class="fas fa-check-circle"></i> Completado';
    showToast(`Se sincronizaron ${result.success} venta(s)`, "success");
  } else if (result.failed > 0) {
    contenido.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--warning-color);"></i>
        <p style="font-size: 18px; margin-top: 15px;">Algunas ventas no se sincronizaron</p>
        <p>${result.failed} venta(s) con error</p>
      </div>
    `;
    if (titulo)
      titulo.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> Con errores';
    btnReintentar.classList.remove("hidden");
    showToast(
      `${result.failed} venta(s) no se pudieron sincronizar`,
      "warning",
    );
  } else {
    contenido.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <i class="fas fa-info-circle" style="font-size: 48px; color: var(--info-color);"></i>
        <p style="font-size: 18px; margin-top: 15px;">No hay ventas pendientes</p>
      </div>
    `;
    if (titulo)
      titulo.innerHTML = '<i class="fas fa-info-circle"></i> Sin pendientes';
    showToast("No hay ventas pendientes de sincronizar", "info");
  }

  btnCerrar.disabled = false;
}

function cerrarSincronizacion() {
  document.getElementById("sincronizacionModal").classList.add("hidden");
  mostrarVentasOffline(); // Actualizar modal de ventas offline
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAR BACKUP - Descargar datos offline
// ═══════════════════════════════════════════════════════════════════════════

function exportarBackupOffline() {
  const ventas = utils.getVentasOffline();
  const compras = utils.getComprasOffline();

  if (ventas.length === 0 && compras.length === 0) {
    showToast("No hay datos para exportar", "info");
    return;
  }

  const backup = {
    exportDate: new Date().toISOString(),
    ventas: ventas,
    compras: compras,
    version: "1.0",
  };

  const dataStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-offline-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(
    `Backup exportado: ${ventas.length} ventas, ${compras.length} compras`,
    "success",
  );
}

// Importar backup (opcional)
function importarBackupOffline(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const backup = JSON.parse(e.target.result);

      // Importar ventas
      if (backup.ventas && Array.isArray(backup.ventas)) {
        const ventasActuales = utils.getVentasOffline();
        const nuevasVentas = [...ventasActuales, ...backup.ventas];
        localStorage.setItem(
          "ventasOffline",
          JSON.stringify(nuevasVentas.slice(-50)),
        );
      }

      // Importar compras
      if (backup.compras && Array.isArray(backup.compras)) {
        const comprasActuales = utils.getComprasOffline();
        const nuevasCompras = [...comprasActuales, ...backup.compras];
        localStorage.setItem(
          "comprasOffline",
          JSON.stringify(nuevasCompras.slice(-50)),
        );
      }

      utils.updateOfflineIndicator();
      showToast("Backup importado correctamente", "success");

      // Actualizar modal si está abierto
      if (typeof mostrarVentasOffline === "function") {
        mostrarVentasOffline();
      }
    } catch (err) {
      showToast("Error al importar backup: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

// Inicializar soporte offline cuando cargue el script
document.addEventListener("DOMContentLoaded", function () {
  if (
    typeof utils !== "undefined" &&
    typeof utils.initOfflineSupport === "function"
  ) {
    utils.initOfflineSupport();
  }
});

// ============ GENERADOR DE ETIQUETAS ============

async function prepararGeneradorEtiquetas() {
  const etiquetaInput = document.getElementById("etiquetaBuscar");
  const statusDiv = document.getElementById("statusEtiquetas");

  if (!inventarioCargado) {
    if (etiquetaInput) etiquetaInput.disabled = true;
    displayStatus("statusEtiquetas", "info", "Cargando inventario...");
    await loadInventario();
    displayStatus("statusEtiquetas", "success", "Inventario listo.");
    if (etiquetaInput) etiquetaInput.disabled = false;
  }

  // Limpiar estado
  etiquetaItems.length = 0;
  renderEtiquetaLista();
  renderEtiquetasPreview();

  // Configurar listeners de sugerencias si no existen
  configurarSugerenciasEtiquetas();

  // Foco en buscar
  setTimeout(() => {
    const input = document.getElementById("etiquetaBuscar");
    if (input) {
      input.focus();
    }
  }, 150);
}

function configurarSugerenciasEtiquetas() {
  const etiquetaInput = document.getElementById("etiquetaBuscar");
  if (!etiquetaInput || etiquetaInput.dataset.configurado === "true") return;

  etiquetaInput.dataset.configurado = "true";

  // Evento input para mostrar sugerencias
  etiquetaInput.addEventListener("input", (e) => {
    etiquetaMostrarSugerencias(e.target.value.trim());
  });

  // Evento keydown para navegación
  etiquetaInput.addEventListener("keydown", (e) => {
    const suggestions = document.querySelectorAll(
      "#etiquetaSugerencias .pos-suggestion-item",
    );
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      etiquetaSugerenciaIndex =
        (etiquetaSugerenciaIndex + 1) % suggestions.length;
      actualizarSeleccionSugerencia(suggestions, etiquetaSugerenciaIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      etiquetaSugerenciaIndex =
        (etiquetaSugerenciaIndex - 1 + suggestions.length) % suggestions.length;
      actualizarSeleccionSugerencia(suggestions, etiquetaSugerenciaIndex);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (etiquetaSugerenciaIndex > -1) {
        suggestions[etiquetaSugerenciaIndex].click();
      }
    } else if (e.key === "Escape") {
      etiquetaCerrarSugerencias();
    }
  });

  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (
      !etiquetaInput.contains(e.target) &&
      !document.getElementById("etiquetaSugerencias")?.contains(e.target)
    ) {
      etiquetaCerrarSugerencias();
    }
  });
}

function etiquetaMostrarSugerencias(query) {
  const container = document.getElementById("etiquetaSugerencias");
  if (!container) return;

  if (query.length < 2) {
    etiquetaCerrarSugerencias();
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matches = inventarioCache
    .filter(
      (p) =>
        String(p.nombre || "")
          .toLowerCase()
          .includes(lowerQuery) ||
        String(p.código || "")
          .toLowerCase()
          .includes(lowerQuery),
    )
    .slice(0, 10);

  if (matches.length === 0) {
    etiquetaCerrarSugerencias();
    return;
  }

  etiquetaSugerenciaIndex = -1;
  container.innerHTML = matches
    .map(
      (p, i) => `
    <div class="pos-suggestion-item" onclick="etiquetaSeleccionar('${p.id}')" data-index="${i}">
      <div class="name">${p.nombre}</div>
      <div class="meta">
        <span>Código: ${p.código}</span>
        <span>Stock: ${p.stock}</span>
      </div>
    </div>
  `,
    )
    .join("");

  container.classList.remove("hidden");
}

function actualizarSeleccionSugerencia(suggestions, index) {
  suggestions.forEach((s, i) => {
    if (i === index) {
      s.classList.add("selected");
      s.scrollIntoView({ block: "nearest" });
    } else {
      s.classList.remove("selected");
    }
  });
}

function etiquetaSeleccionar(id) {
  const producto = inventarioCache.find((p) => String(p.id) === String(id));
  if (!producto) return;

  document.getElementById("etiquetaProducto").value = producto.nombre;
  document.getElementById("etiquetaProductoId").value = producto.id;
  document.getElementById("etiquetaCodigo").value = producto.código || "";
  document.getElementById("etiquetaPrecio").value = producto.precio_venta || 0;
  document.getElementById("etiquetaCantidad").value = 1;

  const etiquetaInput = document.getElementById("etiquetaBuscar");
  if (etiquetaInput) etiquetaInput.value = "";

  etiquetaCerrarSugerencias();

  // Foco en cantidad para edición rápida
  document.getElementById("etiquetaCantidad").focus();
}

function etiquetaCerrarSugerencias() {
  const container = document.getElementById("etiquetaSugerencias");
  if (container) {
    container.classList.add("hidden");
    container.innerHTML = "";
  }
  etiquetaSugerenciaIndex = -1;
}

function etiquetaAgregar() {
  const productoId = document.getElementById("etiquetaProductoId").value;
  const cantidadInput = document.getElementById("etiquetaCantidad");
  const cantidad = parseInt(cantidadInput?.value) || 1;

  if (!productoId) {
    alert("Seleccione un producto primero");
    document.getElementById("etiquetaBuscar").focus();
    return;
  }

  if (cantidad < 1) {
    alert("La cantidad debe ser al menos 1");
    cantidadInput?.focus();
    return;
  }

  const totalUsadas = etiquetaItems.reduce((sum, p) => sum + p.cantidad, 0);
  if (totalUsadas + cantidad > MAX_ETIQUETAS) {
    alert(`Solo quedan ${MAX_ETIQUETAS - totalUsadas} espacios disponibles`);
    return;
  }

  const producto = inventarioCache.find((p) => p.id === productoId);
  if (!producto) {
    alert("Producto no encontrado");
    return;
  }

  etiquetaItems.push({
    id: producto.id,
    nombre: producto.nombre,
    código: producto.código || "",
    precio: producto.precio_venta || 0,
    cantidad: cantidad,
  });

  // Limpiar formulario
  document.getElementById("etiquetaProducto").value = "";
  document.getElementById("etiquetaProductoId").value = "";
  document.getElementById("etiquetaCodigo").value = "";
  document.getElementById("etiquetaPrecio").value = "";
  if (cantidadInput) cantidadInput.value = 1;

  document.getElementById("etiquetaBuscar").focus();

  renderEtiquetaLista();
  renderEtiquetasPreview();
}

function renderEtiquetaLista() {
  const tbody = document.getElementById("etiquetaLista");
  if (!tbody) return;

  if (etiquetaItems.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5">No hay productos agregados.</td></tr>';
    return;
  }

  tbody.innerHTML = etiquetaItems
    .map(
      (item, index) => `
    <tr>
      <td>${item.nombre}</td>
      <td><code>${item.código}</code></td>
      <td>${formatearCOP(item.precio)}</td>
      <td>${item.cantidad}</td>
      <td>
        <button class="btn-icon" onclick="etiquetaEliminar(${index})" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function etiquetaEliminar(index) {
  if (index >= 0 && index < etiquetaItems.length) {
    etiquetaItems.splice(index, 1);
    renderEtiquetaLista();
    renderEtiquetasPreview();
  }
}

function renderEtiquetasPreview() {
  const grid = document.getElementById("etiquetasGrid");
  const stats = document.getElementById("etiquetaStats");

  if (!grid || !stats) return;

  const totalUsadas = etiquetaItems.reduce((sum, p) => sum + p.cantidad, 0);
  stats.textContent = `${totalUsadas} / ${MAX_ETIQUETAS} etiquetas`;

  // Crear array de etiquetas
  const labels = [];
  etiquetaItems.forEach((item) => {
    for (let i = 0; i < item.cantidad; i++) {
      labels.push(item);
    }
  });

  // Completar hasta 50 espacios
  while (labels.length < MAX_ETIQUETAS) {
    labels.push(null);
  }

  // Generar HTML de la grilla usando tabla
  let html =
    '<table class="etiquetas-grid" style="table-layout: fixed; width: 100%;">';
  for (let row = 0; row < 10; row++) {
    html += "<tr>";
    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col;
      const item = labels[index];

      if (!item) {
        html += '<td class="etiqueta-item empty"></td>';
      } else {
        const barcodeId = `barcode-${index}`;
        html += `
          <td class="etiqueta-item">
            <div class="etiqueta-nombre">${escapeHtml(item.nombre)}</div>
            <div class="etiqueta-precio">${formatearCOP(item.precio)}</div>
            <svg class="etiqueta-barcode" id="${barcodeId}" data-code="${item.código}"></svg>
            <div class="etiqueta-codigo">${item.código}</div>
          </td>
        `;
      }
    }
    html += "</tr>";
  }
  html += "</table>";

  grid.innerHTML = html;

  // Generar códigos de barras
  labels.forEach((item, i) => {
    if (item) {
      const barcodeSvg = document.getElementById(`barcode-${i}`);
      if (barcodeSvg && typeof JsBarcode !== "undefined") {
        try {
          JsBarcode(barcodeSvg, item.código, {
            format: "EAN13",
            width: 1,
            height: 20,
            displayValue: false,
            margin: 0,
          });
        } catch (e) {
          console.error("Error generando código de barras:", e);
        }
      }
    }
  });
}

function imprimirEtiquetas() {
  const totalUsadas = etiquetaItems.reduce((sum, p) => sum + p.cantidad, 0);
  if (totalUsadas === 0) {
    alert("Agregue al menos un producto antes de imprimir");
    return;
  }
  window.print();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ================================================================
   THE HERMIT COCKTAIL BAR - FUNCIONES
   ================================================================ */

// Actualizar selector de cuentas
function actualizarSelectorCuentas() {
  const select = document.getElementById("selectorCuenta");
  if (!select) return;

  const cuentas =
    typeof CuentasManager !== "undefined"
      ? CuentasManager.getCuentasAbiertas()
      : [];

  let html = '<option value="">Seleccionar...</option>';
  cuentas.forEach((c) => {
    html += `<option value="${c.id_cuenta}" ${CuentasManager.cuentaActiva === c.id_cuenta ? "selected" : ""}>
      ${c.nombre_mesa || "Mesa"} - $${(c.total || 0).toFixed(2)}
    </option>`;
  });
  select.innerHTML = html;

  actualizarPanelCuenta();
}

// Actualizar panel de cuenta
function actualizarPanelCuenta() {
  const cuenta =
    typeof CuentasManager !== "undefined"
      ? CuentasManager.getCuentaActiva()
      : null;
  const itemsContainer = document.getElementById("cuentaItems");
  const subtotalEl = document.getElementById("cuentaSubtotal");
  const totalEl = document.getElementById("cuentaActivaTotal");

  if (!itemsContainer) return;

  if (!cuenta || !cuenta.items || cuenta.items.length === 0) {
    itemsContainer.innerHTML = '<div class="cuenta-vacio">Sin items</div>';
    if (subtotalEl) subtotalEl.textContent = "$0.00";
    if (totalEl) totalEl.textContent = "$0.00";
    return;
  }

  let html = "";
  cuenta.items.forEach((item) => {
    html += `
      <div class="cuenta-item">
        <div class="cuenta-item__info">
          <div class="cuenta-item__nombre">${item.nombre}</div>
          <div class="cuenta-item__precio">$${(item.precio_unitario || 0).toFixed(2)} c/u</div>
        </div>
        <div class="cuenta-item__cantidad">
          <button onclick="actualizarCantidadItem('${cuenta.id_cuenta}', '${item.id}', -1)">-</button>
          <span>${item.cantidad}</span>
          <button onclick="actualizarCantidadItem('${cuenta.id_cuenta}', '${item.id}', 1)">+</button>
        </div>
        <div class="cuenta-item__subtotal">$${(item.subtotal || 0).toFixed(2)}</div>
        <div class="cuenta-item__actions">
          <button onclick="removerItemCuenta('${cuenta.id_cuenta}', '${item.id}')">&times;</button>
        </div>
      </div>
    `;
  });

  itemsContainer.innerHTML = html;
  if (subtotalEl)
    subtotalEl.textContent = "$" + (cuenta.subtotal || 0).toFixed(2);
  if (totalEl) totalEl.textContent = "$" + (cuenta.total || 0).toFixed(2);
}

function actualizarCantidadItem(idCuenta, itemId, delta) {
  const cuenta = CuentasManager.cuentasAbiertas.find(
    (c) => c.id_cuenta === idCuenta,
  );
  if (!cuenta) return;

  const item = cuenta.items.find((i) => i.id === itemId);
  if (!item) return;

  const nuevaCantidad = item.cantidad + delta;
  if (nuevaCantidad <= 0) {
    removerItemCuenta(idCuenta, itemId);
  } else {
    CuentasManager.actualizarCantidad(idCuenta, itemId, nuevaCantidad);
  }
}

function removerItemCuenta(idCuenta, itemId) {
  CuentasManager.removerItem(idCuenta, itemId);
  actualizarPanelCuenta();
  actualizarSelectorCuentas();
}

// Abrir cuenta desde floor plan
function abrirCuentaMesa(mesaId) {
  const mesa = FloorPlanManager.mesas.find((m) => m.id_mesa === mesaId);
  if (!mesa) return;

  CuentasManager.abrirCuenta({
    id_mesa: mesaId,
    nombre_mesa: mesa.nombre,
    usuario: currentUserRole || "Admin",
  }).then((cuenta) => {
    FloorPlanManager.actualizarMesaEstado(mesaId, "ocupada");
    irASeccion("menu");
    actualizarSelectorCuentas();
  });
}

// Funciones de modal receta
function cerrarModalReceta() {
  document.getElementById("recetaModal").classList.add("hidden");
}

function agregarIngredienteEditor() {
  const container = document.getElementById("ingredientesEditor");
  const index = container.querySelectorAll(".ingrediente-row").length;

  const row = document.createElement("div");
  row.className = "ingrediente-row";
  row.style.cssText = "display: flex; gap: 0.5rem; margin-bottom: 0.5rem;";
  row.innerHTML = `
    <input type="text" class="ingrediente-nombre" placeholder="Nombre del ingrediente" data-index="${index}" style="flex: 2;">
    <input type="number" class="ingrediente-cantidad" placeholder="oz" step="0.5" style="flex: 1;">
    <button type="button" onclick="this.parentElement.remove()" style="background: #FF6B6B; border: none; color: white; width: 30px;">&times;</button>
  `;
  container.appendChild(row);
}

// Funciones de cocktail personalizado
function abrirCocktailPersonalizado() {
  const productos = RecetasManager.productos || [];
  const container = document.getElementById("personalizadoIngredientes");

  container.innerHTML = `
    <div class="pers-ing-row" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
      <select class="pers-producto" style="flex: 2;">
        <option value="">Seleccionar...</option>
        ${productos.map((p) => `<option value="${p.id}">${p.nombre}</option>`).join("")}
      </select>
      <input type="number" class="pers-cantidad" placeholder="oz" step="0.5" style="flex: 1;">
      <button onclick="this.parentElement.remove()" style="background: #FF6B6B; border: none; color: white; width: 30px;">&times;</button>
    </div>
  `;

  document.getElementById("personalizadoModal").classList.remove("hidden");
}

function cerrarModalPersonalizado() {
  document.getElementById("personalizadoModal").classList.add("hidden");
}

function agregarIngredientePersonalizado() {
  const productos = RecetasManager.productos || [];
  const container = document.getElementById("personalizadoIngredientes");
  const row = document.createElement("div");
  row.className = "pers-ing-row";
  row.style.cssText = "display: flex; gap: 0.5rem; margin-bottom: 0.5rem;";
  row.innerHTML = `
    <select class="pers-producto" style="flex: 2;">
      <option value="">Seleccionar...</option>
      ${productos.map((p) => `<option value="${p.id}">${p.nombre}</option>`).join("")}
    </select>
    <input type="number" class="pers-cantidad" placeholder="oz" step="0.5" style="flex: 1;">
    <button onclick="this.parentElement.remove()" style="background: #FF6B6B; border: none; color: white; width: 30px;">&times;</button>
  `;
  container.appendChild(row);
}

function agregarPersonalizadoACuenta() {
  const nombre =
    document.getElementById("personalizadoNombre").value || "Personalizado";
  const precio =
    parseFloat(document.getElementById("personalizadoPrecio").value) || 0;
  const notas = document.getElementById("personalizadoNotas").value;

  const rows = document.querySelectorAll(".pers-ing-row");
  const ingredientes = [];
  let costoTotal = 0;

  rows.forEach((row) => {
    const prodId = row.querySelector(".pers-producto").value;
    const cantidad = parseFloat(row.querySelector(".pers-cantidad").value) || 0;

    if (prodId && cantidad > 0) {
      const producto = RecetasManager.buscarProducto(prodId);
      if (producto) {
        costoTotal += cantidad * (parseFloat(producto.precio_onza) || 0);
        ingredientes.push({
          producto_id: prodId,
          cantidad_oz: cantidad,
          nombre: producto.nombre,
        });
      }
    }
  });

  // Primero verificar si viene de la sección cuentas
  const cuentaDestinoId = window._cuentaDestino;
  
  if (cuentaDestinoId) {
    // Agregar a la cuenta específica de la sección cuentas
    let cuentas = CuentasManager.cuentasAbiertas || [];
    let cuenta = cuentas.find(c => c.id_cuenta === cuentaDestinoId);
    
    if (!cuenta) {
      if (typeof showToast === "function") {
        showToast("Cuenta no encontrada", "error");
      }
      return;
    }
    
    CuentasManager.agregarItem(cuenta.id_cuenta, {
      tipo: "personalizado",
      nombre: nombre,
      cantidad: 1,
      precio_unitario: precio,
      costo: costoTotal,
      notas: notas,
      ingredientes: ingredientes,
    });
    
    window._cuentaDestino = null;
    renderCuentasMesas();
  } else {
    // Agregar a la cuenta activa normal
    const cuenta = CuentasManager.getCuentaActiva();
    if (!cuenta) {
      alert(
        "Abre una cuenta primero desde el Floor Plan o selecciona una cuenta activa",
      );
      return;
    }

    if (ingredientes.length === 0) {
      alert("Agrega al menos un ingrediente");
      return;
    }

    CuentasManager.agregarItem(cuenta.id_cuenta, {
      tipo: "personalizado",
      nombre: nombre,
      cantidad: 1,
      precio_unitario: precio,
      costo: costoTotal,
      notas: notas,
      ingredientes: ingredientes,
    });
    actualizarPanelCuenta();
  }

  cerrarModalPersonalizado();
  
  if (typeof showToast === "function") {
    showToast("Personalizado agregado", "success");
  }
}

// Funciones de mesa
function abrirEditorMesas() {
  document.getElementById("mesaModal").classList.remove("hidden");
}

function cerrarModalMesa() {
  document.getElementById("mesaModal").classList.add("hidden");
}

async function guardarNuevaMesa() {
  const nombre = document.getElementById("mesaNombre").value;
  const capacidad =
    parseInt(document.getElementById("mesaCapacidad").value) || 4;
  const forma = document.getElementById("mesaForma").value;

  if (!nombre) {
    alert("Ingresa el nombre de la mesa");
    return;
  }

  const result = await FloorPlanManager.agregarMesa({
    nombre: nombre,
    capacidad: capacidad,
    forma: forma,
    posicion_x: 50 + Math.random() * 200,
    posicion_y: 50 + Math.random() * 200,
  });

  if (result.status === "success") {
    cerrarModalMesa();
    FloorPlanManager.render();
  } else {
    alert("Error: " + result.message);
  }
}

function abrirEditorZonas() {
  alert("Función de Zonas en desarrollo");
}

// Funciones de cuenta
function aplicarDescuentoCuenta(monto) {
  const cuenta = CuentasManager.getCuentaActiva();
  if (!cuenta) return;

  CuentasManager.aplicarDescuento(cuenta.id_cuenta, parseFloat(monto) || 0);
  actualizarPanelCuenta();
}

function cancelarCuenta() {
  const cuenta = CuentasManager.getCuentaActiva();
  if (!cuenta) return;

  if (confirm("¿Cancelar esta cuenta? Los items serán eliminados.")) {
    const idMesa = cuenta.id_mesa;
    CuentasManager.cancelarCuenta(cuenta.id_cuenta).then(() => {
      if (idMesa) {
        FloorPlanManager.actualizarMesaEstado(idMesa, "disponible");
      }
      renderCuentasAbiertas();
      actualizarSelectorCuentas();
      actualizarPanelCuenta();
    });
  }
}

function abrirPagoCuenta() {
  const cuenta = CuentasManager.getCuentaActiva();
  if (!cuenta) return;

  document.getElementById("montoPagoTotal").textContent =
    "$" + (cuenta.total || 0).toFixed(2);
  document.getElementById("montoRecibido").value = "";
  document.getElementById("pagoModal").classList.remove("hidden");
}

function cerrarModalPago() {
  document.getElementById("pagoModal").classList.add("hidden");
}

async function procesarPago() {
  const cuenta = CuentasManager.getCuentaActiva();
  if (!cuenta) return;

  const montoRecibido =
    parseFloat(document.getElementById("montoRecibido").value) || 0;

  if (montoRecibido < cuenta.total) {
    alert("Monto insuficiente");
    return;
  }

  const cambio = montoRecibido - cuenta.total;

  await CuentasManager.cerrarCuenta(cuenta.id_cuenta, {
    metodo_pago: document.getElementById("metodoPago").value,
    monto_recibido: montoRecibido,
    cambio: cambio,
  });

  if (cuenta.id_mesa) {
    await FloorPlanManager.actualizarMesaEstado(cuenta.id_mesa, "disponible");
  }

  cerrarModalPago();
  alert("¡Cuenta pagada! Cambio: $" + cambio.toFixed(2));
  renderCuentasAbiertas();
  actualizarSelectorCuentas();
  actualizarPanelCuenta();
}

// Renderizar cuentas abiertas
function renderCuentasAbiertas() {
  const container = document.getElementById("listaCuentasAbiertas");
  if (!container) return;

  const cuentas =
    typeof CuentasManager !== "undefined"
      ? CuentasManager.getCuentasAbiertas()
      : [];

  if (cuentas.length === 0) {
    container.innerHTML =
      '<div class="cuenta-vacio">No hay cuentas abiertas</div>';
    return;
  }

  let html = "";
  cuentas.forEach((cuenta) => {
    const tiempo = new Date(cuenta.inicio).toLocaleTimeString();
    html += `
      <div class="cuenta-abierta-item" onclick="seleccionarCuenta('${cuenta.id_cuenta}')">
        <div class="mesa-nombre">${cuenta.nombre_mesa || "Mesa"}</div>
        <div class="cuenta-info">
          <span>${cuenta.items.length} items</span>
          <span>${tiempo}</span>
          <span style="color: var(--hermit-accent); font-weight: bold;">$${(cuenta.total || 0).toFixed(2)}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;

  // Actualizar resumen
  const resumen =
    typeof CuentasManager !== "undefined"
      ? CuentasManager.obtenerResumenDia()
      : { totalVentas: 0, totalCuentas: 0, ticketPromedio: 0 };
  document.getElementById("cuentasPagadas").textContent = resumen.totalCuentas;
  document.getElementById("ventasDia").textContent =
    "$" + resumen.totalVentas.toFixed(2);
  document.getElementById("ticketPromedio").textContent =
    "$" + resumen.ticketPromedio.toFixed(2);
}

function seleccionarCuenta(idCuenta) {
  CuentasManager.setCuentaActiva(idCuenta);
  showSection("menu");
  actualizarSelectorCuentas();
}

// Abrir modal nueva cuenta
function abrirModalNuevaCuenta() {
  const modal = document.getElementById("modalNuevaCuenta");
  if (modal) {
    modal.style.display = "flex";
    modal.classList.remove("hidden");
    document.getElementById("nuevaCuentaNombre").value = "";
    document.getElementById("nuevaCuentaDescripcion").value = "";
    document.getElementById("nuevaCuentaNombre").focus();
  }
}

function cerrarModalNuevaCuenta() {
  const modal = document.getElementById("modalNuevaCuenta");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add("hidden");
  }
}

function crearNuevaCuenta() {
  const nombre = document.getElementById("nuevaCuentaNombre").value.trim();
  const descripcion = document.getElementById("nuevaCuentaDescripcion").value.trim();

  if (!nombre) {
    if (typeof showToast === "function") {
      showToast("Ingresa un nombre para la cuenta", "error");
    } else {
      alert("Ingresa un nombre para la cuenta");
    }
    return;
  }

  if (typeof CuentasManager !== "undefined") {
    const nuevaCuenta = CuentasManager.abrirCuenta({
      nombre_mesa: nombre,
      descripcion: descripcion
    });

    if (nuevaCuenta) {
      cerrarModalNuevaCuenta();
      renderCuentasMesas();
      if (typeof showToast === "function") {
        showToast("Cuenta abierta: " + nombre, "success");
      }
    } else {
      if (typeof showToast === "function") {
        showToast("Error al crear la cuenta", "error");
      }
    }
  }
}

// Renderizar cuentas de mesas en sección cuentas
function renderCuentasMesas() {
  const container = document.getElementById("mesasCuentasGrid");
  if (!container) {
    console.error("Contenedor #mesasCuentasGrid no encontrado");
    return;
  }

  const cuentas = typeof CuentasManager !== "undefined" ? CuentasManager.getCuentasAbiertas() : [];
  const recetas = typeof RecetasManager !== "undefined" ? RecetasManager.recetas || [] : [];

  console.log("[DEBUG] renderCuentasMesas - Cuentas:", cuentas.length);

  if (cuentas.length === 0) {
    container.innerHTML = `
      <div class="mesa-vacio">
        <i class="fas fa-receipt" style="font-size: 3rem; color: var(--hermit-text-secondary); margin-bottom: 1rem;"></i>
        <p>No hay cuentas abiertas</p>
        <button class="btn primary-btn" onclick="abrirModalNuevaCuenta()" style="margin-top: 1rem;">
          <i class="fas fa-plus"></i> Abrir Cuenta
        </button>
      </div>
    `;
    actualizarResumenCuentas();
    return;
  }

  let html = "";

  cuentas.forEach(cuenta => {
    const tieneItems = cuenta.items && cuenta.items.length > 0;
    const total = cuenta.total || 0;
    const cuentaId = cuenta.id_cuenta;

    html += `
      <div class="mesa-cuenta-card" data-cuenta-id="${cuentaId}">
        <div class="mesa-cuenta-header" onclick="toggleCuenta('${cuentaId}')">
          <div class="mesa-info">
            <div class="mesa-icon">${(cuenta.nombre_mesa || "Cuenta").charAt(0)}</div>
            <div>
              <div class="mesa-nombre">${cuenta.nombre_mesa || "Cuenta"}</div>
              <div class="mesa-estado ${tieneItems ? 'ocupada' : 'disponible'}">
                ${tieneItems ? `${cuenta.items.length} items` : 'Vacía'}
              </div>
            </div>
          </div>
          <div class="mesa-total">$${total.toFixed(2)}</div>
        </div>
        <div class="mesa-cuenta-content" id="cuenta-content-${cuentaId}">
          ${tieneItems ? `
            <div class="mesa-cuenta-items" id="cuenta-items-${cuentaId}">
              ${cuenta.items.map((item) => `
                <div class="mesa-item-row">
                  <div class="mesa-item-info">
                    <span class="mesa-item-nombre">${item.nombre}</span>
                    <span class="mesa-item-cantidad">${item.cantidad} x $${(item.precio_unitario || 0).toFixed(2)}</span>
                    ${item.notas ? `<span class="mesa-item-notas">📝 ${item.notas}</span>` : ''}
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="mesa-item-precio">$${(item.subtotal || 0).toFixed(2)}</span>
                    <button class="mesa-item-eliminar" onclick="eliminarItemCuenta('${cuentaId}', '${item.id}')">&times;</button>
                  </div>
                </div>
              `).join('')}
            </div>
` : '<div class="mesa-vacio">Sin productos</div>'}
           
           <div class="mesa-agregar-productos">
             <button class="btn btn-secondary" onclick="toggleProductosLista('${cuentaId}')" id="btn-productos-${cuentaId}">
               <i class="fas fa-plus"></i> Agregar Producto
             </button>
             <div class="mesa-productos-grid hidden" id="productos-lista-${cuentaId}">
               ${recetas.length > 0 ? recetas.map(r => `
                 <button class="btn btn-secondary mesa-producto-btn" onclick="agregarItemACuenta('${cuentaId}', '${r.id_receta}', '${r.nombre}', ${r.precio_venta})">
                   <span class="nombre">${r.nombre}</span>
                   <span class="precio">$${(r.precio_venta || 0).toFixed(2)}</span>
                 </button>
               `).join('') : '<div style="grid-column: 1 / -1; text-align: center; color: var(--hermit-text-secondary); font-size: 0.85rem; padding: 1rem;">Crea recetas primero en la sección Recetas</div>'}
             </div>
             <button class="btn btn-secondary btn-personalizado-mesa" onclick="abrirPersonalizadoParaCuenta('${cuentaId}')">
               <i class="fas fa-flask"></i> Cóctel Personalizado
             </button>
           </div>
           
           <div class="mesa-cuenta-footer">
            <div class="mesa-subtotal">
              Total: <span>$${total.toFixed(2)}</span>
            </div>
            <button class="btn primary-btn mesa-pagar-btn" 
              onclick="pagarCuenta('${cuentaId}')"
              ${!tieneItems ? 'disabled' : ''}>
              <i class="fas fa-credit-card"></i> Pagar
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  actualizarResumenCuentas();
}

function toggleCuenta(cuentaId) {
  const content = document.getElementById(`cuenta-content-${cuentaId}`);
  if (content) {
    content.classList.toggle('active');
  }
}

function toggleProductosLista(cuentaId) {
  const lista = document.getElementById(`productos-lista-${cuentaId}`);
  const btn = document.getElementById(`btn-productos-${cuentaId}`);
  if (lista) {
    lista.classList.toggle('hidden');
    if (lista.classList.contains('hidden')) {
      btn.innerHTML = '<i class="fas fa-plus"></i> Agregar Producto';
    } else {
      btn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
    }
  }
}

function agregarItemACuenta(cuentaId, recetaId, nombre, precio) {
  if (typeof CuentasManager === "undefined") {
    if (typeof showToast === "function") {
      showToast("CuentasManager no disponible", "error");
    }
    return;
  }

  const cuenta = CuentasManager.cuentasAbiertas.find(c => c.id_cuenta === cuentaId);
  if (!cuenta) {
    if (typeof showToast === "function") {
      showToast("Cuenta no encontrada", "error");
    }
    return;
  }

  const receta = typeof RecetasManager !== "undefined" ? RecetasManager.recetas.find(r => r.id_receta === recetaId) : null;
  const ingredientes = receta ? (typeof receta.ingredientes === "string" ? JSON.parse(receta.ingredientes) : receta.ingredientes || []) : [];

  CuentasManager.agregarItem(cuentaId, {
    tipo: "receta",
    receta_id: recetaId,
    nombre: nombre,
    cantidad: 1,
    cantidad_oz: 0,
    precio_unitario: precio,
    ingredientes: ingredientes
  });

  renderCuentasMesas();
  
  if (typeof showToast === "function") {
    showToast(nombre + " agregado", "success");
  }
}

function eliminarItemCuenta(cuentaId, itemId) {
  if (typeof CuentasManager !== "undefined") {
    CuentasManager.removerItem(cuentaId, itemId);
    renderCuentasMesas();
    if (typeof showToast === "function") {
      showToast("Producto eliminado", "info");
    }
  }
}

function abrirPersonalizadoParaCuenta(cuentaId) {
  window._cuentaDestino = cuentaId;
  if (typeof abrirCocktailPersonalizado === "function") {
    abrirCocktailPersonalizado();
  }
}

async function pagarCuenta(cuentaId) {
  const cuentas = typeof CuentasManager !== "undefined" ? CuentasManager.cuentasAbiertas : [];
  const cuenta = cuentas.find(c => c.id_cuenta === cuentaId);
  
  if (!cuenta || !cuenta.items || cuenta.items.length === 0) {
    if (typeof showToast === "function") {
      showToast("No hay productos en la cuenta", "error");
    }
    return;
  }

  const btn = document.querySelector(`.mesa-cuenta-card[data-cuenta-id="${cuentaId}"] .mesa-pagar-btn`);
  const originalText = btn ? btn.innerHTML : "Pagar";
  
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;
  }

  try {
    const result = await callGoogleScript("cerrarCuenta", {
      id_cuenta: cuenta.id_cuenta,
      nombre_mesa: cuenta.nombre_mesa || "Cuenta",
      forma_pago: "efectivo",
      monto_recibido: cuenta.total,
      cambio: 0,
      descuento: 0,
      items: cuenta.items,
      estado: "cerrada"
    });

    if (result.status === "success") {
      // Eliminar la cuenta local
      if (typeof CuentasManager !== "undefined") {
        const idx = CuentasManager.cuentasAbiertas.findIndex(c => c.id_cuenta === cuentaId);
        if (idx !== -1) {
          CuentasManager.cuentasAbiertas.splice(idx, 1);
          CuentasManager.guardarEnLocalStorage();
        }
      }
      
      renderCuentasMesas();
      
      if (typeof showToast === "function") {
        showToast("Cuenta pagada correctamente", "success");
      }
    } else {
      if (typeof showToast === "function") {
        showToast("Error: " + result.message, "error");
      }
    }
  } catch (error) {
    if (typeof showToast === "function") {
      showToast("Error al procesar pago: " + error.message, "error");
    }
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

function actualizarResumenCuentas() {
  const resumen = typeof CuentasManager !== "undefined" ? CuentasManager.obtenerResumenDia() : { totalVentas: 0, totalCuentas: 0, ticketPromedio: 0 };
  document.getElementById("cuentasPagadas").textContent = resumen.totalCuentas;
  document.getElementById("ventasDia").textContent = "$" + resumen.totalVentas.toFixed(2);
  document.getElementById("ticketPromedio").textContent = "$" + resumen.ticketPromedio.toFixed(2);
}

// Dashboard Bar
function actualizarDashboardBar() {
  const cuentas =
    typeof CuentasManager !== "undefined"
      ? CuentasManager.obtenerResumenDia()
      : { totalVentas: 0, totalCuentas: 0, ticketPromedio: 0 };

  document.getElementById("kpiVentas").textContent =
    "$" + cuentas.totalVentas.toFixed(2);
  document.getElementById("kpiTicket").textContent =
    "$" + cuentas.ticketPromedio.toFixed(2);

  // Porcentaje ocupación
  const mesas =
    typeof FloorPlanManager !== "undefined" ? FloorPlanManager.mesas || [] : [];
  const ocupadas = mesas.filter((m) => m.estado === "ocupada").length;
  const ocupacion =
    mesas.length > 0 ? Math.round((ocupadas / mesas.length) * 100) : 0;
  document.getElementById("kpiOcupacion").textContent = ocupacion + "%";

  // Pour cost: (Costo ingredientes vendidos / Ventas totales) * 100
  let pourCost = 0;
  if (cuentas.totalVentas > 0 && typeof RecetasManager !== "undefined") {
    const recetas = RecetasManager.recetas || [];
    let costoTotal = 0;
    const cuentasAbiertas =
      typeof CuentasManager !== "undefined"
        ? CuentasManager.getCuentasAbiertas()
        : [];

    cuentasAbiertas.forEach((c) => {
      (c.items || []).forEach((item) => {
        if (item.receta_id) {
          const receta = recetas.find((r) => r.id_receta === item.receta_id);
          if (receta) {
            const costo = RecetasManager.calcularCostoReceta(receta) || 0;
            costoTotal += costo * item.cantidad;
          }
        }
      });
    });

    pourCost = Math.round((costoTotal / cuentas.totalVentas) * 100);
  }
  document.getElementById("kpiPourCost").textContent = pourCost + "%";

  // Inventario bajo
  renderInventarioBajo();

  // Cargar gráficos del dashboard
  if (typeof cargarDatosGraficos === "function") {
    cargarDatosGraficos();
  }
}

function renderInventarioBajo() {
  const container = document.getElementById("inventarioBajoList");
  if (!container) return;

  const productos = inventarioCache || [];
  const bajos = productos.filter((p) => {
    const stock = parseFloat(p.stock) || 0;
    return stock <= 10;
  });

  if (bajos.length === 0) {
    container.innerHTML =
      '<div style="color: var(--hermit-text-secondary);">No hay productos con stock bajo</div>';
    return;
  }

  let html = "";
  bajos.forEach((p) => {
    const stock = parseFloat(p.stock) || 0;
    const nivel = stock <= 5 ? "critico" : "bajo";
    const ml = stock * 29.57;
    html += `
      <div class="inventario-bajo-item ${nivel}">
        <span>${p.nombre}</span>
        <span>${stock.toFixed(1)} oz / ${ml.toFixed(0)} ml</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

// Renderizar tabla de recetas
function renderRecetasTabla() {
  const tbody = document.getElementById("recetasTablaBody");
  if (!tbody) return;

  const recetas = RecetasManager.recetas || [];

  if (recetas.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center;">No hay recetas creadas</td></tr>';
    return;
  }

  let html = "";
  recetas.forEach((r) => {
    const disponible = r.disponible !== false;
    html += `
      <tr>
        <td>${r.nombre}</td>
        <td>${r.categoria || "Cóotel"}</td>
        <td>$${(r.precio_venta || 0).toFixed(2)}</td>
        <td>$${typeof RecetasManager !== "undefined" ? RecetasManager.calcularCostoReceta(r).toFixed(2) : "0.00"}</td>
        <td>
          <button class="btn btn-secondary" onclick="toggleReceta('${r.id_receta}')">
            ${disponible ? "✓ Disponible" : "✗ No disponible"}
          </button>
        </td>
        <td>
          <button class="btn btn-secondary" onclick="editarReceta('${r.id_receta}')">Editar</button>
          <button class="btn" style="background: #FF6B6B; color: white;" onclick="eliminarReceta('${r.id_receta}')">Eliminar</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function toggleReceta(id) {
  await RecetasManager.toggleDisponibilidad(id);
  renderRecetasTabla();
}

function editarReceta(id) {
  const receta = RecetasManager.recetas.find((r) => r.id_receta === id);
  if (receta) {
    RecetasManager.abrirModalReceta(receta);
  }
}

async function eliminarReceta(id) {
  if (confirm("¿Eliminar esta receta?")) {
    await RecetasManager.eliminarReceta(id);
    renderRecetasTabla();
  }
}

// Escuchar cambios en cuentas
document.addEventListener("cuentasActualizadas", function (e) {
  actualizarSelectorCuentas();
  renderCuentasAbiertas();
});
