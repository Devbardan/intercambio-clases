// functions.js

const btnFormulario = document.getElementById("btn-formulario");
const formularioContainer = document.getElementById("formulario-container");
const formulario = document.getElementById("formulario");
const lista = document.getElementById("lista-solicitudes");

document.getElementById("cerrar-formulario").addEventListener("click", () => {
    document.getElementById("selector-clase-propia").classList.add("oculto");
    formularioContainer.classList.add("oculto");
});

let solicitudPendienteId = null;

// ================= UTILIDADES =================
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ================= USUARIO =================
let usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
    const nombre = prompt("Ingresa tu nombre:");
    usuario = { id: generarId(), nombre };
    localStorage.setItem("usuario", JSON.stringify(usuario));
}

document.getElementById("usuario-actual").textContent =
    `Usuario: ${usuario.nombre}`;

// ================= FORMULARIO =================
btnFormulario.addEventListener("click", () => {
    solicitudPendienteId = null;
    formulario.reset();
    formularioContainer.classList.toggle("oculto");
    document.getElementById("info-intercambio").classList.add("oculto");
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

        // ================= ESTADO =================
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

        // ================= CARD CLICKEABLE =================
        if (
            solicitud.estado === "abierta" &&
            solicitud.claseA.userId !== usuario.id
        ) {
            card.classList.add("clickeable");
            card.addEventListener("click", () => {

    // 1️⃣ llevar la card arriba
    card.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    // 2️⃣ abrir formulario
    prepararFormulario(solicitud.id);
});

        }

        // ================= RESULTADO (SIEMPRE DEFINIDO) =================
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

        // ================= HTML FINAL =================
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

    const asignatura = document.getElementById("asignatura").value.trim();
    const grupo = Number(document.getElementById("grupo").value);
    const fecha = document.getElementById("fecha").value;

    if (!grupo || !fecha) {
        mostrarAlertaError("Completa todos los campos");
        return;
    }

    const solicitudes = await obtenerSolicitudes();

    // ================= NUEVA SOLICITUD =================
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
    }

    // ================= ACEPTAR INTERCAMBIO =================
    else {
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

    // 🚫 ERRORES DEL BACKEND → ALERTA EN FORMULARIO
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

    // scroll automático al formulario
    div.scrollIntoView({ behavior: "smooth", block: "center" });
}

function limpiarAlertaError() {
    const div = document.getElementById("alerta-error");
    if (!div) return;

    div.textContent = "";
    div.classList.add("oculto");
}

// ================= INICIO =================
mostrarSolicitudes();
