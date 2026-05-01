// ***************************************************************
// ⚠️ 1. REEMPLAZA ESTE VALOR con el ID real de tu Google Sheet
// ***************************************************************
const SPREADSHEET_ID = "12IlQFCmS420xFR-J8KSzhGPueYF2lrElHu6_PrTFARQ";

// ================================================================
// CONFIGURACIÓN DEL BAR - THE HERMIT COCKTAIL BAR
// ================================================================
const BAR_CONFIG = {
  nombre: "The Hermit Cocktail Bar",
  ConversionOZ_ML: 29.5735,
  umbralCriticoStock: 5,
  umbralBajoStock: 10,
};

// Nombres de las pestañas
const HOJA_CATEGORIAS = "Categorias";
const HOJA_PRODUCTOS = "Productos";
const HOJA_COMPRAS = "Compras";
const HOJA_VENTAS = "Ventas";
const HOJA_RESUMEN = "resumen_diario";
const HOJA_VENTAS_DETALLE = "Ventas_Detalle";
const HOJA_COMPRAS_DETALLE = "Compras_Detalle";
const HOJA_APROVECHAMIENTOS = "Aprovechamientos";
const HOJA_GASTOS = "Gastos";
const HOJA_CIERRES = "Cierres";

// Nuevas pestañas para el bar
const HOJA_MESAS = "Mesas";
const HOJA_RECETAS = "Recetas";
const HOJA_CUENTAS = "Cuentas";
const HOJA_ZONAS = "Zonas";

// Encabezados
const CATEGORIAS_HEADERS = ["id", "nombre"];
const PRODUCTOS_HEADERS = [
  "id",
  "nombre",
  "código",
  "categoría",
  "precio_compra",
  "precio_venta",
  "precio_venta_2",
  "precio_venta_3",
  "precio_venta_4",
  "stock",
  "fecha_creado",
];

const COMPRAS_HEADERS = [
  "id_compra",
  "fecha",
  "proveedor",
  "proveedor_telefono",
  "subtotal",
  "descuento_global_pct",
  "total_final",
  "metodo_pago",
  "monto_recibido",
  "cambio",
  "consecutivo",
  "envio",
  "direccion_entrega",
  "valor_envio",
];

const COMPRAS_DETALLE_HEADERS = [
  "id_detalle",
  "id_compra",
  "producto_id",
  "nombre_producto",
  "codigo_producto",
  "cantidad",
  "precio_unitario",
  "subtotal",
];

const RESUMEN_HEADERS = [
  "fecha",
  "total_ventas",
  "total_compras",
  "ganancia",
  "productos_vendidos",
];

const VENTAS_POS_HEADERS = [
  "id_venta",
  "fecha",
  "cliente",
  "cliente_documento",
  "cliente_telefono",
  "subtotal",
  "descuento_global_pct",
  "total_final",
  "metodo_pago",
  "comision",
  "monto_recibido",
  "cambio",
  "consecutivo",
  "domicilio",
  "direccion_entrega",
  "valor_domicilio",
  "ingresado", // TRUE o FALSE
];

const GASTOS_HEADERS = [
  "id_gasto",
  "fecha",
  "monto",
  "categoria",
  "concepto",
  "metodo_pago",
  "usuario",
];

const APROVECHAMIENTOS_HEADERS = [
  "id_aprovecho",
  "fecha",
  "monto",
  "categoria",
  "concepto",
  "metodo_pago",
  "usuario",
];

const CIERRES_HEADERS = [
  "id_cierre",
  "fecha",
  "base_efectivo",
  "base_banco",
  "ventas_efectivo",
  "ventas_banco",
  "gastos_efectivo",
  "gastos_banco",
  "aprovechamientos",
  "efectivo_esperado",
  "efectivo_real",
  "efectivo_diferencia",
  "banco_esperado",
  "banco_real",
  "banco_diferencia",
  "usuario",
];

const VENTAS_DETALLE_HEADERS = [
  "id_detalle",
  "id_venta",
  "producto_id",
  "nombre_producto",
  "codigo_producto",
  "cantidad",
  "precio_unitario",
  "descuento_item_pct",
  "subtotal_original",
  "subtotal_final",
  "metodo_pago",
  "ingredientes",
];

// ================================================================
// HEADERS PARA EL BAR - THE HERMIT COCKTAIL BAR
// ================================================================

const PRODUCTOS_BAR_HEADERS = [
  "id",
  "nombre",
  "código",
  "categoría",
  "volumen_ml",
  "contenido_oz",
  "precio_botella",
  "precio_onza",
  "precio_ml",
  "precio_venta",
  "precio_venta_2",
  "precio_venta_3",
  "precio_venta_4",
  "stock",
  "fecha_creado",
];

const MESAS_HEADERS = [
  "id_mesa",
  "nombre",
  "capacidad",
  "forma",
  "posicion_x",
  "posicion_y",
  "ancho",
  "alto",
  "estado",
  "id_zona",
  "observaciones",
];

const ZONAS_HEADERS = ["id_zona", "nombre", "color", "activa"];

const RECETAS_HEADERS = [
  "id_receta",
  "nombre",
  "categoria",
  "descripcion",
  "imagen",
  "precio_venta",
  "costo_total",
  "ingredientes",
  "disponible",
  "fecha_creado",
  "fecha_modificado",
];

const CUENTAS_HEADERS = [
  "id_cuenta",
  "id_mesa",
  "nombre_mesa",
  "id_silla",
  "inicio",
  "estado",
  "items",
  "subtotal",
  "descuento",
  "total",
  "observaciones",
  "usuario",
];

// ----------------------------------------------------------------------
// CIERRE DE CAJA
// ----------------------------------------------------------------------
function registrarCierre(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_CIERRES);
    if (!sheet)
      return { status: "error", message: "Hoja de cierres no encontrada." };

    const id_cierre = "CIE-" + new Date().getTime();
    const rowData = [
      id_cierre,
      new Date(),
      data.base_efectivo || 0,
      data.base_banco || 0,
      data.ventas_efectivo || 0,
      data.ventas_banco || 0,
      data.gastos_efectivo || 0,
      data.gastos_banco || 0,
      data.aprovechamientos || 0,
      data.efectivo_esperado || 0,
      data.efectivo_real || 0,
      data.efectivo_diferencia || 0,
      data.banco_esperado || 0,
      data.banco_real || 0,
      data.banco_diferencia || 0,
      data.usuario || "Admin",
    ];

    sheet.appendRow(rowData);
    return {
      status: "success",
      message: "Cierre de caja registrado correctamente.",
      id_cierre,
    };
  } catch (error) {
    return {
      status: "error",
      message: `Error al registrar cierre: ${error.message}`,
    };
  }
}

// --- FUNCIÓN CENTRAL PARA ACCEDER A LA HOJA ---
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// --- FUNCIÓN HELPER: Obtener índice de columna dinámicamente con fallback ---
// Busca el nombre de columna en los headers y retorna su índice
// Si no lo encuentra, usa el valor hardcodeado como fallback para compatibilidad
function getColumnIndex(sheet, columnName, fallbackIndex) {
  try {
    const headers = sheet.getDataRange().getValues()[0];
    const index = headers.indexOf(columnName);
    if (index !== -1) {
      return index;
    }
    Logger.log(
      `Columna '${columnName}' no encontrada, usando índice fallback: ${fallbackIndex}`,
    );
    return fallbackIndex;
  } catch (e) {
    Logger.log(
      `Error al buscar columna '${columnName}': ${e.message}, usando fallback: ${fallbackIndex}`,
    );
    return fallbackIndex;
  }
}

// --- FUNCIÓN HELPER: Buscar producto por ID en una hoja ---
// Retorna {rowData, rowIndex} o {rowData: null, rowIndex: -1}
function findProductById(sheet, productoId) {
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf("id");

    if (idColIndex === -1) {
      return { rowData: null, rowIndex: -1 };
    }

    const searchId = String(productoId || "")
      .trim()
      .toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][idColIndex] || "")
        .trim()
        .toLowerCase();
      if (rowId === searchId) {
        return { rowData: data[i], rowIndex: i };
      }
    }
    return { rowData: null, rowIndex: -1 };
  } catch (error) {
    Logger.log(`Error en findProductById: ${error.message}`);
    return { rowData: null, rowIndex: -1 };
  }
}

// 🔑 FUNCIÓN CORREGIDA: Generación de ID Único
function generateUniqueAppId() {
  return (
    "id-" +
    (
      new Date().getTime().toString(36) +
      Math.random().toString(36).substring(2, 9)
    ).toUpperCase()
  );
}

function getNextConsecutivoVentas() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_VENTAS);
    const props = PropertiesService.getScriptProperties();
    let last = parseInt(props.getProperty("ULTIMO_CONSECUTIVO_VENTAS")) || 0;

    // H1: Verify against existing sheet values to prevent duplicates
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const consecutivoCol = headers.indexOf("consecutivo");
      if (consecutivoCol !== -1) {
        let maxEnSheet = 0;
        for (let i = 1; i < data.length; i++) {
          const val = parseInt(data[i][consecutivoCol]) || 0;
          if (val > maxEnSheet) maxEnSheet = val;
        }
        if (maxEnSheet >= last) {
          last = maxEnSheet;
        }
      }
    }

    const next = last + 1;
    props.setProperty("ULTIMO_CONSECUTIVO_VENTAS", next);
    return next;
  } finally {
    lock.releaseLock();
  }
}

