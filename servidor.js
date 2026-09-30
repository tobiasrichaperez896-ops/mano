const http = require("node:http");
const OpenAI = require("openai");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

const clienteGroq = process.env.GROQ_API_KEY
    ? new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1"
    })
    : null;

const instruccionesIA = [
    "Eres el interprete de una mano robotica.",
    "Convierte la frase del usuario en acciones ordenadas.",
    "Usa solo dedos pulgar, indice, medio, anular, menique.",
    "Una accion de dedo debe tener accion abrir o cerrar.",
    "Para la muneca usa mover y valor izquierda, centro o derecha.",
    "Para posicion inicial usa objetivo mano y accion abrir, mas muneca centro.",
    "Para un dedo, objetivo debe ser directamente pulgar, indice, medio, anular o menique; nunca uses objetivo dedo.",
    "El valor de un dedo debe ser abierto o cerrado; nunca pongas el nombre del dedo en valor.",
    "Si la frase no es clara, devuelve acciones vacias.",
    "Este endpoint se conserva para compatibilidad; responde unicamente JSON de acciones."
].join(" ");

const instruccionesChat = [
    "Actua como un asistente virtual seguro de si mismo, relajado, empatico y coloquial.",
    "Puedes conversar sobre cualquier tema permitido con razonamiento, profundidad y naturalidad.",
    "Estas integrado en una aplicacion web que controla una mano robotica fisica mediante Arduino.",
    "La mano tiene cinco dedos: 1 pulgar, 2 indice, 3 medio, 4 anular y 5 menique.",
    "Los angulos son 0 para totalmente abierto y 180 para totalmente cerrado.",
    "Cuando el usuario pida una accion fisica, resuelvela internamente como un plan de acciones basicas del sistema: abrir o cerrar dedos, mover la muneca, abrir o cerrar la mano, posicion inicial y esperas cortas.",
    "No desveles ni nombres internos ni funciones ocultas del sistema, ni listados de herramientas, ni codigo JS, ni comandos serial o API.",
    "No respondas con tecnicismos de implementacion ni muestres el nombre de funciones internas como abrirDedo, cerrarDedo, moverMuneca, ejecutarPlan o centroDeControlIA.",
    "Si el usuario pide un gesto o secuencia, conviertelo por dentro a un plan compuesto por acciones simples del sistema y ejecutalo a traves de la logica del front-end.",
    "Usa [ACTION: ...] solo para acciones fisicas que deban ejecutarse. Una pregunta normal no debe llevar etiquetas.",
    "Para movimientos de dedos usa comandos naturales del sistema, como 'abre el dedo indice', 'cierra el dedo pulgar', 'mueve la muñeca a la derecha', 'abre la mano', 'posicion inicial' o 'esperar 500 milisegundos'.",
    "Si el usuario pide un gesto complejo, no lo expreses como una funcion interna ni como un comando inventado. Resuelvelo como una combinacion valida de acciones basicas.",
    "No inventes etiquetas de control fuera de ACTION.",
    "Puedes incluir llamadas dentro de una respuesta conversacional normal, sin responder en JSON.",
    "No afirmes que tienes cuerpo propio: explica que controlas la mano robotica conectada a esta aplicacion."
].join(" ");

const instruccionesAcciones = [
    "Analiza si el usuario solicito una accion fisica sobre la mano robotica.",
    "Devuelve un objeto JSON con una propiedad acciones que sea un array de acciones estructuradas.",
    "IMPORTANTE: Cada accion debe tener exactamente estos campos: accion, objetivo, valor.",
    "accion puede ser: 'abrir', 'cerrar' o 'mover'.",
    "objetivo puede ser: 'pulgar', 'indice', 'medio', 'anular', 'menique', 'mano' o 'muneca'.",
    "valor debe ser: 'abierto'/'cerrado' para dedos, 'abierta'/'cerrada' para mano, 'izquierda'/'centro'/'derecha' para muneca.",
    "Ejemplo correcto: {\"acciones\":[{\"accion\":\"cerrar\",\"objetivo\":\"pulgar\",\"valor\":\"cerrado\"},{\"accion\":\"abrir\",\"objetivo\":\"indice\",\"valor\":\"abierto\"}]}",
    "Para un gesto completo como rock: debe especificar los cinco dedos. Rock = pulgar cerrado, indice abierto, medio abierto, anular cerrado, menique abierto.",
    "Si el usuario pide mover la muñeca sin cambiar dedos, devuelve solo la accion de muneca: {\"acciones\":[{\"accion\":\"mover\",\"objetivo\":\"muneca\",\"valor\":\"derecha\"}]}",
    "Si no hay una accion fisica clara, devuelve {\"acciones\":[]}.",
    "Conserva el orden y la logica anatomica. Usa el estado actual y el historial cuando sea necesario.",
    "NO devuelvas comandos como strings. Devuelve SOLO el JSON con la estructura especificada."
].join(" ");

