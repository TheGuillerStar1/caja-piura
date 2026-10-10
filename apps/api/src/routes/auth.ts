// Dueño: Agente A. Contratos de request/response en @cp/shared.
import { Router } from "express";
import { noImplementado } from "../lib/errores.js";
import { requiereSesion } from "../lib/sesion.js";

export const router = Router();

router.post("/auth/login", noImplementado);
router.post("/auth/logout", noImplementado);
router.get("/auth/clientes-demo", noImplementado);
