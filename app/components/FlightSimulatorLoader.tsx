"use client";

import dynamic from "next/dynamic";

const ClientOnlyFlightSimulator = dynamic(
  () =>
    import("./FlightSimulator").then((module) => module.FlightSimulator),
  {
    ssr: false,
    loading: () => (
      <main className="sim-shell">
        <div className="sim-loading" role="status" aria-live="polite">
          <span className="panel-kicker">Skybound Flight Simulator</span>
          <strong>Uçuş sistemi hazırlanıyor…</strong>
        </div>
      </main>
    ),
  },
);

export function FlightSimulatorLoader() {
  return <ClientOnlyFlightSimulator />;
}