function getNextConsecutivoCompras() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_COMPRAS);
    const props = PropertiesService.getScriptProperties();
    let last = parseInt(props.getProperty("ULTIMO_CONSECUTIVO_COMPRAS")) || 0;

    // H1: Verify against existing sheet values to prevent duplicates
    if (sheet && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const consecutivoCol = headers.indexOf("consecutivo");
      if (consecutivoCol !== -1) {
        let maxEnSheet = 0;
        for (let i = 1; i < data.length; i++) {
          const val = parseInt(data[i][consecutivoCol]) || 0;
          if (val > maxEnSheet) maxEnSheet = val;
        }
        if (maxEnSheet >= last) {
          last = maxEnSheet;
        }
      }
    }

    const next = last + 1;
    props.setProperty("ULTIMO_CONSECUTIVO_COMPRAS", next);
    return next;
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES GET
// ----------------------------------------------------------------------
function doGet(e) {
  const action = e.parameter.action;
  const query = e.parameter.query;
  const sheetName = e.parameter.sheetName;
  let result;

  try {
    if (action === "getVentaDetalle") {
      result = getVentaDetalle(e.parameter.id);
    } else if (action === "iniciar" || action === "resetear") {
      result =
        action === "iniciar" ? iniciarBaseDeDatos() : resetearBaseDeDatos();
    } else if (action === "getCategorias") {
      result = getCategorias();
    } else if (action === "buscarProducto") {
      result = buscarProducto(query);
    } else if (action === "getInventario") {
      result = getInventario();
    } else if (action === "getResumenDiario") {
      result = getResumenDiario();
    } else if (action === "getData" && sheetName) {
      result = getData(sheetName);
    } else if (action === "getMesas") {
      result = obtenerMesas();
    } else if (action === "getZonas") {
      result = obtenerZonas();
    } else if (action === "getRecetas") {
      result = obtenerRecetas();
    } else if (action === "getRecetaById") {
      result = obtenerRecetaPorId(e.parameter.id);
    } else if (action === "getCuentas") {
      result = obtenerCuentas(e.parameter.estado);
    } else if (action === "getProductos") {
      result = obtenerProductos();
    } else {
      result = {
        status: "error",
        message: `Acción GET '${action}' no válida o faltan parámetros.`,
      };
    }
  } catch (error) {
    result = {
      status: "error",
      message: `Error en doGet: ${error.message}`,
    };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES POST
// ----------------------------------------------------------------------
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "error",
          message: "No se recibieron datos en la solicitud POST.",
        }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const requestData = JSON.parse(e.postData.contents);
    const action = e.parameter.action || requestData.action;

    let result;
    // Debug logging to help diagnose unrecognized actions after deployment
    try {
      if (typeof Logger !== 'undefined' && Logger && typeof Logger.log === 'function') {
        Logger.log("Action recibido: " + action);
        Logger.log("RequestData: " + JSON.stringify(requestData));
      }
    } catch (logErr) {
      // Silently ignore logging errors to avoid breaking production flow
    }
    if (action === "agregarCategoria") {
      result = agregarCategoria(requestData);
    } else if (action === "agregarProducto") {
      result = agregarProducto(requestData);
    } else if (action === "registrarTransaccion") {
      result = registrarTransaccion(requestData);
    } else if (action === "registrarVentaPOS") {
      result = registrarVentaPOS(requestData);
    } else if (action === "registrarCompraPOS") {
      result = registrarCompraPOS(requestData);
    } else if (action === "registrarGasto") {
      result = registrarGasto(requestData);
    } else if (action === "registrarAprovechamiento") {
      result = registrarAprovechamiento(requestData);
    } else if (action === "eliminarGasto") {
      result = eliminarGasto(requestData);
    } else if (action === "conciliarVenta") {
      result = conciliarVenta(requestData);
    } else if (action === "registrarCierre") {
      result = registrarCierre(requestData);
    } else if (action === "crearMesa") {
      result = crearMesa(requestData);
    } else if (action === "actualizarMesa") {
      result = actualizarMesa(requestData);
    } else if (action === "eliminarMesa") {
      result = eliminarMesa(requestData.id_mesa);
    } else if (action === "crearZona") {
      result = crearZona(requestData);
    } else if (action === "actualizarZona") {
      result = actualizarZona(requestData);
    } else if (action === "eliminarZona") {
      result = eliminarZona(requestData.id_zona);
    } else if (action === "crearReceta") {
      result = crearReceta(requestData);
    } else if (action === "actualizarReceta") {
      result = actualizarReceta(requestData);
    } else if (action === "eliminarReceta") {
      result = eliminarReceta(requestData.id_receta);
    } else if (action === "abrirCuenta") {
      result = abrirCuenta(requestData);
    } else if (action === "agregarItemCuenta") {
      result = agregarItemCuenta(requestData);
    } else if (action === "cerrarCuenta") {
      result = cerrarCuenta(requestData);
    } else if (action === "eliminarCuenta") {
      result = eliminarCuenta(requestData.id_cuenta);
    } else if (action === "calcularCostoReceta") {
      const costo = calcularCostoReceta(requestData.ingredientes);
      result = { status: "success", data: { costo_total: costo } };
    } else if (action === "descontarInventarioPorVenta") {
      result = descontarInventarioPorVenta(requestData.items);
    } else if (action === "obtenerRecetas") {
      result = obtenerRecetas();
    } else if (action === "obtenerProductos") {
      result = obtenerProductos();
    } else if (action === "obtenerCuentas") {
      result = obtenerCuentas(requestData.estado);
    } else if (action === "obtenerZonas") {
      result = obtenerZonas();
    } else if (action === "obtenerMesas") {
      result = obtenerMesas();
    } else {
      result = { status: "error", message: "Acción POST no reconocida." };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
      ContentService.MimeType.JSON,
    );
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: `Error al procesar la solicitud POST: ${error.message}`,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE CATEGORÍAS
// ----------------------------------------------------------------------
function getCategorias() {
  return getData(HOJA_CATEGORIAS);
}

function agregarCategoria(data) {
  // Validación de entrada
  if (!data) {
    return { status: "error", message: "No se recibieron datos." };
  }
  if (!data.nombre || String(data.nombre).trim() === "") {
    return {
      status: "error",
      message: "El nombre de la categoría es requerido.",
    };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(HOJA_CATEGORIAS);

  if (!sheet) {
    return {
      status: "error",
      message: `La pestaña '${HOJA_CATEGORIAS}' no existe. Inicie la Base de Datos.`,
    };
  }

  const newId = generateUniqueAppId();

  const newRow = [newId, String(data.nombre).trim()];

  try {
    sheet.appendRow(newRow);
    return {
      status: "success",
      message: `Categoría '${data.nombre}' agregada (ID: ${newId}).`,
    };
  } catch (e) {
    return {
      status: "error",
      message: `Error al escribir categoría: ${e.message}`,
    };
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE PRODUCTOS Y BÚSQUEDA
// ----------------------------------------------------------------------
function getInventario() {
  return getData(HOJA_PRODUCTOS);
}

function obtenerProductos() {
  return getData(HOJA_PRODUCTOS);
}

function buscarProducto(query) {
  const data = getData(HOJA_PRODUCTOS);

  if (data.status !== "success") return data;

  const products = data.data;
  const lowerQuery = query.toLowerCase().trim();

  if (lowerQuery.length === 0) {
    return {
      status: "warning",
      message: "Especifique un ID, Código o Nombre para buscar.",
    };
  }

  // Filtra productos por ID, Código, o Nombre - CONVERSIÓN SEGURA A STRING
  const results = products.filter((p) => {
    // Convertir todos los valores a string de forma segura
    const idStr = String(p.id || "");
    const codigoStr = String(p.código || "");
    const nombreStr = String(p.nombre || "");

    return (
      idStr.toLowerCase().includes(lowerQuery) ||
      codigoStr.toLowerCase().includes(lowerQuery) ||
      nombreStr.toLowerCase().includes(lowerQuery)
    );
  });

  if (results.length > 0) {
    return {
      status: "success",
      data: results,
      message: `${results.length} coincidencias encontradas.`,
    };
  } else {
    return { status: "warning", message: "Producto no encontrado." };
  }
}

function agregarProducto(data) {
  // Validación de entrada
  if (!data) {
    return { status: "error", message: "No se recibieron datos." };
  }
  if (!data.nombre || String(data.nombre).trim() === "") {
    return { status: "error", message: "El nombre del producto es requerido." };
  }
  if (!data.codigo || String(data.codigo).trim() === "") {
    return { status: "error", message: "El código del producto es requerido." };
  }
  if (!data.categoria || String(data.categoria).trim() === "") {
    return {
      status: "error",
      message: "La categoría del producto es requerida.",
    };
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(HOJA_PRODUCTOS);

  if (!sheet) {
    return {
      status: "error",
      message: `La pestaña '${HOJA_PRODUCTOS}' no existe. Inicie la Base de Datos.`,
    };
  }

  // Validar que no exista un producto con el mismo código
  const productosData = sheet.getDataRange().getValues();
  const headers = productosData[0];
  const codigoCol = headers.indexOf("código");

  if (codigoCol !== -1) {
    const codigoBusqueda = String(data.codigo || "")
      .trim()
      .toLowerCase();
    for (let i = 1; i < productosData.length; i++) {
      const codigoExistente = String(productosData[i][codigoCol] || "")
        .trim()
        .toLowerCase();
      if (codigoExistente && codigoExistente === codigoBusqueda) {
        return {
          status: "warning",
          message: `Ya existe un producto con el código '${data.codigo}'. Use un código diferente.`,
        };
      }
    }
  }

  const newId = generateUniqueAppId();

  const precioVentaBase = parseFloat(data.precio_venta) || 0;

  const precioVenta2 =
    data.precio_venta_2 !== undefined && data.precio_venta_2 !== ""
      ? parseFloat(data.precio_venta_2)
      : precioVentaBase;

  const precioVenta3 =
    data.precio_venta_3 !== undefined && data.precio_venta_3 !== ""
      ? parseFloat(data.precio_venta_3)
      : precioVentaBase;

  const precioVenta4 =
    data.precio_venta_4 !== undefined && data.precio_venta_4 !== ""
      ? parseFloat(data.precio_venta_4)
      : precioVentaBase;

  const newRow = [
    newId,
    data.nombre,
    data.codigo,
    data.categoria,
    parseFloat(data.volumen_ml) || 0,
    parseFloat(data.contenido_oz) || 0,
    parseFloat(data.precio_botella) || 0,
    parseFloat(data.precio_onza) || 0,
    parseFloat(data.precio_ml) || 0,
    precioVentaBase,
    precioVenta2,
    precioVenta3,
    precioVenta4,
    parseInt(data.stock) || 0,
    new Date(),
  ];

  try {
    sheet.appendRow(newRow);
    return {
      status: "success",
      message: `Producto '${data.nombre}' registrado con éxito. ID: ${newId}`,
    };
  } catch (e) {
    return {
      status: "error",
      message: `Error al escribir producto: ${e.message}`,
    };
  }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE TRANSACCIONES (COMPRAS/VENTAS)
// ----------------------------------------------------------------------
// ⚠️ DEPRECATED: Use registrarVentaPOS or registrarCompraPOS instead.
// This function writes a non-standard format to COMPRAS/VENTAS sheets.
function registrarTransaccion(data) {
  const ss = getSpreadsheet();
  const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);
  if (sheetProductos) {
    const headers = sheetProductos.getDataRange().getValues()[0];
    if (headers.indexOf("precio_compra") === -1) {
      return {
        status: "error",
        message: "Función no compatible con bar inventory. Use registrarVentaPOS o registrarCompraPOS.",
      };
    }
  }

  const action = data.type; // 'compra' o 'venta'
  const isCompra = action === "compra";
  const sheetName = isCompra ? HOJA_COMPRAS : HOJA_VENTAS;
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet || !sheetProductos) {
    return {
      status: "error",
      message: `Una o más pestañas necesarias no existen. Inicie la Base de Datos.`,
    };
  }

  // 1. Validar producto y obtener fila actual (usando helper)
  const { rowData, rowIndex } = findProductById(
    sheetProductos,
    data.producto_id,
  );

  if (rowIndex === -1) {
    return {
      status: "error",
      message: `Producto ID ${data.producto_id} no encontrado en inventario.`,
    };
  }

  // 2. Obtener índices de columnas dinámicamente con fallback
  const headers = sheetProductos.getDataRange().getValues()[0];
  const stockColIndex = getColumnIndex(sheetProductos, "stock", 9);
  const precioCompraColIndex = getColumnIndex(
    sheetProductos,
    "precio_compra",
    4,
  );
  const precioVentaColIndex = getColumnIndex(sheetProductos, "precio_venta", 5);

  const cantidad = parseInt(data.cantidad);
  const precioTransaccion = parseFloat(data.precio);

  let stockActual = parseFloat(rowData[stockColIndex]) || 0;
  let nuevoStock;

  // 3. Validar stock para ventas
  if (!isCompra) {
    if (stockActual < cantidad) {
      return {
        status: "warning",
        message: `Stock insuficiente. Solo hay ${stockActual} unidades disponibles para la venta de ${cantidad} unidades.`,
      };
    }
    nuevoStock = stockActual - cantidad;
  } else {
    nuevoStock = stockActual + cantidad;
  }

  // 4. Escribir nueva transacción
  const transaccionId = generateUniqueAppId();
  const newRow = [
    transaccionId,
    data.producto_id,
    cantidad,
    precioTransaccion,
    new Date(),
    data.extra_data || "",
  ];

  try {
    sheet.appendRow(newRow);
  } catch (e) {
    return {
      status: "error",
      message: `Error al registrar transacción: ${e.message}`,
    };
  }

  // 5. Actualizar stock del producto
  try {
    sheetProductos
      .getRange(rowIndex + 1, stockColIndex + 1)
      .setValue(nuevoStock);

    // 6. Actualizar precio si es diferente
    if (isCompra) {
      const precioActualCompra = parseFloat(rowData[precioCompraColIndex]) || 0;
      if (precioTransaccion !== precioActualCompra) {
        sheetProductos
          .getRange(rowIndex + 1, precioCompraColIndex + 1)
          .setValue(precioTransaccion);
      }
    } else {
      const precioActualVenta = parseFloat(rowData[precioVentaColIndex]) || 0;
      if (precioTransaccion !== precioActualVenta) {
        sheetProductos
          .getRange(rowIndex + 1, precioVentaColIndex + 1)
          .setValue(precioTransaccion);
      }
    }

    return {
      status: "success",
      message: `${
        isCompra ? "Compra" : "Venta"
      } registrada exitosamente. Stock actualizado: ${nuevoStock} unidades.`,
    };
  } catch (e) {
    // Si falla la actualización, revertir la transacción
    sheet.deleteRow(sheet.getLastRow());
    return {
      status: "error",
      message: `Error al actualizar inventario: ${e.message}`,
    };
  }
}

function registrarVentaPOS(data) {
  // Validación de entrada
  if (!data) {
    return { status: "error", message: "No se recibieron datos." };
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { status: "warning", message: "No hay productos en la venta." };
  }
  // Validar que cada item tenga los campos requeridos
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!item.producto_id || !item.cantidad || !item.precio) {
      return {
        status: "error",
        message: `Item ${i + 1} incompleto: requiere producto_id, cantidad y precio.`,
      };
    }
    if (parseInt(item.cantidad) <= 0) {
      return {
        status: "error",
        message: `Item ${i + 1}: la cantidad debe ser mayor a 0.`,
      };
    }
    if (parseFloat(item.precio) < 0) {
      return {
        status: "error",
        message: `Item ${i + 1}: el precio no puede ser negativo.`,
      };
    }
  }

  const ss = getSpreadsheet();
  const sheetVentas = ss.getSheetByName(HOJA_VENTAS);
  const sheetDetalle = ss.getSheetByName(HOJA_VENTAS_DETALLE);
  const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);
  const metodoPago = data.metodoPago || "efectivo";
  const comision = Number(data.comision) || 0;

  if (!sheetVentas || !sheetDetalle || !sheetProductos) {
    return {
      status: "error",
      message: "Una o más hojas necesarias no existen.",
    };
  }

  const items = data.items;
  const cliente = data.cliente || "Mostrador";
  const clienteDocumento = data.clienteDocumento || "";
  const clienteTelefono = data.clienteTelefono || "";
  let montoRecibido = parseFloat(data.montoRecibido) || 0;

  // 1️⃣ Optimización: Cargar productos UNA sola vez y crear mapa O(1)
  const productosData = sheetProductos.getDataRange().getValues();
  const headers = productosData[0];

  const idCol = headers.indexOf("id");
  const nombreCol = headers.indexOf("nombre");
  const codigoCol = headers.indexOf("código");
  const stockCol = headers.indexOf("stock");

  // Crear mapa para búsqueda O(1) en lugar de findIndex O(n)
  const productosMap = {};
  for (let i = 1; i < productosData.length; i++) {
    const prodId = String(productosData[i][idCol]);
    if (prodId) {
      productosMap[prodId] = {
        rowIndex: i,
        nombre: productosData[i][nombreCol] || "",
        codigo: productosData[i][codigoCol] || "",
        stock: parseFloat(productosData[i][stockCol]) || 0,
      };
    }
  }

  let subtotalGeneral = 0;
  let updatesStock = [];
  let itemsConNombre = [];

  for (let item of items) {
    const productoId = item.producto_id;
    const cantidad = parseInt(item.cantidad);
    const precio = parseFloat(item.precio);

    // Búsqueda O(1) usando el mapa
    const producto = productosMap[productoId];

    if (!producto) {
      return {
        status: "error",
        message: `Producto ID ${productoId} no encontrado.`,
      };
    }

    const stockActual = producto.stock;

    if (stockActual < cantidad) {
      return {
        status: "warning",
        message: `Stock insuficiente para ${producto.nombre || productoId}. Disponible: ${stockActual}`,
      };
    }

    const nuevoStock = stockActual - cantidad;
    updatesStock.push({ rowIndex: producto.rowIndex, nuevoStock });

    const descuentoItemPct = Number(item.descuento_item_pct) || 0;
    const subtotalOriginal = cantidad * precio;
    const descuentoItem = subtotalOriginal * (descuentoItemPct / 100);
    const subtotalFinal = subtotalOriginal - descuentoItem;

    subtotalGeneral += subtotalFinal;

    // Guardar nombre y código para devolver en la respuesta
    itemsConNombre.push({
      producto_id: productoId,
      nombre_producto: producto.nombre,
      codigo_producto: producto.codigo,
      cantidad: cantidad,
      precio_unitario: precio,
      descuento_item_pct: descuentoItemPct,
      subtotal_original: subtotalOriginal,
      subtotal_final: subtotalFinal,
    });
  }

  const descuentoGlobalPct = Number(data.descuento_global_pct) || 0;

  const descuentoGlobal = subtotalGeneral * (descuentoGlobalPct / 100);

  const totalConDescuento = subtotalGeneral - descuentoGlobal;
  const valorDomicilio = parseFloat(data.valor_domicilio) || 0;
  const totalFinal = totalConDescuento + comision + valorDomicilio;

  let cambio = 0;

  if (metodoPago === "efectivo") {
    cambio = montoRecibido - totalFinal;

    if (montoRecibido < totalFinal) {
      return {
        status: "warning",
        message: "El monto recibido es menor al total de la venta.",
      };
    }
  } else {
    // Para tarjeta, transferencia, crédito no hay cambio
    montoRecibido = totalFinal;
    cambio = 0;
  }

  // 2️⃣ Registrar encabezado de venta
  const ventaId = generateUniqueAppId();
  const fecha = new Date();
  const consecutivo = getNextConsecutivoVentas();
  const direccionEntrega = data.direccion_entrega || "";

  try {
    const domicilioFlag =
      data.domicilio === true || data.domicilio === "true" ? "TRUE" : "FALSE";
    sheetVentas.appendRow([
      ventaId,
      fecha,
      cliente,
      clienteDocumento,
      clienteTelefono,
      subtotalGeneral,
      descuentoGlobalPct,
      totalFinal,
      metodoPago,
      comision,
      montoRecibido,
      cambio,
      consecutivo,
      domicilioFlag,
      direccionEntrega,
      valorDomicilio,
      data.ingresado === true || data.ingresado === "true" ? "TRUE" : "FALSE",
    ]);
  } catch (e) {
    return { status: "error", message: "Error al registrar venta." };
  }

  // 3️⃣ Registrar detalle (usando datos ya calculados - optimización)
  try {
    for (let item of itemsConNombre) {
      const detalleId = generateUniqueAppId();
      sheetDetalle.appendRow([
        detalleId,
        ventaId,
        item.producto_id,
        item.nombre_producto,
        item.codigo_producto,
        item.cantidad,
        item.precio_unitario,
        item.descuento_item_pct,
        item.subtotal_original,
        item.subtotal_final,
        metodoPago,
      ]);
    }
  } catch (e) {
    sheetVentas.deleteRow(sheetVentas.getLastRow());
    return { status: "error", message: "Error al registrar detalle." };
  }

  // 4️⃣ Actualizar stocks individualmente (cada producto en su fila correcta)
  try {
    updatesStock.forEach((u) => {
      sheetProductos.getRange(u.rowIndex + 1, stockCol + 1).setValue(u.nuevoStock);
    });

    actualizarResumenDiario(totalFinal, items, comision, descuentoGlobalPct);
  } catch (e) {
    return { status: "error", message: "Error al actualizar stock." };
  }

  // 5️⃣ Registrar gasto de domicilio si aplica
  if (valorDomicilio > 0 && direccionEntrega) {
    try {
      const sheetGastos = ss.getSheetByName(HOJA_GASTOS);
      if (sheetGastos) {
        sheetGastos.appendRow([
          generateUniqueAppId(),
          new Date(),
          valorDomicilio,
          "Domicilio",
          direccionEntrega,
          "efectivo",
          data.usuario || "Sistema",
        ]);
      }
    } catch (e) {
      // No fallar la venta si no se puede registrar el gasto de domicilio
      Logger.log("Error al registrar gasto de domicilio: " + e.message);
    }
  }

  return {
    status: "success",
    message: "Venta registrada correctamente.",
    total: totalFinal,
    cambio: cambio,
    ventaId: ventaId,
    // Datos de la venta para mostrar factura sin llamada adicional
    venta: {
      id_venta: ventaId,
      fecha: fecha.toISOString(),
      cliente: cliente,
      cliente_documento: clienteDocumento,
      cliente_telefono: clienteTelefono,
      subtotal: subtotalGeneral,
      descuento_global_pct: descuentoGlobalPct,
      total_final: totalFinal,
      metodo_pago: metodoPago,
      comision: comision,
      monto_recibido: montoRecibido,
      cambio: cambio,
      consecutivo: consecutivo,
      domicilio:
        data.domicilio === true || data.domicilio === "true" ? "TRUE" : "FALSE",
      direccion_entrega: direccionEntrega,
      valor_domicilio: valorDomicilio,
      ingreso:
        data.ingresado === true || data.ingresado === "true" ? "TRUE" : "FALSE",
    },
    items: itemsConNombre,
  };
}

function registrarCompraPOS(data) {
  // Validación de entrada
  if (!data) {
    return { status: "error", message: "No se recibieron datos." };
  }
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return { status: "warning", message: "No hay productos en la compra." };
  }
  // Validar que cada item tenga los campos requeridos
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!item.producto_id || !item.cantidad || !item.precio) {
      return {
        status: "error",
        message: `Item ${i + 1} incompleto: requiere producto_id, cantidad y precio.`,
      };
    }
    if (parseInt(item.cantidad) <= 0) {
      return {
        status: "error",
        message: `Item ${i + 1}: la cantidad debe ser mayor a 0.`,
      };
    }
    if (parseFloat(item.precio) < 0) {
      return {
        status: "error",
        message: `Item ${i + 1}: el precio no puede ser negativo.`,
      };
    }
  }

  const ss = getSpreadsheet();
  const sheetCompras = ss.getSheetByName(HOJA_COMPRAS);
  const sheetComprasDetalle = ss.getSheetByName(HOJA_COMPRAS_DETALLE);
  const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);
  const metodoPago = data.metodoPago || "efectivo";

  if (!sheetCompras || !sheetComprasDetalle || !sheetProductos) {
    return {
      status: "error",
      message: "Una o más hojas necesarias no existen.",
    };
  }

  const items = data.items;
  const proveedor = data.proveedor || "Sin proveedor";
  const proveedorTelefono = data.proveedorTelefono || "";
  let montoRecibido = parseFloat(data.montoRecibido) || 0;

  // Optimización: Cargar productos UNA sola vez y crear mapa O(1)
  const productosData = sheetProductos.getDataRange().getValues();
  const headers = productosData[0];

  const idCol = headers.indexOf("id");
  const nombreCol = headers.indexOf("nombre");
  const codigoCol = headers.indexOf("código");
  const stockCol = headers.indexOf("stock");

  // Crear mapa para búsqueda O(1)
  const productosMap = {};
  for (let i = 1; i < productosData.length; i++) {
    const prodId = String(productosData[i][idCol]);
    if (prodId) {
      productosMap[prodId] = {
        rowIndex: i,
        nombre: productosData[i][nombreCol] || "",
        codigo: productosData[i][codigoCol] || "",
        stock: parseFloat(productosData[i][stockCol]) || 0,
      };
    }
  }

  let subtotalGeneral = 0;
  let updatesStock = [];
  let itemsConNombre = [];

  for (let item of items) {
    const productoId = item.producto_id;
    const cantidad = parseInt(item.cantidad);
    const precio = parseFloat(item.precio);

    // Búsqueda O(1) usando el mapa
    const producto = productosMap[productoId];

    if (!producto) {
      return {
        status: "error",
        message: `Producto ID ${productoId} no encontrado.`,
      };
    }

    const nuevoStock = producto.stock + cantidad;
    updatesStock.push({ rowIndex: producto.rowIndex, nuevoStock });

    const subtotalItem = cantidad * precio;
    subtotalGeneral += subtotalItem;

    // Guardar nombre y código para devolver en la respuesta
    itemsConNombre.push({
      producto_id: productoId,
      nombre_producto: producto.nombre,
      codigo_producto: producto.codigo,
      cantidad: cantidad,
      precio_unitario: precio,
      subtotal: subtotalItem,
    });
  }

  const descuentoGlobalPct = Number(data.descuento_global_pct) || 0;
  const descuentoGlobal = subtotalGeneral * (descuentoGlobalPct / 100);
  const totalConDescuento = subtotalGeneral - descuentoGlobal;

  const valorEnvio = parseFloat(data.valor_envio) || 0;
  const totalFinal = totalConDescuento + valorEnvio;

  let cambio = 0;

  if (metodoPago === "efectivo") {
    cambio = montoRecibido - totalFinal;

    if (montoRecibido < totalFinal) {
      return {
        status: "warning",
        message: "El monto recibido es menor al total de la compra.",
      };
    }
  } else {
    montoRecibido = totalFinal;
    cambio = 0;
  }

  const compraId = generateUniqueAppId();
  const fecha = new Date();
  const consecutivo = getNextConsecutivoCompras();

  // 1️⃣ Registrar encabezado de compra
  try {
    const envioFlag =
      data.envio === true || data.envio === "true" ? "TRUE" : "FALSE";
    const direccionEntrega = data.direccion_entrega || "";

    sheetCompras.appendRow([
      compraId,
      fecha,
      proveedor,
      proveedorTelefono,
      subtotalGeneral,
      descuentoGlobalPct,
      totalFinal,
      metodoPago,
      montoRecibido,
      cambio,
      consecutivo,
      envioFlag,
      direccionEntrega,
      valorEnvio,
    ]);
  } catch (e) {
    return { status: "error", message: "Error al registrar compra." };
  }

  // 2️⃣ Registrar detalle de compra (usando datos ya calculados - optimización)
  try {
    for (let item of itemsConNombre) {
      const detalleId = generateUniqueAppId();

      sheetComprasDetalle.appendRow([
        detalleId,
        compraId,
        item.producto_id,
        item.nombre_producto,
        item.codigo_producto,
        item.cantidad,
        item.precio_unitario,
        item.subtotal,
      ]);
    }
  } catch (e) {
    sheetCompras.deleteRow(sheetCompras.getLastRow());
    return {
      status: "error",
      message: "Error al registrar detalle de compra.",
    };
  }

  // 3️⃣ Actualizar stocks individualmente (cada producto en su fila correcta)
  try {
    updatesStock.forEach((u) => {
      sheetProductos.getRange(u.rowIndex + 1, stockCol + 1).setValue(u.nuevoStock);
    });
  } catch (e) {
    return { status: "error", message: "Error al actualizar stock." };
  }

  return {
    status: "success",
    message: "Compra registrada correctamente.",
    total: totalFinal,
    cambio: cambio,
    compraId: compraId,
    consecutivo: consecutivo,
  };
}

