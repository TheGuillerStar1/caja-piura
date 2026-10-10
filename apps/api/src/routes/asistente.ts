// Dueño: Agente C. Contratos de request/response en @cp/shared.
import { AsistenteReq } from "@cp/shared";
import { Router } from "express";
import { validar } from "../lib/errores.js";
import { requiereSesion } from "../lib/sesion.js";
import { responder } from "../ia/asistente.js";

export const router = Router();

/** Pía: prepara (nunca paga). Responde 1-2 líneas + AccionUI. */
router.post("/asistente", requiereSesion, async (req, res) => {
  const { mensaje } = validar(AsistenteReq, req.body);
  res.json(await responder(req.clienteId!, mensaje));
});
