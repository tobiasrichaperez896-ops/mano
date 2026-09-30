// ==========================================================
// HOOKS DE PERSISTENCIA PARA scrips.js
// ==========================================================
// Intercepta las funciones clave para guardar/restaurar puerto
// ==========================================================

console.log('[HOOKS] Inicializando hooks de persistencia...');

// Esperar a que scrips.js esté listo
const esperarScripsCargado = setInterval(() => {
    if (typeof conectarArduino !== 'undefined' && typeof contexto !== 'undefined') {
        clearInterval(esperarScripsCargado);
        instalarHooks();
    }
}, 100);

function instalarHooks() {
    console.log('[HOOKS] ✅ scrips.js detectado, instalando hooks...');

    // =========================================================
    // HOOK 1: Al conectar Arduino - GUARDAR puerto
    // =========================================================
    const conectarOriginal = window.conectarArduino;
    window.conectarArduino = async function() {
        console.log('[HOOKS] Interceptando: conectarArduino()');
        
        // Llamar la función original
        const resultado = await conectarOriginal.call(this, ...arguments);
        
        // DESPUÉS de conectar, guardar el puerto
        if (typeof puerto !== 'undefined' && puerto !== null) {
            console.log('[HOOKS] 💾 Guardando puerto en persistencia...');
            window.persistenciaPuerto.marcarConectado(puerto, {
                timestamp: new Date().toISOString(),
                baudRate: 9600
            });
        }
        
        return resultado;
    };

    // =========================================================
    // HOOK 2: Al desconectar - LIMPIAR puerto
    // =========================================================
    const desconectarOriginal = window.desconectarArduino;
    window.desconectarArduino = async function() {
        console.log('[HOOKS] Interceptando: desconectarArduino()');
        
        // Llamar función original
        const resultado = await desconectarOriginal.call(this, ...arguments);
        
        // Limpiar persistencia
        window.persistenciaPuerto.limpiar();
        
        return resultado;
    };

    // =========================================================
    // HOOK 3: Al desconectar físicamente
    // =========================================================
    const manejarDesconexionOriginal = window.manejarDesconexionFisica;
    if (typeof manejarDesconexionOriginal === 'function') {
        window.manejarDesconexionFisica = async function() {
            console.log('[HOOKS] Interceptando: manejarDesconexionFisica()');
            
            const resultado = await manejarDesconexionOriginal.call(this, ...arguments);
            window.persistenciaPuerto.limpiar();
            
            return resultado;
        };
    }

    // =========================================================
    // HOOK 4: Restaurar conexión al cambiar de página
    // =========================================================
    const reconectarOriginal = window.reconectarPuertoAutorizado;
    window.reconectarPuertoAutorizado = async function() {
        console.log('[HOOKS] Interceptando: reconectarPuertoAutorizado()');
        
        // Primero verificar si hay puerto guardado
        const puertoGuardado = window.persistenciaPuerto.obtenerPuerto();
        
        if (puertoGuardado && window.persistenciaPuerto.estaConectado()) {
            console.log('[HOOKS] 🔄 Intentando usar puerto guardado...');
            
            try {
                // Verificar que el puerto siga siendo válido
                const esValido = await window.persistenciaPuerto.verificarPuerto(puertoGuardado);
                
                if (esValido && !puerto) {
                    console.log('[HOOKS] ✅ Restaurando puerto guardado');
                    puerto = puertoGuardado;
                    escritor = puertoGuardado.writable.getWriter();
                    contexto.conectado = true;
                    contexto.usbDetectado = true;
                    
                    // Actualizar visual
                    if (typeof actualizarEstadoConexion === 'function') {
                        actualizarEstadoConexion(true);
                    }
                    
                    if (typeof recibirDatos === 'function') {
                        recibirDatos();
                    }
                    
                    if (typeof agregarMonitor === 'function') {
                        agregarMonitor('🟢 Enlace restaurado desde almacenamiento.');
                    }
                    
                    return;
                }
            } catch (error) {
                console.error('[HOOKS] Error al restaurar puerto:', error);
            }
        }
        
        // Si no hay puerto guardado, ejecutar función original
        return await reconectarOriginal.call(this, ...arguments);
    };

    // =========================================================
    // INICIALIZACIÓN: Restaurar puerto al cargar página
    // =========================================================
    console.log('[HOOKS] Verificando conexión previa...');
    
    if (window.persistenciaPuerto.estaConectado()) {
        console.log('[HOOKS] ✅ Se detectó conexión previa');
        
        // Ejecutar la restauración cuando DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => window.reconectarPuertoAutorizado(), 500);
            });
        } else {
            setTimeout(() => window.reconectarPuertoAutorizado(), 500);
        }
    }

    console.log('[HOOKS] ✅ Todos los hooks instalados correctamente');
}

// =========================================================
// EXPORTAR FUNCIÓN DE VERIFICACIÓN
// =========================================================
window.verificarEstadoPuerto = function() {
    if (typeof window.persistenciaPuerto === 'undefined') {
        return { error: 'persistenciaPuerto no disponible' };
    }
    
    return {
        conectado: window.persistenciaPuerto.estaConectado(),
        info: window.persistenciaPuerto.obtenerInfo(),
        puertoDisponible: window.persistenciaPuerto.obtenerPuerto() !== null
    };
};

console.log('[HOOKS] 🟢 Módulo de hooks cargado y listo');
