import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 🔹 Conexión MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("🟢 MongoDB conectado"))
.catch(err => console.error("🔴 Error MongoDB:", err));

// 🔹 Modelo Mongoose
const solicitudSchema = new mongoose.Schema({
    id: String,
    estado: String,
    claseA: Object,
    claseB: Object,
    expiraEn: Date
});

// ✅ FUNCIÓN CORREGIDA: Calcula fecha de expiración correctamente
function calcularFechaExpiracion(solicitud) {
    const fechas = [];
    
    // Validar que claseA existe y tiene fecha válida
    if (solicitud.claseA?.fecha) {
        const fechaA = new Date(solicitud.claseA.fecha);
        if (!isNaN(fechaA.getTime())) {
            fechas.push(fechaA);
        }
    }

    // Solo agregar claseB si existe y tiene fecha válida (para solicitudes intercambiadas)
    if (solicitud.claseB?.fecha) {
        const fechaB = new Date(solicitud.claseB.fecha);
        if (!isNaN(fechaB.getTime())) {
            fechas.push(fechaB);
        }
    }

    // Si no hay fechas válidas, usar fecha actual + 1 día como fallback
    if (fechas.length === 0) {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 1);
        return fallback;
    }

    // Tomar la fecha más reciente y sumar 1 día (o 2 si prefieres)
    const ultimaFecha = new Date(Math.max(...fechas));
    ultimaFecha.setDate(ultimaFecha.getDate() + 1); // +1 día después de la última fecha
    
    return ultimaFecha;
}

const Solicitud = mongoose.model("Solicitud", solicitudSchema);

// GET todas las solicitudes (ROBUSTO)
app.get("/api/solicitudes", async (req, res) => {
    try {
        // Limpiar expiradas antes de devolver (opcional, para datos frescos)
        await limpiarSolicitudesExpiradas();
        
        const solicitudes = await Solicitud.find({}).lean();
        res.json(Array.isArray(solicitudes) ? solicitudes : []);
    } catch (err) {
        console.error("❌ Error GET /api/solicitudes:", err);
        res.json([]);
    }
});

// POST nueva solicitud
app.post("/api/solicitudes", async (req, res) => {
    try {
        const expiraEn = calcularFechaExpiracion(req.body);
        
        const nueva = new Solicitud({
            ...req.body,
            expiraEn: expiraEn
        });

        await nueva.save();
        console.log(`✅ Solicitud creada: ${req.body.id}, expira: ${expiraEn}`);
        res.json(nueva);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear solicitud" });
    }
});

// PUT aceptar intercambio (CON VALIDACIONES)
app.put("/api/solicitudes/:id", async (req, res) => {
    try {
        const solicitud = await Solicitud.findOne({ id: req.params.id });
        if (!solicitud) {
            return res.status(404).json({ error: "Solicitud no encontrada" });
        }

        if (solicitud.estado === "intercambiada") {
            return res.status(400).json({
                error: "Esta solicitud ya fue intercambiada"
            });
        }

        const claseB = req.body.claseB;
        if (!claseB) {
            return res.status(400).json({ error: "Datos de claseB faltantes" });
        }

        // 🚫 VALIDACIONES CRÍTICAS
        if (solicitud.claseA.grupo === claseB.grupo) {
            return res.status(400).json({
                error: "No se permite intercambio con el mismo grupo"
            });
        }

        if (solicitud.claseA.fecha === claseB.fecha) {
            return res.status(400).json({
                error: "No se permite intercambio con la misma fecha"
            });
        }

        // ✅ TODO OK → aceptar intercambio y recalcular expiración
        solicitud.estado = "intercambiada";
        solicitud.claseB = claseB;
        
        // Recalcular fecha de expiración con la nueva claseB
        solicitud.expiraEn = calcularFechaExpiracion(solicitud);

        await solicitud.save();
        console.log(`🔄 Intercambio completado: ${req.params.id}, nueva expiración: ${solicitud.expiraEn}`);
        res.json(solicitud);

    } catch (err) {
        console.error("❌ Error PUT /api/solicitudes:", err);
        res.status(500).json({ error: "Error al actualizar solicitud" });
    }
});

