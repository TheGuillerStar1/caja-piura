// Dueño: Agente C. Contratos de request/response en @cp/shared.
import { Router } from "express";
import { noImplementado } from "../lib/errores.js";
import { requiereSesion } from "../lib/sesion.js";

export const router = Router();

router.get("/recibos/demo", requiereSesion, noImplementado);
router.post("/recibos/leer", requiereSesion, noImplementado);
router.get("/recibos/:codigo", requiereSesion, noImplementado);
