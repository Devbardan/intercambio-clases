// ================= TUTORIAL =================
let pasoTutorial = 0;
let datosTutorial = null;
let datosCardAjena = null;
let tutorialActivo = false;
let proteccionCardsInterval = null;

const btnSolicitar = document.getElementById("btn-formulario");
const overlay = document.getElementById("tutorial-overlay");
const dialog = document.getElementById("tutorial-dialog");
const text = document.getElementById("tutorial-text");
const btnNext = document.getElementById("tutorial-next");
const btnSkip = document.getElementById("tutorial-skip");

// Guardar y bloquear mostrarSolicitudes
const mostrarSolicitudesOriginal = window.mostrarSolicitudes;
window.mostrarSolicitudes = function() {
    if (tutorialActivo) {
        console.log("Bloqueado durante tutorial");
        return Promise.resolve();
    }
    return mostrarSolicitudesOriginal.apply(this, arguments);
};

document.addEventListener("DOMContentLoaded", () => {
    const visto = localStorage.getItem("tutorial_visto");
    if (!visto) iniciarTutorial();
});

function iniciarTutorial() {
    tutorialActivo = true;
    pasoTutorial = 1;
    
    // Proteger las cards del tutorial contra cualquier modificación externa
    iniciarProteccionCards();
    
    mostrarPasoBoton();
}

// Protección activa: re-crea las cards si desaparecen
function iniciarProteccionCards() {
    if (proteccionCardsInterval) clearInterval(proteccionCardsInterval);
    
    proteccionCardsInterval = setInterval(() => {
        if (!tutorialActivo) {
            clearInterval(proteccionCardsInterval);
            return;
        }
        
        // Verificar y re-crear card del paso 3 si falta y estamos en paso 3 o más
        if (pasoTutorial >= 3 && datosTutorial) {
            const cardMia = document.getElementById("card-tutorial");
            if (!cardMia) {
                console.log("Card tutorial perdida, re-creando...");
                recrearCardTutorial();
            }
        }
        
        // Verificar y re-crear card ajena del paso 4 si falta y estamos en paso 4 o más
        if (pasoTutorial >= 4 && datosCardAjena) {
            const cardAjena = document.getElementById("card-ajena-tutorial") || 
                             document.getElementById("card-intercambiada-tutorial");
            if (!cardAjena && pasoTutorial < 5) {
                console.log("Card ajena perdida, re-creando...");
                recrearCardAjena();
            }
        }
    }, 500); // Verificar cada 500ms
}

function recrearCardTutorial() {
    const lista = document.getElementById("lista-solicitudes");
    if (!lista) return;
    
    const card = document.createElement("div");
    card.id = "card-tutorial";
    
    // Mantener el estado visual según el paso actual
    if (pasoTutorial === 3) {
        card.className = "solicitud-card tutorial-card-destacada tutorial-focus-card";
    } else {
        card.className = "solicitud-card tutorial-card-destacada";
        card.style.opacity = "0.7";
    }
    
    const fechaFormateada = new Date(datosTutorial.fecha).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    card.innerHTML = `
        <div class="card-header">
            <span class="fecha">${fechaFormateada}</span>
            <span class="grupo">Grupo ${datosTutorial.grupo}</span>
        </div>
        <div class="card-body">
            <h3 class="asignatura">${datosTutorial.asignatura}</h3>
            <p class="solicitante">${datosTutorial.nombre}</p>
        </div>
        <div class="estado">
            <span class="estado-badge estado-pendiente">Pendiente</span>
        </div>
    `;
    
    lista.insertBefore(card, lista.firstChild);
}

