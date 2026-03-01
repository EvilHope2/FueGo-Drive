import type { ZoneName } from "@/lib/constants";
import { ZONE_NEIGHBORHOODS } from "@/lib/constants";
import type { NeighborhoodSurcharge, ZoneBasePrice } from "@/lib/types";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function toPriceNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export function getZoneFromNeighborhood(neighborhood: string): ZoneName | null {
  const target = normalize(neighborhood);

  for (const [zone, neighborhoods] of Object.entries(ZONE_NEIGHBORHOODS) as [ZoneName, readonly string[]][]) {
    if (neighborhoods.some((item) => normalize(item) === target)) {
      return zone;
    }
  }

  return null;
}

export function calculateEstimatedRidePrice(params: {
  fromNeighborhood: string;
  toNeighborhood: string;
  basePrices: ZoneBasePrice[];
  surcharges: NeighborhoodSurcharge[];
}) {
  const fromZone = getZoneFromNeighborhood(params.fromNeighborhood);
  const toZone = getZoneFromNeighborhood(params.toNeighborhood);

  if (!fromZone || !toZone) {
    return null;
  }

  const fromZoneKey = normalize(fromZone);
  const toZoneKey = normalize(toZone);

  const base = params.basePrices.find(
    (item) => normalize(item.from_zone) === fromZoneKey && normalize(item.to_zone) === toZoneKey,
  );

  const fromSurcharge = params.surcharges.find(
    (item) => normalize(item.neighborhood) === normalize(params.fromNeighborhood),
  );
  const toSurcharge = params.surcharges.find((item) => normalize(item.neighborhood) === normalize(params.toNeighborhood));

  if (!base) {
    return null;
  }

  const estimatedPrice =
    toPriceNumber(base.base_price) +
    toPriceNumber(fromSurcharge?.surcharge) +
    toPriceNumber(toSurcharge?.surcharge);

  return {
    fromZone,
    toZone,
    estimatedPrice,
  };
}

export function calculateRideEconomics(price: number, hasAffiliate: boolean) {
  const affiliateCommissionPercent = hasAffiliate ? 5 : 0;
  const adminCommissionPercent = hasAffiliate ? 10 : 15;
  const affiliateCommissionAmount = Math.round((price * affiliateCommissionPercent) / 100);
  const adminCommissionAmount = Math.round((price * adminCommissionPercent) / 100);
  const driverEarnings = Math.round(price - affiliateCommissionAmount - adminCommissionAmount);

  return {
    commissionPercent: adminCommissionPercent,
    commissionAmount: adminCommissionAmount,
    driverEarnings,
    affiliateCommissionPercent,
    affiliateCommissionAmount,
    adminCommissionPercent,
    adminCommissionAmount,
  };
}

