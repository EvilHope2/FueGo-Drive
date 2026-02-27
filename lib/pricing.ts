import type { ZoneName } from "@/lib/constants";
import { ZONE_NEIGHBORHOODS } from "@/lib/constants";
import type { NeighborhoodSurcharge, ZoneBasePrice } from "@/lib/types";

export function toPriceNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export function getZoneFromNeighborhood(neighborhood: string): ZoneName | null {
  for (const [zone, neighborhoods] of Object.entries(ZONE_NEIGHBORHOODS) as [ZoneName, readonly string[]][]) {
    if (neighborhoods.includes(neighborhood)) {
      return zone;
    }
  }

  return null;
}

export function calculateEstimatedPrice(params: {
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

  const base = params.basePrices.find((item) => item.from_zone === fromZone && item.to_zone === toZone);
  const fromSurcharge = params.surcharges.find((item) => item.neighborhood === params.fromNeighborhood);
  const toSurcharge = params.surcharges.find((item) => item.neighborhood === params.toNeighborhood);

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
