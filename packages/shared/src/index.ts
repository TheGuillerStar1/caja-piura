// CONTRATO (F0) entre apps/web y apps/api.
// Los agentes no editan este archivo: si necesitan un cambio, lo reportan.
// Montos: siempre number en soles con 2 decimales. Fechas: ISO string.
import { z } from "zod";

export const Vista = z.enum(["ASISTIDA", "ESTANDAR"]);
export type Vista = z.infer<typeof Vista>;
export const TipoPago = z.enum(["CUOTA", "FRECUENTE", "RECIBO"]);
export type TipoPago = z.infer<typeof TipoPago>;
export const Tono = z.enum(["CALIDO", "CORTO", "DIRECTO"]);
export type Tono = z.infer<typeof Tono>;

/** Error estándar de la API: { error: { codigo, mensaje } } */
export const ApiError = z.object({
  error: z.object({ codigo: z.string(), mensaje: z.string() }),
});
export type ApiError = z.infer<typeof ApiError>;

// ── Auth ─────────────────────────────────────────────
export const LoginReq = z.discriminatedUnion("metodo", [
  z.object({ metodo: z.literal("ROSTRO"), dni: z.string().length(8) }),
  z.object({ metodo: z.literal("HUELLA"), dni: z.string().length(8) }),
  z.object({ metodo: z.literal("CLAVE"), dni: z.string().length(8), clave: z.string().length(6) }),
]);
export type LoginReq = z.infer<typeof LoginReq>;
/** Errores: CLAVE_INCORRECTA (con intentosRestantes), BLOQUEADO (tras 2 intentos), NO_EXISTE */
export const LoginRes = z.object({ ok: z.literal(true), nombre: z.string(), primerIngreso: z.boolean() });
export type LoginRes = z.infer<typeof LoginRes>;

/** Clientes de demo para la pantalla de selección rápida (Rosa, Elena, Carlos) */
export const ClienteDemo = z.object({ dni: z.string(), nombre: z.string(), edad: z.number(), descripcion: z.string() });
export const ClientesDemoRes = z.array(ClienteDemo);
export type ClienteDemo = z.infer<typeof ClienteDemo>;

// ── Motor de personalización ─────────────────────────
export const Sugerencia = z.object({
  id: z.enum(["PAGAR_CUOTA", "FRECUENTES", "PAGAR_RECIBO", "VER_SALDO", "AYUDA", "PROGRESO"]),
  texto: z.string(),
});
export type Sugerencia = z.infer<typeof Sugerencia>;

export const Recomendacion = z.object({
  vista: Vista,
  tono: Tono,
  puntaje: z.number(), // 0..100, mayor = más digital
  razones: z.array(z.string()), // frases legibles para el cliente y el jurado
  sugerencias: z.array(Sugerencia),
});
export type Recomendacion = z.infer<typeof Recomendacion>;

// ── Perfil ───────────────────────────────────────────
export const Cuenta = z.object({ id: z.number(), numero: z.string(), numeroOculto: z.string(), tipo: z.string(), saldo: z.number() });
export type Cuenta = z.infer<typeof Cuenta>;

export const MeRes = z.object({
  id: z.number(),
  nombre: z.string(),
  edad: z.number(),
  ocupacion: z.string(),
  zona: z.enum(["RURAL", "URBANA"]),
  vistaPreferida: Vista.nullable(), // null = aún no eligió (primer ingreso)
  primerIngreso: z.boolean(),
  fechaSimulada: z.string(),
  recomendacion: Recomendacion,
  cuentas: z.array(Cuenta),
});
export type MeRes = z.infer<typeof MeRes>;

export const PutVistaReq = z.object({ vista: Vista });

// ── Inicio ───────────────────────────────────────────
export const Aviso = z.object({
  tipo: TipoPago, // CUOTA o FRECUENTE
  referenciaId: z.number(),
  titulo: z.string(), // "Tu cuota de S/ 350 vence el viernes"
  monto: z.number(),
  vencimiento: z.string(),
  diasRestantes: z.number(),
});
export type Aviso = z.infer<typeof Aviso>;

export const InicioRes = z.object({
  saludo: z.string(), // "Hola, Rosa"
  vista: Vista,
  avisos: z.array(Aviso),
  accesos: z.array(Sugerencia),
});
export type InicioRes = z.infer<typeof InicioRes>;

// ── Cuotas y frecuentes ──────────────────────────────
export const CuotaRes = z.object({
  id: z.number(),
  credito: z.string(),
  numero: z.number(),
  totalCuotas: z.number(),
  monto: z.number(),
  vencimiento: z.string(),
  diasRestantes: z.number(),
});
export type CuotaRes = z.infer<typeof CuotaRes>;
export const CuotaProximaRes = CuotaRes.nullable();

