import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { avisarNotificaciones } from './notificar';

const PORT = Number(process.env.PORT ?? 3000);
const AGENDA_URL = process.env.AGENDA_URL ?? 'http://localhost:3001';
const AGENDA_TIMEOUT_MS = Number(process.env.AGENDA_TIMEOUT_MS ?? 2000);
const NOTIFICACIONES_HOST = process.env.NOTIFICACIONES_HOST ?? 'localhost';
const NOTIFICACIONES_PORT = Number(process.env.NOTIFICACIONES_PORT ?? 4000);
const NOTIFICACIONES_TIMEOUT_MS = Number(process.env.NOTIFICACIONES_TIMEOUT_MS ?? 1000);

interface Cita {
    id: string;
    paciente: string;
    medicoId: string;
    creadaEn: string;
    notificada: boolean;
    motivoNotificacion?: string;
}

const citas: Cita[] = [];
const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ estado: 'ok', servicio: 'citas' });
});

app.get('/citas', (_req: Request, res: Response) => {
    res.status(200).json(citas);
});

app.post('/citas', async (req: Request, res: Response) => {
    const { paciente, medicoId } = req.body ?? {};
    if (typeof paciente !== 'string' || paciente.trim() === '' ||
        typeof medicoId !== 'string' || medicoId.trim() === '') {
        res.status(400).json({ error: 'Se requieren paciente y medicoId no vacíos' });
        return;
    }

    const inicio = performance.now();
    try {
        const r = await fetch(`${AGENDA_URL}/medicos/${encodeURIComponent(medicoId)}/reservar`, {
            method: 'POST',
            signal: AbortSignal.timeout(AGENDA_TIMEOUT_MS),
        });

        if (r.status === 404 || r.status === 409) {
            const detalle = await r.json().catch(() => ({ error: `Agenda respondió ${r.status}` }));
            console.log(`Agenda respondió ${r.status} para ${medicoId}: ${JSON.stringify(detalle)}`);
            res.status(r.status).json(detalle);
            return;
        }
        if (r.status !== 200) {
            console.log(`Agenda respondió un código inesperado: ${r.status}`);
            res.status(502).json({ error: 'Respuesta inesperada de Agenda', codigoAgenda: r.status });
            return;
        }
    } catch (error) {
        const duracionMs = Math.round(performance.now() - inicio);
        const e = error as Error & { cause?: { code?: string } };
        const motivo = e.name === 'TimeoutError'
            ? `Agenda no respondió en ${AGENDA_TIMEOUT_MS}ms`
            : `No se pudo conectar con Agenda (${e.cause?.code ?? e.message})`;
        console.log(`Error con Agenda: ${motivo} (${duracionMs}ms)`);
        res.status(503).json({ error: 'Agenda no disponible', motivo, duracionMs });
        return;
    }

    const cita: Cita = {
        id: randomUUID(),
        paciente: paciente.trim(),
        medicoId,
        creadaEn: new Date().toISOString(),
        notificada: false,
    };

    const aviso = await avisarNotificaciones(
        NOTIFICACIONES_HOST, NOTIFICACIONES_PORT, NOTIFICACIONES_TIMEOUT_MS,
        { tipo: 'CITA_CREADA', citaId: cita.id, paciente: cita.paciente, medicoId: cita.medicoId },
        cita.id
    );
    if (aviso.ok) {
        cita.notificada = true;
    } else {
        cita.motivoNotificacion = aviso.motivo;
        console.log(`Error con Notificaciones: ${aviso.motivo}`);
    }

    citas.push(cita);
    res.status(201).json(cita);
});

app.get('/reporte', (req: Request, res: Response) => {
    const n = req.query.n === undefined ? 8_000_000 : Number(req.query.n);
    if (!Number.isInteger(n) || n < 0) {
        res.status(400).json({ error: 'n debe ser un entero mayor o igual a 0' });
        return;
    }

    const inicio = performance.now();
    let respondido = false;
    const worker = new Worker(path.join(__dirname, 'worker-reporte.js'), { workerData: { n } });

    const fallar = (detalle: string) => {
        if (respondido) return;
        respondido = true;
        console.log(`Falló el hilo del reporte: ${detalle}`);
        res.status(500).json({ error: 'Falló el cálculo del reporte', detalle });
    };

    worker.once('message', (primos: number) => {
        if (respondido) return;
        respondido = true;
        res.json({
            modo: 'worker', n, primos,
            citasRegistradas: citas.length,
            duracionMs: Math.round(performance.now() - inicio),
        });
    });
    worker.once('error', (err: unknown) => fallar(err instanceof Error ? err.message : String(err)));
    worker.once('exit', (code) => { if (code !== 0) fallar(`El hilo terminó con código ${code}`); });
});

app.listen(PORT, () => {
    console.log(`Citas escuchando en el puerto ${PORT} (agenda: ${AGENDA_URL})`);
});
