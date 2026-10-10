import Groq from "groq-sdk";
import { env } from "./env.js";

// Cliente Groq. La llave vive solo en el backend. Nunca enviar claves, DNI ni números de cuenta completos.
export const groq = new Groq({ apiKey: env.GROQ_API_KEY || "sin-llave" });
export const hayGroq = Boolean(env.GROQ_API_KEY);
export const MODELO_TEXTO = env.GROQ_MODELO_TEXTO;
export const MODELO_VISION = env.GROQ_MODELO_VISION;
