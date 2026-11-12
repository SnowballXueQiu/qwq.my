import Image from "next/image";
import Link from "next/link";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { timeline } from "@/content/timeline";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { getGithub } from "@/lib/github";
import { listPosts } from "@/lib/posts";
import { SHEET_LENGTH } from "@/lib/sheetLengths";
import { SheetTriggers } from "@/components/scroll/SheetTriggers";
import { ContactList } from "@/components/sections/ContactList";
import { HeroIntro } from "@/components/sections/HeroIntro";
import { Panel } from "@/components/sections/Panel";
import { ProjectReadout } from "@/components/sections/ProjectReadout";
import { SkillsPanel } from "@/components/sections/SkillsPanel";
import { Reveal } from "@/components/sections/Reveal";
import { TimelineReadout } from "@/components/sections/TimelineReadout";
import { SheetSection } from "@/components/sections/SheetSection";

export default async function Home() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const posts = await listPosts(locale);
  const github = await getGithub();
  const s = dict.sheets;

  return (
    <main id="main">
      <SheetTriggers />

      <SheetSection id="hero" title={s.hero} length={SHEET_LENGTH.hero} sticky>
        <HeroIntro>
          <p className="label mb-4 text-accent">{profile.roles[locale]}</p>
          <h1 className="font-display text-[clamp(4rem,16vw,16rem)] font-black leading-[0.82] tracking-[-0.04em] font-condensed">
            {profile.name[locale]}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">{dict.hero.tagline}</p>
          <p className="label mt-10 flex flex-wrap gap-x-6 gap-y-2 text-ink-soft">
            <span>↓ {dict.hero.scroll}</span>
            <span className="hidden text-accent md:inline">{dict.hero.draw}</span>
          </p>
        </HeroIntro>
      </SheetSection>

      <SheetSection id="about" title={s.about} length={SHEET_LENGTH.about} sticky>
        <Reveal className="max-w-[500px] [perspective:1100px]">
          <Panel className="origin-left [transform:rotateY(12deg)_rotateX(3deg)] transition-transform duration-500 hover:[transform:none]">
            <div data-line className="mb-3 flex items-center gap-3">
              <Image
                src={profile.avatar}
                alt={profile.name.en}
                width={56}
                height={56}
                className="size-14 border border-ink object-cover grayscale-[0.2]"
              />
              <div>
                <p className="font-display text-xl font-extrabold leading-tight">
                  {profile.name.zh} <span className="text-ink-soft">/ {profile.name.en}</span>
                </p>
                <p className="label text-ink-soft">@{profile.handle}</p>
              </div>
            </div>
            <pre className="overflow-x-auto font-mono text-[12px] leading-[1.6rem]">
              <span data-line className="block text-ink-soft">{"// sheet 02 — init(me);"}</span>
              <span data-line className="block">
                <span className="text-accent">const</span> me = {"{"}
              </span>
              {(
                [
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
              <span data-line className="block pl-4">
                <span className="text-ink-soft">now</span>: [
              </span>
              {profile.now.map((n) => (
                <span data-line key={n.href} className="block pl-8">
                  <a href={n.href} target="_blank" rel="noreferrer" className="hover:text-accent" data-cursor="OPEN">
                    {"logo" in n && n.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 16px org mark
                      <img src={n.logo} alt="" className="mr-1.5 inline-block size-4 -translate-y-px object-contain align-middle" />
                    ) : null}
                    &quot;{n.org[locale]}<span className="text-ink-soft"> · {n.role[locale]}</span>&quot;
                  </a>
                  <span className="text-accent">,</span>
                </span>
              ))}
              <span data-line className="block pl-4">
                ]<span className="text-accent">,</span>
              </span>
              <span data-line className="block">
                {"}"}
                <span className="text-accent">;</span>
              </span>
            </pre>
            <p data-line className="mt-3 border-t border-rule pt-3 text-sm leading-relaxed text-ink-soft">
              {profile.bio[0][locale]}
            </p>
          </Panel>
        </Reveal>
      </SheetSection>

      <SheetSection id="skills" title={s.skills} length={SHEET_LENGTH.skills} sticky>
        <SkillsPanel
          groups={skillGroups}
          locale={locale}
          labels={{ heading: dict.skills.heading, bom: dict.skills.bom, debug: dict.game.start }}
        />
      </SheetSection>

      <SheetSection id="projects" title={s.projects} length={SHEET_LENGTH.projects} sticky>
        <ProjectReadout projects={projects} locale={locale} labels={dict.projects} />
      </SheetSection>

      <SheetSection id="timeline" title={s.timeline} length={SHEET_LENGTH.timeline} sticky>
        <TimelineReadout
          events={timeline}
          locale={locale}
          github={github}
          labels={{ play: dict.video.play, contributions: dict.timeline.contributions, repos: dict.timeline.repos }}
        />
      </SheetSection>

      <SheetSection id="writing" title={s.writing} length={SHEET_LENGTH.writing} sticky>
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
                    <span className="truncate font-medium group-hover:text-accent">{post.title}</span>
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

      <SheetSection id="contact" title={s.contact} length={SHEET_LENGTH.contact} sticky>
        <h2 className="font-display text-[clamp(3rem,10vw,9rem)] font-black leading-[0.85] tracking-[-0.04em] font-condensed">
          {dict.contact.heading}
        </h2>
        <p className="mt-4 max-w-md text-lg text-ink-soft">{dict.contact.lead}</p>
        <ContactList contacts={profile.contacts} copiedLabel={dict.contact.copied} />
        <a
          href="#hero"
          data-cursor="REDRAW"
          className="label pointer-events-auto mt-6 inline-block self-start border border-accent bg-paper px-3 py-2 text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          ↺ {dict.contact.again}
        </a>
      </SheetSection>
    </main>
  );
}
