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

export const STATUS_ORDER: RideStatus[] = ["Solicitado", "Aceptado", "En camino", "Llegando", "Afuera", "Finalizado"];

export const NEXT_DRIVER_STATUS: Partial<Record<RideStatus, RideStatus>> = {
  Aceptado: "En camino",
  "En camino": "Llegando",
  Llegando: "Afuera",
  Afuera: "Finalizado",
};

export const ROLE_PATHS = {
  customer: "/app",
  driver: "/driver",
  admin: "/admin",
  affiliate: "/affiliate",
} as const;

export const WHATSAPP_MESSAGE = "Tu FueGo llego";

export const ZONE_NEIGHBORHOODS = {
  "Centro y aledaños": ["Centro", "Casco Viejo", "AGP", "Perón", "Intevu"],
  Chacras: ["Chacra II", "Chacra IV", "Chacra XI", "Chacra XIII (Malvinas Argentinas)"],
  "Margen Sur": ["Margen Sur", "Chacras de la Margen Sur"],
  "Norte y otras áreas": [
    "Aeropuerto",
    "Parque Industrial",
    "Buena Vista",
    "Mutual",
    "Profesional",
    "Ex Campamento de YPF",
    "CGT",
    "Las Barrancas",
    "Altos de la Estancia",
    "Los Cisnes",
    "Vapor Amadeo",
    "San Martín",
    "San Martín Norte",
  ],
} as const;

export type ZoneName = keyof typeof ZONE_NEIGHBORHOODS;

export const ALL_NEIGHBORHOODS = Object.values(ZONE_NEIGHBORHOODS).flat();

