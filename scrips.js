// ==========================================================
// MANO ROBÓTICA V3.9.5
// ==========================================================
//
// Arquitectura:
//
// Entrada
//   ↓
// Normalizador
//   ↓
// Corrección / comprensión de voz
//   ↓
// Intérprete natural
//   ↓
// Contexto + Estado + Restricciones
//   ↓
// Generador / Planificador
//   ↓
// Validador
//   ↓
// Comandos Arduino
//   ↓
// Ejecución
//
// ==========================================================


// ==========================================================
// VARIABLES PRINCIPALES
// ==========================================================

let puerto = null;
let escritor = null;
let lector = null;

let bufferSerial = "";

let secuenciaActiva = false;
let detenerSecuencia = false;
let numeroRepeticion = 0;

let colaEjecucion = Promise.resolve();

let reconocimientoVoz = null;
let vozDisponible = false;
let vozEnCurso = false;
let modoLlamadaIA = false;
let reinicioLlamadaPendiente = false;
let respuestaEnVoz = false;

const URL_API = window.location.protocol === "file:"
    ? "http://127.0.0.1:3000"
    : window.location.origin;


// ==========================================================
// ESTADO LÓGICO DE LA MANO
// ==========================================================

const estadoMano = {

    pulgar: "desconocido",
    indice: "desconocido",
    medio: "desconocido",
    anular: "desconocido",
    menique: "desconocido",

    muneca: "desconocida"

};


// ==========================================================
// CONTEXTO
// ==========================================================

const contexto = {

    ultimaEntrada: "",
    ultimaAccion: "",
    ultimosObjetivos: [],

    ultimaSecuencia: null,

    conectado: false,

    usbDetectado: false,

    ultimoGrupo: [],

    ultimaAccionFueGrupo: false,

    desconexionIntencional: false

};

const STORAGE_KEY = "mano_robotica_conexion";

function guardarEstadoConexionPersistente(conectado) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            conectado,
            timestamp: Date.now(),
            version: "3.9.5"
        }));
        console.log("[CONEXION] Estado persistido:", conectado);
    } catch (error) {
        console.error("[CONEXION] Error al guardar estado persistente:", error);
    }
}

function restaurarEstadoConexionDesdeStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return;
        }

        const datos = JSON.parse(raw);
        if (typeof datos.conectado === "boolean") {
            contexto.conectado = datos.conectado;
            actualizarEstadoConexion(datos.conectado);
            console.log("[CONEXION] Estado restaurado desde storage:", datos.conectado);
        }
    } catch (error) {
        console.error("[CONEXION] Error al restaurar estado persistente:", error);
    }
}


// ==========================================================
// ELEMENTOS HTML
// ==========================================================

let botonConectar;
let botonDesconectar;

let estadoConexion;
let conexionUSB;
let puertoSeleccionado;

let menuPrincipal;

let modoBotones;
let modoAudio;
let modoEscribir;
let modoSecuencias;
let modoIA;

let panelBotones;
let panelAudio;
let panelEscribir;
let panelSecuencias;
let panelIA;

let monitor;
let historialMonitor;

let botonVerMonitor;
let botonLimpiarMonitor;
let panelMonitorCompleto;

let botonMicrofono;
let botonDetenerMicrofono;
let estadoMicrofono;
let textoVoz;
let textoCorregido;
let interpretacionVoz;

let entradaComando;
let botonEnviarTexto;

let bucleSecuencia;
let botonFinalizarSecuencia;
let estadoSecuencia;
let historialChatIA = [];
let historialChatElemento;
let entradaChat;
let botonChat;
let botonVozChat;
let estadoLlamada;
let modoIAActual = "escribir";


// ==========================================================
// LISTAS PRINCIPALES
// ==========================================================

const todosLosDedos = [

    "pulgar",
    "indice",
    "medio",
    "anular",
    "menique"

];


const nombresDedos = {

    pulgar: "pulgar",
    indice: "índice",
    medio: "medio",
    anular: "anular",
    menique: "meñique"

};


