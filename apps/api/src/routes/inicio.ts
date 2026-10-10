// Dueño: Agente A. Contratos de request/response en @cp/shared.
import { Router } from "express";
import { noImplementado } from "../lib/errores.js";
import { requiereSesion } from "../lib/sesion.js";

export const router = Router();

router.get("/inicio", requiereSesion, noImplementado);
