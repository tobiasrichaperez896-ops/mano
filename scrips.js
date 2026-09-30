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

    contexto.conectado =
        Boolean(conectado);

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


// ==========================================================
// NORMALIZADOR
// ==========================================================

function normalizarEntrada(texto) {

    return String(texto)

        .toLowerCase()

        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .replace(/[¿?¡!]+/g, "")

        .replace(/[.;:]+/g, ",")

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


// ==========================================================
// CORRECCIÓN NATURAL DE VOZ
// ==========================================================

function corregirEntradaNatural(texto) {

    let resultado = texto;


    const correcciones = {

        "pulga": "pulgar",
        "pulgaro": "pulgar",

        "indise": "indice",
        "indicee": "indice",

        "menique": "menique",
        "meñique": "menique",
        "meniquee": "menique",

        "muneca": "muneca",
        "muñeca": "muneca",

        "abrete": "abrete",
        "cerrate": "cerrate",

        "abrilos": "abrilos",
        "abrirlos": "abrilos",

        "cerralos": "cerralos",
        "cerrarlos": "cerralos",

        "deja": "deja",
        "dejame": "dejame",

        "primer": "primer",
        "primero": "primer",

        "segundo": "segundo",
        "tercer": "tercer",
        "tercero": "tercer",

        "cuarto": "cuarto",
        "quinto": "quinto"

    };


    for (
        const [incorrecto, correcto]
        of Object.entries(correcciones)
    ) {

        resultado =
            resultado.replace(
                new RegExp(
                    "\\b" +
                    escaparRegExp(incorrecto) +
                    "\\b",
                    "g"
                ),
                correcto
            );

    }

    // En una rectificación, la parte posterior reemplaza la orden anterior.
    // Si solo se corrige el dedo, se conserva la acción que ya había dicho.
    const correccion = resultado.match(
        /(?:ah\s+no[\s,]+)?(?:no\s+perdon|perdon|digo|mejor|quise\s+decir)(?:[\s,]+)(.+)$/
    );

    if (correccion) {
        const parteFinal = correccion[1].trim();
        const tieneAccion = detectarAccion(parteFinal);
        const parteAnterior = resultado.slice(0, correccion.index);

        if (!tieneAccion) {
            const accionAnterior = detectarAccion(parteAnterior);
            if (accionAnterior) {
                return accionAnterior + " " + parteFinal;
            }
        }

        return parteFinal;
    }


    return resultado;

}


// ==========================================================
// INTERPRETAR ENTRADA
// ==========================================================

function interpretarEntrada(texto) {

    const acciones = [];


    const planBase = resolverAccionBase(texto);
    if (planBase && planBase.length > 0) {
        return {
            acciones: planBase
        };
    }


    // ------------------------------------------------------
    // PRIMERO: COMANDOS ESPECIALES
    // ------------------------------------------------------

    const especial =
        interpretarComandoEspecial(texto);


    if (especial) {

        acciones.push(
            ...convertirAArray(especial)
        );

        return {
            acciones
        };

    }


    // ------------------------------------------------------
    // FRASIS NATURALES COMPLETAS
    // ------------------------------------------------------

    const frasesNaturales =
        normalizarEntrada(texto)
            .split(/\s*(?:,|;|\s+y\s+|\s+luego\s+|\s+despues\s+|\s+entonces\s+)\s*/i)
            .map(parte => parte.trim())
            .filter(Boolean);

    const accionesNaturales = [];

    for (const parte of frasesNaturales) {
        const resultado = interpretarParte(parte);

        if (!resultado) {
            continue;
        }

        accionesNaturales.push(
            ...convertirAArray(resultado)
        );
    }

    if (accionesNaturales.length > 0) {
        return {
            acciones: accionesNaturales
        };
    }


    // ------------------------------------------------------
    // SEPARACIÓN NATURAL
    // ------------------------------------------------------

    const partes =
        separarComandosNaturales(texto);


    for (
        const parte of partes
    ) {

        const resultado =
            interpretarParte(
                parte
            );


        if (resultado) {

            acciones.push(
                ...convertirAArray(resultado)
            );

        }

    }


    return {
        acciones
    };

}


// ==========================================================
// SEPARAR COMANDOS NATURALES
// ==========================================================

function separarComandosNaturales(texto) {

    // La coma sigue funcionando como separador,
    // pero ya NO es necesaria para hablar naturalmente.

    let partes =
        texto
            .split(",")
            .map(
                parte => parte.trim()
            )
            .filter(Boolean);

    // “Los demás” depende de la acción y de la excepción en la misma parte.
    if (contieneAlguna(texto, ["demas", "resto", "todos menos"])) {
        return [texto];
    }


    if (partes.length > 1) {
        return partes;
    }


    // Conectores hablados.
    //
    // Ejemplos:
    //
    // "cierra el pulgar y abre el índice"
    //
    // "cierra el pulgar despues abre el medio"
    //
    // "abre el índice luego cierra el medio"

    const patrones = [

        /\s+y\s+(?=(?:ahora\s+)?(?:abre|abrir|abri|cierra|cerrar|cerra|mueve|lleva|deja|dejame|pon|pone|el|la)\b)/,

        /\s+y\s+luego\s+(?=(?:ahora\s+)?(?:abre|abrir|abri|cierra|cerrar|cerra|mueve|lleva|deja|dejame|pon|pone|el|la)\b)/,

        /\s+despues\s+(?=(?:ahora\s+)?(?:abre|abrir|abri|cierra|cerrar|cerra|mueve|lleva|deja|dejame|pon|pone|el|la)\b)/,

        /\s+luego\s+(?=(?:ahora\s+)?(?:abre|abrir|abri|cierra|cerrar|cerra|mueve|lleva|deja|dejame|pon|pone|el|la)\b)/,

        /\s+al\s+final\s+(?=(?:abre|abrir|cierra|cerrar|mueve|lleva|deja|dejame|pon|pone|el|la)\b)/

    ];


    for (
        const patron of patrones
    ) {

        if (patron.test(texto)) {

            partes =
                texto
                    .split(patron)
                    .map(
                        parte => parte.trim()
                    )
                    .filter(Boolean);

            return partes;

        }

    }


    return [texto];

}


// ==========================================================
// COMANDO ESPECIAL
// ==========================================================

function interpretarComandoEspecial(texto) {
    const textoNormalizado = normalizarEntrada(texto);

    // ------------------------------------------------------
    // TRUCO / ROCK
    // Pulgar cerrado
    // Índice + medio abiertos
    // RETRUCO debe evaluarse antes que truco porque contiene esa palabra.
    if (contieneAlguna(textoNormalizado, ["retruco"])) {

        return generarConfiguracionDedos({

            pulgar: "abierto",
            indice: "abierto",
            medio: "abierto",
            anular: "cerrado",
            menique: "cerrado"

        });

    }


    if (contieneAlguna(textoNormalizado, ["truco", "rock"])) {

        return generarConfiguracionDedos({

            pulgar: "cerrado",
            indice: "abierto",
            medio: "abierto",
            anular: "cerrado",
            menique: "cerrado"

        });

    }


    // ------------------------------------------------------
    // VALE CUATRO
    // Todos abiertos menos pulgar
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "vale cuatro",
                "vale 4",
                "un vale cuatro",
                "un vale 4",
                "me aceptas un vale cuatro",
                "me aceptas un vale 4"
            ]
        )
    ) {

        return generarConfiguracionDedos({

            pulgar: "cerrado",
            indice: "abierto",
            medio: "abierto",
            anular: "abierto",
            menique: "abierto"

        });

    }


    return null;

}


// ==========================================================
// CONFIGURACIÓN DE DEDOS
// ==========================================================

function generarConfiguracionDedos(
    configuracion
) {

    return todosLosDedos.map(
        dedo => {

            const valor =
                configuracion[dedo];


            return {

                accion:
                    valor === "abierto"
                        ? "abrir"
                        : "cerrar",

                objetivo:
                    dedo,

                valor:
                    valor

            };

        }
    );

}


function mapearDedoNatural(texto) {
    const normalizado = normalizarEntrada(texto);

    const equivalencias = {
        pulgar: "pulgar",
        indice: "indice",
        medio: "medio",
        anular: "anular",
        menique: "menique",
        "meñique": "menique"
    };

    for (const [nombre, dedo] of Object.entries(equivalencias)) {
        if (normalizado.includes(nombre)) {
            return dedo;
        }
    }

    return null;
}


