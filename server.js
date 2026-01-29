import express from "express";
import cors from "cors";
import path from "path";

import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("🟢 MongoDB conectado"))
  .catch(err => console.error("🔴 Error MongoDB", err));


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 👉 servir frontend
app.use(express.static("public"));


const solicitudSchema = new mongoose.Schema({
  id: { type: String, required: true }, // id generado en frontend
  estado: { type: String, default: "abierta" },
  claseA: {
    userId: String,
    nombre: String,
    asignatura: String,
    grupo: Number,
    fecha: String
  },
  claseB: {
    userId: String,
    nombre: String,
    asignatura: String,
    grupo: Number,
    fecha: String
  }
});

const Solicitud = mongoose.model("Solicitud", solicitudSchema);

// GET todas
app.get("/api/solicitudes", async (req, res) => {
  try {
    const solicitudes = await Solicitud.find({});
    res.json(solicitudes);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
});
// POST nueva
app.post("/api/solicitudes", async (req, res) => {
  try {
    const nueva = new Solicitud(req.body);
    await nueva.save();
    res.json({ ok: true, solicitud: nueva });
  } catch (err) {
    res.status(500).json({ error: "Error al crear solicitud" });
  }
});

// PUT aceptar intercambio
app.put("/api/solicitudes/:id", async (req, res) => {
  try {
    const solicitud = await Solicitud.findOne({ id: req.params.id });
    if (!solicitud) return res.status(404).json({ error: "No encontrada" });

    solicitud.estado = "intercambiada";
    solicitud.claseB = req.body.claseB;

    await solicitud.save();
    res.json({ ok: true, solicitud });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar solicitud" });
  }
});

app.delete("/api/solicitudes/:id", async (req, res) => {
  try {
    await Solicitud.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar solicitud" });
  }
});

// fallback
app.get("*", (req, res) => {
    res.sendFile(path.resolve("public/index.html"));
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto", PORT);
});
