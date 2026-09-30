// ==========================================================
// PERSISTENCIA DEL PUERTO SERIAL
// ==========================================================
// Este módulo GUARDA el puerto en memoria compartida
// entre todas las páginas para NO perder la conexión
// ==========================================================

class PersistenciaPuerto {
    constructor() {
        this.STORAGE_KEY = 'mano-puerto-conectado';
        this.DEBUG = true;
        this.inicializar();
    }

    inicializar() {
        // Crear canal de comunicación entre tabs/frames
        if (!window.puertoCompartido) {
            window.puertoCompartido = {
                puerto: null,
                conectado: false,
                timestamp: null,
                info: {}
            };
            console.log('[PUERTO] ✅ Sistema de persistencia inicializado');
        }
    }

    // Guardar que hay conexión activa
    marcarConectado(puertoObjeto, info = {}) {
        if (!puertoObjeto) return;

        window.puertoCompartido = {
            puerto: puertoObjeto,
            conectado: true,
            timestamp: Date.now(),
            info: info
        };

        // También guardar en sessionStorage
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                conectado: true,
                timestamp: Date.now(),
                info: info
            }));
        } catch (e) {
            console.log('[PUERTO] sessionStorage no disponible');
        }

        console.log('[PUERTO] ✅ Puerto marcado como CONECTADO');
    }

    // Obtener el puerto guardado
    obtenerPuerto() {
        if (window.puertoCompartido?.puerto) {
            console.log('[PUERTO] 🔄 Obteniendo puerto del almacenamiento compartido');
            return window.puertoCompartido.puerto;
        }
        return null;
    }

    // Verificar si hay conexión activa
    estaConectado() {
        const estado = window.puertoCompartido?.conectado === true;
        if (this.DEBUG && estado) {
            console.log('[PUERTO] ✅ Estado: CONECTADO');
        }
        return estado;
    }

    // Obtener info del puerto
    obtenerInfo() {
        return window.puertoCompartido?.info || {};
    }

    // Limpiar conexión (cuando se desconecta)
    limpiar() {
        window.puertoCompartido = {
            puerto: null,
            conectado: false,
            timestamp: null,
            info: {}
        };

        try {
            sessionStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {}

        console.log('[PUERTO] 🗑️ Conexión limpiada');
    }

    // Verificar si el puerto sigue disponible
    async verificarPuerto(puerto) {
        if (!puerto) return false;

        try {
            // Intentar una operación pequeña para verificar
            return puerto.readable !== undefined && puerto.writable !== undefined;
        } catch (error) {
            console.log('[PUERTO] ⚠️ Puerto no disponible:', error.message);
            return false;
        }
    }
}

// Crear instancia global
window.persistenciaPuerto = window.persistenciaPuerto || new PersistenciaPuerto();

console.log('[PUERTO] 🟢 Módulo de persistencia cargado');