function resolverAccionBase(texto) {
    const normalizado = normalizarEntrada(texto);

    if (!normalizado) {
        return null;
    }

    const partes = normalizado
        .split(/\s*(?:,|;|\s+y\s+|\s+luego\s+|\s+despues\s+|\s+entonces\s+)\s*/i)
        .map(parte => parte.trim())
        .filter(Boolean);

    const acciones = [];

    for (const parte of partes) {
        const p = normalizarEntrada(parte);

        if (!p) {
            continue;
        }

        if (/(?:posicion inicial|volver al inicio|volveme a la posicion inicial|poneme en posicion inicial)/.test(p)) {
            acciones.push(
                { accion: "mover", objetivo: "muneca", valor: "centro" },
                { accion: "abrir", objetivo: "mano", valor: "abierta" }
            );
            continue;
        }

        if (/(?:abre|abrir|abri|deja|dejame|pon|pone).*(?:la\s+)?mano|(?:la\s+)?mano\s*(?:abierta|abierto)|(?:abierta|abierto)\s+(?:la\s+)?mano/.test(p)) {
            acciones.push({ accion: "abrir", objetivo: "mano", valor: "abierta" });
            continue;
        }

        if (/(?:cierra|cerrar|cerra|deja|dejame|pon|pone).*(?:la\s+)?mano|(?:la\s+)?mano\s*(?:cerrada|cerrado)|(?:cerrada|cerrado)\s+(?:la\s+)?mano/.test(p)) {
            acciones.push({ accion: "cerrar", objetivo: "mano", valor: "cerrada" });
            continue;
        }

        const direccionMuneca = p.match(/(?:mueve|mover|lleva|pon|pone|deja|dejame).*(?:la\s+)?muneca.*?(izquierda|derecha|centro|medio)|(?:izquierda|derecha|centro|medio).*(?:la\s+)?muneca/i);
        if (direccionMuneca) {
            const valor = direccionMuneca[1] || direccionMuneca[0];
            acciones.push({ accion: "mover", objetivo: "muneca", valor: valor.includes("centro") || valor.includes("medio") ? "centro" : valor.includes("izquierda") ? "izquierda" : "derecha" });
            continue;
        }

        const dedo = mapearDedoNatural(p);

        if (dedo) {
            const abrir = /(abre|abrir|abri|deja|dejame|pon|pone).*(?:el\s+)?/.test(p) || /(?:abierta|abierto)/.test(p);
            const cerrar = /(cierra|cerrar|cerra|deja|dejame|pon|pone).*(?:el\s+)?/.test(p) || /(?:cerrada|cerrado)/.test(p);

            if (abrir && !cerrar) {
                acciones.push({ accion: "abrir", objetivo: dedo, valor: "abierto" });
                continue;
            }

            if (cerrar && !abrir) {
                acciones.push({ accion: "cerrar", objetivo: dedo, valor: "cerrado" });
                continue;
            }
        }
    }

    return acciones.length > 0 ? acciones : null;
}


function interpretarFraseNatural(texto) {
    const normalizado = normalizarEntrada(texto);

    if (!normalizado) {
        return null;
    }

    if (/(?:posicion|posicion inicial|volver al inicio|vuelve a la posicion inicial|poneme la mano en posicion inicial)/.test(normalizado)) {
        return [
            { accion: "mover", objetivo: "muneca", valor: "centro" },
            { accion: "abrir", objetivo: "mano", valor: "abierta" }
        ];
    }

    const accionMano =
        /(abre|abrir|abri|abrime|deja|dejame|pon|pone)\s+(?:la\s+)?mano|mano\s+(abierta|abierto)|(?:abierta|abierto)\s+la\s+mano/.test(normalizado)
            ? "abrir"
            : null;

    if (accionMano) {
        return { accion: accionMano, objetivo: "mano", valor: "abierta" };
    }

    const accionManoCerrar =
        /(cierra|cerrar|cerra|cerrame|deja|dejame|pon|pone)\s+(?:la\s+)?mano|mano\s+(cerrada|cerrado)|(?:cerrada|cerrado)\s+la\s+mano/.test(normalizado)
            ? "cerrar"
            : null;

    if (accionManoCerrar) {
        return { accion: accionManoCerrar, objetivo: "mano", valor: "cerrada" };
    }

    const moverMuneca = normalizado.match(/(?:mueve|mover|lleva|pon|pone|deja|dejame)\s+(?:la\s+)?muneca\s+(?:a\s+|al\s+)?(izquierda|derecha|centro|medio)/);
    if (moverMuneca) {
        return {
            accion: "mover",
            objetivo: "muneca",
            valor: moverMuneca[1]
        };
    }

    const accionDedo =
        /(abre|abrir|abri|abrime|deja|dejame)\s+(?:el\s+)?(pulgar|indice|medio|anular|menique|meñique)/.test(normalizado)
            ? "abrir"
            : /(cierra|cerrar|cerra|cerrame|deja|dejame)\s+(?:el\s+)?(pulgar|indice|medio|anular|menique|meñique)/.test(normalizado)
                ? "cerrar"
                : null;

    if (accionDedo) {
        const dedoMatch = normalizado.match(/(?:abre|abrir|abri|abrime|cierra|cerrar|cerra|cerrame|deja|dejame)\s+(?:el\s+)?(pulgar|indice|medio|anular|menique|meñique)/);
        const dedo = dedoMatch ? dedoMatch[1] : null;

        if (dedo) {
            return {
                accion: accionDedo,
                objetivo: dedo === "meñique" ? "menique" : dedo,
                valor: accionDedo === "abrir" ? "abierto" : "cerrado"
            };
        }
    }

    return null;
}


// ==========================================================
// INTERPRETAR UNA PARTE
// ==========================================================

function interpretarParte(texto) {
    const fraseNatural = interpretarFraseNatural(texto);
    if (fraseNatural) {
        return fraseNatural;
    }

    // ------------------------------------------------------
    // SECUENCIA ALEATORIA
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "secuencia aleatoria",
                "secuencia random",
                "movimientos aleatorios",
                "movimientos random",
                "movimientos al azar"
            ]
        )
    ) {

        const cantidad =
            extraerNumero(texto) || 5;


        const restricciones =
            obtenerRestricciones(texto);


        return generarSecuenciaAleatoria(
            cantidad,
            restricciones
        );

    }


    // ------------------------------------------------------
    // POSICIÓN INICIAL
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "posicion inicial",
                "punto inicial",
                "volver al inicio",
                "volvi al inicio"
            ]
        )
    ) {

        return [

            {
                accion: "mover",
                objetivo: "muneca",
                valor: "centro"
            },

            {
                accion: "abrir",
                objetivo: "mano",
                valor: "abierta"
            }

        ];

    }


    // ------------------------------------------------------
    // CENTRO
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "muneca al centro",
                "muneca al medio",
                "vuelve al centro",
                "volver al centro",
                "lleva la muneca al centro",
                "pon la muneca al centro"
            ]
        )
    ) {

        return {

            accion: "mover",
            objetivo: "muneca",
            valor: "centro"

        };

    }


    // ------------------------------------------------------
    // MUÑECA IZQUIERDA
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "izquierda",
                "lado izquierdo"
            ]
        ) &&
        contieneAlguna(
            texto,
            [
                "muneca"
            ]
        )
    ) {

        return {

            accion: "mover",
            objetivo: "muneca",
            valor: "izquierda"

        };

    }


    // ------------------------------------------------------
    // MUÑECA DERECHA
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "derecha",
                "lado derecho"
            ]
        ) &&
        contieneAlguna(
            texto,
            [
                "muneca"
            ]
        )
    ) {

        return {

            accion: "mover",
            objetivo: "muneca",
            valor: "derecha"

        };

    }


    // ------------------------------------------------------
    // "SOLO X ABIERTO"
    // ------------------------------------------------------

    const objetivoUnico =
        detectarObjetivoUnicoAbierto(texto);


    if (objetivoUnico) {

        return generarSoloUnoAbierto(
            objetivoUnico
        );

    }


    // ------------------------------------------------------
    // REFERENCIAS "ABRILOS"
    // ------------------------------------------------------

        if (
            contieneAlguna(
                texto,
                [
                    "abrilos",
                    "abrirlos",
                    "ahora abrilos",
                    "abrelos",
                    "abre los",
                    "abrilos todos"
                ]
            )
        ) {

        return generarReferenciaAnterior("abrir", true);

    }


    // ------------------------------------------------------
    // REFERENCIAS "CERRALOS"
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "cerralos",
                "cerrarlos",
                "ahora cerralos",
                "cierralos",
                "cierra los"
            ]
        )
    ) {

        return generarReferenciaAnterior("cerrar", true);

    }


    // ------------------------------------------------------
    // ABRIR/CERRAR POR NÚMERO
    // ------------------------------------------------------

    const dedosPorNumero =
        detectarDedosNumericos(texto);


    const accionNumerica =
        detectarAccion(texto);


    if (
        dedosPorNumero.length > 0 &&
        accionNumerica
    ) {

        return dedosPorNumero.map(
            dedo => ({

                accion:
                    accionNumerica,

                objetivo:
                    dedo,

                valor:
                    accionNumerica === "abrir"
                        ? "abierto"
                        : "cerrado"

            })
        );

    }


    // ------------------------------------------------------
    // DEDOS MENCIONADOS
    // ------------------------------------------------------

    const dedosMencionados =
        detectarDedos(texto);


    const accionPrincipal =
        detectarAccion(texto);


    if (
        dedosMencionados.length > 0 &&
        accionPrincipal
    ) {

        const accionMencionados = contieneAlguna(texto, ["demas", "resto"])
            ? obtenerPrimeraAccion(texto.slice(0, texto.indexOf("demas") >= 0
                ? texto.indexOf("demas")
                : texto.length)) || accionPrincipal
            : accionPrincipal;

        const acciones =
            dedosMencionados.map(
                dedo => ({

                    accion:
                        accionMencionados,

                    objetivo:
                        dedo,

                    valor:
                        accionMencionados === "abrir"
                            ? "abierto"
                            : "cerrado"

                })
            );


        // --------------------------------------------------
        // "LOS DEMÁS"
        // --------------------------------------------------

        if (
            contieneAlguna(
                texto,
                [
                    "los demas",
                    "los demás",
                    "el resto",
                    "todos los demas",
                    "todos menos"
                ]
            )
        ) {

            const accionDeExcepcion = accionMencionados;

            const restantes =
                todosLosDedos.filter(
                    dedo =>
                        !dedosMencionados.includes(
                            dedo
                        )
                );


            const accionRestante =
                accionDeExcepcion === "abrir"
                    ? "cerrar"
                    : "abrir";


            restantes.forEach(
                dedo => {

                    acciones.push({

                        accion:
                            accionRestante,

                        objetivo:
                            dedo,

                        valor:
                            accionRestante === "abrir"
                                ? "abierto"
                                : "cerrado"

                    });

                }
            );

        }


        return acciones;

    }


    // ------------------------------------------------------
    // MANO COMPLETA
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "abre la mano",
                "abrir la mano",
                "abri la mano",
                "mano abierta",
                "abrite la mano",
                "abre mano",
                "abrete",
                "abrete sesamo",
                "abre sésamo"
            ]
        )
    ) {

        return {

            accion: "abrir",
            objetivo: "mano",
            valor: "abierta"

        };

    }


    // ------------------------------------------------------
    // MANO CERRADA
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "cierra la mano",
                "cerrar la mano",
                "cerra la mano",
                "mano cerrada",
                "cerrate",
                "cerrate sesamo",
                "cierra sésamo"
            ]
        )
    ) {

        return {

            accion: "cerrar",
            objetivo: "mano",
            valor: "cerrada"

        };

    }


    // ------------------------------------------------------
    // DEDO INDIVIDUAL
    // ------------------------------------------------------

    const dedo =
        detectarPrimerDedo(texto);


    if (
        dedo &&
        accionPrincipal
    ) {

        return {

                accion:
                    accionPrincipal,

            objetivo:
                dedo,

            valor:
                accionPrincipal === "abrir"
                    ? "abierto"
                    : "cerrado"

        };

    }


    // ------------------------------------------------------
    // REFERENCIAS CONTEXTUALES
    // ------------------------------------------------------

    if (
        contieneAlguna(
            texto,
            [
                "abrila",
                "abrilo",
                "abierto",
                "abrelo",
                "abrelo",
                "dejalo abierto"
            ]
        )
    ) {

        return generarReferenciaAnterior("abrir", texto.includes("abrilos") || texto.includes("abrelos"));

    }


    if (
        contieneAlguna(
            texto,
            [
                "cerrala",
                "cerralo",
                "cerrado",
                "cerralo",
                "dejalo cerrado"
            ]
        )
    ) {

        return generarReferenciaAnterior("cerrar", texto.includes("cerralos") || texto.includes("cierralos"));

    }


    return null;

}


