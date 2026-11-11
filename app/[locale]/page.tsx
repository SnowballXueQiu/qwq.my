import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skills } from "@/content/skills";
import { timeline } from "@/content/timeline";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { SheetTriggers } from "@/components/scroll/SheetTriggers";
import { HeroIntro } from "@/components/sections/HeroIntro";
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

      <SheetSection id="about" title={s.about}>
        <div className="grid max-w-5xl gap-10 md:grid-cols-[1fr_280px]">
          <div className="space-y-5 text-xl leading-relaxed">
            {profile.bio.map((p, i) => (
              <p key={i}>{p[locale]}</p>
            ))}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 self-start border-t border-ink pt-3 font-mono text-sm">
            <dt className="label text-ink-soft">{dict.about.school}</dt>
            <dd>{profile.school[locale]}</dd>
            <dt className="label text-ink-soft">{dict.about.major}</dt>
            <dd>{profile.major[locale]}</dd>
            <dt className="label text-ink-soft">{dict.about.grade}</dt>
            <dd>{profile.grade[locale]}</dd>
            <dt className="label text-ink-soft">{dict.about.based}</dt>
            <dd>{profile.location[locale]}</dd>
          </dl>
        </div>
      </SheetSection>

      <SheetSection id="skills" title={s.skills}>
        <h2 className="font-display mb-8 text-5xl font-extrabold tracking-tight">{dict.skills.heading}</h2>
        <table className="w-full max-w-2xl border-collapse font-mono text-sm">
          <caption className="label mb-2 text-left text-ink-soft">{dict.skills.bom}</caption>
          <thead>
            <tr className="label border-y border-ink text-left text-ink-soft">
              <th className="py-1.5 pr-3 font-normal">{dict.skills.part}</th>
              <th className="py-1.5 pr-3 font-normal">{dict.skills.item}</th>
              <th className="py-1.5 pr-3 font-normal">{dict.skills.level}</th>
              <th className="py-1.5 font-normal">{dict.skills.since}</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill, i) => (
              <tr key={skill.name} className="border-b border-rule">
                <td className="py-1.5 pr-3 text-accent">{String(i + 1).padStart(2, "0")}</td>
                <td className="py-1.5 pr-3">{skill.name}</td>
                <td className="py-1.5 pr-3 tracking-[0.2em]">
                  {"▮".repeat(skill.level)}
                  <span className="text-rule">{"▯".repeat(5 - skill.level)}</span>
                </td>
                <td className="py-1.5 tabular-nums">{skill.since}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SheetSection>

      <SheetSection id="projects" title={s.projects}>
        <ol className="grid max-w-5xl gap-px border border-ink bg-ink sm:grid-cols-2">
          {projects.map((project, i) => (
            <li key={project.slug} className="flex flex-col gap-3 bg-paper p-5">
              <div className="label flex justify-between text-ink-soft">
                <span className="text-accent">P-{String(i + 1).padStart(2, "0")}</span>
                <span>{project.year}</span>
              </div>
              <h3 className="font-display text-3xl font-extrabold tracking-tight">{project.title}</h3>
              <p className="text-ink-soft">{project.summary[locale]}</p>
              <p className="label mt-auto text-ink-soft">{project.tags.join(" · ")}</p>
            </li>
          ))}
        </ol>
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
