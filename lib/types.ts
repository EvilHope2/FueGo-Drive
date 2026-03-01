import type { RideStatus, ZoneName } from "@/lib/constants";
import type { DriverWalletStatus } from "@/lib/wallet";

export type Role = "customer" | "driver" | "admin" | "affiliate";
export type AffiliatePayoutStatus = "pending" | "paid";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  affiliate_code?: string | null;
  affiliate_referral_link?: string | null;
  referred_by_affiliate_id?: string | null;
  referred_by_affiliate_code?: string | null;
  vehicle_plate?: string | null;
  vehicle_brand?: string | null;
  vehicle_model_year?: string | null;
  driver_account_status?: DriverWalletStatus;
  wallet_limit_negative?: number;
  created_at: string;
  updated_at: string;
};

export type RidePaymentMethod = "cash" | "transfer";

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
  affiliate_id?: string | null;
  affiliate_commission_percent?: number | null;
  affiliate_commission_amount?: number | null;
  admin_commission_percent?: number | null;
  admin_commission_amount?: number | null;
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
  driver_profile?: Pick<Profile, "full_name" | "phone" | "vehicle_plate" | "vehicle_brand" | "vehicle_model_year"> | null;
  affiliate_profile?: Pick<Profile, "full_name" | "affiliate_code"> | null;
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

export type AffiliateEarning = {
  id: string;
  affiliate_id: string;
  driver_id: string;
  ride_id: string;
  ride_amount: number;
  affiliate_commission_percent: number;
  affiliate_commission_amount: number;
  admin_commission_percent: number;
  admin_commission_amount: number;
  payout_status: AffiliatePayoutStatus;
  paid_at: string | null;
  created_at: string;
  driver_profile?: Pick<Profile, "full_name"> | null;
  ride?: Pick<Ride, "id" | "status" | "created_at"> | null;
};
