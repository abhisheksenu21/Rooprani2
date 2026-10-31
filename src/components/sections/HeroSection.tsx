import { motion, useReducedMotion } from 'motion/react';
import { catalogueMedia } from '../../assets/catalogueMedia';
import { ResilientImage } from '../ui/ResilientImage';

const HERO_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  const scrollToCollection = () => {
    const el = document.getElementById('collection');
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <section
      aria-label="Hero"
      className="relative min-h-[100svh] w-full flex items-end overflow-hidden bg-background"
    >
      {/* Background Studio Photography */}
      <div className="absolute inset-0">
        <ResilientImage
          src={catalogueMedia.heroRoyalBangles}
          alt="Handcrafted champagne-gold bangles, sculpted kade, and antique filigree choker arranged on dark slate stone"
          fallbackLabel="Rooprani Heritage Adornments"
          priority
          containerClassName="w-full h-full"
          className="w-full h-full object-cover object-center"
        />

        {/* Top Header Scrim + Rich Bottom Editorial Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-background"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent"
        />
      </div>

      {/* Soft Slowly Drifting Warm-Gold Radial Glow */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0.32, x: '-6%', y: '4%' }}
        animate={
          prefersReducedMotion
            ? { opacity: 0.32, x: '0%', y: '0%' }
            : {
                opacity: [0.26, 0.42, 0.26],
                x: ['-6%', '6%', '-6%'],
                y: ['4%', '-5%', '4%'],
              }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                duration: 18,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="pointer-events-none absolute left-1/2 bottom-12 -translate-x-1/2 w-[36rem] sm:w-[48rem] h-[24rem] rounded-full bg-[radial-gradient(circle,hsla(38,48%,64%,0.22)_0%,transparent_70%)] blur-3xl"
      />

      {/* Hero Editorial Copy */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-12 pt-32 pb-16 sm:pb-24 lg:pb-28">
        <div className="max-w-2xl">
          <motion.p
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, delay: 0.1, ease: HERO_EASE }}
            className="text-xs tracking-[0.28em] text-primary mb-5"
          >
            THE ART OF ADORNMENT
          </motion.p>

          <motion.h1
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, filter: 'blur(14px)', y: 16 }
            }
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1.35, delay: 0.22, ease: HERO_EASE }}
            className="font-display text-[clamp(2.85rem,7vw,5.5rem)] leading-[1.02] tracking-[0.14em] text-foreground"
          >
            ROOPRANI
          </motion.h1>

          <motion.p
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, filter: 'blur(10px)', y: 14 }
            }
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1.3, delay: 0.42, ease: HERO_EASE }}
            className="mt-4 font-serif italic text-[clamp(1.5rem,3vw,2.35rem)] font-light text-foreground/95 leading-snug text-balance"
          >
            Elegance in every detail.
          </motion.p>

          <motion.p
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.58, ease: HERO_EASE }}
            className="mt-4 text-sm sm:text-base font-light text-foreground/80 max-w-lg leading-relaxed"
          >
            Discover jewellery that makes every moment feel extraordinary.
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.74, ease: HERO_EASE }}
            className="mt-9"
          >
            <button
              type="button"
              onClick={scrollToCollection}
              className="inline-flex items-center justify-center px-8 py-4 min-h-[48px] border border-primary/75 bg-background/45 backdrop-blur-xs text-xs tracking-[0.22em] text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              DISCOVER THE COLLECTION
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