// ==========================================================
// DETECTAR ACCIÓN
// ==========================================================

function detectarAccion(texto) {

    if (
        contieneAlguna(
            texto,
            [
                "abre",
                "abrir",
                "abri",
                "abierto",
                "levantado",
                "levanta",
                "dejame abierto",
                "deja abierto",
                "abreme",
                "abrime"
            ]
        )
    ) {

        return "abrir";

    }


    if (
        contieneAlguna(
            texto,
            [
                "cierra",
                "cerrar",
                "cerra",
                "cerrado",
                "bajado",
                "baja",
                "dejame cerrado",
                "deja cerrado",
                "cierra me",
                "cerrame"
            ]
        )
    ) {

        return "cerrar";

    }


    return null;

}


// ==========================================================
// DETECTAR DEDOS
// ==========================================================

function detectarDedos(texto) {

    const encontrados = [];


    const equivalencias = {

        pulgar: [
            "pulgar"
        ],

        indice: [
            "indice",
            "dedo indice"
        ],

        medio: [
            "medio",
            "dedo medio"
        ],

        anular: [
            "anular",
            "dedo anular"
        ],

        menique: [
            "menique",
            "meñique",
            "dedo menique",
            "dedo meñique"
        ]

    };


    for (
        const dedo of todosLosDedos
    ) {

        if (
            equivalencias[dedo].some(
                nombre =>
                    texto.includes(nombre)
            )
        ) {

            encontrados.push(
                dedo
            );

        }

    }


    return encontrados;

}


// ==========================================================
// DETECTAR DEDOS POR NÚMERO
// ==========================================================

function detectarDedosNumericos(texto) {

    const encontrados = [];


    const numeros = {

        primer: "pulgar",
        primero: "pulgar",

        segundo: "indice",
        segunda: "indice",

        tercer: "medio",
        tercero: "medio",
        tercera: "medio",

        cuarto: "anular",
        cuarta: "anular",

        quinto: "menique",
        quinta: "menique"

    };


    for (
        const [palabra, dedo]
        of Object.entries(numeros)
    ) {


    const ordinalesSueltos = texto.match(
        /\b(?:primer|primero|segundo|segunda|tercer|tercero|tercera|cuarto|cuarta|quinto|quinta)\b/g
    ) || [];

    ordinalesSueltos.forEach(palabra => {
        const dedo = numeros[palabra];
        if (dedo && !encontrados.includes(dedo)) {
            encontrados.push(dedo);
        }
    });
        if (
            texto.includes(
                palabra + " dedo"
            ) ||
            texto.includes(
                palabra + " dedos"
            ) ||
            texto.includes(
                "dedo " + palabra
            )
        ) {

            if (
                !encontrados.includes(dedo)
            ) {

                encontrados.push(dedo);

            }

        }

    }


    // Números escritos como dígitos

    const numerosSueltos = texto.match(
        /\b(?:uno|una|dos|tres|cuatro|cinco|1|2|3|4|5)\b/g
    ) || [];

    numerosSueltos.forEach(numero => {
        const valor = {
            uno: 1,
            una: 1,
            dos: 2,
            tres: 3,
            cuatro: 4,
            cinco: 5
        }[numero] || Number(numero);

        const dedo = todosLosDedos[valor - 1];
        if (dedo && !encontrados.includes(dedo)) {
            encontrados.push(dedo);
        }
    });

    const coincidencias =
        texto.match(
            /\b[1-5]\b/g
        );


    if (coincidencias) {

        coincidencias.forEach(
            numero => {

                const indice =
                    Number(numero) - 1;


                if (
                    todosLosDedos[indice] &&
                    !encontrados.includes(
                        todosLosDedos[indice]
                    )
                ) {

                    encontrados.push(
                        todosLosDedos[indice]
                    );

                }

            }
        );

    }


    return encontrados;

}


// ==========================================================
// DETECTAR PRIMER DEDO
// ==========================================================

function detectarPrimerDedo(texto) {

    const dedos =
        detectarDedos(texto);


    return dedos[0] || null;

}


// ==========================================================
// SOLO UNO ABIERTO
// ==========================================================

function detectarObjetivoUnicoAbierto(texto) {

    if (contieneAlguna(texto, ["demas", "resto", "todos menos"])) {
        return null;
    }

    if (
        !contieneAlguna(
            texto,
            [
                "solo",
                "solamente",
                "unicamente",
                "únicamente"
            ]
        )
    ) {

        return null;

    }


    if (
        !contieneAlguna(
            texto,
            [
                "abierto",
                "abre",
                "abrir",
                "dejame",
                "deja"
            ]
        )
    ) {

        return null;

    }


    const dedos =
        detectarDedos(texto);


    if (dedos.length === 1) {

        return dedos[0];

    }


    return null;

}


// ==========================================================
// GENERAR SOLO UNO ABIERTO
// ==========================================================

function generarSoloUnoAbierto(
    dedoAbierto
) {

    return todosLosDedos.map(
        dedo => {

            const abrir =
                dedo === dedoAbierto;


            return {

                accion:
                    abrir
                        ? "abrir"
                        : "cerrar",

                objetivo:
                    dedo,

                valor:
                    abrir
                        ? "abierto"
                        : "cerrado"

            };

        }
    );

}


// ==========================================================
// REFERENCIA AL CONTEXTO
// ==========================================================

function generarReferenciaAnterior(
    nuevaAccion,
    plural = false
) {

    let objetivos =
        contexto.ultimosObjetivos;


    if (
        !objetivos ||
        objetivos.length === 0
    ) {

        agregarMonitor(
            "⚠️ No tengo un grupo anterior al cual referirme.",
            "error"
        );

        return null;

    }


    objetivos =
        [...new Set(objetivos)]
            .filter(
                objetivo =>
                    objetivo !== "mano" &&
                    objetivo !== "muneca"
            );


    if (!plural) {
        objetivos = objetivos.slice(-1);
    }

    if (objetivos.length === 0) {

        return null;

    }


    return objetivos.map(
        objetivo => ({

            accion:
                nuevaAccion,

            objetivo,

            valor:
                nuevaAccion === "abrir"
                    ? "abierto"
                    : "cerrado"

        })
    );

}


