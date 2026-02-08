// functions.js

const btnFormulario = document.getElementById("btn-formulario");
const formularioContainer = document.getElementById("formulario-container");
const formulario = document.getElementById("formulario");
const lista = document.getElementById("lista-solicitudes");

document.getElementById("cerrar-formulario").addEventListener("click", () => {
    document.getElementById("selector-clase-propia").classList.add("oculto");
    formularioContainer.classList.add("oculto");
});

function establecerFechaMinima() {
    const inputFecha = document.getElementById("fecha");
    if (!inputFecha) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");

    inputFecha.min = `${yyyy}-${mm}-${dd}`;
}


let solicitudPendienteId = null;

// ================= UTILIDADES =================
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ================= USUARIO =================
let usuario = JSON.parse(localStorage.getItem("usuario"));

// Si no hay usuario, crear uno temporal anónimo hasta que termine el tutorial
if (!usuario) {
    usuario = { 
        id: generarId(), 
        nombre: null,
        pendiente: true
    };
    localStorage.setItem("usuario", JSON.stringify(usuario));
}

// Mostrar nombre si existe, si no mostrar placeholder
function actualizarDisplayUsuario() {
    const display = document.getElementById("usuario-actual");
    if (display) {
        if (usuario && usuario.nombre) {
            display.textContent = `Usuario: ${usuario.nombre}`;
        } else {
            display.textContent = `Usuario: (sin nombre)`;
        }
    }
}

actualizarDisplayUsuario();


// ================= FORMULARIO =================
btnFormulario.addEventListener("click", () => {
    solicitudPendienteId = null;
    formulario.reset();
    formularioContainer.classList.toggle("oculto");
    document.getElementById("alerta-error").classList.add("oculto");

    const inputAsignatura = document.getElementById("asignatura");
    inputAsignatura.disabled = false;
});

// ================= API =================
async function obtenerSolicitudes() {
    try {
        const response = await fetch("/api/solicitudes");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error("❌ Error al obtener solicitudes", err);
        return [];
    }
}

