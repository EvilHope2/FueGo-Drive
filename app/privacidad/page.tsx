import Link from "next/link";

const updatedAt = "6 de marzo de 2026";

export default function PrivacidadPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">
        Volver al inicio
      </Link>

      <header className="mt-4 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Politica de Privacidad</h1>
        <p className="text-sm text-slate-500">Ultima actualizacion: {updatedAt}</p>
        <p className="text-sm leading-6 text-slate-600">
          Esta politica describe de forma resumida como FueGo recolecta, usa y protege datos personales de clientes,
          conductores y afiliados.
        </p>
      </header>

      <article className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">1. Datos que procesamos</h2>
          <p>
            Podemos procesar nombre, email, telefono, informacion de cuenta, datos del viaje, datos de vehiculo del
            conductor y registros tecnicos necesarios para operar la plataforma.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">2. Finalidad del tratamiento</h2>
          <p>
            Usamos los datos para gestionar cuentas, conectar clientes con conductores, operar viajes, mejorar seguridad,
            prevenir fraude, brindar soporte y cumplir obligaciones legales.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">3. Conservacion y seguridad</h2>
          <p>
            Conservamos la informacion por el tiempo necesario para fines operativos y legales. Aplicamos medidas
            razonables de seguridad tecnica y organizativa para proteger los datos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">4. Comparticion de datos</h2>
          <p>
            FueGo no comercializa datos personales. Solo comparte informacion cuando es necesario para operar el servicio,
            por requerimiento legal o con proveedores tecnologicos bajo obligaciones de confidencialidad.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">5. Contacto</h2>
          <p>
            Para consultas sobre privacidad o datos personales, utiliza los canales oficiales de soporte disponibles
            dentro de la plataforma.
          </p>
        </section>
      </article>

      <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Este documento es informativo y puede requerir revision legal segun jurisdiccion.
      </p>
    </main>
  );
}
