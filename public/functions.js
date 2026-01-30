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
        const div = document.createElement("div");
        div.classList.add("solicitud");

        let textoEstado = "";
        let claseEstado = "";

        if (
            solicitud.estado === "intercambiada" &&
            (solicitud.claseA.userId === usuario.id ||
             solicitud.claseB?.userId === usuario.id)
        ) {
            textoEstado = "Intercambio en el que participaste";
            claseEstado = "mia";
        } else if (solicitud.estado === "abierta") {
            textoEstado = "Pendiente de intercambio";
            claseEstado = "pendiente";
        } else {
            textoEstado = "Intercambio realizado";
            claseEstado = "intercambiada";
        }

        div.classList.add(claseEstado);

        // ===== RESULTADO DEL INTERCAMBIO =====
        let infoIntercambio = "";
        if (solicitud.estado === "intercambiada" && solicitud.claseB) {
            infoIntercambio = `
                <br><strong>Resultado del intercambio:</strong><br>

                <div class="resultado">
                    ✅ ${solicitud.claseA.nombre} quedó con:
                    <br>
                    ${solicitud.claseA.asignatura}
                    (Grupo ${solicitud.claseB.grupo}, ${solicitud.claseB.fecha})
                </div>

                <div class="resultado">
                    ✅ ${solicitud.claseB.nombre} quedó con:
                    <br>
                    ${solicitud.claseA.asignatura}
                    (Grupo ${solicitud.claseA.grupo}, ${solicitud.claseA.fecha})
                </div>
            `;
        }

        let botonAceptar = "";
        if (
            solicitud.estado === "abierta" &&
            solicitud.claseA.userId !== usuario.id
        ) {
            botonAceptar = `
                <button onclick="prepararFormulario('${solicitud.id}')">
                    Aceptar intercambio
                </button>
            `;
        }

        div.innerHTML = `
            <strong>${solicitud.claseA.asignatura}</strong><br>
            Grupo: ${solicitud.claseA.grupo}<br>
            Fecha: ${solicitud.claseA.fecha}<br>
            Solicitado por: ${solicitud.claseA.nombre}<br>
            <strong>Estado:</strong> ${textoEstado}
            ${infoIntercambio}
            ${botonAceptar}
        `;

        lista.appendChild(div);
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

    // NUEVA
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
    // ACEPTAR
    else {
        const solicitud = solicitudes.find(s => s.id === solicitudPendienteId);
        if (!solicitud) return;

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
});

function mostrarAlertaInfo(texto) {
  const div = document.getElementById("alerta-info");
  div.textContent = texto;
  div.classList.remove("oculto");
}

function mostrarAlertaError(texto) {
  const div = document.getElementById("alerta-error");
  div.textContent = texto;
  div.classList.remove("oculto");
}


function resetUsuario() {
    localStorage.removeItem("usuario");
    location.reload();
}
// ================= INICIO =================
mostrarSolicitudes();
