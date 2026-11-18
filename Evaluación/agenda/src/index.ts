import express, { Request, Response } from 'express';

const PORT = Number(process.env.PORT ?? 3001);
const RETARDO_MS = Number(process.env.RETARDO_MS ?? 0);

interface Medico { id: string; nombre: string; especialidad: string; cupos: number; }

const medicos: Medico[] = [
    { id: 'MED-01', nombre: 'Dra. Elena Barrera', especialidad: 'Cardiología', cupos: 20 },
    { id: 'MED-02', nombre: 'Dr. Tomás Ledesma', especialidad: 'Pediatría', cupos: 8 },
    { id: 'MED-03', nombre: 'Dra. Camila Orellana', especialidad: 'Dermatología', cupos: 0 },
    { id: 'MED-04', nombre: 'Dr. Ignacio Paredes', especialidad: 'Traumatología', cupos: 5 },
    { id: 'MED-05', nombre: 'Dra. Lucía Montalvo', especialidad: 'Neurología', cupos: 12 },
];

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ estado: 'ok', servicio: 'agenda' });
});

app.get('/medicos', (_req: Request, res: Response) => {
    res.status(200).json(medicos);
});

app.post('/medicos/:id/reservar', async (req: Request<{ id: string }>, res: Response) => {
    if (RETARDO_MS > 0) await esperar(RETARDO_MS);

    const medico = medicos.find((m) => m.id === req.params.id);
    if (!medico) {
        res.status(404).json({ error: `El médico ${req.params.id} no existe` });
        return;
    }
    if (medico.cupos <= 0) {
        res.status(409).json({ error: `El médico ${medico.id} no tiene cupos disponibles` });
        return;
    }
    medico.cupos -= 1;
    res.status(200).json({ medicoId: medico.id, cuposRestantes: medico.cupos });
});

app.listen(PORT, () => {
    console.log(`Agenda escuchando en el puerto ${PORT} retardo: ${RETARDO_MS}ms`);
});
