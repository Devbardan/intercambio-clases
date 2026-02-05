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
    claseB: Object
});

const Solicitud = mongoose.model("Solicitud", solicitudSchema);

// GET todas las solicitudes (ROBUSTO)
app.get("/api/solicitudes", async (req, res) => {
    try {
        const solicitudes = await Solicitud.find({}).lean();

        // 🔐 Asegurar siempre un array válido
        res.json(Array.isArray(solicitudes) ? solicitudes : []);
    } catch (err) {
        console.error("❌ Error GET /api/solicitudes:", err);
        res.json([]); // 👈 NUNCA romper el frontend
    }
});


// POST nueva solicitud
app.post("/api/solicitudes", async (req, res) => {
    try {
        const nueva = new Solicitud(req.body);
        await nueva.save();
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

        // ✅ TODO OK → aceptar intercambio
        solicitud.estado = "intercambiada";
        solicitud.claseB = claseB;

        await solicitud.save();
        res.json(solicitud);

    } catch (err) {
        console.error("❌ Error PUT /api/solicitudes:", err);
        res.status(500).json({ error: "Error al actualizar solicitud" });
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