function recrearCardAjena() {
    const lista = document.getElementById("lista-solicitudes");
    if (!lista || !datosCardAjena) return;
    
    const card = document.createElement("div");
    card.id = "card-ajena-tutorial";
    card.className = "solicitud-card tutorial-card-clickeable tutorial-focus-card tutorial-pulse-click";
    
    const fechaFormateada = new Date(datosCardAjena.fecha).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    card.innerHTML = `
        <div class="card-header">
            <span class="fecha">${fechaFormateada}</span>
            <span class="grupo">Grupo ${datosCardAjena.grupo}</span>
        </div>
        <div class="card-body">
            <h3 class="asignatura">${datosCardAjena.asignatura}</h3>
            <p class="solicitante">${datosCardAjena.nombre}</p>
        </div>
        <div class="estado">
            <span class="estado-badge estado-pendiente">Pendiente</span>
        </div>
    `;
    
    card.addEventListener("click", () => {
        if (pasoTutorial === 4) {
            abrirFormularioIntercambio();
        }
    });
    
    const primeraCard = document.getElementById("card-tutorial");
    if (primeraCard && primeraCard.nextSibling) {
        lista.insertBefore(card, primeraCard.nextSibling);
    } else {
        lista.appendChild(card);
    }
}

/* ================= PASO 1: Botón Principal ================= */
function mostrarPasoBoton() {
    overlay.classList.remove("oculto");
    dialog.classList.remove("oculto");
    
    dialog.className = "tutorial-dialog tutorial-paso-1";

    text.innerHTML = `
        Para comenzar, haz click en
        <strong>"Solicitar intercambio"</strong>.
        <br><br>
        Ahí crearás una solicitud para cambiar tu clase.
    `;

    btnNext.textContent = "Siguiente";
    btnNext.onclick = avanzarAPasoFormulario;
    
    btnSolicitar.classList.remove("tutorial-focus-btn");
    void btnSolicitar.offsetWidth;
    btnSolicitar.classList.add("tutorial-focus-btn");
    
    btnSolicitar.scrollIntoView({ behavior: "smooth", block: "center" });

    const nuevoBtn = btnSolicitar.cloneNode(true);
    btnSolicitar.parentNode.replaceChild(nuevoBtn, btnSolicitar);
    const btnActual = document.getElementById("btn-formulario");
    btnActual.addEventListener("click", avanzarAPasoFormulario, { once: true });
    Object.assign(btnSolicitar, btnActual);
}

/* ================= PASO 2: Formulario ================= */
function avanzarAPasoFormulario() {
    const btnActual = document.getElementById("btn-formulario");
    btnActual.classList.remove("tutorial-focus-btn");
    
    pasoTutorial = 2;

    const formularioContainer = document.getElementById("formulario-container");
    formularioContainer.classList.add("tutorial-focus");
    
    document.getElementById("asignatura").value = "Matemáticas II";
    document.getElementById("grupo").value = "3";
    
    const fechaEjemplo = new Date();
    fechaEjemplo.setDate(fechaEjemplo.getDate() + 3);
    const yyyy = fechaEjemplo.getFullYear();
    const mm = String(fechaEjemplo.getMonth() + 1).padStart(2, "0");
    const dd = String(fechaEjemplo.getDate()).padStart(2, "0");
    document.getElementById("fecha").value = `${yyyy}-${mm}-${dd}`;

    formularioContainer.classList.remove("oculto");
    void formularioContainer.offsetHeight;
    
    mostrarPasoFormulario();
}

function mostrarPasoFormulario() {
    const formularioContainer = document.getElementById("formulario-container");

    overlay.classList.remove("oculto");
    dialog.classList.remove("oculto");

    dialog.classList.remove("tutorial-paso-1");
    dialog.classList.add("tutorial-paso-2");

    text.innerHTML = `
        Aquí debes ingresar la
        <strong>clase a la que NO podrás asistir</strong>.
        <br><br>
        Completa el grupo y la fecha correctamente.
        <br><br>
        <em>Los datos de ejemplo están llenos. Puedes editarlos o dar "Siguiente" para continuar.</em>
    `;

    btnNext.textContent = "Siguiente";
    btnNext.onclick = simularGuardadoTutorial;

    formularioContainer.scrollIntoView({ behavior: "smooth", block: "center" });

    const form = document.getElementById("formulario");
    form.onsubmit = (e) => {
        e.preventDefault();
        if (pasoTutorial === 2) {
            simularGuardadoTutorial();
        }
    };
}