// ==========================================================
// RESTRICCIONES
// ==========================================================

function obtenerRestricciones(texto) {

    const restricciones = {

        noCerrarMano: false,
        noAbrirMano: false,
        noMoverMuneca: false,

        soloDedos: false

    };


    if (
        contieneAlguna(
            texto,
            [
                "sin cerrar la mano",
                "no cierres la mano",
                "sin cerrar mano"
            ]
        )
    ) {

        restricciones.noCerrarMano = true;

    }


    if (
        contieneAlguna(
            texto,
            [
                "sin abrir la mano",
                "no abras la mano",
                "sin abrir mano"
            ]
        )
    ) {

        restricciones.noAbrirMano = true;

    }


    if (
        contieneAlguna(
            texto,
            [
                "sin mover la muneca",
                "no muevas la muneca",
                "sin mover muneca"
            ]
        )
    ) {

        restricciones.noMoverMuneca = true;

    }


    return restricciones;

}


// ==========================================================
// GENERADOR DE SECUENCIAS ALEATORIAS
// ==========================================================

function generarSecuenciaAleatoria(
    cantidad,
    restricciones = {}
) {

    const movimientos = [];
    const candidatos = [];


    if (
        !restricciones.noCerrarMano
    ) {

        candidatos.push({

            accion: "cerrar",
            objetivo: "mano",
            valor: "cerrada"

        });

    }


    if (
        !restricciones.noAbrirMano
    ) {

        candidatos.push({

            accion: "abrir",
            objetivo: "mano",
            valor: "abierta"

        });

    }


    todosLosDedos.forEach(
        dedo => {

            candidatos.push({

                accion: "abrir",
                objetivo: dedo,
                valor: "abierto"

            });


            candidatos.push({

                accion: "cerrar",
                objetivo: dedo,
                valor: "cerrado"

            });

        }
    );


    if (
        !restricciones.noMoverMuneca
    ) {

        candidatos.push({

            accion: "mover",
            objetivo: "muneca",
            valor: "izquierda"

        });


        candidatos.push({

            accion: "mover",
            objetivo: "muneca",
            valor: "derecha"

        });


        candidatos.push({

            accion: "mover",
            objetivo: "muneca",
            valor: "centro"

        });

    }


    if (candidatos.length === 0) {
        return [];
    }


    for (
        let i = 0;
        i < cantidad;
        i++
    ) {

        const indice =
            Math.floor(
                Math.random() *
                candidatos.length
            );


        movimientos.push(
            {
                ...candidatos[indice]
            }
        );

    }


    return movimientos;

}


// ==========================================================
// PLANIFICADOR
// ==========================================================

function planificar(
    interpretacion
) {

    return {

        acciones:
            interpretacion.acciones,

        creado:
            new Date(),

        simultaneo:
            interpretacion.acciones.length > 1

    };

}


// ==========================================================
// VALIDAR PLAN
// ==========================================================

function validarPlan(plan) {

    if (
        !plan ||
        !Array.isArray(
            plan.acciones
        )
    ) {

        return false;

    }


    if (
        plan.acciones.length === 0
    ) {

        return false;

    }


    for (
        const accion of plan.acciones
    ) {

        if (
            ![
                "abrir",
                "cerrar",
                "mover"
            ].includes(
                accion.accion
            )
        ) {

            return false;

        }


        if (!accion.objetivo) {

            return false;

        }

    }


    return true;

}


// ==========================================================
// EJECUTAR PLAN
// ==========================================================

async function ejecutarPlan(
    plan
) {

    if (!escritor) {

        agregarMonitor(
            "⚠️ La mano robótica no está conectada.",
            "error"
        );

        return;

    }


    if (
        plan.simultaneo &&
        plan.acciones.length > 1
    ) {

        agregarMonitor(
            "⚡ Grupo de " +
            plan.acciones.length +
            " acciones preparado."
        );

    }


    for (
        const accion of plan.acciones
    ) {

        const comando =
            convertirAccionAComando(
                accion
            );


        if (!comando) {

            agregarMonitor(
                "⚠️ No se pudo convertir una acción.",
                "error"
            );

            continue;

        }


        const enviado =
            await enviarComando(
                comando
            );


        if (!enviado) {

            return;

        }


        actualizarEstadoDesdeAccion(
            accion
        );


        // Pausa muy pequeña entre acciones.
        // El Arduino sigue siendo quien determina
        // la velocidad física de los servos.

        if (
            plan.acciones.length > 1
        ) {

            await esperar(80);

        } else {

            await esperar(400);

        }

    }


    actualizarVisualEstado();

}


// ==========================================================
// CONVERTIR ACCIÓN → ARDUINO
// ==========================================================

function convertirAccionAComando(
    accion
) {

    const objetivo =
        accion.objetivo;


    // ------------------------------------------------------
    // MANO
    // ------------------------------------------------------

    if (
        objetivo === "mano"
    ) {

        if (
            accion.accion === "abrir"
        ) {

            return "abre la mano";

        }


        if (
            accion.accion === "cerrar"
        ) {

            return "cierra la mano";

        }

    }


    // ------------------------------------------------------
    // MUÑECA
    // ------------------------------------------------------

    if (
        objetivo === "muneca"
    ) {

        if (
            accion.valor === "izquierda"
        ) {

            return "mueve la muñeca a la izquierda";

        }


        if (
            accion.valor === "derecha"
        ) {

            return "mueve la muñeca a la derecha";

        }


        if (
            accion.valor === "centro"
        ) {

            return "mueve la muñeca al centro";

        }

    }


    // ------------------------------------------------------
    // DEDOS
    // ------------------------------------------------------

    if (
        todosLosDedos.includes(
            objetivo
        )
    ) {

        if (
            accion.accion === "abrir"
        ) {

            return (
                "abre el dedo " +
                nombresDedos[objetivo]
            );

        }


        if (
            accion.accion === "cerrar"
        ) {

            return (
                "cierra el dedo " +
                nombresDedos[objetivo]
            );

        }

    }


    return null;

}


// ==========================================================
// ACTUALIZAR ESTADO DESDE ACCIÓN
// ==========================================================

function actualizarEstadoDesdeAccion(
    accion
) {

    if (
        accion.objetivo === "mano"
    ) {

        const valor =
            accion.accion === "abrir"
                ? "abierto"
                : "cerrado";


        todosLosDedos.forEach(
            dedo => {

                estadoMano[dedo] =
                    valor;

            }
        );

    }


    else if (
        todosLosDedos.includes(
            accion.objetivo
        )
    ) {

        estadoMano[
            accion.objetivo
        ] =
            accion.accion === "abrir"
                ? "abierto"
                : "cerrado";

    }


    else if (
        accion.objetivo === "muneca"
    ) {

        estadoMano.muneca =
            accion.valor;

    }

}


// ==========================================================
// ACTUALIZAR ESTADO DESDE COMANDO
// ==========================================================

function actualizarEstadoDesdeComando(
    comando
) {

    const interpretacion =
        interpretarParte(
            normalizarEntrada(
                comando
            )
        );


    if (
        Array.isArray(
            interpretacion
        )
    ) {

        interpretacion.forEach(
            actualizarEstadoDesdeAccion
        );

    } else if (
        interpretacion
    ) {

        actualizarEstadoDesdeAccion(
            interpretacion
        );

    }


    actualizarVisualEstado();

}


// ==========================================================
// ACTUALIZAR VISUAL DEL ESTADO
// ==========================================================


function actualizarVisualEstado() {

    const elementos = {

        pulgar:
            document.getElementById(
                "estado-pulgar"
            ),

        indice:
            document.getElementById(
                "estado-indice"
            ),

        medio:
            document.getElementById(
                "estado-medio"
            ),

        anular:
            document.getElementById(
                "estado-anular"
            ),

        menique:
            document.getElementById(
                "estado-menique"
            ),

        muneca:
            document.getElementById(
                "estado-muneca"
            )

    };


    for (
        const dedo of todosLosDedos
    ) {

        const elemento =
            elementos[dedo];


        if (!elemento) {
            continue;
        }


        const estado =
            estadoMano[dedo];


        elemento.textContent =
            capitalizar(
                dedo
            ) +
            ": " +
            obtenerEmojiEstado(
                estado
            ) +
            " " +
            capitalizar(
                estado
            );

    }


    if (elementos.muneca) {

        elementos.muneca.textContent =
            "Muñeca: " +
            obtenerEmojiEstado(
                estadoMano.muneca
            ) +
            " " +
            capitalizar(
                estadoMano.muneca
            );

    }

    document.querySelectorAll(".indicador-dedo").forEach(indicador => {
        const estado = estadoMano[indicador.dataset.dedo] || "desconocido";
        indicador.className = `indicador-dedo ${estado}`;
    });

}


