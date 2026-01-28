alert("Bienvenido a el sistema de switch aqui podras cambiar tus clases con otros compañeros");
const btnFormulario = document.getElementById("btn-formulario");
const formularioContainer = document.getElementById("formulario-container");
const formulario = document.getElementById("formulario");
const lista = document.getElementById("lista-solicitudes");
document.getElementById("cerrar-formulario").addEventListener("click", () => {
    document.getElementById("selector-clase-propia").classList.add("oculto");
document.getElementById("clases-propias").value = "";

    formularioContainer.classList.add("oculto");
});
let solicitudPendienteId = null;




// ===== IDENTIDAD DEL USUARIO =====
let usuario = JSON.parse(localStorage.getItem("usuario"));

if (!usuario) {
    const nombre = prompt("Ingresa tu nombre:");
    usuario = {
        id: crypto.randomUUID(),
        nombre: nombre
    };
    localStorage.setItem("usuario", JSON.stringify(usuario));
}

document.getElementById("usuario-actual").textContent =
    `Usuario: ${usuario.nombre}`;


// Mostrar / ocultar formulario
btnFormulario.addEventListener("click", () => {
    solicitudPendienteId = null;

    formularioContainer.classList.toggle("oculto");

    // Ocultar info porque es una solicitud nueva
    document.getElementById("info-intercambio").classList.add("oculto");

    formulario.reset();
});

const clasesPropias = obtenerClasesPropias();
// Obtener solicitudes guardadas
async function obtenerSolicitudes() {
    const res = await fetch('http://localhost:3000/solicitudes');
    return await res.json();
}

// Guardar solicitudes
async function guardarSolicitud(solicitud) {
    const res = await fetch('http://localhost:3000/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitud)
    });
    return await res.json();
}

