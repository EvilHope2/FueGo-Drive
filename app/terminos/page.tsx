import Link from "next/link";

const updatedAt = "6 de marzo de 2026";

const sections = [
  { id: "definiciones", title: "1. Definiciones" },
  { id: "naturaleza", title: "2. Naturaleza del servicio" },
  { id: "registro", title: "3. Registro y cuentas" },
  { id: "viajes", title: "4. Solicitudes y estados del viaje" },
  { id: "precios", title: "5. Precios estimados y metodo de pago" },
  { id: "comisiones", title: "6. Comisiones de la plataforma" },
  { id: "promociones", title: "7. Promociones y descuentos" },
  { id: "obligaciones", title: "8. Obligaciones del conductor" },
  { id: "suspension", title: "9. Suspension por deuda e incumplimiento" },
  { id: "conducta", title: "10. Conducta prohibida" },
  { id: "responsabilidad", title: "11. Limitacion de responsabilidad" },
  { id: "privacidad", title: "12. Privacidad y datos" },
  { id: "modificaciones", title: "13. Modificaciones de terminos" },
  { id: "contacto", title: "14. Contacto y soporte" },
];

export default function TerminosPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">
        Volver al inicio
      </Link>

      <header className="mt-4 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Terminos y Condiciones de FueGo</h1>
        <p className="text-sm text-slate-500">Ultima actualizacion: {updatedAt}</p>
        <p className="text-sm leading-6 text-slate-600">
          Estos Terminos y Condiciones regulan el acceso y uso de FueGo por parte de clientes, conductores y afiliados.
          Al registrarte o usar la plataforma, aceptas estas condiciones.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Indice</p>
        <ul className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="hover:text-slate-900 hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <article className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
        <section id="definiciones" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">1. Definiciones</h2>
          <p>
            Plataforma: sitio web y servicios digitales de FueGo. Cliente: usuario que solicita viajes. Conductor:
            usuario que acepta y realiza viajes. Afiliado: usuario que refiere conductores y percibe comisiones segun
            reglas vigentes.
          </p>
        </section>

        <section id="naturaleza" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">2. Naturaleza del servicio</h2>
          <p>
            FueGo funciona como plataforma de intermediacion tecnologica entre clientes y conductores. FueGo no presta
            directamente el traslado. El servicio de transporte es prestado por conductores independientes, quienes
            asumen la responsabilidad operativa del viaje.
          </p>
        </section>

        <section id="registro" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">3. Registro y cuentas</h2>
          <p>
            Para usar FueGo es necesario registrarse con datos reales y mantenerlos actualizados. Cada cuenta es
            personal e intransferible. El usuario es responsable de la seguridad de sus credenciales y de toda
            actividad realizada con su cuenta.
          </p>
        </section>

        <section id="viajes" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">4. Solicitudes y estados del viaje</h2>
          <p>
            Los viajes se gestionan mediante estados operativos, incluyendo Solicitado, Aceptado, En camino, Llegando,
            Afuera, Finalizado y Cancelado. FueGo puede mejorar el flujo operativo para optimizar seguridad,
            trazabilidad y experiencia de uso.
          </p>
        </section>

        <section id="precios" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">5. Precios estimados y metodo de pago</h2>
          <p>
            El precio informado en la app es estimado, calculado segun reglas comerciales vigentes al momento de la
            solicitud. Los metodos de pago habilitados pueden incluir efectivo, transferencia u otros que la plataforma
            incorpore.
          </p>
        </section>

        <section id="comisiones" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">6. Comisiones de la plataforma</h2>
          <p>
            FueGo puede aplicar comisiones sobre viajes, incluyendo esquemas de reparto con afiliados. Los porcentajes,
            condiciones y criterios operativos pueden variar segun politicas comerciales vigentes.
          </p>
        </section>

        <section id="promociones" className="space-y-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <h2 className="text-xl font-semibold text-slate-900">7. Promociones y descuentos</h2>
          <p>
            FueGo puede lanzar promociones y descuentos comerciales (por ejemplo, 50% off) para clientes en cualquier
            momento.
          </p>
          <p className="font-semibold text-slate-900">
            El conductor acepta expresamente que debe absorber el descuento aplicado por la Plataforma.
          </p>
          <p>
            Si el cliente paga un valor reducido por promocion, la diferencia entre el precio sin promocion y el precio
            promocionado sera asumida por el conductor.
          </p>
          <p>
            El conductor no podra reclamar a FueGo por ese descuento, salvo que una campana lo indique expresamente por
            escrito.
          </p>
          <p>
            Esta regla aplica a viajes cobrados al cliente por efectivo, transferencia u otros metodos que la
            Plataforma habilite.
          </p>
        </section>

        <section id="obligaciones" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">8. Obligaciones del conductor</h2>
          <p>
            El conductor debe prestar el servicio con diligencia, respetar la normativa aplicable, mantener informacion
            personal y vehicular actualizada y brindar trato adecuado a los clientes.
          </p>
        </section>

        <section id="suspension" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">9. Suspension por deuda e incumplimiento</h2>
          <p>
            FueGo podra limitar o suspender funcionalidades de cuentas que registren deuda, incumplimientos operativos o
            infracciones a estos terminos, incluyendo la imposibilidad de aceptar nuevos viajes.
          </p>
        </section>

        <section id="conducta" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">10. Conducta prohibida</h2>
          <p>
            Se prohibe utilizar la plataforma para fraude, suplantacion de identidad, manipulacion de precios, uso de
            datos falsos, acoso, conductas discriminatorias o cualquier actividad ilicita.
          </p>
        </section>

        <section id="responsabilidad" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">11. Limitacion de responsabilidad</h2>
          <p>
            FueGo no garantiza disponibilidad ininterrumpida del servicio y no responde por hechos atribuibles
            exclusivamente a conductores o terceros. La responsabilidad de FueGo se limita al marco legal aplicable.
          </p>
        </section>

        <section id="privacidad" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">12. Privacidad y datos</h2>
          <p>
            FueGo trata datos personales para operar la plataforma, mejorar seguridad y cumplir obligaciones legales.
            Para mas informacion, consulta la Politica de Privacidad.
          </p>
        </section>

        <section id="modificaciones" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">13. Modificaciones de terminos</h2>
          <p>
            FueGo puede actualizar estos terminos en cualquier momento. Las modificaciones rigen desde su publicacion
            en el sitio.
          </p>
        </section>

        <section id="contacto" className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">14. Contacto y soporte</h2>
          <p>
            Alias de pago: <span className="font-semibold">fuegodriver</span>
          </p>
          <p>
            Titular: <span className="font-semibold">Nahuel Ramos</span>
          </p>
          <p>Para soporte operativo o consultas sobre cuenta, utiliza los canales oficiales habilitados por FueGo.</p>
        </section>
      </article>

      <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Este documento es informativo y puede requerir revision legal segun jurisdiccion.
      </p>
    </main>
  );
}