// ==========================================================
// INICIALIZAR
// ==========================================================

function inicializarApp() {

    restaurarEstadoConexionDesdeStorage();

    // ------------------------------------------------------
    // CONEXIÓN
    // ------------------------------------------------------

    botonConectar =
        document.getElementById("boton-conectar");

    botonDesconectar =
        document.getElementById("boton-desconectar");

    estadoConexion =
        document.getElementById("estado-conexion");

    conexionUSB =
        document.getElementById("conexion-usb");

    puertoSeleccionado =
        document.getElementById("puerto-seleccionado");


    // ------------------------------------------------------
    // MENÚ
    // ------------------------------------------------------

    menuPrincipal =
        document.getElementById("menu-principal");

    modoBotones =
        document.getElementById("modo-botones");

    modoAudio =
        document.getElementById("modo-audio");

    modoEscribir =
        document.getElementById("modo-escribir");

    modoSecuencias =
        document.getElementById("modo-secuencias");

    modoIA =
        document.getElementById("modo-ia");

    document
        .querySelectorAll(".enlace-ruta")
        .forEach(enlace => {
            enlace.addEventListener("click", () => {
                if (enlace.dataset.ruta) {
                    navegarA(enlace.dataset.ruta);
                }
            });
        });

    window.addEventListener("hashchange", () => {
        navegarA(window.location.hash.slice(1) || "control", false);
    });


    // ------------------------------------------------------
    // PANELES
    // ------------------------------------------------------

    panelBotones =
        document.getElementById("panel-botones");

    panelAudio =
        document.getElementById("panel-audio");

    panelEscribir =
        document.getElementById("panel-escribir");

    panelSecuencias =
        document.getElementById("panel-secuencias");

    panelIA =
        document.getElementById("panel-ia");

    historialChatElemento =
        document.getElementById("historial-chat");

    prepararMensajesIniciales();

    entradaChat =
        document.getElementById("entrada-chat");

    botonChat =
        document.getElementById("boton-chat");

    botonVozChat =
        document.getElementById("boton-voz-chat");

    configurarIdentidadUsuario();
    configurarRelojLocal();


    // ------------------------------------------------------
    // MONITOR
    // ------------------------------------------------------

    monitor =
        document.getElementById("monitor");

    historialMonitor =
        document.getElementById("historial-monitor");

    botonVerMonitor =
        document.getElementById("boton-ver-monitor");

    botonLimpiarMonitor =
        document.getElementById("boton-limpiar-monitor");

    panelMonitorCompleto =
        document.getElementById("panel-monitor-completo");


    // ------------------------------------------------------
    // AUDIO
    // ------------------------------------------------------

    botonMicrofono =
        document.getElementById("boton-microfono");

    botonDetenerMicrofono =
        document.getElementById("boton-detener-microfono");

    estadoMicrofono =
        document.getElementById("estado-microfono");

    textoVoz =
        document.getElementById("texto-voz");

    textoCorregido =
        document.getElementById("texto-corregido");

    interpretacionVoz =
        document.getElementById("interpretacion-voz");


    // ------------------------------------------------------
    // ESCRIBIR
    // ------------------------------------------------------

    entradaComando =
        document.getElementById("entrada-comando");

    botonEnviarTexto =
        document.getElementById("boton-enviar-texto");


    // ------------------------------------------------------
    // SECUENCIAS
    // ------------------------------------------------------

    bucleSecuencia =
        document.getElementById("bucle-secuencia");

    botonFinalizarSecuencia =
        document.getElementById(
            "boton-finalizar-secuencia"
        );

    estadoSecuencia =
        document.getElementById(
            "estado-secuencia"
        );


    // ------------------------------------------------------
    // WEB SERIAL
    // ------------------------------------------------------

    if (!("serial" in navigator)) {

        agregarMonitor(
            "⚠️ Web Serial no está disponible en este navegador.",
            "error"
        );

        if (botonConectar) {
            botonConectar.disabled = true;
        }

        if (conexionUSB) {
            conexionUSB.textContent =
                "USB: ⚠️ No disponible";
        }

    } else {

        agregarMonitor(
            "🟢 Web Serial disponible."
        );

        configurarEventosUSB();
        comprobarDispositivosUSB();
        reconectarPuertoAutorizado();

    }

    botonConectar?.addEventListener("click", conectarArduino);
    botonDesconectar?.addEventListener("click", desconectarArduino);

    document.querySelectorAll(".boton-comando").forEach(boton => {
        boton.addEventListener("click", () => {
            procesarEntrada(boton.dataset.comando, "boton");
        });
    });


    // ------------------------------------------------------
    // BOTONES VOLVER
    // ------------------------------------------------------

    document
        .querySelectorAll(".boton-volver")
        .forEach(function (boton) {

            boton.addEventListener(
                "click",
                mostrarMenu
            );

        });


    // ------------------------------------------------------
    // MODOS
    // ------------------------------------------------------

    modoBotones?.addEventListener(
        "click",
        () => window.location.href = "botones.html"
    );

    modoAudio?.addEventListener(
        "click",
        () => window.location.href = "audio.html"
    );

    modoEscribir?.addEventListener(
        "click",
        () => window.location.href = "comandos.html"
    );

    modoSecuencias?.addEventListener(
        "click",
        () => window.location.href = "secuencias.html"
    );

    modoIA?.addEventListener(
        "click",
        () => window.location.href = "ia.html"
    );

    botonChat?.addEventListener("click", () => enviarMensajeChat());
    botonVozChat?.addEventListener("click", iniciarDictadoIA);
    estadoLlamada = document.getElementById("estado-llamada");

    entradaChat?.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            enviarMensajeChat();
        }
    });


    // ------------------------------------------------------
    // TEXTO
    // ------------------------------------------------------

    botonEnviarTexto?.addEventListener(
        "click",
        function () {

            const texto =
                entradaComando.value.trim();

            if (!texto) {
                return;
            }

            procesarEntrada(
                texto,
                "texto"
            );

            entradaComando.value = "";

        }
    );


    entradaComando?.addEventListener(
        "keydown",
        function (evento) {

            if (evento.key === "Enter") {

                botonEnviarTexto.click();

            }

        }
    );


    // ------------------------------------------------------
    // MONITOR
    // ------------------------------------------------------

    botonVerMonitor?.addEventListener(
        "click",
        function () {

            navegarA("monitor");

        }
    );


    botonLimpiarMonitor?.addEventListener(
        "click",
        limpiarMonitor
    );


    // ------------------------------------------------------
    // SECUENCIAS
    // ------------------------------------------------------

    document
        .getElementById("secuencia-1")
        ?.addEventListener(
            "click",
            () => ejecutarSecuencia(1)
        );

    document
        .getElementById("secuencia-2")
        ?.addEventListener(
            "click",
            () => ejecutarSecuencia(2)
        );

    document
        .getElementById("secuencia-3")
        ?.addEventListener(
            "click",
            () => ejecutarSecuencia(3)
        );


    botonFinalizarSecuencia?.addEventListener(
        "click",
        finalizarSecuencia
    );


    // ------------------------------------------------------
    // VOZ
    // ------------------------------------------------------

    configurarReconocimientoVoz();


    // ------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------

    crearIndicadoresEstado();
    actualizarVisualEstado();

    navegarA(document.body.dataset.rutaInicial || window.location.hash.slice(1) || "control", false);

    agregarMonitor(
        "🟢 Sistema V3.9.5 listo."
    );

}


