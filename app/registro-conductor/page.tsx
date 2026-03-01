import { RegisterForm } from "@/components/forms/register-form";
import { normalizeAffiliateCode } from "@/lib/affiliate";

type Props = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function RegisterDriverPage({ searchParams }: Props) {
  const { ref } = await searchParams;
  const initialAffiliateCode = normalizeAffiliateCode(ref ?? "");

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-10 sm:py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <RegisterForm role="driver" initialAffiliateCode={initialAffiliateCode} />
      </section>
    </main>
  );
}
