type Props = {
  fullName?: string | null;
  phone?: string | null;
  vehiclePlate?: string | null;
  vehicleBrand?: string | null;
  vehicleModelYear?: string | null;
  title?: string;
};

export function DriverVehicleCard({
  fullName,
  phone,
  vehiclePlate,
  vehicleBrand,
  vehicleModelYear,
  title = "Tu conductor",
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <p>Chofer: {fullName || "Conductor asignado"}</p>
        {phone ? <p>WhatsApp: {phone}</p> : null}
        <p>
          Vehículo: {vehicleBrand || "-"} {vehicleModelYear || "-"}
        </p>
        <p>Patente: {vehiclePlate || "-"}</p>
      </div>
    </section>
  );
}