// ✅ FUNCIÓN CORREGIDA: Limpieza de solicitudes expiradas
async function limpiarSolicitudesExpiradas() {
    try {
        const ahora = new Date();
        
        // Buscar solicitudes donde expiraEn <= ahora
        const resultado = await Solicitud.deleteMany({
            expiraEn: { $lte: ahora }
        });
        
        if (resultado.deletedCount > 0) {
            console.log(`🗑️ ${resultado.deletedCount} solicitud(es) expirada(s) eliminada(s)`);
        }
        
        return resultado;
    } catch (error) {
        console.error("❌ Error limpiando solicitudes:", error);
        throw error;
    }
}

// POST actualizar nombre de usuario en todas sus solicitudes
app.post("/api/actualizar-nombre", async (req, res) => {
    try {
        const { userId, nombreAnterior, nuevoNombre } = req.body;
        
        if (!userId || !nuevoNombre) {
            return res.status(400).json({ error: "Datos incompletos" });
        }
        
        // Actualizar en claseA (solicitudes creadas por el usuario)
        await Solicitud.updateMany(
            { "claseA.userId": userId },
            { $set: { "claseA.nombre": nuevoNombre } }
        );
        
        // Actualizar en claseB (solicitudes donde aceptó intercambio)
        await Solicitud.updateMany(
            { "claseB.userId": userId },
            { $set: { "claseB.nombre": nuevoNombre } }
        );
        
        console.log(`✅ Nombre actualizado: ${nombreAnterior} → ${nuevoNombre}`);
        res.json({ ok: true, mensaje: "Nombre actualizado correctamente" });
        
    } catch (err) {
        console.error("❌ Error al actualizar nombre:", err);
        res.status(500).json({ error: "Error al actualizar nombre" });
    }
});

// DELETE (opcional)
app.delete("/api/solicitudes/:id", async (req, res) => {
    try {
        await Solicitud.deleteOne({ id: req.params.id });
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar" });
    }
});

// fallback
app.get("*", (req, res) => {
    res.sendFile(path.resolve("public/index.html"));
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto", PORT);
});

// 🕐 Ejecutar limpieza cada hora
setInterval(() => {
    limpiarSolicitudesExpiradas()
        .then(() => console.log("🧹 Limpieza programada completada"))
        .catch(err => console.error("Error en limpieza programada:", err));
}, 1000 * 60 * 60); // cada hora

// 🛠️ REPARACIÓN: Limpiar solicitudes con expiraEn inválido o ya expiradas
async function repararSolicitudesExistentes() {
    try {
        const ahora = new Date();
        const solicitudes = await Solicitud.find({});
        
        console.log(`🔧 Reparando ${solicitudes.length} solicitudes existentes...`);
        
        for (const sol of solicitudes) {
            // Verificar si expiraEn es inválido o ya pasó
            const expiraInvalido = !sol.expiraEn || isNaN(new Date(sol.expiraEn).getTime());
            const yaExpirada = sol.expiraEn && new Date(sol.expiraEn) <= ahora;
            
            if (expiraInvalido || yaExpirada) {
                const nuevaExpiracion = calcularFechaExpiracion(sol);
                
                if (nuevaExpiracion <= ahora) {
                    // Si incluso con el cálculo nuevo ya expiró, eliminar
                    await Solicitud.deleteOne({ _id: sol._id });
                    console.log(`🗑️ Eliminada solicitud expirada: ${sol.id}`);
                } else {
                    // Recalcular fecha
                    sol.expiraEn = nuevaExpiracion;
                    await sol.save();
                    console.log(`✅ Fecha corregida: ${sol.id} → ${nuevaExpiracion.toISOString().split('T')[0]}`);
                }
            }
        }
    } catch (err) {
        console.error("❌ Error reparando solicitudes:", err);
    }
}

// 🚀 INICIAR SERVIDOR (SOLO UNA VEZ)
async function iniciarServidor() {
    // Primero reparar solicitudes existentes
    await repararSolicitudesExistentes();
    
    // Luego iniciar el servidor
    app.listen(PORT, () => {
        console.log("Servidor corriendo en puerto", PORT);
    });
    
    // Limpieza inicial al arrancar
    await limpiarSolicitudesExpiradas();
}

iniciarServidor();