// ==========================================================
// USB
// ==========================================================

function configurarEventosUSB() {

    navigator.serial.addEventListener(
        "connect",
        async function () {

            contexto.usbDetectado = true;

            if (conexionUSB) {

                conexionUSB.textContent =
                    "USB: 🟢 Dispositivo detectado";

            }

            agregarMonitor(
                "🔌 Dispositivo USB detectado."
            );

            await comprobarDispositivosUSB();

        }
    );


    navigator.serial.addEventListener(
        "disconnect",
        async function (evento) {

            contexto.usbDetectado = false;

            if (conexionUSB) {

                conexionUSB.textContent =
                    "USB: 🔴 Desconectado";

            }

            agregarMonitor(
                "⚠️ Dispositivo USB desconectado.",
                "error"
            );


            if (puerto) {

                await manejarDesconexionFisica();

            } else {

                actualizarEstadoConexion(false);

            }

        }
    );

}


// ==========================================================
// COMPROBAR DISPOSITIVOS USB
// ==========================================================

async function comprobarDispositivosUSB() {

    if (!("serial" in navigator)) {
        return;
    }


    try {

        const puertos =
            await navigator.serial.getPorts();


        if (puertos.length > 0) {

            contexto.usbDetectado = true;

            if (conexionUSB) {

                conexionUSB.textContent =
                    "USB: 🟢 Dispositivo detectado";

            }

        } else {

            contexto.usbDetectado = false;

            if (!contexto.conectado && conexionUSB) {

                conexionUSB.textContent =
                    "USB: ⚪ Desconectado";

            }

        }

    } catch (error) {

        console.error(error);

        if (conexionUSB) {

            conexionUSB.textContent =
                "USB: ⚠️ No se pudo comprobar";

        }

    }

}