const modelosGroq = [
    "llama-3.3-70b-versatile",
    "llama-3.3-70b-specdec",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b"
];

function esErrorDeModelo(error) {
    return error.status === 404 ||
        error.code === "model_not_found" ||
        error.code === "model_decommissioned";
}

async function solicitarGroq(mensajes, opciones = {}) {

    let ultimoError;

    for (const modelo of modelosGroq) {
        try {
            return await clienteGroq.chat.completions.create({
                model: modelo,
                messages: mensajes,
                temperature: opciones.temperature ?? 0.7,
                ...(opciones.responseFormat
                    ? { response_format: opciones.responseFormat }
                    : {})
            });
        } catch (error) {
            ultimoError = error;

            if (!esErrorDeModelo(error)) {
                throw error;
            }
        }
    }

    throw ultimoError;
}

function responder(res, datos, estado = 200) {
    const cuerpo = JSON.stringify(datos);

    res.writeHead(estado, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
    });
    res.end(cuerpo);
}

function validarAcciones(acciones) {
    if (!Array.isArray(acciones)) {
        return [];
    }

    return acciones.slice(0, 200).filter(accion => {
        if (!accion || !accion.accion || !accion.objetivo || !accion.valor) {
            return false;
        }

        if (["pulgar", "indice", "medio", "anular", "menique"].includes(accion.objetivo)) {
            return ["abrir", "cerrar"].includes(accion.accion) &&
                ["abierto", "cerrado"].includes(accion.valor);
        }

        if (accion.objetivo === "muneca") {
            return accion.accion === "mover" &&
                ["izquierda", "centro", "derecha"].includes(accion.valor);
        }

        if (accion.objetivo === "mano") {
            return ["abrir", "cerrar"].includes(accion.accion) &&
                ["abierta", "cerrada"].includes(accion.valor);
        }

        return false;
    });
}

function extraerAccionesChat(texto) {
    const acciones = [...String(texto).matchAll(
        /\[ACTION:\s*([^\]]+)\]/gi
    )]
        .map(coincidencia => coincidencia[1].trim())
        .filter(comando => comando && comando.length <= 160);

    const respuesta = String(texto)
        .replace(/\[ACTION:\s*[^\]]+\]/gi, "")
        .replace(/\[CALL:\s*[^\]]+\]/gi, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return { respuesta, acciones };
}

async function interpretarAccionesChat(texto, historial, estado) {
    const resultado = await solicitarGroq([
        { role: "system", content: instruccionesAcciones },
        { role: "user", content: JSON.stringify({ texto, historial, estado }) }
    ], {
        temperature: 0,
        responseFormat: { type: "json_object" }
    });

    try {
        const plan = JSON.parse(
            resultado.choices[0]?.message?.content || "{\"acciones\":[] }"
        );

        return validarAcciones(plan.acciones);
    } catch (error) {
        return [];
    }
}