function actualizarResumenDiario(
  totalFinal,
  items,
  comision,
  descuentoGlobalPct,
) {
  try {
    const ss = getSpreadsheet();
    const sheetResumen = ss.getSheetByName(HOJA_RESUMEN);
    const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);

    if (!sheetResumen || !sheetProductos) {
      Logger.log("actualizarResumenDiario: Hojas no encontradas");
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const data = sheetResumen.getDataRange().getValues();
    const headers = data[0];

    const fechaCol = headers.indexOf("fecha");
    const ventasCol = headers.indexOf("total_ventas");
    const gananciaCol = headers.indexOf("ganancia");
    const productosVendidosCol = headers.indexOf("productos_vendidos");

    // Validar que las columnas existan
    if (
      fechaCol === -1 ||
      ventasCol === -1 ||
      gananciaCol === -1 ||
      productosVendidosCol === -1
    ) {
      Logger.log("actualizarResumenDiario: Columnas no encontradas");
      return;
    }

    let rowIndex = -1;

    // Buscar si ya existe fila para hoy
    for (let i = 1; i < data.length; i++) {
      try {
        let fechaFila = new Date(data[i][fechaCol]);
        fechaFila.setHours(0, 0, 0, 0);
        if (fechaFila.getTime() === hoy.getTime()) {
          rowIndex = i;
          break;
        }
      } catch (e) {
        // Continuar si hay error con alguna fecha
        continue;
      }
    }

    // Calcular ganancia real
    const productosData = sheetProductos.getDataRange().getValues();
    const idCol = productosData[0].indexOf("id");
    const precioCompraCol = productosData[0].indexOf("precio_botella");
    const contenidoOzCol = productosData[0].indexOf("contenido_oz");

    if (idCol === -1 || precioCompraCol === -1) {
      Logger.log(
        "actualizarResumenDiario: Columnas de productos no encontradas",
      );
      return;
    }

    // Crear mapa para búsqueda O(1)
    const productosMap = {};
    for (let i = 1; i < productosData.length; i++) {
      const prodId = String(productosData[i][idCol]);
      if (prodId) {
        productosMap[prodId] = productosData[i];
      }
    }

    let gananciaTotal = 0;
    let totalProductosVendidos = 0;
    let costoTotal = 0;

    for (let item of items) {
      const productoRow = productosMap[item.producto_id];
      if (productoRow) {
        const precioBotella = parseFloat(productoRow[precioCompraCol]) || 0;
        const contenidoOz = contenidoOzCol !== -1
          ? parseFloat(productoRow[contenidoOzCol]) || 0
          : 0;
        const descuentoItemPct = Number(item.descuento_item_pct) || 0;

        const subtotalOriginal = (item.precio || item.precio_unitario) * item.cantidad;
        const descuentoItem = subtotalOriginal * (descuentoItemPct / 100);
        const subtotalFinal = subtotalOriginal - descuentoItem;

        // C5: Calcular costo proporcional al volumen vendido
        if (contenidoOz > 0 && item.cantidad_oz) {
          const costoPorOz = precioBotella / contenidoOz;
          costoTotal += costoPorOz * item.cantidad_oz;
        } else {
          costoTotal += precioBotella * item.cantidad;
        }
        gananciaTotal += subtotalFinal;

        totalProductosVendidos += item.cantidad;
      }
    }

    gananciaTotal = gananciaTotal - costoTotal - (parseFloat(comision) || 0);

    if (rowIndex === -1) {
      // Crear nueva fila: fecha, total_ventas, total_compras, ganancia, productos_vendidos
      sheetResumen.appendRow([
        hoy,
        totalFinal,
        costoTotal,
        gananciaTotal,
        totalProductosVendidos,
      ]);
    } else {
      // Actualizar cada columna individualmente para evitar mapeo incorrecto
      const actualesVentas = parseFloat(data[rowIndex][ventasCol]) || 0;
      const actualesGanancias = parseFloat(data[rowIndex][gananciaCol]) || 0;
      const actualesProductos =
        parseFloat(data[rowIndex][productosVendidosCol]) || 0;
      const totalComprasCol = headers.indexOf("total_compras");

      sheetResumen
        .getRange(rowIndex + 1, ventasCol + 1)
        .setValue(actualesVentas + totalFinal);

      if (totalComprasCol !== -1) {
        const actualesCompras = parseFloat(data[rowIndex][totalComprasCol]) || 0;
        sheetResumen
          .getRange(rowIndex + 1, totalComprasCol + 1)
          .setValue(actualesCompras + costoTotal);
      }

      sheetResumen
        .getRange(rowIndex + 1, gananciaCol + 1)
        .setValue(actualesGanancias + gananciaTotal);

      sheetResumen
        .getRange(rowIndex + 1, productosVendidosCol + 1)
        .setValue(actualesProductos + totalProductosVendidos);
    }
  } catch (e) {
    // No fallar la venta si el resumen falla
    Logger.log("Error en actualizarResumenDiario: " + e.message);
  }
}

