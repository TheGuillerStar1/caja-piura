// Dueño: Agente B. Contratos de request/response en @cp/shared.
import { Router } from "express";
import { noImplementado } from "../lib/errores.js";
import { requiereSesion } from "../lib/sesion.js";

export const router = Router();

router.get("/frecuentes", requiereSesion, noImplementado);
router.post("/frecuentes", requiereSesion, noImplementado);
