// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose.connect('TU_URI_MONGODB', { useNewUrlParser: true, useUnifiedTopology: true });

// Modelo de solicitud
const Solicitud = mongoose.model('Solicitud', new mongoose.Schema({
    estado: String,
    claseA: Object,
    claseB: Object
}));

// Rutas
app.get('/solicitudes', async (req, res) => {
    const solicitudes = await Solicitud.find();
    res.json(solicitudes);
});

app.post('/solicitudes', async (req, res) => {
    const nueva = new Solicitud(req.body);
    await nueva.save();
    res.json(nueva);
});

app.put('/solicitudes/:id', async (req, res) => {
    const solicitud = await Solicitud.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(solicitud);
});

// Servidor
app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
