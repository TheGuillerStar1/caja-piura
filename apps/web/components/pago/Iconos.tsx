// Dueño: Agente B. Íconos de pagos y autenticación. Librería Lucide (antes, SVG dibujados a mano).
import { CalendarCheck, CircleCheck, CircleHelp, CircleX, Fingerprint, ReceiptText, ScanFace, Settings, Star, TrendingUp, Wallet } from "lucide-react";

type P = { className?: string };

export const IconoCuota = ({ className = "h-10 w-10" }: P) => <CalendarCheck className={className} strokeWidth={1.8} aria-hidden />;
export const IconoFrecuente = ({ className = "h-10 w-10" }: P) => <Star className={className} strokeWidth={1.8} aria-hidden />;
export const IconoRecibo = ({ className = "h-10 w-10" }: P) => <ReceiptText className={className} strokeWidth={1.8} aria-hidden />;
export const IconoAyuda = ({ className = "h-10 w-10" }: P) => <CircleHelp className={className} strokeWidth={1.8} aria-hidden />;
export const IconoSaldo = ({ className = "h-10 w-10" }: P) => <Wallet className={className} strokeWidth={1.8} aria-hidden />;
export const IconoProgreso = ({ className = "h-10 w-10" }: P) => <TrendingUp className={className} strokeWidth={1.8} aria-hidden />;
export const IconoAjustes = ({ className = "h-10 w-10" }: P) => <Settings className={className} strokeWidth={1.8} aria-hidden />;
export const IconoHuella = ({ className = "h-14 w-14" }: P) => <Fingerprint className={className} strokeWidth={1.8} aria-hidden />;
export const IconoRostro = ({ className = "h-14 w-14" }: P) => <ScanFace className={className} strokeWidth={1.8} aria-hidden />;
export const IconoCheck = ({ className = "h-20 w-20" }: P) => <CircleCheck className={className} strokeWidth={1.8} aria-hidden />;
export const IconoX = ({ className = "h-20 w-20" }: P) => <CircleX className={className} strokeWidth={1.8} aria-hidden />;
