// Envíos a contacto por celular. Mismo principio que los pagos: preparar NO mueve dinero; solo /confirmar lo hace,
// y la app lo llama únicamente después de que el cliente toca "Confirmar envío" y pone su huella, rostro o clave.
// Pía (asistente) no tiene ninguna herramienta que llegue aquí.
import type { ConfirmarTransferenciaReq, ConfirmarTransferenciaRes, PrepararTransferenciaReq, PrepararTransferenciaRes } from "@cp/shared";
import { Prisma, type Transferencia } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { HttpError } from "../lib/errores.js";
import { aNumero, nuevaOperacion, ocultarNombre } from "../lib/formato.js";
import { prisma } from "../lib/prisma.js";
import { fechaOperacion } from "../pagos/logica.js";
import { aCuentaRes, cuentaPrincipal, obtenerCliente } from "../pagos/servicio.js";
import { consultarNumero, NOMBRE_BILLETERA, ocultarTelefono } from "./directorio.js";

const saldoInsuficiente = () => new HttpError(422, "SALDO_INSUFICIENTE", "Tu cuenta no tiene saldo suficiente. No se envió nada.");
const esDuplicado = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Valida que el número esté afiliado a la billetera elegida. */
function destino(b: PrepararTransferenciaReq) {
  const a = consultarNumero(b.telefono, b.nombre);
  if (!a.billeteras.includes(b.billetera)) {
    const otras = a.billeteras.map((x) => NOMBRE_BILLETERA[x]).join(" o ");
    throw new HttpError(422, "NO_AFILIADO", `Este número no tiene ${NOMBRE_BILLETERA[b.billetera]}. Prueba con ${otras}.`, {
      disponibles: a.billeteras,
    });
  }
  return a;
}

export async function prepararTransferencia(clienteId: number, b: PrepararTransferenciaReq): Promise<PrepararTransferenciaRes> {
  const a = destino(b);
  const cuenta = await cuentaPrincipal(clienteId);
  return {
    nombre: b.nombre,
    telefonoOculto: ocultarTelefono(b.telefono),
    titularOculto: ocultarNombre(a.titular),
    billetera: b.billetera,
    monto: b.monto,
    comision: 0,
    cuenta: aCuentaRes(cuenta),
    saldoSuficiente: aNumero(cuenta.saldo) >= b.monto,
    idempotencyKey: randomUUID(),
  };
}

const aRes = (t: Transferencia, repetido: boolean): ConfirmarTransferenciaRes => ({
  estado: "EXITOSO",
  operacion: t.operacion,
  monto: aNumero(t.monto),
  billetera: t.billetera as ConfirmarTransferenciaRes["billetera"],
  nombre: t.nombreContacto,
  titularOculto: ocultarNombre(t.titular),
  telefonoOculto: ocultarTelefono(t.telefono),
  fecha: t.creadoEn.toISOString(),
  repetido,
});

/** La misma key con otros datos (otro número o monto) no se acepta: evita reusar una autorización para otro envío. */
function mismaOperacion(t: Transferencia, clienteId: number, b: ConfirmarTransferenciaReq) {
  return t.clienteId === clienteId && t.telefono === b.telefono && t.billetera === b.billetera && aNumero(t.monto) === b.monto;
}

async function devolverExistente(key: string, clienteId: number, b: ConfirmarTransferenciaReq) {
  const t = await prisma.transferencia.findUnique({ where: { idempotencyKey: key } });
  if (!t) throw new HttpError(409, "EN_PROCESO", "Tu envío se está procesando. Inténtalo en unos segundos.");
  if (!mismaOperacion(t, clienteId, b)) throw new HttpError(409, "KEY_REUTILIZADA", "Esta operación no corresponde a este envío. Vuelve a empezar.");
  return aRes(t, true);
}

export async function confirmarTransferencia(clienteId: number, b: ConfirmarTransferenciaReq): Promise<ConfirmarTransferenciaRes> {
  const key = b.idempotencyKey.trim();
  if (key.length < 8 || key.length > 64) throw new HttpError(400, "VALIDACION", "Clave de operación inválida");

  // Reintento (se cortó la conexión, doble toque): se devuelve el envío anterior sin cobrar otra vez.
  const previo = await prisma.transferencia.findUnique({ where: { idempotencyKey: key } });
  if (previo) return devolverExistente(key, clienteId, b);

  const a = destino(b);
  const cliente = await obtenerCliente(clienteId);
  const cuenta = await cuentaPrincipal(clienteId);
  if (aNumero(cuenta.saldo) < b.monto) throw saldoInsuficiente();

  try {
    const t = await prisma.$transaction(
      async (tx) => {
        // 1) Reservar la key: otra petición igual a la vez choca con el índice único (P2002).
        const t = await tx.transferencia.create({
          data: {
            idempotencyKey: key,
            clienteId,
            cuentaId: cuenta.id,
            telefono: b.telefono,
            nombreContacto: b.nombre,
            titular: a.titular,
            billetera: b.billetera,
            monto: b.monto,
            operacion: nuevaOperacion(),
            creadoEn: fechaOperacion(cliente.fechaSimulada),
          },
        });
        // 2) Descontar verificando el saldo otra vez (condición atómica).
        const d = await tx.cuenta.updateMany({ where: { id: cuenta.id, saldo: { gte: b.monto } }, data: { saldo: { decrement: b.monto } } });
        if (d.count === 0) throw saldoInsuficiente();
        await tx.cliente.update({ where: { id: clienteId }, data: { opsDigitalesMes: { increment: 1 } } });
        return t;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
    return aRes(t, false);
  } catch (e) {
    if (esDuplicado(e)) return devolverExistente(key, clienteId, b);
    throw e;
  }
}
