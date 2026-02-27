import type { RideStatus, ZoneName } from "@/lib/constants";
import type { DriverWalletStatus } from "@/lib/wallet";

export type Role = "customer" | "driver" | "admin";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  driver_account_status?: DriverWalletStatus;
  wallet_limit_negative?: number;
  created_at: string;
  updated_at: string;
};

export type RidePaymentMethod = "cash" | "transfer" | "platform" | "unknown";

export type Ride = {
  id: string;
  customer_id: string;
  driver_id: string | null;
  origin: string;
  destination: string;
  origin_address: string | null;
  destination_address: string | null;
  from_zone: ZoneName | null;
  from_neighborhood: string | null;
  to_zone: ZoneName | null;
  to_neighborhood: string | null;
  estimated_price: number | null;
  commission_percent: number | null;
  commission_amount: number | null;
  driver_earnings: number | null;
  payment_method: RidePaymentMethod;
  is_settled: boolean;
  settled_at: string | null;
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
  canceled_at: string | null;
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

export type AppSettings = {
  id: string;
  default_commission_percent: number;
  created_at: string;
  updated_at: string;
};

export type DriverWalletTransactionType = "commission_charge" | "payment" | "adjustment";
export type WalletPaymentMethod = "cash" | "transfer" | "platform" | "manual";

export type DriverWalletTransaction = {
  id: string;
  driver_id: string;
  ride_id: string | null;
  type: DriverWalletTransactionType;
  amount: number;
  description: string;
  payment_method: WalletPaymentMethod | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  ride?: Pick<Ride, "id" | "origin_address" | "destination_address" | "status"> | null;
};