// ================= MOSTRAR SOLICITUDES =================
async function mostrarSolicitudes() {
    const solicitudes = await obtenerSolicitudes();
    lista.innerHTML = "";

    const mias = [];
    const pendientes = [];
    const intercambiadas = [];

    solicitudes.forEach(s => {
        if (!s.claseA) return;

        const soyParte =
            s.estado === "intercambiada" &&
            (s.claseA.userId === usuario.id || s.claseB?.userId === usuario.id);

        if (soyParte) mias.push(s);
        else if (s.estado === "abierta") pendientes.push(s);
        else intercambiadas.push(s);
    });

    const ordenadas = [...mias, ...pendientes, ...intercambiadas];

    ordenadas.forEach(solicitud => {
        const card = document.createElement("div");
        card.classList.add("solicitud-card");

        let estadoClase = "estado-pendiente";
        let estadoTexto = "Pendiente";

        if (solicitud.estado === "intercambiada") {
            estadoTexto = "Intercambiado";
            estadoClase =
                solicitud.claseA.userId === usuario.id ||
                solicitud.claseB?.userId === usuario.id
                    ? "estado-mia"
                    : "estado-intercambiada";
        }

        if (
            solicitud.estado === "abierta" &&
            solicitud.claseA.userId !== usuario.id
        ) {
            card.classList.add("clickeable");
            card.addEventListener("click", () => {
                card.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
                prepararFormulario(solicitud.id);
            });
        }

        let resultadoHTML = "";

        if (solicitud.estado === "intercambiada" && solicitud.claseB) {
            resultadoHTML = `
                <div class="resultado-intercambio">
                    <div class="resultado-item"
                         data-grupo="Grupo ${solicitud.claseB.grupo}">
                        <strong>${solicitud.claseA.nombre}</strong><br>
                        <span class="fecha">${solicitud.claseB.fecha}</span>
                    </div>
                    <div class="resultado-item"
                         data-grupo="Grupo ${solicitud.claseA.grupo}">
                        <strong>${solicitud.claseB.nombre}</strong><br>
                        <span class="fecha">${solicitud.claseA.fecha}</span>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-header">
                <span class="fecha">${solicitud.claseA.fecha}</span>
                <span class="grupo">Grupo ${solicitud.claseA.grupo}</span>
            </div>
            <div class="card-body">
                <h3 class="asignatura">${solicitud.claseA.asignatura}</h3>
                <p class="solicitante">${solicitud.claseA.nombre}</p>
            </div>
            <div class="estado">
                <span class="estado-badge ${estadoClase}">
                    ${estadoTexto}
                </span>
            </div>
            ${resultadoHTML}
        `;

        lista.appendChild(card);
    });
}

// ================= PREPARAR FORMULARIO =================
async function prepararFormulario(idSolicitud) {
    establecerFechaMinima();
    limpiarAlertaError();
    solicitudPendienteId = idSolicitud;
    formularioContainer.classList.remove("oculto");

    const solicitudes = await obtenerSolicitudes();
    const solicitud = solicitudes.find(s => s.id === idSolicitud);
    if (!solicitud) return;

    const inputAsignatura = document.getElementById("asignatura");
    inputAsignatura.value = solicitud.claseA.asignatura;
    inputAsignatura.disabled = true;

    document.getElementById("grupo").value = "";
    document.getElementById("fecha").value = "";

    const contenedor = document.getElementById("selector-clase-propia");
    const select = document.getElementById("clases-propias");
    select.innerHTML = `<option value="">-- Usar otra clase --</option>`;

    const propias = solicitudes.filter(
        s => s.estado === "abierta" && s.claseA.userId === usuario.id
    );

    if (propias.length > 0) {
        contenedor.classList.remove("oculto");
        propias.forEach(c => {
            const option = document.createElement("option");
            option.value = c.id;
            option.textContent =
                `${c.claseA.asignatura} | Grupo ${c.claseA.grupo} | ${c.claseA.fecha}`;
            select.appendChild(option);
        });
    } else {
        contenedor.classList.add("oculto");
    }

    select.onchange = async function () {
        if (!this.value) return;
        const actuales = await obtenerSolicitudes();
        const sel = actuales.find(s => s.id === this.value);
        if (!sel) return;

        document.getElementById("grupo").value = sel.claseA.grupo;
        document.getElementById("fecha").value = sel.claseA.fecha;
    };
}

// ================= ENVIAR FORMULARIO =================
formulario.addEventListener("submit", async e => {
    e.preventDefault();

    if (window.tutorialActivo) {
        console.log("🚫 Tutorial activo: formulario bloqueado");
        return;
    }

    const asignatura = document.getElementById("asignatura").value.trim();
    const grupo = Number(document.getElementById("grupo").value);
    const fecha = document.getElementById("fecha").value;

    if (!grupo || !fecha) {
        mostrarAlertaError("Completa todos los campos");
        return;
    }

    const fechaSeleccionada = new Date(fecha);
    fechaSeleccionada.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) {
        mostrarAlertaError("No puedes seleccionar una fecha anterior a hoy.");
        return;
    }

    const solicitudes = await obtenerSolicitudes();

    if (!solicitudPendienteId) {
        await fetch("/api/solicitudes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: generarId(),
                estado: "abierta",
                claseA: {
                    userId: usuario.id,
                    nombre: usuario.nombre,
                    asignatura,
                    grupo,
                    fecha
                },
                claseB: null
            })
        });
    } else {
        const solicitud = solicitudes.find(s => s.id === solicitudPendienteId);
        if (!solicitud) return;

        const usada = document.getElementById("clases-propias")?.value;
        if (usada) {
            await fetch(`/api/solicitudes/${usada}`, { method: "DELETE" });
        }

        const response = await fetch(`/api/solicitudes/${solicitudPendienteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                claseB: {
                    userId: usuario.id,
                    nombre: usuario.nombre,
                    grupo,
                    fecha
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            mostrarAlertaError(`⚠️ ${data.error}`);
            return;
        }
    }

    formulario.reset();
    formularioContainer.classList.add("oculto");
    mostrarSolicitudes();
});


function mostrarAlertaError(texto) {
    const div = document.getElementById("alerta-error");
    if (!div) return;

    div.textContent = texto;
    div.classList.remove("oculto");
    div.scrollIntoView({ behavior: "smooth", block: "center" });
}

function limpiarAlertaError() {
    const div = document.getElementById("alerta-error");
    if (!div) return;

    div.textContent = "";
    div.classList.add("oculto");
}

// ================= EDITAR NOMBRE DE USUARIO =================

// Crear modal de edición (usado tanto para registro como para cambio)
const modalHTML = `
    <div id="modal-editar" class="modal-editar-nombre oculto">
        <div class="modal-contenido">
            <h3 id="modal-titulo">Cambiar nombre</h3>
            <p id="modal-descripcion" style="font-size: 0.9rem; color: #666; margin-bottom: 12px;"></p>
            <input type="text" id="input-nuevo-nombre" placeholder="Ingresa tu nombre completo" maxlength="50">
            <div class="modal-botones" id="modal-botones-container">
                <button class="btn-cancelar" id="btn-cancelar-modal">Cancelar</button>
                <button class="btn-guardar" id="btn-guardar-modal">Guardar</button>
            </div>
        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

const modalEditar = document.getElementById("modal-editar");
const inputNuevoNombre = document.getElementById("input-nuevo-nombre");
const modalTitulo = document.getElementById("modal-titulo");
const modalDescripcion = document.getElementById("modal-descripcion");
const btnCancelarModal = document.getElementById("btn-cancelar-modal");
const btnGuardarModal = document.getElementById("btn-guardar-modal");

// Variable para saber si es registro inicial o cambio de nombre
let esRegistroInicial = false;

// Abrir modal en modo edición (cuando ya tiene nombre)
function abrirModalEdicion() {
    esRegistroInicial = false;
    modalTitulo.textContent = "Cambiar nombre";
    modalDescripcion.textContent = "";
    inputNuevoNombre.value = usuario.nombre || "";
    inputNuevoNombre.placeholder = "Nuevo nombre";
    btnCancelarModal.style.display = "block";
    modalEditar.classList.remove("oculto");
    inputNuevoNombre.focus();
}

// Abrir modal en modo registro (primer vez, después del tutorial)
function abrirModalRegistro() {
    esRegistroInicial = true;
    modalTitulo.textContent = "¡Bienvenido!";
    modalDescripcion.textContent = "Para comenzar a usar la aplicación, ingresa tu nombre completo:";
    inputNuevoNombre.value = "";
    inputNuevoNombre.placeholder = "Ingresa tu nombre completo";
    btnCancelarModal.style.display = "none";
    modalEditar.classList.remove("oculto");
    inputNuevoNombre.focus();
    
    // Desactivar cierre al hacer click fuera SOLO en modo registro
    modalEditar.style.pointerEvents = "auto";
    modalEditar.onclick = null; // Eliminar listener anterior
    
    // Bloquear interacción con el resto de la app
    document.body.style.overflow = "hidden";
}

// Evento del botón de editar (solo si ya tiene nombre)
const btnEditarNombre = document.getElementById("btn-editar-nombre");
if (btnEditarNombre) {
    btnEditarNombre.addEventListener("click", () => {
        if (usuario && usuario.nombre) {
            abrirModalEdicion();
        }
    });
}

// Eventos de los botones del modal
if (btnCancelarModal) {
    btnCancelarModal.addEventListener("click", cerrarModalEditar);
}

if (btnGuardarModal) {
    btnGuardarModal.addEventListener("click", guardarNuevoNombre);
}

// Cerrar modal
function cerrarModalEditar() {
    // Solo permitir cerrar si NO es registro inicial
    if (esRegistroInicial) {
        console.log("No se puede cerrar: registro obligatorio");
        // Mostrar alerta visual
        inputNuevoNombre.style.borderColor = "#e74c3c";
        setTimeout(() => {
            inputNuevoNombre.style.borderColor = "#1b1b1b";
        }, 1000);
        inputNuevoNombre.focus();
        return;
    }
    modalEditar.classList.add("oculto");
    document.body.style.overflow = ""; // Restaurar scroll
}
// Cerrar al hacer click fuera
if (modalEditar) {
    modalEditar.addEventListener("click", (e) => {
        if (e.target === modalEditar) cerrarModalEditar();
    });
}

// Guardar nuevo nombre (tanto para registro inicial como para cambio)
async function guardarNuevoNombre() {
    const nuevoNombre = inputNuevoNombre.value.trim();
    
    if (!nuevoNombre) {
        if (esRegistroInicial) {
            alert("Por favor ingresa tu nombre completo para continuar");
        } else {
            alert("Por favor ingresa un nombre");
        }
        return;
    }
    
    if (nuevoNombre.length < 2) {
        alert("El nombre debe tener al menos 2 caracteres");
        return;
    }
    
    if (!esRegistroInicial && nuevoNombre === usuario.nombre) {
        cerrarModalEditar();
        return;
    }
    
    const nombreAnterior = usuario.nombre;
    
    try {
        usuario.nombre = nuevoNombre;
        usuario.pendiente = false;
        localStorage.setItem("usuario", JSON.stringify(usuario));
        
        actualizarDisplayUsuario();
        
        let resultado = { local: true };
        if (nombreAnterior) {
            resultado = await actualizarNombreEnBackend(nombreAnterior, nuevoNombre);
        }
        
        await mostrarSolicitudes();

        document.body.style.overflow = "";
        esRegistroInicial = false;
        
        cerrarModalEditar();
        
        if (esRegistroInicial) {
            console.log("✅ Registro completado:", nuevoNombre);
        } else if (resultado.local) {
            console.log("✅ Nombre actualizado localmente (modo sin servidor)");
        } else {
            console.log("✅ Nombre actualizado en servidor y localmente");
        }
        
    } catch (error) {
        console.error("❌ Error inesperado:", error);
        alert("Error al guardar el nombre. Intenta de nuevo.");
    }
}

// Llamar a la API para actualizar nombre en todas las solicitudes
async function actualizarNombreEnBackend(nombreAnterior, nuevoNombre) {
    try {
        const response = await fetch("/api/actualizar-nombre", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: usuario.id,
                nombreAnterior: nombreAnterior,
                nuevoNombre: nuevoNombre
            })
        });
        
        if (!response.ok) {
            console.warn("⚠️ Servidor no disponible, modo local activado");
            return { ok: true, local: true };
        }
        
        return await response.json();
    } catch (error) {
        console.warn("⚠️ Sin conexión al servidor, cambio solo en local:", error.message);
        return { ok: true, local: true };
    }
}

// Permitir Enter para guardar
if (inputNuevoNombre) {
    inputNuevoNombre.addEventListener("keypress", (e) => {
        if (e.key === "Enter") guardarNuevoNombre();
    });
}

// ================= VERIFICAR REGISTRO DESPUÉS DEL TUTORIAL =================

function verificarRegistroPendiente() {
    const tutorialVisto = localStorage.getItem("tutorial_visto");
    const usuarioData = JSON.parse(localStorage.getItem("usuario"));
    
    if (tutorialVisto && usuarioData && (usuarioData.pendiente || !usuarioData.nombre)) {
        setTimeout(() => {
            abrirModalRegistro();
        }, 500);
    }
}

window.verificarRegistroPendiente = verificarRegistroPendiente;

// ================= INICIO =================
mostrarSolicitudes();