// ==========================================================
// MANEJAR DESCONEXIÓN FÍSICA
// ==========================================================

async function manejarDesconexionFisica() {

    detenerSecuencia = true;
    secuenciaActiva = false;


    try {

        if (lector) {

            try {
                await lector.cancel();
            } catch (error) {}

            try {
                lector.releaseLock();
            } catch (error) {}

            lector = null;

        }


        if (escritor) {

            try {
                escritor.releaseLock();
            } catch (error) {}

            escritor = null;

        }

    } catch (error) {

        console.error(error);

    }


    puerto = null;

    bufferSerial = "";

    contexto.conectado = false;
    contexto.usbDetectado = false;

    marcarEstadoDesconocido();


    actualizarEstadoConexion(false);


    if (conexionUSB) {

        conexionUSB.textContent =
            "USB: 🔴 Desconectado";

    }


    if (puertoSeleccionado) {

        puertoSeleccionado.textContent =
            "Puerto: Ninguno";

    }


    agregarMonitor(
        "❌ Comunicación perdida: la mano robótica fue desconectada.",
        "error"
    );

}


// ==========================================================
// MOSTRAR PANEL
// ==========================================================

function mostrarPanel(panel) {

    const rutas = {
        [panelBotones?.id]: "mano",
        [panelAudio?.id]: "audio",
        [panelEscribir?.id]: "escribir",
        [panelSecuencias?.id]: "secuencias",
        [panelIA?.id]: "ia",
        [panelMonitorCompleto?.id]: "monitor"
    };

    navegarA(rutas[panel?.id] || "control");

}


// ==========================================================
// OCULTAR PANELES
// ==========================================================

function ocultarTodosLosPaneles() {

    [panelBotones, panelAudio, panelEscribir, panelSecuencias, panelIA, panelMonitorCompleto]
        .forEach(panel => {
            if (panel) {
                panel.hidden = true;
            }
        });

}


// ==========================================================
// MENÚ
// ==========================================================

function mostrarMenu() {

    if (window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/")) {
        navegarA("control");
    } else {
        window.location.href = "index.html";
    }

}


async function reconectarPuertoAutorizado() {

    if (!navigator.serial || contexto.conectado) {
        return;
    }

    try {
        const puertos = await navigator.serial.getPorts();
        if (!puertos.length) {
            return;
        }

        puerto = puertos[0];
        await puerto.open({ baudRate: 9600 });
        escritor = puerto.writable.getWriter();
        contexto.usbDetectado = true;
        actualizarEstadoConexion(true);

        if (conexionUSB) {
            conexionUSB.textContent = "USB: 🟢 Reconectado";
        }
        if (puertoSeleccionado) {
            puertoSeleccionado.textContent = "Puerto: Reconectado automáticamente";
        }

        agregarMonitor("🟢 Enlace restaurado al cambiar de módulo.");
        recibirDatos();
    } catch (error) {
        puerto = null;
        escritor = null;
        console.info("No se pudo restaurar el puerto autorizado.", error);
    }

}