function crearIndicadoresEstado() {

    const modulo = document.querySelector(".modulo");

    if (!modulo || modulo.querySelector(".estado-dedos-categoria")) {
        return;
    }

    const barra = document.createElement("div");
    barra.className = "estado-dedos-categoria";
    barra.innerHTML = `
        <span>ESTADO ACTUAL</span>
        <i class="indicador-dedo desconocido" data-dedo="pulgar">Pulgar</i>
        <i class="indicador-dedo desconocido" data-dedo="indice">Indice</i>
        <i class="indicador-dedo desconocido" data-dedo="medio">Medio</i>
        <i class="indicador-dedo desconocido" data-dedo="anular">Anular</i>
        <i class="indicador-dedo desconocido" data-dedo="menique">Meñique</i>
        <i class="indicador-dedo desconocido" data-dedo="muneca">Muñeca</i>
    `;

    modulo.insertBefore(barra, modulo.children[1] || null);

}


// ==========================================================
// ENVIAR COMANDO
// ==========================================================

async function enviarComando(
    comando
) {

    if (!escritor) {

        agregarMonitor(
            "⚠️ La mano robótica no está conectada.",
            "error"
        );

        return false;

    }


    return colaEjecucion =
        colaEjecucion.then(
            async function () {

                try {

                    const limpio =
                        limpiarComando(
                            comando
                        );


                    const datos =
                        new TextEncoder()
                            .encode(
                                limpio +
                                "\n"
                            );


                    await escritor.write(
                        datos
                    );


                    agregarMonitor(
                        "➡️ " +
                        limpio
                    );


                    return true;

                } catch (error) {

                    console.error(
                        error
                    );


                    agregarMonitor(
                        "❌ Error de conexión al enviar comando.",
                        "error"
                    );


                    if (puerto && !contexto.desconexionIntencional) {
                        contexto.conectado = false;
                        marcarEstadoDesconocido();
                        actualizarEstadoConexion(false);
                    }


                    return false;

                }

            }
        );

}


// ==========================================================
// LIMPIAR COMANDO
// ==========================================================

function limpiarComando(
    texto
) {

    return String(texto)

        .replace(
            /[.!?]+$/g,
            ""
        )

        .trim()

        .toLowerCase();

}


// ==========================================================
// RECIBIR ARDUINO
// ==========================================================

async function recibirDatos() {

    if (
        !puerto ||
        !puerto.readable
    ) {

        return;

    }


    const decoder =
        new TextDecoder();


    lector =
        puerto.readable.getReader();


    try {

        while (true) {

            const resultado =
                await lector.read();


            if (
                resultado.done
            ) {

                break;

            }


            if (
                !resultado.value
            ) {

                continue;

            }


            const fragmento =
                decoder.decode(
                    resultado.value,
                    {
                        stream: true
                    }
                );


            bufferSerial +=
                fragmento;


            const lineas =
                bufferSerial.split(
                    /\r?\n/
                );


            bufferSerial =
                lineas.pop() ?? "";


            lineas.forEach(
                function (linea) {

                    const mensaje =
                        linea.trim();


                    if (mensaje) {

                        agregarMonitor(
                            mensaje
                        );

                    }

                }
            );

        }

    } catch (error) {

        console.error(
            error
        );


        if (!contexto.desconexionIntencional) {
            agregarMonitor(
                "⚠️ Error de comunicación al recibir datos de la mano robótica.",
                "error"
            );
            marcarEstadoDesconocido();
        }

    } finally {

        if (lector) {

            try {
                lector.releaseLock();
            } catch (error) {}

            lector = null;

        }

    }

}


// ==========================================================
// SECUENCIAS PREDEFINIDAS
// ==========================================================

const secuencias = {

    1: [

        "abre la mano",
        "cierra la mano",
        "abre la mano",
        "cierra la mano",

        "mueve la muñeca a la izquierda",
        "mueve la muñeca a la derecha",
        "mueve la muñeca al centro"

    ],


    2: [

        "abre el dedo pulgar",
        "cierra el dedo pulgar",

        "abre el dedo índice",
        "cierra el dedo índice",

        "abre el dedo medio",
        "cierra el dedo medio",

        "abre el dedo anular",
        "cierra el dedo anular",

        "abre el dedo meñique",
        "cierra el dedo meñique",

        "abre la mano"

    ],


    3: [

        "abre la mano",

        "mueve la muñeca a la izquierda",
        "mueve la muñeca al centro",
        "mueve la muñeca a la derecha",
        "mueve la muñeca al centro",

        "cierra el dedo pulgar",
        "cierra el dedo índice",
        "cierra el dedo medio",
        "cierra el dedo anular",
        "cierra el dedo meñique",

        "abre la mano",

        "mueve la muñeca al centro"

    ]

};


// ==========================================================
// EJECUTAR SECUENCIA
// ==========================================================

async function ejecutarSecuencia(
    numero
) {

    if (secuenciaActiva) {

        agregarMonitor(
            "⚠️ Ya hay una secuencia en ejecución.",
            "error"
        );

        return;

    }


    if (!escritor) {

        agregarMonitor(
            "⚠️ Conecta la mano robótica primero.",
            "error"
        );

        return;

    }


    const secuencia =
        secuencias[numero];


    if (!secuencia) {
        return;
    }


    secuenciaActiva = true;
    detenerSecuencia = false;
    numeroRepeticion = 0;

    contexto.ultimaSecuencia =
        numero;


    agregarMonitor(
        "🧪 Iniciando Secuencia " +
        numero
    );


    if (estadoSecuencia) {

        estadoSecuencia.textContent =
            "Estado: 🟢 Ejecutando Secuencia " +
            numero;

    }


    do {

        numeroRepeticion++;


        for (
            const comando of secuencia
        ) {

            if (
                detenerSecuencia
            ) {

                break;

            }


            const resultado =
                await enviarComando(
                    comando
                );


            if (!resultado) {

                detenerSecuencia = true;

                break;

            }


            actualizarEstadoDesdeComando(
                comando
            );


            await esperar(
                700
            );

        }


        if (
            !detenerSecuencia
        ) {

            agregarMonitor(
                "✅ Repetición " +
                numeroRepeticion +
                " completada."
            );

        }


    } while (
        bucleSecuencia &&
        bucleSecuencia.checked &&
        !detenerSecuencia
    );


    secuenciaActiva = false;


    if (estadoSecuencia) {

        estadoSecuencia.textContent =
            "Estado: Ninguna secuencia en ejecución";

    }

}


// ==========================================================
// FINALIZAR SECUENCIA
// ==========================================================

async function finalizarSecuencia() {

    if (
        !secuenciaActiva
    ) {

        agregarMonitor(
            "ℹ️ No hay ninguna secuencia activa."
        );

        return;

    }


    detenerSecuencia = true;


    agregarMonitor(
        "⏹️ Secuencia detenida."
    );


    if (estadoSecuencia) {

        estadoSecuencia.textContent =
            "Estado: Restableciendo posición inicial...";

    }


    if (escritor) {

        await enviarComando(
            "mueve la muñeca al centro"
        );


        await esperar(
            500
        );


        await enviarComando(
            "abre la mano"
        );

    }


    actualizarEstadoDesdeComando(
        "mueve la muñeca al centro"
    );


    actualizarEstadoDesdeComando(
        "abre la mano"
    );


    secuenciaActiva = false;


    if (estadoSecuencia) {

        estadoSecuencia.textContent =
            "Estado: Posición inicial";

    }

}


// ==========================================================
// ESPERAR
// ==========================================================

function esperar(
    milisegundos
) {

    return new Promise(
        resolver =>
            setTimeout(
                resolver,
                milisegundos
            )
    );

}


// ==========================================================
// MONITOR
// ==========================================================

function agregarMonitor(
    mensaje,
    tipo = "normal"
) {

    if (
        !mensaje ||
        !monitor
    ) {

        return;

    }


    const linea =
        document.createElement(
            "p"
        );


    linea.textContent =
        mensaje;


    linea.dataset.tipo =
        tipo;


    monitor.appendChild(
        linea
    );


    while (
        monitor.children.length > 5
    ) {

        monitor.removeChild(
            monitor.firstElementChild
        );

    }


    monitor.scrollTop =
        monitor.scrollHeight;


    agregarHistorial(
        mensaje,
        tipo
    );

}


// ==========================================================
// HISTORIAL
// ==========================================================

function agregarHistorial(
    mensaje,
    tipo = "normal"
) {

    if (
        !historialMonitor
    ) {

        return;

    }


    const linea =
        document.createElement(
            "p"
        );


    linea.textContent =
        mensaje;


    linea.dataset.tipo =
        tipo;


    historialMonitor.appendChild(
        linea
    );


    historialMonitor.scrollTop =
        historialMonitor.scrollHeight;

}


// ==========================================================
// LIMPIAR MONITOR
// ==========================================================

function limpiarMonitor() {

    if (monitor) {

        monitor.innerHTML = "";

    }


    if (historialMonitor) {

        historialMonitor.innerHTML = "";

    }


    agregarMonitor(
        "🗑️ Monitor limpiado."
    );

}


// ==========================================================
// RECONOCIMIENTO DE VOZ
// ==========================================================

