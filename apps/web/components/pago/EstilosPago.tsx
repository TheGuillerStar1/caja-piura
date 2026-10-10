// Dueño: Agente B. Animaciones CSS propias de los pagos (no se toca globals.css).
export function EstilosPago() {
  return (
    <style>{`
@keyframes cp-trazo { from { stroke-dashoffset: 40; } to { stroke-dashoffset: 0; } }
.anim-trazo { stroke-dasharray: 40; stroke-dashoffset: 0; animation: cp-trazo .6s ease-out .15s both; }
@keyframes cp-sube { from { transform: translateY(100%); } to { transform: translateY(0); } }
.anim-hoja { animation: cp-sube .25s ease-out both; }
@keyframes cp-escanea { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: .6; } }
.anim-escanea { animation: cp-escanea .6s ease-in-out infinite; }
@keyframes cp-aparece { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }
.anim-aparece { animation: cp-aparece .35s ease-out both; }
@media (prefers-reduced-motion: reduce) { .anim-trazo, .anim-hoja, .anim-escanea, .anim-aparece { animation: none; } }
`}</style>
  );
}