function navegarA(ruta, actualizarURL = true) {

    const rutasValidas = ["control", "mano", "ia", "audio", "conexion", "escribir", "configuracion", "secuencias", "monitor"];
    const rutaActiva = rutasValidas.includes(ruta) ? ruta : "control";

    if (actualizarURL && window.location.hash !== `#${rutaActiva}`) {
        window.history.pushState({}, "", `#${rutaActiva}`);
    }

    document.querySelectorAll("[data-vista]").forEach(vista => {
        vista.hidden = vista.dataset.vista !== rutaActiva;
    });

    const rutasPorArchivo = {
        "index.html": "control",
        "botones.html": "mano",
        "ia.html": "ia",
        "audio.html": "audio",
        "conexion.html": "conexion",
        "comandos.html": "escribir",
        "configuracion.html": "configuracion",
        "secuencias.html": "secuencias",
        "monitor.html": "monitor"
    };

    document.querySelectorAll(".enlace-ruta").forEach(enlace => {
        const archivo = enlace.getAttribute("href")?.split("#")[0];
        const rutaEnlace = enlace.dataset.ruta || rutasPorArchivo[archivo];
        const activo = rutaEnlace === rutaActiva;
        enlace.classList.toggle("activo", activo);
        enlace.setAttribute("aria-current", activo ? "page" : "false");
    });

    const vistaActiva = document.querySelector(`[data-vista="${rutaActiva}"]`);
    vistaActiva?.classList.remove("vista-entrando");
    requestAnimationFrame(() => vistaActiva?.classList.add("vista-entrando"));

}


// ==========================================================
// CONECTAR
// ==========================================================

async function conectarArduino() {

    if (contexto.conectado && puerto && escritor) {
        agregarMonitor("ℹ️ La mano robótica ya está conectada.");
        return;
    }

    if (!("serial" in navigator)) {

        agregarMonitor(
            "⚠️ Web Serial no disponible.",
            "error"
        );

        return;

    }


    try {

        contexto.desconexionIntencional = false;

        agregarMonitor(
            "🔍 Buscando dispositivo USB..."
        );


        puerto =
            await navigator.serial.requestPort();


        if (!puerto) {

            throw new Error(
                "No se seleccionó ningún puerto."
            );

        }


        await puerto.open({
            baudRate: 9600
        });


        contexto.conectado = true;
        contexto.usbDetectado = true;


        actualizarEstadoConexion(true);


        let informacion =
            "USB";


        const info =
            puerto.getInfo();


        if (info.usbProductId) {

            informacion +=
                " | PID: 0x" +
                info.usbProductId.toString(16);

        }


        if (info.usbVendorId) {

            informacion +=
                " | VID: 0x" +
                info.usbVendorId.toString(16);

        }


        if (puertoSeleccionado) {

            puertoSeleccionado.textContent =
                "Puerto: " +
                informacion;

        }


        if (conexionUSB) {

            conexionUSB.textContent =
                "USB: 🟢 Conectado";

        }


        agregarMonitor(
            "🟢 Mano robótica conectada correctamente."
        );


        escritor =
            puerto.writable.getWriter();


        recibirDatos();


    } catch (error) {

        console.error(error);


        puerto = null;
        escritor = null;

        contexto.conectado = false;


        actualizarEstadoConexion(false);


        agregarMonitor(
            "❌ Error al conectar con la mano robótica.",
            "error"
        );

    }

}


// ==========================================================
// ESTADO DE CONEXIÓN
// ==========================================================