// ----------------------------------------------------------------------
// FUNCIÓN PARA OBTENER RESUMEN DIARIO
// ----------------------------------------------------------------------
function getResumenDiario() {
  return getData(HOJA_RESUMEN);
}

// ----------------------------------------------------------------------
// FUNCIONES DE UTILIDAD GENERAL
// ----------------------------------------------------------------------
function getData(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      status: "error",
      message: `Pestaña '${sheetName}' vacía o no existe.`,
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Validar que haya headers
  if (!headers || headers.length === 0 || !headers[0]) {
    return {
      status: "error",
      message: `Pestaña '${sheetName}' sin encabezados válidos.`,
    };
  }

  const rows = data.slice(1);

  const mappedData = rows.map((row) => {
    let entry = {};
    headers.forEach((header, index) => {
      let value = row[index];

      // Manejar valores vacíos
      if (value === "" || value === null || value === undefined) {
        value = "";
      }
      // Si es número, mantenerlo como número
      else if (typeof value === "number") {
        value = value;
      }
      // Si es string que representa número, convertirlo a número
      else if (
        typeof value === "string" &&
        !isNaN(value) &&
        value.trim() !== ""
      ) {
        // Para códigos, mantener como string si tiene letras
        if (header === "código" && /[a-zA-Z]/.test(value)) {
          value = value; // Mantener como string
        } else {
          value = parseFloat(value);
        }
      }
      // Si es fecha, dejarla como está
      else if (value instanceof Date) {
        // Mantener como Date
      }
      // Para cualquier otro caso, asegurar que sea string
      else {
        value = String(value);
      }

      entry[header] = value;
    });
    return entry;
  });

  // Filtrar filas completamente vacías
  const filteredData = mappedData.filter((entry) => {
    return Object.values(entry).some((value) => value !== "" && value !== null);
  });

  return { status: "success", data: filteredData };
}

