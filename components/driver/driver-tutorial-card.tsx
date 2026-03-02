"use client";

import { useState } from "react";

const STORAGE_KEY = "driver_tutorial_hidden";

export function DriverTutorialCard() {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  const hideGuide = () => {
    setHidden(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  };

  const showGuide = () => {
    setHidden(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (hidden) {
    return (
      <button
        type="button"
        onClick={showGuide}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
      >
        Mostrar guía rápida
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Cómo usar tu panel de conductor</h2>
        <button type="button" onClick={hideGuide} className="text-xs font-medium text-slate-500 hover:text-slate-700">
          Ocultar guía
        </button>
      </div>
      <ol className="mt-3 space-y-2 text-sm text-slate-700">
        <li>1. Revisá los viajes disponibles: las solicitudes llegan en tiempo real.</li>
        <li>2. Aceptá un viaje: presioná “Aceptar” en la solicitud.</li>
        <li>3. Seguí el estado del viaje: En camino, Llegando, Afuera y Finalizado.</li>
        <li>4. Usá Google Maps desde el detalle para ir al origen o destino.</li>
        <li>5. Consultá tu wallet para ver comisiones, pagos y saldo pendiente.</li>
        <li>6. Prestá atención a las alertas: cuando entra un viaje nuevo se actualiza y suena.</li>
      </ol>
      <p className="mt-3 text-xs text-slate-500">
        Si tenés una deuda pendiente con FueGo, puede limitarse la aceptación de nuevos viajes hasta regularizar el pago.
      </p>
    </section>
  );
}