function actualizarEstadoConexion(conectado) {

    contexto.conectado = Boolean(conectado);

    document.querySelectorAll("[data-link-status]").forEach(indicador => {
        indicador.textContent = conectado ? "ONLINE" : "OFFLINE";
        indicador.classList.toggle("enlace-online", conectado);
    });

    document.querySelectorAll("[data-dashboard-status]").forEach(indicador => {
        indicador.textContent = conectado
            ? "Sistema conectado"
            : "Sistema desconectado";
    });


    if (estadoConexion) {

        estadoConexion.textContent =
            conectado
                ? "Estado: 🟢 Conectado"
                : "Estado: 🔴 Desconectado";

    }


    if (botonConectar) {

        botonConectar.disabled =
            conectado;

    }


    if (botonDesconectar) {

        botonDesconectar.disabled =
            !conectado;

    }


    if (
        puertoSeleccionado &&
        !conectado
    ) {

        puertoSeleccionado.textContent =
            "Puerto: Ninguno";

    }


    if (
        conexionUSB &&
        !conectado &&
        !contexto.usbDetectado
    ) {

        conexionUSB.textContent =
            "USB: ⚪ Desconectado";

    }

    guardarEstadoConexionPersistente(contexto.conectado);

}


// ==========================================================
// DESCONECTAR
// ==========================================================

async function desconectarArduino() {

    contexto.desconexionIntencional = true;

    detenerSecuencia = true;
    secuenciaActiva = false;


    try {

        if (lector) {

            try {
                await lector.cancel();
            } catch (error) {}

            try {
                lector.releaseLock();
            } catch (error) {}

            lector = null;

        }


        if (escritor) {

            try {
                escritor.releaseLock();
            } catch (error) {}

            escritor = null;

        }


        if (puerto) {

            try {
                await puerto.close();
            } catch (error) {}

        }

    } catch (error) {

        console.error(error);

    }


    puerto = null;

    bufferSerial = "";

    contexto.conectado = false;

    marcarEstadoDesconocido();


    actualizarEstadoConexion(false);


    if (conexionUSB) {

        conexionUSB.textContent =
            "USB: ⚪ Desconectado";

    }


    agregarMonitor(
        "🔌 Mano robótica desconectada."
    );

}


// ==========================================================
// PROCESAMIENTO GENERAL
// ==========================================================

async function procesarEntrada(
    entrada,
    origen = "texto",
    silencioso = false
) {

    if (!entrada) {
        return;
    }


    const textoReconocido =
        normalizarEntrada(entrada);

    let normalizada =
        textoReconocido;


    normalizada =
        corregirEntradaNatural(normalizada);


    contexto.ultimaEntrada =
        normalizada;

    actualizarTextoVoz(
        textoReconocido,
        normalizada
    );


    if (origen === "voz") {

        agregarMonitor(
            "🎤 Voz interpretada: " +
            normalizada
        );

    } else if (origen === "texto") {

        agregarMonitor(
            "🗣️ Entrada: " +
            normalizada
        );

    }


    const interpretacion =
        interpretarEntrada(
            normalizada
        );


    if (
        !interpretacion ||
        !interpretacion.acciones ||
        interpretacion.acciones.length === 0
    ) {

        const mensaje = "Comando no reconocido: no pude determinar una acción.";

        actualizarInterpretacionVoz(mensaje);
        if (!silencioso) {
            agregarMonitor(mensaje, "error");
        }

        return false;

    }


    contexto.ultimaAccion =
        interpretacion.acciones[
            interpretacion.acciones.length - 1
        ];


    contexto.ultimosObjetivos =
        interpretacion.acciones
            .map(
                accion => accion.objetivo
            )
            .filter(Boolean);


    contexto.ultimoGrupo =
        interpretacion.acciones;


    contexto.ultimaAccionFueGrupo =
        interpretacion.acciones.length > 1;

    actualizarInterpretacionVoz(
        describirInterpretacion(interpretacion.acciones)
    );


    const plan =
        planificar(
            interpretacion
        );


    const valido =
        validarPlan(plan);


    if (!valido) {

        agregarMonitor(
            "⚠️ El plan generado no es válido.",
            "error"
        );

        return;

    }


    await ejecutarPlan(plan);
    return true;

}