function configurarReconocimientoVoz() {

    const ReconocimientoVoz =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (
        !ReconocimientoVoz
    ) {

        vozDisponible = false;


        if (botonMicrofono) {

            botonMicrofono.disabled =
                true;

        }


        if (estadoMicrofono) {

            estadoMicrofono.textContent =
                "⚠️ Reconocimiento de voz no disponible.";

        }


        agregarMonitor(
            "⚠️ Speech Recognition no está disponible.",
            "error"
        );


        return;

    }


    vozDisponible = true;


    reconocimientoVoz =
        new ReconocimientoVoz();


    reconocimientoVoz.lang =
        "es-AR";


    reconocimientoVoz.continuous =
        false;


    reconocimientoVoz.interimResults =
        false;


    reconocimientoVoz.maxAlternatives =
        5;


    botonMicrofono?.addEventListener(
        "click",
        iniciarReconocimientoVoz
    );

    botonDetenerMicrofono?.addEventListener(
        "click",
        detenerReconocimientoVoz
    );


    reconocimientoVoz.addEventListener(
        "start",
        function () {
            vozEnCurso = true;
            reinicioLlamadaPendiente = false;

            if (modoLlamadaIA) {
                actualizarEstadoLlamada("Escuchando...", true);
            }

            if (estadoMicrofono) {
                estadoMicrofono.textContent =
                    "Estado: 🎤 Escuchando... Hablá ahora";
            }
        }
    );


    reconocimientoVoz.addEventListener(
        "result",
        function (evento) {

            const resultado =
                evento.results[
                    evento.results.length - 1
                ];


            const alternativas = [];


            for (
                let i = 0;
                i < resultado.length;
                i++
            ) {

                if (
                    resultado[i]?.transcript
                ) {

                    alternativas.push(
                        resultado[i].transcript
                    );

                }

            }


            if (
                alternativas.length === 0
            ) {

                return;

            }


            // La interpretación completa pasa por procesarEntrada.
            const texto = alternativas[0];


            agregarMonitor(
                "🎤 Comando de voz: " +
                texto
            );


            if (panelIA && !panelIA.hidden) {
                if (modoIAActual === "audio") {
                    if (entradaChat) {
                        entradaChat.value = texto;
                    }
                    actualizarEstadoLlamada("Orden de voz recibida", false);
                    enviarMensajeChat(texto);
                } else {
                    enviarMensajeChat(texto);
                }
            } else {
                procesarEntrada(texto, "voz");
            }

        }
    );


    reconocimientoVoz.addEventListener(
        "end",
        function () {

            vozEnCurso = false;

            if (botonMicrofono) {
                botonMicrofono.disabled = false;
            }

            if (botonDetenerMicrofono) {
                botonDetenerMicrofono.disabled = true;
            }

            if (botonVozChat) {
                botonVozChat.disabled = false;
            }

            if (estadoMicrofono) {

                estadoMicrofono.textContent =
                    "Estado: 🎤 Micrófono Apagado";

            }

            if (modoLlamadaIA && !respuestaEnVoz && !reinicioLlamadaPendiente) {
                reinicioLlamadaPendiente = true;
                window.setTimeout(() => {
                    if (modoLlamadaIA) {
                        iniciarReconocimientoVoz();
                    }
                }, 450);
            }

        }
    );


    reconocimientoVoz.addEventListener(
        "error",
        function (evento) {

            console.error(
                evento
            );


            if (estadoMicrofono) {

                estadoMicrofono.textContent =
                    "Estado: ⚠️ Error del Micrófono";

            }


            agregarMonitor(
                "⚠️ Error del reconocimiento de voz: " +
                (evento.error || "desconocido"),
                "error"
            );

            vozEnCurso = false;

            if (botonMicrofono) {
                botonMicrofono.disabled = false;
            }

            if (botonDetenerMicrofono) {
                botonDetenerMicrofono.disabled = true;
            }

            if (botonVozChat) {
                botonVozChat.disabled = false;
            }

            if (modoLlamadaIA && evento.error !== "not-allowed") {
                actualizarEstadoLlamada("Reintentando canal...", true);
            }

        }
    );

}


// ==========================================================
// INICIAR VOZ
// ==========================================================

function iniciarReconocimientoVoz() {

    if (!vozDisponible || !reconocimientoVoz || vozEnCurso) {

        return;

    }


    if (estadoMicrofono) {

        estadoMicrofono.textContent =
            "Estado: 🎤 Escuchando...";

    }


    try {

        vozEnCurso = true;
        if (botonMicrofono) {
            botonMicrofono.disabled = true;
        }
        if (botonDetenerMicrofono) {
            botonDetenerMicrofono.disabled = false;
        }
        if (botonVozChat) {
            botonVozChat.disabled = true;
        }

        reconocimientoVoz.continuous = modoLlamadaIA;
        reconocimientoVoz.start();

    } catch (error) {

        vozEnCurso = false;

        console.error(
            error
        );

        agregarMonitor(
            "⚠️ No se pudo iniciar el micrófono.",
            "error"
        );

    }

}


// ==========================================================
// UTILIDADES
// ==========================================================

function contieneAlguna(
    texto,
    palabras
) {
    const textoNormalizado = normalizarEntrada(texto);

    return palabras.some(
        palabra =>
            textoNormalizado.includes(
                normalizarEntrada(palabra)
            )
    );

}


// ==========================================================
// CONVERTIR A ARRAY
// ==========================================================

function convertirAArray(resultado) {

    if (!resultado) {
        return [];
    }


    if (Array.isArray(resultado)) {
        return resultado;
    }


    return [resultado];

}


// ==========================================================
// EXTRAER NÚMERO
// ==========================================================

function extraerNumero(
    texto
) {

    const resultado =
        texto.match(
            /\d+/
        );


    if (!resultado) {

        const palabras = {

            uno: 1,
            una: 1,

            dos: 2,

            tres: 3,

            cuatro: 4,

            cinco: 5,

            seis: 6,

            siete: 7,

            ocho: 8,

            nueve: 9,

            diez: 10

        };


        for (
            const palabra in palabras
        ) {

            if (
                texto.includes(
                    palabra
                )
            ) {

                return palabras[palabra];

            }

        }


        return null;

    }


    return Number(
        resultado[0]
    );

}


// ==========================================================
// CAPITALIZAR
// ==========================================================

function capitalizar(
    texto
) {

    if (!texto) {
        return "";
    }


    return (
        texto.charAt(0).toUpperCase() +
        texto.slice(1)
    );

}


// ==========================================================
// EMOJI ESTADO
// ==========================================================

function obtenerEmojiEstado(
    estado
) {

    if (
        estado === "abierto" ||
        estado === "izquierda"
    ) {

        return "🟢";

    }


    if (
        estado === "cerrado" ||
        estado === "derecha"
    ) {

        return "🔴";

    }


    if (
        estado === "centro"
    ) {

        return "⦿";

    }


    return "❔";

}


// ==========================================================
// ESCAPAR REGEXP
// ==========================================================

function escaparRegExp(
    texto
) {

    return String(texto)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

}


// ==========================================================
// INICIAR APLICACIÓN
// ==========================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarApp
    );

} else {

    inicializarApp();

}


function detenerReconocimientoVoz() {

    if (!reconocimientoVoz || !vozEnCurso) {
        return;
    }

    try {
        reconocimientoVoz.stop();
    } catch (error) {
        console.error(error);
    }

}


function actualizarTextoVoz(reconocido, corregido) {

    if (textoVoz) {
        textoVoz.textContent = reconocido || "Ninguno";
    }

    if (textoCorregido) {
        textoCorregido.textContent = corregido || "Ninguno";
    }

}


function actualizarInterpretacionVoz(texto) {

    if (interpretacionVoz) {
        interpretacionVoz.textContent = texto || "Ninguna";
    }

}


function describirInterpretacion(acciones) {

    return acciones.map(accion => {
        if (accion.objetivo === "mano") {
            return accion.accion === "abrir"
                ? "Abrir mano"
                : "Cerrar mano";
        }

        if (accion.objetivo === "muneca") {
            return "Mover muñeca a " + accion.valor;
        }

        return capitalizar(accion.accion) + " " +
            nombresDedos[accion.objetivo];
    }).join("; ");

}


function marcarEstadoDesconocido() {

    todosLosDedos.forEach(dedo => {
        estadoMano[dedo] = "desconocido";
    });

    estadoMano.muneca = "desconocida";
    actualizarVisualEstado();

}


function obtenerUltimaAccion(texto) {

    const coincidencias = texto.match(
        /\b(?:abre|abrir|abri|abierto|abrime|abreme|cierra|cerrar|cerra|cerrado|cerrame)\b/g
    );

    if (!coincidencias || coincidencias.length === 0) {
        return null;
    }

    return ["abre", "abrir", "abri", "abierto", "abrime", "abreme"]
        .includes(coincidencias[coincidencias.length - 1])
        ? "abrir"
        : "cerrar";

}


function obtenerPrimeraAccion(texto) {

    const coincidencias = texto.match(
        /\b(?:abre|abrir|abri|abierto|abrime|abreme|cierra|cerrar|cerra|cerrado|cerrame)\b/g
    );

    if (!coincidencias || coincidencias.length === 0) {
        return null;
    }

    return ["abre", "abrir", "abri", "abierto", "abrime", "abreme"]
        .includes(coincidencias[0])
        ? "abrir"
        : "cerrar";

}


// ==========================================================
// EJECUTAR ACCIONES IA (JSON DIRECTO)
// ==========================================================

