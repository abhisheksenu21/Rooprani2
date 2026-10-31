import { BlurReveal } from '../ui/BlurReveal';

export function ManifestoSection() {
  return (
    <section
      aria-labelledby="manifesto-heading"
      className="py-24 sm:py-32 lg:py-36 px-4 sm:px-8 lg:px-12 bg-background border-b border-border-subtle"
    >
      <div className="max-w-3xl mx-auto text-center">
        <BlurReveal>
          <div aria-hidden="true" className="w-12 h-px bg-primary/60 mx-auto mb-10" />
          <h2
            id="manifesto-heading"
            className="font-serif text-[clamp(2rem,4.2vw,3.35rem)] font-light text-foreground leading-[1.18] text-balance"
          >
            Beauty lives in the details.
          </h2>
          <p className="mt-6 text-base sm:text-lg font-light text-muted leading-relaxed max-w-2xl mx-auto text-balance">
            Discover thoughtfully selected jewellery designed to complement your style, celebrate
            your moments, and make everyday elegance feel special.
          </p>
        </BlurReveal>
      </div>
    </section>
  );
}
