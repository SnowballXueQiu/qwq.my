import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skills } from "@/content/skills";
import { timeline } from "@/content/timeline";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { SheetTriggers } from "@/components/scroll/SheetTriggers";
import { HeroIntro } from "@/components/sections/HeroIntro";
import { Panel } from "@/components/sections/Panel";
import { ProjectReadout } from "@/components/sections/ProjectReadout";
import { Reveal } from "@/components/sections/Reveal";
import { SheetSection } from "@/components/sections/SheetSection";

export default async function Home() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const s = dict.sheets;

  return (
    <main id="main">
      <SheetTriggers />

      <SheetSection id="hero" title={s.hero} length={2.4} sticky>
        <HeroIntro>
          <p className="label mb-4 text-accent">{profile.roles[locale]}</p>
          <h1 className="font-display text-[clamp(4rem,16vw,16rem)] font-black leading-[0.82] tracking-[-0.04em] font-condensed">
            {profile.name[locale]}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">{dict.hero.tagline}</p>
          <p className="label mt-10 text-ink-soft">↓ {dict.hero.scroll}</p>
        </HeroIntro>
      </SheetSection>

      <SheetSection id="about" title={s.about} length={2} sticky>
        <Reveal className="max-w-[440px] [perspective:1100px]">
          <Panel className="origin-left [transform:rotateY(14deg)_rotateX(4deg)] transition-transform duration-500 hover:[transform:none]">
            <pre className="overflow-x-auto font-mono text-[13px] leading-6">
              <span data-line className="block text-ink-soft">{"// sheet 02 — init(me);"}</span>
              <span data-line className="block">
                <span className="text-accent">const</span> me = {"{"}
              </span>
              {(
                [
                  ["name", profile.name[locale]],
                  ["school", profile.school[locale]],
                  ["major", profile.major[locale]],
                  ["grade", profile.grade[locale]],
                  ["based", profile.location[locale]],
                ] as const
              ).map(([key, value]) => (
                <span data-line key={key} className="block pl-4">
                  <span className="text-ink-soft">{key}</span>: <span>&quot;{value}&quot;</span>
                  <span className="text-accent">,</span>
                </span>
              ))}
              <span data-line className="block">
                {"}"}
                <span className="text-accent">;</span>
              </span>
            </pre>
            <div className="mt-4 space-y-2 border-t border-rule pt-3 text-sm leading-relaxed text-ink-soft">
              {profile.bio.map((p, i) => (
                <p data-line key={i}>
                  {p[locale]}
                </p>
              ))}
            </div>
          </Panel>
        </Reveal>
      </SheetSection>

      <SheetSection id="skills" title={s.skills} length={2.4} sticky>
        <Reveal className="max-w-[380px]">
          <Panel>
            <h2 data-line className="font-display mb-3 text-2xl font-extrabold tracking-tight">
              {dict.skills.heading}
            </h2>
            <table className="w-full border-collapse font-mono text-xs">
              <caption className="label mb-2 text-left text-ink-soft">{dict.skills.bom}</caption>
              <thead>
                <tr className="label border-y border-ink text-left text-ink-soft">
                  <th className="py-1 pr-2 font-normal">{dict.skills.part}</th>
                  <th className="py-1 pr-2 font-normal">{dict.skills.item}</th>
                  <th className="py-1 pr-2 font-normal">{dict.skills.level}</th>
                  <th className="py-1 font-normal">{dict.skills.since}</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill, i) => (
                  <tr data-line key={skill.name} className="border-b border-rule">
                    <td className="py-1 pr-2 text-accent">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-1 pr-2">{skill.name}</td>
                    <td className="py-1 pr-2 tracking-[0.15em]">
                      {"▮".repeat(skill.level)}
                      <span className="text-rule">{"▯".repeat(5 - skill.level)}</span>
                    </td>
                    <td className="py-1 tabular-nums">{skill.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Reveal>
      </SheetSection>

      <SheetSection id="projects" title={s.projects} length={Math.max(3, projects.length * 0.85)} sticky>
        <ProjectReadout projects={projects} locale={locale} labels={dict.projects} />
      </SheetSection>

      <SheetSection id="timeline" title={s.timeline}>
        <ol className="max-w-3xl border-l border-ink">
          {timeline.map((event) => (
            <li key={event.date + event.title.en} className="relative py-4 pl-6">
              <span className="absolute -left-[5px] top-6 size-[9px] rounded-full border border-ink bg-paper" />
              <p className="label text-accent">{event.date}</p>
              <h3 className="mt-1 text-xl font-bold">{event.title[locale]}</h3>
              <p className="text-ink-soft">{event.detail[locale]}</p>
            </li>
          ))}
        </ol>
      </SheetSection>

      <SheetSection id="writing" title={s.writing}>
        <h2 className="font-display text-5xl font-extrabold tracking-tight">{dict.writing.heading}</h2>
      </SheetSection>

      <SheetSection id="contact" title={s.contact} className="flex flex-col justify-center">
        <h2 className="font-display text-[clamp(3rem,12vw,11rem)] font-black leading-[0.85] tracking-[-0.04em] font-condensed">
          {dict.contact.heading}
        </h2>
        <p className="mt-6 max-w-md text-lg text-ink-soft">{dict.contact.lead}</p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {profile.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="label inline-block border border-ink px-3 py-2 transition-colors hover:bg-ink hover:text-paper"
                {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {link.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </SheetSection>
    </main>
  );
}