// ----------------------------------------------------------------------
// FUNCIONES DE CONFIGURACIÓN DE BASE DE DATOS
// ----------------------------------------------------------------------
function createOrResetSheet(ss, name, headers) {
  const existingSheet = ss.getSheetByName(name);

  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }

  const sheet = ss.insertSheet(name);

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  return `Pestaña '${name}' creada o reiniciada correctamente.`;
}

function iniciarBaseDeDatos() {
  const ss = getSpreadsheet();
  let msg = [];

  msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_BAR_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
  msg.push(
    createOrResetSheet(ss, HOJA_COMPRAS_DETALLE, COMPRAS_DETALLE_HEADERS),
  );
  msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_POS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_VENTAS_DETALLE, VENTAS_DETALLE_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_GASTOS, GASTOS_HEADERS));
  msg.push(
    createOrResetSheet(ss, HOJA_APROVECHAMIENTOS, APROVECHAMIENTOS_HEADERS),
  );
  msg.push(createOrResetSheet(ss, HOJA_CIERRES, CIERRES_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_ZONAS, ZONAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_MESAS, MESAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_RECETAS, RECETAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_CUENTAS, CUENTAS_HEADERS));
  PropertiesService.getScriptProperties().deleteProperty(
    "ULTIMO_CONSECUTIVO_VENTAS",
  );
  PropertiesService.getScriptProperties().deleteProperty(
    "ULTIMO_CONSECUTIVO_COMPRAS",
  );

  return {
    status: "success",
    message: `Base de datos inicializada: ${msg.join(" ")}`,
  };
}