// Mostrar solicitudes en pantalla
function mostrarSolicitudes() {
    const solicitudes = obtenerSolicitudes();
    lista.innerHTML = "";

    // Clasificación
    const mias = [];
    const pendientes = [];
    const intercambiadas = [];

    // Separar por estado y participación
    solicitudes.forEach(s => {
        // Validación: si la solicitud es antigua o recién creada, aseguramos que exista claseA
        if (!s.claseA) {
            s.claseA = {
                userId: s.creadorId || "desconocido",
                nombre: s.creadorNombre || "Desconocido",
                asignatura: s.asignatura || "Desconocida",
                grupo: s.grupo || "Desconocido",
                fecha: s.fecha || "Desconocida"
            };
        }

        // Identificar mis intercambios
        const soyParte =
            s.estado === "intercambiada" &&
            (s.claseA.userId === usuario.id || s.claseB?.userId === usuario.id);

        if (soyParte) {
            mias.push(s);
        } else if (s.estado === "abierta") {
            pendientes.push(s);
        } else {
            intercambiadas.push(s);
        }
    });

    // Orden: mis intercambios → pendientes → intercambiadas
    const ordenadas = [...mias, ...pendientes, ...intercambiadas];

    // Mostrar cada solicitud
    ordenadas.forEach(solicitud => {
        const div = document.createElement("div");
        div.classList.add("solicitud");

        // Estado visible y color
        let textoEstado = "";
        let claseEstado = "";

        if (
            solicitud.estado === "intercambiada" &&
            (solicitud.claseA.userId === usuario.id ||
             solicitud.claseB?.userId === usuario.id)
        ) {
            textoEstado = "Intercambio en el que participaste";
            claseEstado = "mia"; // azul
        } else if (solicitud.estado === "abierta") {
            textoEstado = "Pendiente de intercambio";
            claseEstado = "pendiente"; // verde
        } else {
            textoEstado = "Intercambio realizado";
            claseEstado = "intercambiada"; // rojo
        }

        div.classList.add(claseEstado);

        // Información del intercambio completo
        let infoIntercambio = "";
        if (solicitud.estado === "intercambiada" && solicitud.claseB) {
    infoIntercambio = `
        <br><strong>Resultado del intercambio:</strong><br>
        <div class="resultado">
            ✅ ${solicitud.claseA.nombre} quedó con:
            <br>
            ${solicitud.claseB.asignatura}
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


        // Botón aceptar si corresponde
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

        // Construir HTML
        div.innerHTML = `
            <strong>${solicitud.claseA.asignatura}</strong>
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
function mostrarErrorIntercambio(mensaje) {
    const errorDiv = document.getElementById("error-intercambio");
    errorDiv.textContent = mensaje;
    errorDiv.classList.remove("oculto");
}

function ocultarErrorIntercambio() {
    const errorDiv = document.getElementById("error-intercambio");
    errorDiv.textContent = "";
    errorDiv.classList.add("oculto");
}


function prepararFormulario(idSolicitud) {
    ocultarErrorIntercambio();
    solicitudPendienteId = idSolicitud;

    formularioContainer.classList.remove("oculto");

    // Mostrar info de intercambio
    document.getElementById("info-intercambio").classList.remove("oculto");

    const solicitudes = obtenerSolicitudes();
    const solicitud = solicitudes.find(s => s.id === idSolicitud);

    if (!solicitud) {
        alert("No se encontró la solicitud.");
        return;
    }

    // ===== CLASES PROPIAS =====
const contenedorSelector = document.getElementById("selector-clase-propia");
const select = document.getElementById("clases-propias");

select.innerHTML = `<option value="">-- Usar otra clase --</option>`;

if (clasesPropias.length > 0) {
    contenedorSelector.classList.remove("oculto");

    clasesPropias.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = `${c.claseA.asignatura} | Grupo ${c.claseA.grupo} | ${c.claseA.fecha}`;
        select.appendChild(option);
    });
} else {
    contenedorSelector.classList.add("oculto");
}

document.getElementById("clases-propias").addEventListener("change", function () {
    const idSolicitud = this.value;
    if (!idSolicitud) return;

    const solicitudes = obtenerSolicitudes();
    const solicitud = solicitudes.find(s => s.id === idSolicitud);

    if (!solicitud) return;

    document.getElementById("asignatura").value = solicitud.claseA.asignatura;
    document.getElementById("grupo").value = solicitud.claseA.grupo;
    document.getElementById("fecha").value = solicitud.claseA.fecha;
});


    // Prellenar con la clase existente
    document.getElementById("asignatura").value = solicitud.claseA.asignatura;
    document.getElementById("grupo").value = solicitud.claseA.grupo;
    document.getElementById("fecha").value = solicitud.claseA.fecha;
}


// Enviar formulario
formulario.addEventListener("submit", function (e) {
    e.preventDefault();
    ocultarErrorIntercambio();

    const asignatura = document.getElementById("asignatura").value.trim();
    const grupo = Number(document.getElementById("grupo").value);
    const fecha = document.getElementById("fecha").value;

    if (!asignatura || !grupo || !fecha) {
        mostrarErrorIntercambio("❌ Debes completar todos los campos.");
        return;
    }

    if (grupo <= 0) {
        mostrarErrorIntercambio("❌ El grupo debe ser un número válido.");
        return;
    }

    const solicitudes = obtenerSolicitudes();

    // ===============================
    // 🆕 CREAR NUEVA SOLICITUD
    // ===============================
    if (!solicitudPendienteId) {
        const nuevaSolicitud = {
            id: crypto.randomUUID(),
            estado: "abierta",
            claseA: {
                userId: usuario.id,
                nombre: usuario.nombre,
                asignatura,
                grupo,
                fecha
            },
            claseB: null
        };

        solicitudes.push(nuevaSolicitud);
    }

    // ===============================
    // 🔁 ACEPTAR INTERCAMBIO
    // ===============================
    else {
        const solicitud = solicitudes.find(s => s.id === solicitudPendienteId);

        if (!solicitud || solicitud.estado !== "abierta") {
            mostrarErrorIntercambio("❌ Esta solicitud ya no está disponible.");
            return;
        }

        const grupoClaseA = Number(solicitud.claseA.grupo);

        if (grupo === grupoClaseA) {
            mostrarErrorIntercambio(
                "❌ No puedes intercambiar una clase por otra del mismo grupo. " +
                "Ambos grupos tienen el mismo horario."
            );
            return;
        }

        solicitud.claseB = {
            userId: usuario.id,
            nombre: usuario.nombre,
            asignatura: solicitud.claseA.asignatura,
            grupo,
            fecha
        };

        solicitud.estado = "intercambiada";
        solicitudPendienteId = null;
        document.getElementById("info-intercambio").classList.add("oculto");
    }

    guardarSolicitudes(solicitudes);

    formulario.reset();
    formularioContainer.classList.add("oculto");

    mostrarSolicitudes();
});

async function aceptarIntercambio(id, datos) {
    const res = await fetch(`http://localhost:3000/solicitudes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });
    return await res.json();
}


function resetUsuario() {
    localStorage.removeItem("usuario");
    location.reload();
}

function obtenerClasesPropias() {
    const solicitudes = obtenerSolicitudes();
    return solicitudes.filter(s =>
        s.estado === "abierta" &&
        s.claseA &&
        s.claseA.userId === usuario.id
    );
}


// Cargar solicitudes al abrir la página
mostrarSolicitudes();


// arreglar el problema de que el formulario no deja ingresar nuevas solicitudes solo deja con ya creadas. 