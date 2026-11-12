import type { Metadata } from "next";
import { getDictionary } from "@/lib/dictionaries";
import { LabBench } from "@/components/lab/LabBench";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.lab.title };
}

export default async function LabPage() {
  const dict = await getDictionary();
  return (
    <main id="main" className="relative z-10 min-h-svh" style={{ padding: "calc(var(--sheet-pad) + 56px) var(--sheet-pad) 140px" }}>
      <div className="mx-auto max-w-6xl">
        <p className="label text-accent">DWG · LAB</p>
        <h1 className="font-display mt-2 text-[clamp(3rem,9vw,7rem)] font-black leading-[0.85] tracking-[-0.04em] font-condensed">
          {dict.lab.title}
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">{dict.lab.lead}</p>
        <LabBench labels={dict.lab} />
      </div>
    </main>
  );
}
