import { formatCurrencyARS } from "@/lib/utils";

export type DriverWalletStatus = "active" | "suspended_debt";

export function calculateDriverWalletBalance(amounts: Array<number | null | undefined>): number {
  return amounts.reduce<number>((sum, amount) => sum + Number(amount ?? 0), 0);
}

export function shouldSuspendDriver(balance: number, limit: number) {
  return balance <= limit;
}

export function getDriverWalletStatus(balance: number, negativeLimit: number): DriverWalletStatus {
  return shouldSuspendDriver(balance, negativeLimit) ? "suspended_debt" : "active";
}

export function buildDebtAlertMessage(balance: number) {
  const debt = Math.abs(Math.min(balance, 0));
  return `Deuda ${formatCurrencyARS(debt)}. Pagar a este alias: fuegodriver (titular Nahuel Ramos)`;
}

export function getWalletBalanceCopy(balance: number) {
  if (balance < 0) {
    const debt = Math.abs(balance);
    return {
      title: `Deuda pendiente: ${formatCurrencyARS(debt)}`,
      subtitle: "Este es el total pendiente que debés abonar a FueGo.",
      cardTitle: "Deuda pendiente",
      cardValue: debt,
    };
  }

  if (balance === 0) {
    return {
      title: "Estás al día",
      subtitle: "No tenés deuda pendiente con FueGo.",
      cardTitle: "Estás al día",
      cardValue: 0,
    };
  }

  return {
    title: `Saldo a favor: ${formatCurrencyARS(balance)}`,
    subtitle: "Tenés saldo disponible a favor en FueGo.",
    cardTitle: "Saldo a favor",
    cardValue: balance,
  };
}