function simularGuardadoTutorial() {
    const asignatura = document.getElementById("asignatura").value;
    const grupo = document.getElementById("grupo").value;
    const fecha = document.getElementById("fecha").value;
    
    if (!asignatura || !grupo || !fecha) {
        const alerta = document.getElementById("alerta-error");
        alerta.textContent = "Completa todos los campos para continuar";
        alerta.classList.remove("oculto");
        setTimeout(() => alerta.classList.add("oculto"), 2000);
        return;
    }
    
    datosTutorial = { asignatura, grupo, fecha, nombre: "Tú (Ejemplo)" };
    
    const formularioContainer = document.getElementById("formulario-container");
    formularioContainer.classList.add("oculto");
    formularioContainer.classList.remove("tutorial-focus");
    
    document.getElementById("formulario").reset();
    
    avanzarAPasoCard();
}

/* ================= PASO 3: Card Creada ================= */
function avanzarAPasoCard() {
    pasoTutorial = 3;
    crearCardTutorial();
    
    setTimeout(() => {
        mostrarPasoCard();
    }, 300);
}

function crearCardTutorial() {
    const lista = document.getElementById("lista-solicitudes");
    
    // Eliminar si existe para evitar duplicados
    let cardExistente = document.getElementById("card-tutorial");
    if (cardExistente) cardExistente.remove();
    
    const card = document.createElement("div");
    card.id = "card-tutorial";
    card.className = "solicitud-card tutorial-card-destacada tutorial-focus-card";
    
    const fechaFormateada = new Date(datosTutorial.fecha).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    card.innerHTML = `
        <div class="card-header">
            <span class="fecha">${fechaFormateada}</span>
            <span class="grupo">Grupo ${datosTutorial.grupo}</span>
        </div>
        <div class="card-body">
            <h3 class="asignatura">${datosTutorial.asignatura}</h3>
            <p class="solicitante">${datosTutorial.nombre}</p>
        </div>
        <div class="estado">
            <span class="estado-badge estado-pendiente">Pendiente</span>
        </div>
    `;
    
    if (lista.firstChild) {
        lista.insertBefore(card, lista.firstChild);
    } else {
        lista.appendChild(card);
    }
    
    card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function mostrarPasoCard() {
    const card = document.getElementById("card-tutorial");
    
    overlay.classList.remove("oculto");
    dialog.classList.remove("oculto");

    dialog.classList.remove("tutorial-paso-2");
    dialog.classList.add("tutorial-paso-3");

    text.innerHTML = `
        ¡Perfecto! Tu solicitud ha sido creada y aparece en la lista.
        <br><br>
        Esta card está <strong>"Pendiente"</strong> de ser intercambiada con otro usuario.
        <br><br>
        Cuando otro estudiante acepte tu intercambio, se marcará como "Intercambiado".
    `;

    btnNext.textContent = "Siguiente";
    btnNext.onclick = avanzarAPasoIntercambio;

    if (card) {
        // Asegurar que tenga las clases correctas
        card.classList.add("tutorial-card-destacada");
        card.classList.add("tutorial-focus-card");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

/* ================= PASO 4: Intercambio con otra card ================= */
function avanzarAPasoIntercambio() {
    pasoTutorial = 4;
    
    // Quitar focus de la card anterior pero mantenerla visible
    const cardAnterior = document.getElementById("card-tutorial");
    if (cardAnterior) {
        cardAnterior.classList.remove("tutorial-focus-card");
        cardAnterior.classList.remove("tutorial-card-destacada");
        cardAnterior.style.opacity = "0.6";
    }
    
    crearCardOtroUsuario();
    
    setTimeout(() => {
        mostrarPasoIntercambio();
    }, 400);
}

function crearCardOtroUsuario() {
    const lista = document.getElementById("lista-solicitudes");
    
    let card = document.getElementById("card-ajena-tutorial");
    if (card) card.remove();
    
    datosCardAjena = {
        asignatura: "Matemáticas II",
        grupo: "5",
        fecha: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        nombre: "María García"
    };
    
    card = document.createElement("div");
    card.id = "card-ajena-tutorial";
    card.className = "solicitud-card tutorial-card-clickeable tutorial-focus-card tutorial-pulse-click";
    
    const fechaFormateada = new Date(datosCardAjena.fecha).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    card.innerHTML = `
        <div class="card-header">
            <span class="fecha">${fechaFormateada}</span>
            <span class="grupo">Grupo ${datosCardAjena.grupo}</span>
        </div>
        <div class="card-body">
            <h3 class="asignatura">${datosCardAjena.asignatura}</h3>
            <p class="solicitante">${datosCardAjena.nombre}</p>
        </div>
        <div class="estado">
            <span class="estado-badge estado-pendiente">Pendiente</span>
        </div>
    `;
    
    const primeraCard = document.getElementById("card-tutorial");
    if (primeraCard && primeraCard.nextSibling) {
        lista.insertBefore(card, primeraCard.nextSibling);
    } else {
        lista.appendChild(card);
    }
    
    card.addEventListener("click", () => {
        if (pasoTutorial === 4) {
            abrirFormularioIntercambio();
        }
    });
    
    card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function mostrarPasoIntercambio() {
    const cardAjena = document.getElementById("card-ajena-tutorial");
    
    overlay.classList.remove("oculto");
    dialog.classList.remove("oculto");

    dialog.classList.remove("tutorial-paso-3");
    dialog.classList.add("tutorial-paso-4");

   text.innerHTML = `
    Ahora ves una solicitud de <strong>otro estudiante</strong> 
    para la misma asignatura: <strong>Matemáticas II</strong>.
    <br><br>
    <strong>Importante:</strong> Solo puedes intercambiar la misma asignatura, 
    cambiando el grupo y la fecha.
    <br><br>
    Al hacer <strong>click en esta card</strong>, propondrás intercambiar tu 
    Matemáticas II (Grupo 3) por la de María (Grupo 5).
`;
    btnNext.textContent = "Simular click";
    btnNext.onclick = abrirFormularioIntercambio;

    if (cardAjena) {
        cardAjena.classList.add("tutorial-focus-card");
        cardAjena.classList.add("tutorial-pulse-click");
    }
}

function abrirFormularioIntercambio() {
    if (pasoTutorial !== 4) return;
    
    pasoTutorial = 4.5;
    
    const cardAjena = document.getElementById("card-ajena-tutorial");
    if (cardAjena) {
        cardAjena.classList.remove("tutorial-focus-card");
        cardAjena.classList.remove("tutorial-pulse-click");
    }
    
    const formularioContainer = document.getElementById("formulario-container");
    formularioContainer.classList.add("tutorial-focus");
    
    const inputAsignatura = document.getElementById("asignatura");
    inputAsignatura.value = datosCardAjena.asignatura;
    inputAsignatura.disabled = true;
    
    document.getElementById("grupo").value = "";
    document.getElementById("fecha").value = "";
    
    const selectorContainer = document.getElementById("selector-clase-propia");
    const select = document.getElementById("clases-propias");
    
    select.innerHTML = `
        <option value="">-- Selecciona tu clase --</option>
        <option value="tutorial-mia">${datosTutorial.asignatura} | Grupo ${datosTutorial.grupo} | ${datosTutorial.fecha}</option>
    `;
    
    selectorContainer.classList.remove("oculto");
    
    select.onchange = function() {
        if (this.value === "tutorial-mia") {
            document.getElementById("grupo").value = datosTutorial.grupo;
            document.getElementById("fecha").value = datosTutorial.fecha;
        } else {
            document.getElementById("grupo").value = "";
            document.getElementById("fecha").value = "";
        }
    };
    
    formularioContainer.classList.remove("oculto");
    void formularioContainer.offsetHeight;
    
    mostrarPasoFormularioIntercambio();
}

function mostrarPasoFormularioIntercambio() {
    const formularioContainer = document.getElementById("formulario-container");
    
    overlay.classList.remove("oculto");
    dialog.classList.remove("oculto");

    dialog.classList.remove("tutorial-paso-4");
    dialog.classList.add("tutorial-paso-4-form");

    text.innerHTML = `
    Intercambio de <strong>Matemáticas II</strong> con <strong>${datosCardAjena.nombre}</strong>.
    <br><br>
    Tú tienes: <strong>Grupo ${datosTutorial.grupo}</strong> | 
    María tiene: <strong>Grupo ${datosCardAjena.grupo}</strong>
    <br><br>
    Selecciona tu clase del desplegable para confirmar el intercambio de grupos o <strong> si no tienes una creada pudes registrarla en el formulario. </strong>
`;

    btnNext.textContent = "Seleccionar y continuar";
    btnNext.onclick = seleccionarClasePropia;

    const form = document.getElementById("formulario");
    form.onsubmit = (e) => {
        e.preventDefault();
        const select = document.getElementById("clases-propias");
        if (pasoTutorial === 4.5 && select.value === "tutorial-mia") {
            seleccionarClasePropia();
        } else if (pasoTutorial === 4.5) {
            const alerta = document.getElementById("alerta-error");
            alerta.textContent = "Por favor selecciona tu clase del desplegable primero";
            alerta.classList.remove("oculto");
            setTimeout(() => alerta.classList.add("oculto"), 2000);
        }
    };

    formularioContainer.scrollIntoView({ behavior: "smooth", block: "center" });
}

function seleccionarClasePropia() {
    if (pasoTutorial !== 4.5) return;
    
    const select = document.getElementById("clases-propias");
    
    if (!select.value) {
        const alerta = document.getElementById("alerta-error");
        alerta.textContent = "Selecciona tu clase del desplegable para continuar";
        alerta.classList.remove("oculto");
        setTimeout(() => alerta.classList.add("oculto"), 2000);
        return;
    }
    
    if (select.value !== "tutorial-mia") {
        select.value = "tutorial-mia";
        const event = new Event('change');
        select.dispatchEvent(event);
    }
    
    setTimeout(() => {
        simularGuardadoIntercambio();
    }, 200);
}

function simularGuardadoIntercambio() {
    const formularioContainer = document.getElementById("formulario-container");
    formularioContainer.classList.add("oculto");
    formularioContainer.classList.remove("tutorial-focus");
    
    document.getElementById("selector-clase-propia").classList.add("oculto");
    
    document.getElementById("formulario").reset();
    document.getElementById("asignatura").disabled = false;
    
    avanzarAPasoIntercambioCompletado();
}

/* ================= PASO 5: Intercambio Completado ================= */
function avanzarAPasoIntercambioCompletado() {
    pasoTutorial = 5;
    
    actualizarCardAIntercambiada();
    
    setTimeout(() => {
        mostrarPasoIntercambioCompletado();
    }, 400);
}

function actualizarCardAIntercambiada() {
    const cardAjena = document.getElementById("card-ajena-tutorial");
    if (!cardAjena) return;
    
    cardAjena.id = "card-intercambiada-tutorial";
    cardAjena.className = "solicitud-card tutorial-card-intercambiada";
    
    const miFecha = new Date(datosTutorial.fecha).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
    });
    
    const suFecha = new Date(datosCardAjena.fecha).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
    });
    
    cardAjena.innerHTML = `
        <div class="card-header">
            <span class="fecha">${new Date(datosCardAjena.fecha).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })}</span>
            <span class="grupo">Grupo ${datosCardAjena.grupo}</span>
        </div>
        <div class="card-body">
            <h3 class="asignatura">${datosCardAjena.asignatura}</h3>
            <p class="solicitante">${datosCardAjena.nombre}</p>
        </div>
        <div class="estado">
            <span class="estado-badge estado-intercambiada">Intercambiado</span>
        </div>
        
        <div class="resultado-intercambio tutorial-resultado">
            <div class="resultado-item" data-grupo="Grupo ${datosTutorial.grupo}">
                <strong>Tú</strong><br>
                <span class="fecha">${miFecha}</span>
                <small>→ Grupo ${datosCardAjena.grupo}</small>
            </div>
            <div class="flecha-intercambio">⇄</div>
            <div class="resultado-item" data-grupo="Grupo ${datosCardAjena.grupo}">
                <strong>${datosCardAjena.nombre}</strong><br>
                <span class="fecha">${suFecha}</span>
                <small>→ Grupo ${datosTutorial.grupo}</small>
            </div>
        </div>
    `;
    
    cardAjena.scrollIntoView({ behavior: "smooth", block: "center" });
}

