export const RIDE_STATUSES = [
  "Solicitado",
  "Aceptado",
  "En camino",
  "Llegando",
  "Afuera",
  "Finalizado",
  "Cancelado",
] as const;

export type RideStatus = (typeof RIDE_STATUSES)[number];

export const STATUS_ORDER: RideStatus[] = [
  "Solicitado",
  "Aceptado",
  "En camino",
  "Llegando",
  "Afuera",
  "Finalizado",
];

export const ROLE_PATHS = {
  customer: "/app",
  driver: "/driver",
  admin: "/admin",
} as const;

export const WHATSAPP_MESSAGE = "Tu FueGo llego";
