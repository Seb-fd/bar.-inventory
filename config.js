// ================================================================
// CONFIGURACIÓN DE THE HERMIT COCKTAIL BAR
// ================================================================

const BAR_CONFIG = {
  nombre: "The Hermit Cocktail Bar",
  ConversionOZ_ML: 29.5735,
  ConversionML_OZ: 0.033814,
  umbralesStock: {
    critico: 5,
    bajo: 10,
    normal: 50,
  },
  estadoMesas: {
    disponible: "disponible",
    ocupada: "ocupada",
    reservada: "reservada",
    mantenimiento: "mantenimiento",
  },
  estadoCuentas: {
    abierta: "abierta",
    cerrada: "cerrada",
    pagada: "pagada",
  },
  categoriasRecetas: [
    "Cóctel",
    "Shot",
    "Bebida sin alcohol",
    "Combinado",
    "Comida",
  ],
  unidadesMedida: {
    onza: "oz",
    mililitro: "ml",
    botella: "botella",
  },
};

function convertirUnidad(valor, desde, hasta) {
  if (desde === hasta) return valor;
  if (desde === "oz" && hasta === "ml") {
    return valor * BAR_CONFIG.ConversionOZ_ML;
  }
  if (desde === "ml" && hasta === "oz") {
    return valor * BAR_CONFIG.ConversionML_OZ;
  }
  return valor;
}

function formatStock(stockOnzas) {
  const ml = stockOnzas * BAR_CONFIG.ConversionOZ_ML;
  return `${stockOnzas.toFixed(1)} oz / ${ml.toFixed(0)} ml`;
}

function getStockNivel(stockOnzas) {
  if (stockOnzas <= BAR_CONFIG.umbralesStock.critico) return { nivel: "critico", color: "#e74c3c" };
  if (stockOnzas <= BAR_CONFIG.umbralesStock.bajo) return { nivel: "bajo", color: "#f39c12" };
  return { nivel: "normal", color: "#27ae60" };
}

function calcularCostoOnza(precioBotella, contenidoOz) {
  return precioBotella / contenidoOz;
}

function calcularContenidoOz(volumenMl) {
  return volumenMl * BAR_CONFIG.ConversionML_OZ;
}