async function ejecutarAccionesIAJSON(acciones) {

    if (!Array.isArray(acciones) || acciones.length === 0) {
        console.log("[FRONTEND] ejecutarAccionesIAJSON: Sin acciones");
        return 0;
    }

    console.log("[FRONTEND] ===== ejecutarAccionesIAJSON INICIADA =====");
    console.log("[FRONTEND] Acciones JSON recibidas:", JSON.stringify(acciones, null, 2));

    const plan = planificar({ acciones });
    console.log("[FRONTEND] Plan generado:", JSON.stringify(plan, null, 2));

    const valido = validarPlan(plan);
    console.log("[FRONTEND] Plan válido:", valido);

    if (!valido) {
        console.log("[FRONTEND] ⚠️ Plan inválido, retornando");
        agregarMonitor(
            "⚠️ Las acciones de la IA no son válidas.",
            "error"
        );
        return 0;
    }

    console.log("[FRONTEND] Ejecutando plan...");
    await ejecutarPlan(plan);
    console.log("[FRONTEND] ===== ejecutarAccionesIAJSON COMPLETADA =====");
    return acciones.length;

}


// ==========================================================
// ENVIAR MENSAJE CHAT
// ==========================================================

async function enviarMensajeChat(textoForzado = "") {

    const texto = textoForzado || entradaChat?.value.trim();

    if (!texto) {
        return;
    }

    agregarMensajeChat("Vos", texto);
    historialChatIA.push({ role: "user", content: texto });
    if (entradaChat) {
        entradaChat.value = "";
    }

    if (botonChat) {
        botonChat.disabled = true;
    }

    mostrarIApensando();

    try {
        console.log("\n[FRONTEND] ===== NUEVO MENSAJE CHAT =====");
        console.log("[FRONTEND] Texto enviado:", texto);
        console.log("[FRONTEND] Enviando POST a /api/chat...");
        
        const respuesta = await fetch(
            `${URL_API}/api/chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    texto,
                        historial: historialChatIA.slice(0, -1),
                        estado: estadoMano
                })
            }
        );

        const datos = await respuesta.json();
        console.log("[FRONTEND] Respuesta del servidor:", JSON.stringify(datos, null, 2));

        if (!respuesta.ok) {
            throw new Error(datos.error || "Error de chat");
        }

        const mensaje = datos.respuesta || "No recibí una respuesta.";
        historialChatIA.push({ role: "assistant", content: mensaje });
        ocultarIApensando();
        agregarMensajeChat("Groq", mensaje);
        hablarRespuestaIA(mensaje);

        // Detectar si acciones son JSON estructurado o strings
        const sonAccionesJSON = Array.isArray(datos.acciones) && 
            datos.acciones.length > 0 && 
            typeof datos.acciones[0] === 'object' && 
            datos.acciones[0].accion !== undefined;

        console.log("[FRONTEND] Tipo de acciones:", sonAccionesJSON ? "JSON ESTRUCTURADO ✅" : "STRINGS ⚠️");
        console.log("[FRONTEND] Cantidad de acciones:", datos.acciones.length);

        const cantidadAcciones = sonAccionesJSON
            ? await ejecutarAccionesIAJSON(datos.acciones)
            : await ejecutarAccionesIA(datos.acciones);
        const cantidadLlamadas = cantidadAcciones > 0
            ? 0
            : await ejecutarLlamadasIA(mensaje);
        const ejecutoUnaOrden = cantidadAcciones > 0 || cantidadLlamadas > 0
            ? true
            : await procesarEntrada(texto, "ia", true);

        if (ejecutoUnaOrden && !escritor) {
            agregarMensajeChat("Sistema", "Entendí la orden, pero la mano está desconectada.");
        }
    } catch (error) {
        console.error(error);
        ocultarIApensando();
        agregarMensajeChat("Sistema", error.message);
    } finally {
        if (botonChat) {
            botonChat.disabled = false;
        }
    }

}


function alternarModoLlamada() {

    if (!vozDisponible || !reconocimientoVoz) {
        actualizarEstadoLlamada("Voz no disponible", false);
        return;
    }

    modoLlamadaIA = !modoLlamadaIA;

    if (!modoLlamadaIA) {
        reconocimientoVoz.stop();
        window.speechSynthesis?.cancel();
        respuestaEnVoz = false;
        actualizarEstadoLlamada("Canal de voz listo", false);
        return;
    }

    actualizarEstadoLlamada("Modo llamada activo", true);
    iniciarReconocimientoVoz();

}


function actualizarEstadoLlamada(mensaje, activo) {

    if (estadoLlamada) {
        estadoLlamada.querySelector("span:last-child").textContent = mensaje;
        estadoLlamada.classList.toggle("llamada-activa", activo);
    }

    if (botonVozChat) {
        botonVozChat.textContent = activo
            ? "Finalizar llamada"
            : "Iniciar modo llamada";
        botonVozChat.setAttribute("aria-pressed", String(activo));
    }

}


function hablarRespuestaIA(mensaje) {

    if (!modoLlamadaIA || !window.speechSynthesis || !mensaje) {
        return;
    }

    respuestaEnVoz = true;
    if (vozEnCurso) {
        reconocimientoVoz.stop();
    }
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(mensaje);
    voz.lang = "es-ES";
    voz.rate = 1;
    voz.pitch = 1.02;
    voz.addEventListener("end", () => {
        respuestaEnVoz = false;
        if (modoLlamadaIA) {
            iniciarReconocimientoVoz();
        }
    });
    window.speechSynthesis.speak(voz);

}


function agregarMensajeChat(remitente, mensaje) {

    if (!historialChatElemento) {
        return;
    }

    if (historialChatElemento.textContent === "Todavia no hay mensajes.") {
        historialChatElemento.textContent = "";
    }

    const linea = document.createElement("p");
    linea.className = `mensaje-chat mensaje-${remitente.toLowerCase()}`;

    const cuerpo = document.createElement("span");
    cuerpo.className = "mensaje-cuerpo";

    const meta = document.createElement("span");
    meta.className = "mensaje-meta";

    const nombre = document.createElement("strong");
    nombre.className = "mensaje-remitente";
    nombre.textContent = remitente === "Vos"
        ? localStorage.getItem("mano-robotica-nombre") || "Vos"
        : remitente === "Groq"
            ? "IA // GROQ"
            : "SISTEMA";

    const hora = document.createElement("time");
    hora.className = "mensaje-hora";
    hora.textContent = obtenerHoraChat();

    const texto = document.createElement("span");
    texto.className = "mensaje-texto";
    texto.textContent = mensaje;

    meta.append(nombre, hora);
    cuerpo.append(meta, texto);
    linea.appendChild(cuerpo);
    historialChatElemento.appendChild(linea);
    historialChatElemento.scrollTop = historialChatElemento.scrollHeight;

}


function obtenerHoraChat() {
    return new Intl.DateTimeFormat("es-ES", {
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date());
}


function prepararMensajesIniciales() {

    document.querySelectorAll(".mensaje-sistema").forEach(linea => {
        if (linea.querySelector(".mensaje-meta")) {
            return;
        }

        const contenido = linea.textContent;
        linea.textContent = "";

        const cuerpo = document.createElement("span");
        cuerpo.className = "mensaje-cuerpo";

        const meta = document.createElement("span");
        meta.className = "mensaje-meta";

        const nombre = document.createElement("strong");
        nombre.className = "mensaje-remitente";
        nombre.textContent = "SISTEMA";

        const hora = document.createElement("time");
        hora.className = "mensaje-hora";
        hora.textContent = obtenerHoraChat();

        const texto = document.createElement("span");
        texto.className = "mensaje-texto";
        texto.textContent = contenido;

        meta.append(nombre, hora);
        cuerpo.append(meta, texto);
        linea.appendChild(cuerpo);
    });

}


const centroDeControlIA = {
    abrirMano: async () => {
        return procesarEntrada("abre la mano", "ia", true);
    },

    cerrarMano: async () => {
        return procesarEntrada("cierra la mano", "ia", true);
    },

    abrirDedo: async (dedo) => {
        const nombre = String(dedo || "").trim().toLowerCase();
        if (!nombre) return false;
        return procesarEntrada(`abre el dedo ${nombre}`, "ia", true);
    },

    cerrarDedo: async (dedo) => {
        const nombre = String(dedo || "").trim().toLowerCase();
        if (!nombre) return false;
        return procesarEntrada(`cierra el dedo ${nombre}`, "ia", true);
    },

    moverMuneca: async (direccion) => {
        const valor = String(direccion || "").trim().toLowerCase();
        if (!valor) return false;
        return procesarEntrada(`mueve la muñeca a ${valor}`, "ia", true);
    },

    centrarMuneca: async () => {
        return procesarEntrada("mueve la muñeca al centro", "ia", true);
    },

    posicionInicial: async () => {
        return procesarEntrada("posicion inicial", "ia", true);
    },

    leerEstado: () => ({
        ...estadoMano
    }),

    esperar: async (milisegundos) => {
        const tiempo = Math.min(Math.max(Number(milisegundos) || 0, 0), 30000);
        await esperar(tiempo);
        return true;
    },

    ejecutarPlan: async (plan) => {
        if (!Array.isArray(plan) || plan.length === 0) {
            return false;
        }

        const planValido = planificar({ acciones: plan });

        if (!validarPlan(planValido)) {
            return false;
        }

        await ejecutarPlan(planValido);
        return true;
    }
};


function resolverHerramientIA(comando) {
    const texto = String(comando || "").trim();
    if (!texto) {
        return null;
    }

    const normalizado = normalizarEntrada(texto);

    if (normalizado === "abre la mano" || normalizado === "abrir la mano") {
        return () => centroDeControlIA.abrirMano();
    }

    if (normalizado === "cierra la mano" || normalizado === "cerrar la mano") {
        return () => centroDeControlIA.cerrarMano();
    }

    if (normalizado === "mueve la muneca al centro" || normalizado === "muneca al centro") {
        return () => centroDeControlIA.centrarMuneca();
    }

    if (normalizado === "posicion inicial" || normalizado === "volveme a la posicion inicial") {
        return () => centroDeControlIA.posicionInicial();
    }

    const direccion = normalizado.match(/mueve la muneca a (izquierda|derecha|centro)$/i);
    if (direccion) {
        return () => centroDeControlIA.moverMuneca(direccion[1]);
    }

    const abreDedo = normalizado.match(/^abre el dedo (pulgar|indice|medio|anular|menique|meñique)$/i);
    if (abreDedo) {
        return () => centroDeControlIA.abrirDedo(abreDedo[1]);
    }

    const cierraDedo = normalizado.match(/^cierra el dedo (pulgar|indice|medio|anular|menique|meñique)$/i);
    if (cierraDedo) {
        return () => centroDeControlIA.cerrarDedo(cierraDedo[1]);
    }

    const pausa = normalizado.match(/^esperar\s+(\d+)\s+milisegundos?$/i);
    if (pausa) {
        return () => centroDeControlIA.esperar(Number(pausa[1]));
    }

    const aleatorio = normalizado.match(/^secuencia aleatoria\s*(\d+)?$/i);
    if (aleatorio) {
        const cantidad = Math.min(Math.max(Number(aleatorio[1]) || 4, 1), 20);
        return () => {
            const acciones = generarSecuenciaAleatoria(cantidad, obtenerRestricciones(normalizado));
            return centroDeControlIA.ejecutarPlan(acciones);
        };
    }

    return null;
}


async function ejecutarLlamadasIA(mensaje) {

    const llamadas = [...String(mensaje).matchAll(
        /\[CALL:\s*([^\]]+)\]/gi
    )];

    for (const llamada of llamadas) {
        const contenido = llamada[1].trim();
        const movimiento = contenido.match(
            /^moverDedo\(\s*([1-5])\s*,\s*(0|180)\s*\)$/i
        );
        const espera = contenido.match(
            /^esperar\(\s*(\d+)\s*\)$/i
        );
        const aleatorios = contenido.match(
            /^movimientosAleatorios\(\s*(\d+)\s*\)$/i
        );

        if (espera) {
            await esperar(Math.min(Number(espera[1]), 30000));
            continue;
        }

        if (aleatorios) {
            const cantidad = Math.min(Math.max(Number(aleatorios[1]), 1), 20);
            const acciones = generarSecuenciaAleatoria(cantidad);
            await ejecutarPlan(planificar({ acciones }));
            continue;
        }

        if (!movimiento) {
            continue;
        }

        const dedo = todosLosDedos[Number(movimiento[1]) - 1];
        const accion = Number(movimiento[2]) === 0 ? "abrir" : "cerrar";

        if (!dedo) {
            continue;
        }

        const comando = `${accion} el dedo ${nombresDedos[dedo]}`;
        const enviado = await enviarComando(comando);

        if (enviado) {
            actualizarEstadoDesdeAccion({
                accion,
                objetivo: dedo,
                valor: accion === "abrir" ? "abierto" : "cerrado"
            });
        }
    }

    if (llamadas.length > 0) {
        actualizarVisualEstado();
    }

    return llamadas.length;
}


async function ejecutarAccionesIA(acciones) {

    if (!Array.isArray(acciones)) {
        console.log("[FRONTEND] ejecutarAccionesIA: No es array");
        return 0;
    }

    console.log("[FRONTEND] ===== ejecutarAccionesIA INICIADA (FALLBACK STRING) =====");
    console.log("[FRONTEND] Acciones (strings):", JSON.stringify(acciones, null, 2));

    let accionesEjecutadas = 0;

    for (const comando of acciones) {

        if (!comando || comando.length > 160) {
            console.log("[FRONTEND] Comando vacío o muy largo, saltando");
            continue;
        }

        console.log("[FRONTEND] Procesando comando:", comando);

        const herramienta = resolverHerramientIA(comando);

        if (herramienta) {
            console.log("[FRONTEND] ✅ Herramienta resuelta:", comando);
            await herramienta();
            accionesEjecutadas++;
            continue;
        }

        const pausa = comando.match(
            /^esperar\s+(\d+)\s+milisegundos?$/i
        );

        if (pausa) {
            console.log("[FRONTEND] ⏸️ Pausa detectada:", pausa[1], "ms");
            await centroDeControlIA.esperar(Number(pausa[1]));
            accionesEjecutadas++;
            continue;
        }

        console.log("[FRONTEND] ❌ Comando no resuelto, cayendo a procesarEntrada:", comando);
        await procesarEntrada(comando, "ia", true);
        accionesEjecutadas++;
    }

    console.log("[FRONTEND] ===== ejecutarAccionesIA COMPLETADA - Acciones ejecutadas:", accionesEjecutadas, "=====");
    return accionesEjecutadas;
}


function configurarIdentidadUsuario() {

    const nombreGuardado = localStorage.getItem("mano-robotica-nombre");
    const modalNombre = document.getElementById("modal-nombre");
    const formulario = document.getElementById("formulario-nombre");
    const entradaNombre = document.getElementById("entrada-nombre");
    const entradaNombreConfig = document.getElementById("entrada-nombre-config");
    const guardarNombreConfig = document.getElementById("guardar-nombre-config");
    const salirNombreConfig = document.getElementById("salir-nombre-config");
    const estadoNombreConfig = document.getElementById("estado-nombre-config");

    const actualizarNombre = nombre => {
        document.querySelectorAll("[data-usuario]").forEach(elemento => {
            elemento.textContent = nombre;
        });
    };

    if (nombreGuardado) {
        actualizarNombre(nombreGuardado);
        if (entradaNombreConfig) {
            entradaNombreConfig.value = nombreGuardado;
        }
        document.querySelectorAll("[data-config-nombre]").forEach(elemento => {
            elemento.textContent = nombreGuardado;
        });
    } else if (modalNombre) {
        modalNombre.hidden = false;
        window.setTimeout(() => entradaNombre?.focus(), 150);
    }

    formulario?.addEventListener("submit", evento => {
        evento.preventDefault();
        const nombre = entradaNombre?.value.trim().replace(/\s+/g, " ");

        if (!nombre) {
            entradaNombre?.focus();
            return;
        }

        localStorage.setItem("mano-robotica-nombre", nombre);
        actualizarNombre(nombre);
        if (modalNombre) {
            modalNombre.hidden = true;
        }
    });

    guardarNombreConfig?.addEventListener("click", () => {
        const nombre = entradaNombreConfig?.value.trim().replace(/\s+/g, " ");

        if (!nombre) {
            entradaNombreConfig?.focus();
            return;
        }

        localStorage.setItem("mano-robotica-nombre", nombre);
        actualizarNombre(nombre);
        document.querySelectorAll("[data-config-nombre]").forEach(elemento => {
            elemento.textContent = nombre;
        });
        if (estadoNombreConfig) {
            estadoNombreConfig.textContent = "Nombre actualizado en la consola.";
        }
    });

    salirNombreConfig?.addEventListener("click", () => {
        localStorage.removeItem("mano-robotica-nombre");
        window.location.href = "index.html";
    });

}


function iniciarDictadoIA() {

    modoIAActual = "audio";
    actualizarEstadoLlamada("Escuchando tu orden...", true);
    iniciarReconocimientoVoz();

}


function mostrarIApensando() {

    ocultarIApensando();

    if (!historialChatElemento) {
        return;
    }

    const pensando = document.createElement("p");
    pensando.id = "ia-pensando";
    pensando.className = "mensaje-chat mensaje-pensando";
    pensando.innerHTML = "IA está pensando <span class=\"puntos-pensando\"><i></i><i></i><i></i></span>";
    historialChatElemento.appendChild(pensando);
    historialChatElemento.scrollTop = historialChatElemento.scrollHeight;

}


function ocultarIApensando() {
    document.getElementById("ia-pensando")?.remove();
}


function configurarRelojLocal() {

    const actualizar = () => {
        const ahora = new Date();
        const hora = new Intl.DateTimeFormat("es-ES", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(ahora);
        const fecha = new Intl.DateTimeFormat("es-ES", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(ahora).replace(/\./g, "").toUpperCase();

        document.querySelectorAll("[data-reloj]").forEach(elemento => {
            elemento.textContent = hora;
        });
        document.querySelectorAll("[data-fecha]").forEach(elemento => {
            elemento.textContent = fecha;
        });
    };

    actualizar();
    window.setInterval(actualizar, 30000);

}