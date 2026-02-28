import Link from "next/link";

import { AppShell } from "@/components/common/app-shell";
import { DriverProfileForm } from "@/components/driver/driver-profile-form";
import { requireProfile } from "@/lib/auth-server";
import type { Profile } from "@/lib/types";

export default async function DriverProfilePage() {
  const { profile } = await requireProfile("driver");

  return (
    <AppShell title="Mi perfil" subtitle="Actualizá tus datos personales y del vehículo." roleLabel="Conductor">
      <div className="space-y-4">
        <Link href="/driver" className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-800">
          Volver al panel
        </Link>
        <DriverProfileForm profile={profile as Profile} />
      </div>
    </AppShell>
  );
}

