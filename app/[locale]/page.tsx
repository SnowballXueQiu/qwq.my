import Link from "next/link";
import { posts } from "@/content/posts";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skills } from "@/content/skills";
import { timeline } from "@/content/timeline";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { SheetTriggers } from "@/components/scroll/SheetTriggers";
import { HeroIntro } from "@/components/sections/HeroIntro";
import { Panel } from "@/components/sections/Panel";
import { ProjectReadout } from "@/components/sections/ProjectReadout";
import { DebugButton } from "@/components/game/DebugButton";
import { Reveal } from "@/components/sections/Reveal";
import { TimelineReadout } from "@/components/sections/TimelineReadout";
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
            <DebugButton label={dict.game.start} />
          </Panel>
        </Reveal>
      </SheetSection>

      <SheetSection id="projects" title={s.projects} length={Math.max(3, projects.length * 0.85)} sticky>
        <ProjectReadout projects={projects} locale={locale} labels={dict.projects} />
      </SheetSection>

      <SheetSection id="timeline" title={s.timeline} length={Math.max(3, timeline.length * 0.7)} sticky>
        <TimelineReadout events={timeline} locale={locale} />
      </SheetSection>

      <SheetSection id="writing" title={s.writing} length={1.6} sticky>
        <Reveal className="max-w-[460px]">
          <Panel>
            <h2 data-line className="font-display text-3xl font-extrabold tracking-tight">
              {dict.writing.heading}
            </h2>
            <ol className="mt-3 divide-y divide-rule border-y border-rule">
              {posts.map((post) => (
                <li data-line key={post.slug}>
                  <Link
                    href={`/${locale}/blog/${post.slug}`}
                    data-cursor="READ"
                    className="group flex items-baseline gap-3 py-2"
                  >
                    <span className="label shrink-0 text-ink-soft">{post.date}</span>
                    <span className="truncate font-medium group-hover:text-accent">{post.title[locale]}</span>
                    <span className="ml-auto text-accent opacity-0 transition-opacity group-hover:opacity-100">→</span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link href={`/${locale}/blog`} className="label mt-3 inline-block hover:text-accent">
              {dict.writing.all} →
            </Link>
          </Panel>
        </Reveal>
      </SheetSection>

      <SheetSection id="contact" title={s.contact} length={1.8} sticky>
        <h2 className="font-display text-[clamp(3rem,10vw,9rem)] font-black leading-[0.85] tracking-[-0.04em] font-condensed">
          {dict.contact.heading}
        </h2>
        <p className="mt-4 max-w-md text-lg text-ink-soft">{dict.contact.lead}</p>
        <ul className="pointer-events-auto mt-6 flex flex-wrap gap-3">
          {profile.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="label inline-block border border-ink bg-paper px-3 py-2 transition-colors hover:bg-ink hover:text-paper"
                {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {link.label} ↗
              </a>
            </li>
          ))}
          <li>
            <a href="#hero" data-cursor="REDRAW" className="label inline-block border border-accent px-3 py-2 text-accent transition-colors hover:bg-accent hover:text-paper">
              ↺ {dict.contact.again}
            </a>
          </li>
        </ul>
      </SheetSection>
    </main>
  );
}