function mostrarPasoIntercambioCompletado() {
    const cardIntercambiada = document.getElementById("card-intercambiada-tutorial");
    
    overlay.classList.remove("oculto");
    dialog.classList.remove("oculto");

    dialog.classList.remove("tutorial-paso-4-form");
    dialog.classList.add("tutorial-paso-5");

    text.innerHTML = `
    ¡<strong>Intercambio completado!</strong>
    <br><br>
    Has intercambiado tu <strong>Matemáticas II</strong> (Grupo ${datosTutorial.grupo}) 
    por la de <strong>${datosCardAjena.nombre}</strong> (Grupo ${datosCardAjena.grupo}).
    <br><br>
    Recuerda: <strong>misma asignatura, diferente grupo y fecha</strong>.
    <br><br>
    <em>¡Listo! Ya sabes cómo funciona el sistema.</em>
`;

    btnNext.textContent = "Finalizar";
    btnNext.onclick = finalizarTutorial;

    if (cardIntercambiada) {
        cardIntercambiada.classList.add("tutorial-focus-card");
    }
}

/* ================= FINALIZAR ================= */
function finalizarTutorial() {
    tutorialActivo = false;
    
    if (proteccionCardsInterval) {
        clearInterval(proteccionCardsInterval);
        proteccionCardsInterval = null;
    }
    
    const cardsTutorial = [
        document.getElementById("card-tutorial"),
        document.getElementById("card-ajena-tutorial"),
        document.getElementById("card-intercambiada-tutorial")
    ];
    
    cardsTutorial.forEach((card, index) => {
        if (card) {
            setTimeout(() => {
                card.style.transition = "all 0.5s ease";
                card.style.opacity = "0";
                card.style.transform = "scale(0.8)";
                setTimeout(() => {
                    if (card.parentNode) card.remove();
                }, 500);
            }, index * 100);
        }
    });
    
    setTimeout(() => {
        cerrarTutorial();
        // Recargar la página o llamar a mostrarSolicitudes real
        location.reload();
    }, 800);
}

function cerrarTutorial() {
    overlay.classList.add("oculto");
    dialog.classList.add("oculto");

    const btnActual = document.getElementById("btn-formulario");
    btnActual.classList.remove("tutorial-focus-btn");
    
    const formularioContainer = document.getElementById("formulario-container");
    formularioContainer.classList.remove("tutorial-focus");

    localStorage.setItem("tutorial_visto", "true");
    
    pasoTutorial = 0;
    datosTutorial = null;
    datosCardAjena = null;
    tutorialActivo = false;
    
    if (proteccionCardsInterval) {
        clearInterval(proteccionCardsInterval);
        proteccionCardsInterval = null;
    }
}

btnSkip.addEventListener("click", () => {
    tutorialActivo = false;
    
    if (proteccionCardsInterval) {
        clearInterval(proteccionCardsInterval);
        proteccionCardsInterval = null;
    }
    
    const todasLasCards = document.querySelectorAll('[id*="card-tutorial"], [id*="card-ajena"], [id*="card-intercambiada"]');
    todasLasCards.forEach(card => {
        if (card) card.remove();
    });
    
    cerrarTutorial();
    location.reload();
});