export const FrecuenteRes = z.object({
  id: z.number(),
  alias: z.string(),
  empresa: z.string(),
  rubro: z.string(),
  codigo: z.string(),
  esPropio: z.boolean(),
  /** Deuda vigente consultada "a Caja Piura" (null si no hay deuda) */
  deuda: z.object({ reciboId: z.number(), monto: z.number(), vencimiento: z.string() }).nullable(),
});
export type FrecuenteRes = z.infer<typeof FrecuenteRes>;
export const FrecuentesRes = z.array(FrecuenteRes);

export const CrearFrecuenteReq = z.object({ reciboId: z.number(), alias: z.string().min(1).max(40), esPropio: z.boolean() });

// ── Recibos (ruta C) ─────────────────────────────────
/** POST /recibos/leer: multipart con campo "imagen" (jpeg/png ≤ 2 MB) o JSON { demoKey } */
export const LeerReciboRes = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), codigo: z.string(), servicioId: z.number(), empresa: z.string() }),
  z.object({ ok: z.literal(false), motivo: z.string() }), // "No pude leer el código"
]);
export type LeerReciboRes = z.infer<typeof LeerReciboRes>;

export const ReciboRes = z.object({
  id: z.number(),
  codigo: z.string(),
  empresa: z.string(),
  rubro: z.string(),
  titularOculto: z.string(), // "MAR*** PÉR***"
  monto: z.number(), // monto real de Caja Piura, nunca el de la foto
  vencimiento: z.string(),
});
export type ReciboRes = z.infer<typeof ReciboRes>;

export const ReciboDemo = z.object({ key: z.string(), url: z.string(), empresa: z.string() });
export const RecibosDemoRes = z.array(ReciboDemo);

// ── Pagos ────────────────────────────────────────────
export const PrepararPagoReq = z.object({ tipo: TipoPago, referenciaId: z.number() });
/** CUOTA → id de Cuota · FRECUENTE → id de Frecuente · RECIBO → id de Recibo */
export const PrepararPagoRes = z.object({
  tipo: TipoPago,
  referenciaId: z.number(),
  descripcion: z.string(), // "Cuota 8 de 12 · Crédito 0012345"
  destinatario: z.string(), // "Caja Piura" o "Enosa · MAR*** PÉR***"
  monto: z.number(),
  cuenta: Cuenta,
  saldoSuficiente: z.boolean(),
  /** Generada por el servidor; el cliente la reenvía igual en /confirmar y en cada reintento */
  idempotencyKey: z.string(),
});
export type PrepararPagoRes = z.infer<typeof PrepararPagoRes>;

export const ConfirmarPagoReq = z.object({
  tipo: TipoPago,
  referenciaId: z.number(),
  idempotencyKey: z.string(),
  autenticacion: z.enum(["ROSTRO", "HUELLA", "CLAVE"]),
  conAyuda: z.boolean().default(false),
  /** Solo demo: fuerza un fallo para mostrar "No se cobró nada" */
  simularFallo: z.boolean().optional(),
});
export type ConfirmarPagoReq = z.infer<typeof ConfirmarPagoReq>;

export const ConfirmarPagoRes = z.object({
  estado: z.enum(["EXITOSO", "FALLIDO"]),
  operacion: z.string().nullable(),
  monto: z.number(),
  descripcion: z.string(),
  fecha: z.string(),
  puntosGanados: z.number(),
  mensaje: z.string(), // "Te ahorraste una visita a la agencia" | "No se realizó el pago. No se cobró nada"
  /** true si la key ya existía y se devolvió el resultado anterior sin cobrar de nuevo */
  repetido: z.boolean(),
  /** true si vino por la ruta C y se puede ofrecer "¿Lo guardo?" */
  ofrecerGuardar: z.boolean(),
});
export type ConfirmarPagoRes = z.infer<typeof ConfirmarPagoRes>;

// ── Transferencias a contacto (por número de celular) ──
/** Destino interoperable por celular. */
export const Billetera = z.enum(["YAPE", "PLIN", "BIM", "DALE", "SIP"]);
export type Billetera = z.infer<typeof Billetera>;
/** Máximo por envío a celular (S/). */
export const LIMITE_TRANSFERENCIA = 500;

const Celular = z.string().regex(/^9\d{8}$/, "El número debe tener 9 dígitos y empezar con 9");
const MontoTransferencia = z
  .number()
  .positive("Escribe un monto mayor a cero")
  .max(LIMITE_TRANSFERENCIA, `El máximo por envío es S/ ${LIMITE_TRANSFERENCIA}`)
  .refine((n) => Math.round(n * 100) === n * 100, "Máximo 2 decimales");

