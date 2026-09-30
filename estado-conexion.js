// ==========================================================
// ESTADO DE CONEXIÓN PERSISTENTE (v1.0)
// ==========================================================
// Este módulo guarda y restaura el estado de conexión
// de la mano robótica en TODAS las páginas
// sin afectar el código existente
// ==========================================================

const STORAGE_KEY = "mano_robotica_conexion";
const STORAGE_PUERTO_KEY = "mano_robotica_puerto";
const STORAGE_BAUDRATE_KEY = "mano_robotica_baudrate";

class GestorConexionPersistente {
  constructor() {
    this.estado = this.cargarEstado();
    this.puerto = null;
    this.escritor = null;
    this.lector = null;
  }

  // GUARDAR ESTADO EN STORAGE
  guardarEstado() {
    const datosGuardar = {
      conectado: this.estado.conectado,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(datosGuardar));
    console.log("[PERSISTENCIA] Estado guardado:", datosGuardar);
  }

  // CARGAR ESTADO DESDE STORAGE
  cargarEstado() {
    try {
      const datos = sessionStorage.getItem(STORAGE_KEY);
      if (datos) {
        const estado = JSON.parse(datos);
        console.log("[PERSISTENCIA] Estado restaurado:", estado);
        return estado;
      }
    } catch (error) {
      console.error("[PERSISTENCIA] Error al cargar estado:", error);
    }
    
    return { conectado: false, timestamp: null, version: "1.0" };
  }

  // MARCAR COMO CONECTADO
  marcarConectado() {
    this.estado.conectado = true;
    this.estado.timestamp = new Date().toISOString();
    this.guardarEstado();
    this.actualizarVisualGlobal();
    console.log("[PERSISTENCIA] ✅ Marcado como conectado");
  }

  // MARCAR COMO DESCONECTADO
  marcarDesconectado() {
    this.estado.conectado = false;
    this.estado.timestamp = new Date().toISOString();
    this.guardarEstado();
    this.actualizarVisualGlobal();
    console.log("[PERSISTENCIA] ❌ Marcado como desconectado");
  }

  // OBTENER ESTADO ACTUAL
  estaConectado() {
    return Boolean(this.estado.conectado);
  }

  // ACTUALIZAR TODOS LOS INDICADORES VISUALES
  actualizarVisualGlobal() {
    const conectado = this.estaConectado();
    
    // Actualizar indicadores de conexión
    document.querySelectorAll("[data-link-status]").forEach(elemento => {
      elemento.textContent = conectado ? "ONLINE" : "OFFLINE";
      elemento.classList.toggle("enlace-online", conectado);
    });

    // Actualizar estado del dashboard
    document.querySelectorAll("[data-dashboard-status]").forEach(elemento => {
      elemento.textContent = conectado 
        ? "Sistema conectado" 
        : "Sistema desconectado";
    });

    // Actualizar botones de conexión
    const botonConectar = document.getElementById("boton-conectar");
    const botonDesconectar = document.getElementById("boton-desconectar");
    
    if (botonConectar) {
      botonConectar.disabled = conectado;
    }
    if (botonDesconectar) {
      botonDesconectar.disabled = !conectado;
    }

    // Actualizar pulsos de enlace
    document.querySelectorAll(".pulso-enlace").forEach(elemento => {
      elemento.classList.toggle("enlace-online", conectado);
    });

    console.log("[PERSISTENCIA] Visual actualizado - Conectado:", conectado);
  }

  // LIMPIAR ESTADO (cuando se desconecta intencionalmente)
  limpiar() {
    sessionStorage.removeItem(STORAGE_KEY);
    this.estado = { conectado: false, timestamp: null, version: "1.0" };
    console.log("[PERSISTENCIA] Estado limpiado");
  }

  // SINCRONIZAR CON CONTEXTO GLOBAL (si existe)
  sincronizarConContexto() {
    if (typeof contexto !== 'undefined') {
      if (this.estaConectado() !== contexto.conectado) {
        console.log("[PERSISTENCIA] Sincronizando con contexto global");
        contexto.conectado = this.estaConectado();
      }
    }
  }
}

// INSTANCIA GLOBAL
const gestorConexion = new GestorConexionPersistente();

// INICIALIZAR AL CARGAR
document.addEventListener("DOMContentLoaded", () => {
  console.log("[PERSISTENCIA] Inicializando gestor de conexión persistente...");
  gestorConexion.actualizarVisualGlobal();
  gestorConexion.sincronizarConContexto();
});

// MONITOREAR CAMBIOS EN EL CONTEXTO
if (typeof contexto !== 'undefined') {
  setInterval(() => {
    gestorConexion.sincronizarConContexto();
  }, 500);
}

// ACTUALIZAR VISUAL PERIÓDICAMENTE
setInterval(() => {
  gestorConexion.actualizarVisualGlobal();
}, 1000);

// LIMPIAR AL CERRAR LA VENTANA (opcional)
// window.addEventListener("beforeunload", () => {
//   gestorConexion.guardarEstado();
// });
