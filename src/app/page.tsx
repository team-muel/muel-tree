import Link from "next/link";
import { OpenActivityLink } from "@/components/OpenActivityLink";
import { Nav } from "@/components/Nav";
import { footerLinks, services, teamUpdates } from "@/config/services";

function Badge({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-widest ${
        light ? "border-ink/30 text-ink/60" : "border-white/30 text-white/60"
      }`}
    >
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <>
      <Nav />

      {services.map((service, index) => {
        const isFirst = index === 0;
        const isLight = service.badgeLight;
        const primaryClass = isLight
          ? "bg-ink text-white hover:bg-ink/80"
          : "bg-white text-ink hover:bg-white/85";
        const disabledClass = isLight
          ? "border border-ink/20 text-ink/45"
          : "border border-white/15 text-white/40";

        return (
          <section
            key={service.slug}
            id={service.slug}
            className={`flex min-h-[680px] flex-col items-center justify-center px-6 text-center ${service.sectionClassName} ${
              isFirst ? "pb-24 pt-32" : "py-24"
            }`}
          >
            <Badge light={isLight}>{service.label}</Badge>
            {isFirst ? (
              <h1 className="mt-6 text-7xl font-bold leading-none sm:text-9xl">
                {service.name}
              </h1>
            ) : (
              <h2 className="mt-6 text-7xl font-bold leading-none sm:text-9xl">
                {service.name}
              </h2>
            )}
            <p
              className={`mt-5 max-w-xl text-base leading-relaxed ${
                isLight ? "text-ink/65" : "text-white/60"
              }`}
            >
              {service.description}
            </p>
            <p
              className={`mt-3 text-xs font-semibold uppercase tracking-widest ${
                isLight ? "text-ink/45" : "text-white/40"
              }`}
            >
              {service.operatingModel} / {service.statusLabel}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {service.primaryAction.href ? (
                <OpenActivityLink
                  href={service.primaryAction.href}
                  className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold transition ${primaryClass}`}
                >
                  {service.primaryAction.label} -&gt;
                </OpenActivityLink>
              ) : (
                <span
                  className={`inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold ${disabledClass}`}
                >
                  {service.primaryAction.label}
                </span>
              )}
            </div>
            {service.note && (
              <p
                className={`mt-5 max-w-lg text-sm leading-relaxed ${
                  isLight ? "text-ink/50" : "text-white/45"
                }`}
              >
                {service.note}
              </p>
            )}
          </section>
        );
      })}

      <section id="team" className="bg-white px-8 py-20 sm:px-16 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-4xl font-bold text-ink">Team</h2>
          <div className="mt-10 divide-y divide-ink/10">
            {teamUpdates.map((item) => (
              <Link
                key={item.text}
                href={item.href}
                className="group flex items-start justify-between gap-6 py-8 transition hover:opacity-60"
              >
                <div>
                  <p className="mb-2 text-sm text-ink/40">
                    {item.date}
                    <span className="ml-4">{item.category}</span>
                  </p>
                  <p className="text-xl font-bold text-ink">{item.text}</p>
                </div>
                <span className="mt-1 shrink-0 text-ink/30 transition group-hover:translate-x-1">
                  -&gt;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#0a0a0a] px-8 py-16 sm:px-16 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-base font-bold text-white">Muel</p>
          <p className="mt-1 text-sm text-white/45">
            고닥ㆍ집을 원함 | fancy2794@gmail.com
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/55 transition hover:border-white/40 hover:text-white"
              >
                {link.label} -&gt;
              </Link>
            ))}
          </div>
          <p className="mt-14 text-xs text-white/20">
            © 2026 Muel · 고닥ㆍ집을 원함. All Rights Reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
