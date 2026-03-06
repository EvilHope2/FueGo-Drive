type Props = {
  totalDrivers: number;
  totalCustomers: number;
  totalCompletedRides: number;
};

export function HomeStats({ totalDrivers, totalCustomers, totalCompletedRides }: Props) {
  const stats = [
    { value: totalDrivers, label: "Conductores registrados" },
    { value: totalCustomers, label: "Usuarios registrados" },
    { value: totalCompletedRides, label: "Viajes realizados" },
  ];

  return (
    <section className="px-4 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-[1200px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm text-slate-600">Cada vez mas personas eligen y forman parte de FueGo.</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Nuestra comunidad</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {stats.map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-4xl font-bold tracking-tight text-[#1D4ED8]">+{item.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{item.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
