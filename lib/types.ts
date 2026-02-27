import type { RideStatus, ZoneName } from "@/lib/constants";

export type Role = "customer" | "driver" | "admin";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Ride = {
  id: string;
  customer_id: string;
  driver_id: string | null;
  origin: string;
  destination: string;
  from_zone: ZoneName | null;
  from_neighborhood: string | null;
  to_zone: ZoneName | null;
  to_neighborhood: string | null;
  estimated_price: number | null;
  note: string | null;
  customer_name: string;
  customer_phone: string;
  status: RideStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  en_route_at: string | null;
  arriving_at: string | null;
  outside_at: string | null;
  finished_at: string | null;
  customer_profile?: Pick<Profile, "full_name" | "phone"> | null;
  driver_profile?: Pick<Profile, "full_name" | "phone"> | null;
};

export type ZoneBasePrice = {
  id: string;
  from_zone: ZoneName;
  to_zone: ZoneName;
  base_price: number;
};

export type NeighborhoodSurcharge = {
  id: string;
  zone: ZoneName;
  neighborhood: string;
  surcharge: number;
};
