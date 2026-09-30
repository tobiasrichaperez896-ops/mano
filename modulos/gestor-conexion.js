// ==========================================================
// GESTOR DE CONEXIÓN PERSISTENTE (v2.0)
// ==========================================================
// Almacena estado en localStorage (persiste entre sesiones)
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
    this.callbacks = [];
  }

  // REGISTRAR CALLBACK PARA CAMBIOS DE ESTADO
  onCambioEstado(callback) {
    this.callbacks.push(callback);
  }

  // NOTIFICAR CAMBIOS
  notificarCambio() {
    this.callbacks.forEach(callback => callback(this.estado.conectado));
  }

  // GUARDAR ESTADO EN localStorage (PERSISTE)
  guardarEstado() {
    const datosGuardar = {
      conectado: this.estado.conectado,
      timestamp: new Date().toISOString(),
      version: "2.0"
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datosGuardar));
    console.log("[PERSISTENCIA] Estado guardado en localStorage:", datosGuardar);
  }

  // CARGAR ESTADO DESDE localStorage
  cargarEstado() {
    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      if (datos) {
        const estado = JSON.parse(datos);
        console.log("[PERSISTENCIA] Estado restaurado desde localStorage:", estado);
        return estado;
      }
    } catch (error) {
      console.error("[PERSISTENCIA] Error al cargar estado:", error);
    }
    
    return { conectado: false, timestamp: null, version: "2.0" };
  }

  // GUARDAR DATOS DE PUERTO
  guardarPuerto(puertoInfo) {
    if (puertoInfo) {
      localStorage.setItem(STORAGE_PUERTO_KEY, JSON.stringify(puertoInfo));
      console.log("[PERSISTENCIA] Puerto guardado:", puertoInfo);
    }
  }

  // CARGAR DATOS DE PUERTO
  cargarPuerto() {
    try {
      const datos = localStorage.getItem(STORAGE_PUERTO_KEY);
      return datos ? JSON.parse(datos) : null;
    } catch (error) {
      console.error("[PERSISTENCIA] Error al cargar puerto:", error);
      return null;
    }
  }

  // MARCAR COMO CONECTADO
  marcarConectado() {
    this.estado.conectado = true;
    this.estado.timestamp = new Date().toISOString();
    this.guardarEstado();
    this.actualizarVisualGlobal();
    this.notificarCambio();
    console.log("[PERSISTENCIA] ✅ Marcado como conectado");
  }

  // MARCAR COMO DESCONECTADO
  marcarDesconectado() {
    this.estado.conectado = false;
    this.estado.timestamp = new Date().toISOString();
    this.guardarEstado();
    this.actualizarVisualGlobal();
    this.notificarCambio();
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PUERTO_KEY);
    this.estado = { conectado: false, timestamp: null, version: "2.0" };
    this.notificarCambio();
    console.log("[PERSISTENCIA] Estado limpiado");
  }
}

// INSTANCIA GLOBAL
const gestorConexion = new GestorConexionPersistente();

// INICIALIZAR AL CARGAR EL DOCUMENTO
document.addEventListener("DOMContentLoaded", () => {
  console.log("[PERSISTENCIA] Inicializando gestor de conexión persistente...");
  gestorConexion.actualizarVisualGlobal();
});

// ACTUALIZAR VISUAL PERIÓDICAMENTE
setInterval(() => {
  gestorConexion.actualizarVisualGlobal();
}, 1000);
