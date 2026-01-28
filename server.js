import express from "express";
import cors from "cors";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 👉 servir frontend
app.use(express.static("public"));

// 🧠 memoria temporal
let solicitudes = [];

// GET todas
app.get("/api/solicitudes", (req, res) => {
    res.json(solicitudes);
});

// POST nueva
app.post("/api/solicitudes", (req, res) => {
    solicitudes.push(req.body);
    res.json({ ok: true });
});

// PUT aceptar intercambio
app.put("/api/solicitudes/:id", (req, res) => {
    const solicitud = solicitudes.find(s => s.id === req.params.id);
    if (!solicitud) {
        return res.status(404).json({ error: "No encontrada" });
    }

    solicitud.estado = "intercambiada";
    solicitud.claseB = req.body.claseB;

    res.json({ ok: true });
});

// fallback
app.get("*", (req, res) => {
    res.sendFile(path.resolve("public/index.html"));
});

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto", PORT);
});