function resetearBaseDeDatos() {
  const ss = getSpreadsheet();
  let msg = [];

  ss.getSheets().forEach((sheet) => {
    if (sheet.getName() !== "Hoja 1") {
      ss.deleteSheet(sheet);
      msg.push(`Pestaña '${sheet.getName()}' eliminada.`);
    }
  });

  msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_BAR_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
  msg.push(
    createOrResetSheet(ss, HOJA_COMPRAS_DETALLE, COMPRAS_DETALLE_HEADERS),
  );
  msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_POS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_VENTAS_DETALLE, VENTAS_DETALLE_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_GASTOS, GASTOS_HEADERS));
  msg.push(
    createOrResetSheet(ss, HOJA_APROVECHAMIENTOS, APROVECHAMIENTOS_HEADERS),
  );
  msg.push(createOrResetSheet(ss, HOJA_CIERRES, CIERRES_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_ZONAS, ZONAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_MESAS, MESAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_RECETAS, RECETAS_HEADERS));
  msg.push(createOrResetSheet(ss, HOJA_CUENTAS, CUENTAS_HEADERS));
  PropertiesService.getScriptProperties().deleteProperty(
    "ULTIMO_CONSECUTIVO_VENTAS",
  );
  PropertiesService.getScriptProperties().deleteProperty(
    "ULTIMO_CONSECUTIVO_COMPRAS",
  );

  return {
    status: "success",
    message: `Base de datos reseteada completamente: ${msg.join(" ")}`,
  };
}

function getVentaDetalle(idVenta) {
  const ss = getSpreadsheet();

  const sheetVentas = ss.getSheetByName(HOJA_VENTAS);
  const sheetDetalle = ss.getSheetByName(HOJA_VENTAS_DETALLE);

  if (!sheetVentas || !sheetDetalle) {
    return {
      status: "error",
      message: "No se encontraron las hojas necesarias.",
    };
  }

  const ventasData = sheetVentas.getDataRange().getValues();
  const detalleData = sheetDetalle.getDataRange().getValues();

  if (ventasData.length < 2) {
    return {
      status: "error",
      message: "No hay ventas registradas.",
    };
  }

  const headersVentas = ventasData[0];
  const headersDetalle = detalleData[0];

  // Obtener índices de columnas dinámicamente
  const ventaIdCol = headersVentas.indexOf("id_venta");
  const detalleVentaIdCol = headersDetalle.indexOf("id_venta");

  if (ventaIdCol === -1) {
    return {
      status: "error",
      message: "Columna id_venta no encontrada en Ventas.",
    };
  }

  // Buscar venta por ID usando índice dinámico
  const ventaRow = ventasData.find(
    (row, i) => i > 0 && String(row[ventaIdCol]) === String(idVenta),
  );

  if (!ventaRow) {
    return {
      status: "error",
      message: "Venta no encontrada.",
    };
  }

  const venta = {};
  headersVentas.forEach((h, i) => (venta[h] = ventaRow[i]));

  // Buscar detalles usando índice dinámico
  const items = detalleData
    .filter(
      (row, i) =>
        i > 0 &&
        detalleVentaIdCol !== -1 &&
        String(row[detalleVentaIdCol]) === String(idVenta),
    )
    .map((row) => {
      const obj = {};
      headersDetalle.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });

  return {
    status: "success",
    venta: venta,
    items: items,
  };
}

// ================= FUNCIONES FINANCIERAS =================

