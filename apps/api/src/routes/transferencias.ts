// Envíos a contacto por celular (Yape, Plin, Bim, Dale, Sip). Contratos en @cp/shared.
import { ConfirmarTransferenciaReq, PrepararTransferenciaReq } from "@cp/shared";
import { Router } from "express";
import { validar } from "../lib/errores.js";
import { requiereSesion } from "../lib/sesion.js";
import { agendaDemo } from "../transferencias/directorio.js";
import { confirmarTransferencia, prepararTransferencia } from "../transferencias/servicio.js";

export const router = Router();

/** Agenda de prueba (contactos ficticios) para celulares que no permiten leer los contactos. */
router.get("/transferencias/contactos-demo", requiereSesion, (_req, res) => {
  res.json(agendaDemo());
});

/** Resumen del envío (a quién, por dónde, cuánto) + key de idempotencia. No mueve dinero. */
router.post("/transferencias/preparar", requiereSesion, async (req, res) => {
  res.json(await prepararTransferencia(req.clienteId!, validar(PrepararTransferenciaReq, req.body)));
});

/** Ejecuta el envío una sola vez por idempotencyKey. Solo lo llama la pantalla de confirmación tras huella/rostro/clave. */
router.post("/transferencias/confirmar", requiereSesion, async (req, res) => {
  res.json(await confirmarTransferencia(req.clienteId!, validar(ConfirmarTransferenciaReq, req.body)));
});