export const PrepararTransferenciaReq = z.object({
  telefono: Celular,
  nombre: z.string().trim().min(1).max(60), // como lo tiene guardado el cliente
  billetera: Billetera,
  monto: MontoTransferencia,
});
export type PrepararTransferenciaReq = z.infer<typeof PrepararTransferenciaReq>;
/** Resumen para revisar. No mueve dinero. */
export const PrepararTransferenciaRes = z.object({
  nombre: z.string(),
  telefonoOculto: z.string(), // "987 *** 321"
  /** Nombre registrado en la billetera de destino, enmascarado: "SER*** CAS***" */
  titularOculto: z.string(),
  billetera: Billetera,
  monto: z.number(),
  comision: z.number(),
  cuenta: Cuenta,
  saldoSuficiente: z.boolean(),
  idempotencyKey: z.string(),
});
export type PrepararTransferenciaRes = z.infer<typeof PrepararTransferenciaRes>;

export const ConfirmarTransferenciaReq = PrepararTransferenciaReq.extend({
  idempotencyKey: z.string(),
  autenticacion: z.enum(["ROSTRO", "HUELLA", "CLAVE"]),
});
export type ConfirmarTransferenciaReq = z.infer<typeof ConfirmarTransferenciaReq>;
export const ConfirmarTransferenciaRes = z.object({
  estado: z.literal("EXITOSO"),
  operacion: z.string(),
  monto: z.number(),
  billetera: Billetera,
  nombre: z.string(),
  titularOculto: z.string(),
  telefonoOculto: z.string(),
  fecha: z.string(),
  /** true si la key ya existía: se devolvió el envío anterior sin cobrar de nuevo */
  repetido: z.boolean(),
});
export type ConfirmarTransferenciaRes = z.infer<typeof ConfirmarTransferenciaRes>;

/** Agenda de prueba (contactos ficticios) para celulares sin acceso a contactos. */
export const ContactoDemo = z.object({ nombre: z.string(), telefono: z.string() });
export const ContactosDemoRes = z.array(ContactoDemo);
export type ContactoDemo = z.infer<typeof ContactoDemo>;

// ── Asistente ────────────────────────────────────────
export const AsistenteReq = z.object({ mensaje: z.string().min(1).max(500) });
export const AccionUI = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("NINGUNA") }),
  /** Enviar a un contacto. Pía solo entiende el pedido; el cliente elige el contacto en su celular, pone el monto y confirma. */
  z.object({
    tipo: z.literal("TRANSFERIR"),
    nombre: z.string().nullable(), // "sergio" (para buscar en los contactos del celular)
    monto: z.number().nullable(),
    billetera: Billetera.nullable(),
  }),
  z.object({ tipo: z.literal("NAVEGAR"), ruta: z.string() }), // p. ej. "/pagar/confirmar?tipo=CUOTA&ref=12"
  z.object({ tipo: z.literal("OPCIONES"), opciones: z.array(z.object({ texto: z.string(), ruta: z.string() })) }),
]);
export type AccionUI = z.infer<typeof AccionUI>;
export const AsistenteRes = z.object({ respuesta: z.string(), accion: AccionUI, fuente: z.enum(["LLM", "PALABRAS_CLAVE"]) });
export type AsistenteRes = z.infer<typeof AsistenteRes>;

// ── Retención y demo ─────────────────────────────────
export const ProgresoRes = z.object({
  puntosTotal: z.number(),
  pagosDigitalesMes: z.number(),
  visitasAhorradas: z.number(),
  cuotasRestantes: z.number(),
  totalCuotas: z.number(),
  sugerirVistaEstandar: z.boolean(),
  historial: z.array(z.object({ fecha: z.string(), descripcion: z.string(), puntos: z.number() })),
});
export type ProgresoRes = z.infer<typeof ProgresoRes>;

export const AdelantarRes = z.object({ fechaSimulada: z.string(), notificaciones: z.array(z.string()) });
export type AdelantarRes = z.infer<typeof AdelantarRes>;

// ── Telemetría y panel ───────────────────────────────
export const EventoIn = z.object({
  sesionId: z.string().max(40),
  pantalla: z.string().max(40),
  accion: z.enum(["ver", "tocar", "completar", "abandonar", "error", "ayuda"]),
  flujo: z.enum(["CUOTA", "FRECUENTE", "RECIBO", "LOGIN", "ASISTENTE", "TRANSFERENCIA"]).optional(),
  msDesdeInicio: z.number().int().nonnegative().optional(),
  ayudaUsada: z.boolean().optional(),
});
export type EventoIn = z.infer<typeof EventoIn>;
export const EventosReq = z.object({ eventos: z.array(EventoIn).max(50) });

export const KpisRes = z.object({
  tasaExitoSinAyuda: z.number(), // 0..1
  tiempoMedioSeg: z.object({ CUOTA: z.number().nullable(), FRECUENTE: z.number().nullable(), RECIBO: z.number().nullable() }),
  tiempoReferenciaActualSeg: z.number(), // flujo actual de la app (del video de Caja Piura)
  embudo: z.array(z.object({ pantalla: z.string(), vistas: z.number(), abandonos: z.number() })),
  distribucionVistas: z.object({ ASISTIDA: z.number(), ESTANDAR: z.number() }), // sobre los 500 perfiles
  pagosTotales: z.number(),
});
export type KpisRes = z.infer<typeof KpisRes>;
