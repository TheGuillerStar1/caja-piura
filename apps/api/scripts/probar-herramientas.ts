// F0. Prueba tool calling en modelos de Groq. Uso: npx tsx --env-file=../../.env scripts/probar-herramientas.ts <modelo>...
import { groq } from "../src/lib/groq.js";

for (const model of process.argv.slice(2)) {
  const t0 = Date.now();
  try {
    const r = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Eres el asistente de Caja Piura. Usa herramientas cuando corresponda." },
        { role: "user", content: "quiero pagar la luz de mi mamá" },
      ],
      tools: [{ type: "function", function: { name: "preparar_pago_frecuente", description: "Deja listo el pago de un pago frecuente guardado", parameters: { type: "object", properties: { alias: { type: "string" } }, required: ["alias"] } } }],
      tool_choice: "auto",
    });
    const tc = r.choices[0].message.tool_calls?.[0];
    console.log(`✔ ${model} (${Date.now() - t0} ms): ${tc ? `${tc.function.name}(${tc.function.arguments})` : "sin herramienta: " + r.choices[0].message.content?.slice(0, 80)}`);
  } catch (e) {
    console.log(`✘ ${model}: ${(e as Error).message.slice(0, 160)}`);
  }
}