function registrarGasto(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(HOJA_GASTOS);

  if (!sheet)
    return {
      status: "error",
      message: "Hoja de Gastos no existe. Use Iniciar DB.",
    };

  const id = generateUniqueAppId();
  const newRow = [
    id,
    new Date(),
    parseFloat(data.monto) || 0,
    data.categoria,
    data.concepto,
    data.metodo_pago || "efectivo",
    data.usuario || "",
  ];

  try {
    sheet.appendRow(newRow);
    return { status: "success", message: "Gasto registrado." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function registrarAprovechamiento(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(HOJA_APROVECHAMIENTOS);

  if (!sheet)
    return {
      status: "error",
      message: "Hoja de Aprovechamientos no existe. Use Iniciar DB.",
    };

  const id = generateUniqueAppId();
  const newRow = [
    id,
    new Date(),
    parseFloat(data.monto) || 0,
    data.categoria,
    data.concepto,
    data.metodo_pago || "efectivo",
    data.usuario || "",
  ];

  try {
    sheet.appendRow(newRow);
    return { status: "success", message: "Aprovechamiento registrado." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function conciliarVenta(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(HOJA_VENTAS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf("id_venta");
  const ingCol = headers.indexOf("ingresado");

  if (idCol === -1 || ingCol === -1)
    return { status: "error", message: "Columnas no encontradas." };

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol]) === String(data.id_venta),
  );

  if (rowIndex === -1)
    return { status: "error", message: "Venta no encontrada." };

  try {
    sheet.getRange(rowIndex + 1, ingCol + 1).setValue("TRUE");
    return { status: "success", message: "Venta conciliada correctamente." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function eliminarGasto(data) {
  const ss = getSpreadsheet();
  const tipo = data.tipo || "gasto";
  const id = data.id;

  let sheet;
  let idCol;

  if (tipo === "aprovecho") {
    sheet = ss.getSheetByName(HOJA_APROVECHAMIENTOS);
    idCol = "id_aprovecho";
  } else {
    sheet = ss.getSheetByName(HOJA_GASTOS);
    idCol = "id_gasto";
  }

  if (!sheet) return { status: "error", message: "Hoja no existe." };

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIndex = headers.indexOf(idCol);

  if (idIndex === -1)
    return { status: "error", message: "Columna ID no encontrada." };

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idIndex]) === String(id),
  );

  if (rowIndex === -1)
    return { status: "error", message: "Registro no encontrado." };

  try {
    sheet.deleteRow(rowIndex + 1);
    return { status: "success", message: "Registro eliminado." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

// ================================================================
// FUNCIONES DEL BAR - THE HERMIT COCKTAIL BAR
// ================================================================

function obtenerZonas() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_ZONAS);
    if (!sheet) return { status: "success", data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: "success", data: [] };
    const headers = data[0];
    const zonas = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const zona = {};
      headers.forEach((h, idx) => {
        zona[h] = row[idx];
      });
      zonas.push(zona);
    }
    return { status: "success", data: zonas };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function crearZona(data) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_ZONAS);
    if (!sheet) {
      sheet = ss.insertSheet(HOJA_ZONAS);
      sheet.appendRow(ZONAS_HEADERS);
    }
    const id_zona = "ZONA-" + new Date().getTime();
    const rowData = [
      id_zona,
      data.nombre || "Nueva Zona",
      data.color || "#3498db",
      data.activa !== false && data.activa !== "false" ? true : false,
    ];
    sheet.appendRow(rowData);
    return { status: "success", message: "Zona creada.", id_zona };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function actualizarZona(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_ZONAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Zonas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_zona");
    if (idIndex === -1)
      return { status: "error", message: "Columna id_zona no encontrada." };
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(data.id_zona),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Zona no encontrada." };
    const rowNum = rowIndex + 1;
    if (data.nombre !== undefined) {
      const colIdx = headers.indexOf("nombre");
      if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(data.nombre);
    }
    if (data.color !== undefined) {
      const colIdx = headers.indexOf("color");
      if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(data.color);
    }
    if (data.activa !== undefined) {
      const colIdx = headers.indexOf("activa");
      if (colIdx !== -1) sheet.getRange(rowNum, colIdx + 1).setValue(data.activa);
    }
    return { status: "success", message: "Zona actualizada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function eliminarZona(id_zona) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_ZONAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Zonas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_zona");
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(id_zona),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Zona no encontrada." };
    sheet.deleteRow(rowIndex + 1);
    return { status: "success", message: "Zona eliminada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function obtenerMesas() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_MESAS);
    if (!sheet) return { status: "success", data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: "success", data: [] };
    const headers = data[0];
    const mesas = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const mesa = {};
      headers.forEach((h, idx) => {
        mesa[h] = row[idx];
      });
      mesas.push(mesa);
    }
    return { status: "success", data: mesas };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function crearMesa(data) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_MESAS);
    if (!sheet) {
      sheet = ss.insertSheet(HOJA_MESAS);
      sheet.appendRow(MESAS_HEADERS);
    }
    const id_mesa = "MESA-" + new Date().getTime();
    const rowData = [
      id_mesa,
      data.nombre || "Mesa " + id_mesa.slice(-4),
      data.capacidad || 4,
      data.forma || "circular",
      data.posicion_x || 10,
      data.posicion_y || 10,
      data.ancho || 80,
      data.alto || 80,
      data.estado || "disponible",
      data.id_zona || "",
      data.observaciones || "",
    ];
    sheet.appendRow(rowData);
    return { status: "success", message: "Mesa creada.", id_mesa };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function actualizarMesa(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_MESAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Mesas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_mesa");
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(data.id_mesa),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Mesa no encontrada." };
    const rowNum = rowIndex + 1;
    const campos = [
      "nombre",
      "capacidad",
      "forma",
      "posicion_x",
      "posicion_y",
      "ancho",
      "alto",
      "estado",
      "id_zona",
      "observaciones",
    ];
    campos.forEach((campo) => {
      if (data[campo] !== undefined) {
        const colIdx = headers.indexOf(campo);
        if (colIdx !== -1)
          sheet.getRange(rowNum, colIdx + 1).setValue(data[campo]);
      }
    });
    return { status: "success", message: "Mesa actualizada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function eliminarMesa(id_mesa) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_MESAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Mesas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_mesa");
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(id_mesa),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Mesa no encontrada." };
    sheet.deleteRow(rowIndex + 1);
    return { status: "success", message: "Mesa eliminada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function obtenerRecetas() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_RECETAS);
    if (!sheet) return { status: "success", data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: "success", data: [] };
    const headers = data[0];
    const recetas = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const receta = {};
      headers.forEach((h, idx) => {
        if (h === "ingredientes" && row[idx]) {
          try {
            receta[h] = JSON.parse(row[idx]);
          } catch (e) {
            receta[h] = [];
          }
        } else if (h === "disponible") {
          receta[h] = row[idx] !== false && row[idx] !== "false";
        } else {
          receta[h] = row[idx];
        }
      });
      recetas.push(receta);
    }
    return { status: "success", data: recetas };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function crearReceta(data) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_RECETAS);
    if (!sheet) {
      sheet = ss.insertSheet(HOJA_RECETAS);
      sheet.appendRow(RECETAS_HEADERS);
    }
    const id_receta = "REC-" + new Date().getTime();
    const now = new Date();
    const costoTotal = calcularCostoReceta(data.ingredientes || []);
    const rowData = [
      id_receta,
      data.nombre || "",
      data.categoria || "Cóctel",
      data.descripcion || "",
      data.imagen || "",
      parseFloat(data.precio_venta) || 0,
      costoTotal,
      JSON.stringify(data.ingredientes || []),
      data.disponible !== false && data.disponible !== "false",
      now,
      now,
    ];
    sheet.appendRow(rowData);
    return {
      status: "success",
      message: "Receta creada.",
      id_receta,
      costo_total: costoTotal,
    };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function calcularCostoReceta(ingredientes) {
  try {
    if (!ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) return 0;
    const ss = getSpreadsheet();
    const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);
    if (!sheetProductos) return 0;
    const dataProductos = sheetProductos.getDataRange().getValues();
    const headers = dataProductos[0];
    const idCol = headers.indexOf("id");
    const precioBotellaCol = headers.indexOf("precio_botella");
    const contenidoOzCol = headers.indexOf("contenido_oz");
    if (idCol === -1 || precioBotellaCol === -1 || contenidoOzCol === -1) return 0;

    const productoMap = {};
    for (let i = 1; i < dataProductos.length; i++) {
      const pid = String(dataProductos[i][idCol]);
      const precioBotella = parseFloat(dataProductos[i][precioBotellaCol]) || 0;
      const contenidoOz = parseFloat(dataProductos[i][contenidoOzCol]) || 0;
      if (precioBotella > 0 && contenidoOz > 0) {
        productoMap[pid] = precioBotella / contenidoOz;
      }
    }

    let costo = 0;
    ingredientes.forEach((ing) => {
      const costoPorOz = productoMap[String(ing.producto_id)];
      if (costoPorOz) {
        costo += costoPorOz * (parseFloat(ing.cantidad_oz) || 0);
      }
    });
    return Math.round(costo * 100) / 100;
  } catch (e) {
    return 0;
  }
}

function actualizarReceta(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_RECETAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Recetas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_receta");
    if (idIndex === -1)
      return { status: "error", message: "Columna id_receta no encontrada." };
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(data.id_receta),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Receta no encontrada." };
    const rowNum = rowIndex + 1;

    const campos = ["nombre", "categoria", "descripcion", "imagen", "precio_venta", "ingredientes", "costo_total", "disponible"];
    campos.forEach((campo) => {
      if (data[campo] !== undefined) {
        const colIdx = headers.indexOf(campo);
        if (colIdx !== -1) {
          let valor = data[campo];
          if (campo === "precio_venta") valor = parseFloat(valor);
          else if (campo === "ingredientes") valor = JSON.stringify(valor);
          else if (campo === "costo_total") valor = calcularCostoReceta(data.ingredientes || []);
          sheet.getRange(rowNum, colIdx + 1).setValue(valor);
        }
      }
    });

    // M2: Always recalculate costo_total when ingredients change
    if (data.ingredientes !== undefined) {
      const costoColIdx = headers.indexOf("costo_total");
      if (costoColIdx !== -1) {
        const costoCalculado = calcularCostoReceta(data.ingredientes);
        sheet.getRange(rowNum, costoColIdx + 1).setValue(costoCalculado);
      }
    }

    const fechaModIdx = headers.indexOf("fecha_modificado");
    if (fechaModIdx !== -1) {
      sheet.getRange(rowNum, fechaModIdx + 1).setValue(new Date());
    }

    return { status: "success", message: "Receta actualizada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function eliminarReceta(id_receta) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_RECETAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Recetas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_receta");
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(id_receta),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Receta no encontrada." };
    sheet.deleteRow(rowIndex + 1);
    return { status: "success", message: "Receta eliminada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function obtenerCuentas(estado) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_CUENTAS);
    if (!sheet) return { status: "success", data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: "success", data: [] };
    const headers = data[0];
    let cuentas = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const cuenta = {};
      headers.forEach((h, idx) => {
        if (h === "items" && row[idx]) {
          try {
            cuenta[h] = JSON.parse(row[idx]);
          } catch (e) {
            cuenta[h] = [];
          }
        } else {
          cuenta[h] = row[idx];
        }
      });
      cuentas.push(cuenta);
    }
    if (estado) {
      cuentas = cuentas.filter((c) => c.estado === estado);
    }
    return { status: "success", data: cuentas };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function abrirCuenta(data) {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_CUENTAS);
    if (!sheet) {
      sheet = ss.insertSheet(HOJA_CUENTAS);
      sheet.appendRow(CUENTAS_HEADERS);
    }
    const id_cuenta = "CTA-" + (new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 9)).toUpperCase();
    const now = new Date();
    const rowData = [
      id_cuenta,
      data.id_mesa || "",
      data.nombre_mesa || "",
      data.id_silla || "",
      now,
      "abierta",
      JSON.stringify(data.items || []),
      0,
      0,
      0,
      data.observaciones || "",
      data.usuario || "Admin",
    ];
    sheet.appendRow(rowData);
    return { status: "success", message: "Cuenta abierta.", id_cuenta };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function agregarItemCuenta(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_CUENTAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Cuentas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_cuenta");
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(data.id_cuenta),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Cuenta no encontrada." };
    const rowNum = rowIndex + 1;
    const itemsCol = headers.indexOf("items");
    const items = JSON.parse(dataRange[rowIndex][itemsCol] || "[]");
    items.push(data.item);
    sheet.getRange(rowNum, itemsCol + 1).setValue(JSON.stringify(items));
    const subtotalCol = headers.indexOf("subtotal");
    const totalCol = headers.indexOf("total");
    const nuevoSubtotal = items.reduce(
      (sum, it) => sum + (it.subtotal || 0),
      0,
    );
    sheet.getRange(rowNum, subtotalCol + 1).setValue(nuevoSubtotal);
    sheet.getRange(rowNum, totalCol + 1).setValue(nuevoSubtotal);
    return { status: "success", message: "Item agregado.", items: items };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function cerrarCuenta(data) {
  try {
    const ss = getSpreadsheet();
    const sheetCuentas = ss.getSheetByName(HOJA_CUENTAS);
    const sheetVentas = ss.getSheetByName(HOJA_VENTAS);
    const sheetDetalle = ss.getSheetByName(HOJA_VENTAS_DETALLE);
    if (!sheetCuentas)
      return { status: "error", message: "Hoja de Cuentas no encontrada." };
    const dataRange = sheetCuentas.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_cuenta");
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(data.id_cuenta),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Cuenta no encontrada." };
    const rowNum = rowIndex + 1;
    
    // Obtener items de la cuenta para registrar la venta
    const itemsCol = headers.indexOf("items");
    const items = data.items && Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : JSON.parse(dataRange[rowIndex][itemsCol] || "[]");
    
    const estadoCol = headers.indexOf("estado");
    sheetCuentas.getRange(rowNum, estadoCol + 1).setValue(data.estado || "cerrada");
    if (data.descuento !== undefined) {
      const descCol = headers.indexOf("descuento");
      sheetCuentas.getRange(rowNum, descCol + 1).setValue(data.descuento);
      const totalCol = headers.indexOf("total");
      const subtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
      sheetCuentas.getRange(rowNum, totalCol + 1).setValue(subtotal - data.descuento);
    }
    
    // Registrar la venta en VENTAS y VENTAS_DETALLE
    if (sheetVentas && sheetDetalle && items.length > 0) {
      const ventaId = generateUniqueAppId();
      const fecha = new Date();
      const consecutivo = getNextConsecutivoVentas();
      const metodoPago = data.forma_pago || "efectivo";
      const montoRecibido = parseFloat(data.monto_recibido) || 0;
      const cambio = parseFloat(data.cambio) || 0;
      const descuento = parseFloat(data.descuento) || 0;
      
      const subtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
      const total = subtotal - descuento;
      
      // Registrar encabezado de venta
      sheetVentas.appendRow([
        ventaId,
        fecha,
        data.nombre_mesa || "Cuenta",
        data.cliente_documento || "",
        data.cliente_telefono || "",
        subtotal,
        descuento > 0 ? (descuento / subtotal * 100) : 0,
        total,
        metodoPago,
        0,
        montoRecibido || total,
        cambio,
        consecutivo,
        "FALSE",
        "",
        0,
        "TRUE",
      ]);
      
      // Registrar detalle
      items.forEach(item => {
        const detalleId = generateUniqueAppId();
        let ingredientesStr = "";
        if (item.ingredientes && Array.isArray(item.ingredientes)) {
          ingredientesStr = item.ingredientes
            .map(ing => `${ing.nombre_producto || ing.nombre}: ${ing.cantidad_oz} oz`)
            .join(", ");
        }
        sheetDetalle.appendRow([
          detalleId,
          ventaId,
          item.producto_id || "",
          item.nombre || "",
          item.codigo || "",
          item.cantidad || 1,
          item.precio_unitario || 0,
          item.descuento_pct || 0,
          (item.cantidad || 1) * (item.precio_unitario || 0),
          item.subtotal || 0,
          metodoPago,
          ingredientesStr,
        ]);
      });

      // Descontar inventario (C2)
      const itemsParaDescontar = items.map(item => ({
        tipo: item.tipo || "receta",
        producto_id: item.producto_id,
        receta_id: item.receta_id,
        cantidad: item.cantidad || 1,
        cantidad_oz: item.cantidad_oz || 0,
      }));
      descontarInventarioPorVenta(itemsParaDescontar);

      // Actualizar resumen diario (C3)
      actualizarResumenDiario(total, items, 0, 0);
    }
    
    return { status: "success", message: "Cuenta cerrada y venta registrada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function eliminarCuenta(id_cuenta) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_CUENTAS);
    if (!sheet)
      return { status: "error", message: "Hoja de Cuentas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_cuenta");
    const rowIndex = dataRange.findIndex(
      (row, i) => i > 0 && String(row[idIndex]) === String(id_cuenta),
    );
    if (rowIndex === -1)
      return { status: "error", message: "Cuenta no encontrada." };
    sheet.deleteRow(rowIndex + 1);
    return { status: "success", message: "Cuenta eliminada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function descontarInventarioPorVenta(items) {
  try {
    const ss = getSpreadsheet();
    const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);
    if (!sheetProductos)
      return { status: "error", message: "Hoja de Productos no encontrada." };
    const dataProductos = sheetProductos.getDataRange().getValues();
    const headers = dataProductos[0];
    const idCol = headers.indexOf("id");
    const stockCol = headers.indexOf("stock");
    const precioOnzaCol = headers.indexOf("precio_onza");

    if (precioOnzaCol === -1) {
      return { status: "error", message: "Columna precio_onza no encontrada." };
    }

    // Acumular deducciones por producto para evitar stale snapshot
    const deducciones = {}; // { productoId: { rowIndex, stockInicial, precioOnza, totalOz } }
    let totalCosto = 0;

    items.forEach((item) => {
      if (item.tipo === "producto" && item.cantidad_oz) {
        for (let i = 1; i < dataProductos.length; i++) {
          if (String(dataProductos[i][idCol]) === String(item.producto_id)) {
            const pid = String(item.producto_id);
            if (!deducciones[pid]) {
              deducciones[pid] = {
                rowIndex: i,
                stockInicial: parseFloat(dataProductos[i][stockCol]) || 0,
                precioOnza: parseFloat(dataProductos[i][precioOnzaCol]) || 0,
                totalOz: 0,
              };
            }
            deducciones[pid].totalOz += item.cantidad_oz;
            totalCosto += item.cantidad_oz * deducciones[pid].precioOnza;
            break;
          }
        }
      } else if (item.tipo === "receta" && item.receta_id) {
        const recetaData = obtenerRecetaPorId(item.receta_id);
        if (recetaData && recetaData.status === "success" && recetaData.data && recetaData.data.ingredientes) {
          const ingredientes =
            typeof recetaData.data.ingredientes === "string"
              ? JSON.parse(recetaData.data.ingredientes)
              : recetaData.data.ingredientes;
          ingredientes.forEach((ing) => {
            for (let i = 1; i < dataProductos.length; i++) {
              if (String(dataProductos[i][idCol]) === String(ing.producto_id)) {
                const pid = String(ing.producto_id);
                const ozNeeded = ing.cantidad_oz * item.cantidad;
                if (!deducciones[pid]) {
                  deducciones[pid] = {
                    rowIndex: i,
                    stockInicial: parseFloat(dataProductos[i][stockCol]) || 0,
                    precioOnza: parseFloat(dataProductos[i][precioOnzaCol]) || 0,
                    totalOz: 0,
                  };
                }
                deducciones[pid].totalOz += ozNeeded;
                totalCosto += ozNeeded * deducciones[pid].precioOnza;
                break;
              }
            }
          });
        }
      }
    });

    // Aplicar todas las deducciones al final (evita stale snapshot)
    const stockInsuficiente = [];
    Object.keys(deducciones).forEach((pid) => {
      const d = deducciones[pid];
      const nuevoStock = Math.max(0, d.stockInicial - d.totalOz);
      sheetProductos.getRange(d.rowIndex + 1, stockCol + 1).setValue(nuevoStock);
      if (d.totalOz > d.stockInicial) {
        stockInsuficiente.push({
          producto_id: pid,
          stock_disponible: d.stockInicial,
          oz_necesarias: d.totalOz,
        });
      }
    });

    const result = { status: "success", costo_total: totalCosto };
    if (stockInsuficiente.length > 0) {
      result.stock_insuficiente = stockInsuficiente;
      result.warning = "Stock insuficiente para algunos productos. Se descontó hasta 0.";
    }
    return result;
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function obtenerRecetaPorId(id_receta) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_RECETAS);
    if (!sheet) return { status: "error", message: "Hoja de Recetas no encontrada." };
    const dataRange = sheet.getDataRange().getValues();
    const headers = dataRange[0];
    const idIndex = headers.indexOf("id_receta");
    for (let i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][idIndex]) === String(id_receta)) {
        const receta = {};
        headers.forEach((h, idx) => {
          if (h === "ingredientes" && dataRange[i][idx]) {
            try {
              receta[h] = JSON.parse(dataRange[i][idx]);
            } catch (e) {
              receta[h] = [];
            }
          } else if (h === "disponible") {
            receta[h] = dataRange[i][idx] !== false && dataRange[i][idx] !== "false";
          } else {
            receta[h] = dataRange[i][idx];
          }
        });
        return { status: "success", data: receta };
      }
    }
    return { status: "error", message: "Receta no encontrada." };
  } catch (e) {
    return { status: "error", message: e.message };
  }
}
