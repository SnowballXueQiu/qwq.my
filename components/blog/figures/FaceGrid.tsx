import { tr, type Lang } from "./Figure";

const FACES = [
  { file: "qwq", face: "QwQ", zh: "平时", en: "Most of the time" },
  { file: "owo", face: "OwO", zh: "鼠标停在脸上", en: "Pointer on its face" },
  { file: "press", face: ">w<", zh: "被戳了一下", en: "Just got poked" },
  { file: "qaq", face: "QAQ", zh: "3 秒内被戳 5 次，或鼠标离开窗口", en: "Five pokes in three seconds, or the pointer left" },
  { file: "dizzy", face: "@w@", zh: "鼠标甩得太快", en: "Pointer shaken too fast" },
  { file: "sleepy", face: "-w-", zh: "8 秒没动", en: "Eight idle seconds" },
  { file: "wave", face: "^w^", zh: "到了联系页，挥手", en: "On the contact sheet, waving" },
];

/** QwQ's seven faces, captured from the live scene. */
export function FaceGrid({ lang }: { lang: Lang }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-4">
      {FACES.map((f) => (
        <div key={f.file} className="bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- static captures */}
          <img src={`/blog/how-qwq-my-is-built/face-${f.file}.webp`} alt={f.face} loading="lazy" className="block aspect-[16/9] w-full object-cover" />
          <div className="bg-paper px-2 py-1.5">
            <p className="font-mono text-[0.95rem] font-bold leading-tight text-accent">{f.face}</p>
            <p className="text-[0.75rem] leading-snug text-ink-soft">{tr(lang, f.zh, f.en)}</p>
          </div>
        </div>
      ))}
      <div className="hidden bg-paper p-3 font-mono text-[0.72rem] leading-relaxed text-ink-soft sm:block">
        {tr(lang, "终端里输入 qwq QAQ 也能让它换脸。", "Type qwq QAQ in the terminal to pick a face yourself.")}
      </div>
    </div>
  );
}
