// Variables de entorno. Se cargan desde ../../.env en desarrollo (tsx --env-file) y desde Railway en producción.
function opcional(nombre: string, porDefecto = ""): string {
  return process.env[nombre] ?? porDefecto;
}

export const env = {
  PORT: Number(opcional("PORT", "4317")),
  NODE_ENV: opcional("NODE_ENV", "development"),
  DATABASE_URL: opcional("DATABASE_URL"),
  SESSION_SECRET: opcional("SESSION_SECRET", "dev-secret-cambiar"),
  GROQ_API_KEY: opcional("GROQ_API_KEY"),
  GROQ_MODELO_TEXTO: opcional("GROQ_MODELO_TEXTO", "qwen/qwen3.8-27b"),
  GROQ_MODELO_VISION: opcional("GROQ_MODELO_VISION", "qwen/qwen3.8-27b"),
  R2_ACCOUNT_ID: opcional("R2_ACCOUNT_ID"),
  R2_ACCESS_KEY_ID: opcional("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: opcional("R2_SECRET_ACCESS_KEY"),
  R2_BUCKET: opcional("R2_BUCKET"),
};

export const esProduccion = env.NODE_ENV === "production";