const servidor = http.createServer((solicitud, respuesta) => {
    if (solicitud.method === "GET" && solicitud.url === "/health") {
        responder(respuesta, { status: "ok", service: "mano-robotica-ia" });
        return;
    }

    // Servir archivos estáticos
    if (solicitud.method === "GET") {
        let rutaArchivo = solicitud.url === "/" ? "/index.html" : solicitud.url;
        rutaArchivo = path.join(__dirname, rutaArchivo);

        try {
            if (fs.existsSync(rutaArchivo)) {
                const contenido = fs.readFileSync(rutaArchivo, "utf-8");
                const tiposContenido = {
                    ".html": "text/html; charset=utf-8",
                    ".css": "text/css; charset=utf-8",
                    ".js": "application/javascript; charset=utf-8",
                    ".json": "application/json",
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".gif": "image/gif",
                    ".svg": "image/svg+xml",
                    ".ico": "image/x-icon"
                };
                const ext = path.extname(rutaArchivo).toLowerCase();
                const tipoContenido = tiposContenido[ext] || "application/octet-stream";

                respuesta.writeHead(200, {
                    "Content-Type": tipoContenido,
                    "Access-Control-Allow-Origin": "*"
                });
                respuesta.end(contenido);
                return;
            }
        } catch (error) {
            console.log("Error sirviendo archivo:", error.message);
        }
    }

    if (solicitud.method === "OPTIONS") {
        respuesta.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
        });
        respuesta.end();
        return;
    }

    if (
        solicitud.method !== "POST" ||
        !["/api/interpretar", "/api/chat"].includes(solicitud.url)
    ) {
        responder(respuesta, { error: "Ruta no encontrada" }, 404);
        return;
    }

    let cuerpo = "";

    solicitud.on("data", fragmento => {
        cuerpo += fragmento;

        if (cuerpo.length > 10000) {
            solicitud.destroy();
        }
    });

    solicitud.on("end", async () => {
        try {
            const datos = JSON.parse(cuerpo);
            const texto = String(datos.texto || "").trim();

            if (!texto) {
                responder(respuesta, { error: "Falta el texto" }, 400);
                return;
            }

            if (!clienteGroq) {
                responder(respuesta, {
                    error: "GROQ_API_KEY no esta configurada"
                }, 503);
                return;
            }

            if (solicitud.url === "/api/chat") {
                console.log("\n[SERVIDOR] ===== NUEVA SOLICITUD /api/chat =====");
                console.log("[SERVIDOR] Texto entrada:", texto);
                
                const historial = Array.isArray(datos.historial)
                    ? datos.historial.slice(-12).filter(mensaje =>
                        mensaje &&
                        ["user", "assistant"].includes(mensaje.role) &&
                        typeof mensaje.content === "string"
                    )
                    : [];

                console.log("[SERVIDOR] Historial mensajes:", historial.length);

                const respuestaChat = await solicitarGroq([
                        { role: "system", content: instruccionesChat },
                        ...historial,
                        { role: "user", content: texto }
                    ], {
                        temperature: 0.7
                    });

                const chat = extraerAccionesChat(
                    respuestaChat.choices[0]?.message?.content || "No pude responder."
                );
                console.log("[SERVIDOR] Chat respuesta:", chat.respuesta.substring(0, 100));
                
                const accionesInternas = await interpretarAccionesChat(
                    texto,
                    historial,
                    datos.estado || {}
                );
                
                console.log("[SERVIDOR] Acciones JSON recibidas:", JSON.stringify(accionesInternas, null, 2));

                const respuestaFinal = {
                    modo: "groq-chat",
                    respuesta: chat.respuesta || "Listo.",
                    acciones: accionesInternas.length > 0
                        ? accionesInternas
                        : chat.acciones
                };
                
                console.log("[SERVIDOR] Respuesta final al frontend:", JSON.stringify(respuestaFinal, null, 2));
                console.log("[SERVIDOR] ===== FIN /api/chat =====");
                
                responder(respuesta, respuestaFinal);
                return;
            }

            const resultado = await solicitarGroq([
                    { role: "system", content: instruccionesIA },
                    { role: "user", content: texto }
                ], {
                    responseFormat: { type: "json_object" },
                    temperature: 0
                }
            );

            const contenido = resultado.choices[0]?.message?.content || "{\"acciones\":[]}";
            const plan = JSON.parse(contenido);
            const acciones = validarAcciones(plan.acciones);
            responder(respuesta, {
                modo: "groq",
                texto,
                acciones,
                valido: acciones.length > 0
            });
        } catch (error) {
            console.error(error);

            if (error.status === 429) {
                responder(respuesta, {
                    error: "La cuota de Groq esta agotada o se alcanzo un limite. Revisa tu cuenta de Groq."
                }, 429);
                return;
            }

            if (error.status === 401) {
                responder(respuesta, {
                    error: "La clave de Groq no es valida o fue revocada."
                }, 401);
                return;
            }

            if (error.status === 404 || error.code === "model_not_found") {
                responder(respuesta, {
                    error: "Ninguno de los modelos configurados esta disponible para esta cuenta de Groq."
                }, 404);
                return;
            }

            responder(respuesta, { error: "No se pudo interpretar la solicitud" }, 500);
        }
    });
});

servidor.listen(PORT, HOST, () => {
    console.log(`Servidor de prueba: http://${HOST}:${PORT}`);
});