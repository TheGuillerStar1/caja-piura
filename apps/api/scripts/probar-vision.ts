// F0. Prueba qué modelos de Groq aceptan imágenes. Uso: npx tsx --env-file=../../.env scripts/probar-vision.ts
import { groq } from "../src/lib/groq.js";

// PNG 32x32 rojo
const png = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGO4IyJCU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULAJ3LED3QqzauAAAAAElFTkSuQmCC";
for (const model of process.argv.slice(2)) {
  try {
    const r = await groq.chat.completions.create({
      model,
      max_completion_tokens: 300,
      messages: [{ role: "user", content: [
        { type: "text", text: "¿De qué color es esta imagen? Responde con una palabra." },
        { type: "image_url", image_url: { url: `data:image/png;base64,${png}` } },
      ] }],
    });
    console.log(`✔ ${model}: ${r.choices[0].message.content?.slice(-80)}`);
  } catch (e) {
    console.log(`✘ ${model}: ${(e as Error).message.slice(0, 160)}`);
  }
}
