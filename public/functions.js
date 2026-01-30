// functions.js
alert("Bienvenido a el sistema de switch aqui podras cambiar tus clases con otros compañeros");

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

    const ordenadas = [];

    solicitudes.forEach(s => {
        if (!s.claseA) return;

        const soyParte =
            s.estado === "intercambiada" &&
            (s.claseA.userId === usuario.id || s.claseB?.userId === usuario.id);

        if (soyParte) ordenadas.unshift(s);
        else ordenadas.push(s);
    });

    ordenadas.forEach(s => {
        const card = document.createElement("div");
        card.className = "card-solicitud";

        // ===== ESTADO =====
        let estadoTexto = "Pendiente";
        let estadoClase = "estado-pendiente";

        if (s.estado === "intercambiada") {
            estadoTexto = "Intercambiado";
            estadoClase =
                s.claseA.userId === usuario.id || s.claseB?.userId === usuario.id
                    ? "estado-mia"
                    : "estado-intercambiada";
        }

        // ===== RESULTADO =====
        let resultadoHTML = "";
        if (s.estado === "intercambiada" && s.claseB) {
            const soyA = s.claseA.userId === usuario.id;
            const origen = soyA ? s.claseA : s.claseB;
            const destino = soyA ? s.claseB : s.claseA;

            resultadoHTML = `
                <div class="divider"></div>
                <div class="resultado">
                    ↔ Grupo ${origen.grupo} → Grupo ${destino.grupo} · ${destino.fecha}
                </div>
            `;
        }

        // ===== BOTÓN =====
        let botonAceptar = "";
        if (s.estado === "abierta" && s.claseA.userId !== usuario.id) {
            botonAceptar = `
                <button class="btn-aceptar"
                    onclick="prepararFormulario('${s.id}')">
                    Aceptar intercambio
                </button>
            `;
        }

        // ===== HTML =====
        card.innerHTML = `
            <div class="card-header">
                <span class="fecha">${s.claseA.fecha}</span>
                <span class="grupo">Grupo ${s.claseA.grupo}</span>
            </div>

            <div class="card-body">
                <h3 class="asignatura">${s.claseA.asignatura}</h3>
                <p class="solicitante">${s.claseA.nombre}</p>
            </div>

            <div class="estado">
                <span class="estado-badge ${estadoClase}">
                    ${estadoTexto}
                </span>
            </div>

            ${resultadoHTML}
            ${botonAceptar}
        `;

        lista.appendChild(card);
    });
}

// ================= PREPARAR FORMULARIO =================
async function prepararFormulario(idSolicitud) {
    solicitudPendienteId = idSolicitud;
    formularioContainer.classList.remove("oculto");
    document.getElementById("info-intercambio").classList.remove("oculto");

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
        alert("Completa todos los campos");
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
        const usada = document.getElementById("clases-propias")?.value;
        if (usada) {
            await fetch(`/api/solicitudes/${usada}`, { method: "DELETE" });
        }

        await fetch(`/api/solicitudes/${solicitudPendienteId}`, {
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
    }

    formulario.reset();
    formularioContainer.classList.add("oculto");
    mostrarSolicitudes();
};

function resetUsuario() {
    localStorage.removeItem("usuario");
    location.reload();
}

// ================= INICIO =================
mostrarSolicitudes();
