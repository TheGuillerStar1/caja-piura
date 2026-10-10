// Dueño: Agente B. Contratos de request/response en @cp/shared.
import { Router } from "express";
import { noImplementado } from "../lib/errores.js";
import { requiereSesion } from "../lib/sesion.js";

export const router = Router();

router.post("/pagos/preparar", requiereSesion, noImplementado);
router.post("/pagos/confirmar", requiereSesion, noImplementado);
