import { catalogueMedia } from '../../assets/catalogueMedia';
import { BlurReveal } from '../ui/BlurReveal';
import { ResilientImage } from '../ui/ResilientImage';

export function BrandStorySection() {
  return (
    <section
      id="our-story"
      aria-labelledby="story-heading"
      className="bg-ivory text-background scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-24 sm:py-32 lg:py-36">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          {/* Editorial Copy */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <BlurReveal>
              <p className="text-xs tracking-[0.26em] text-deep-brown/75 mb-4">OUR STORY</p>
              <h2
                id="story-heading"
                className="font-serif text-[clamp(2.15rem,4.2vw,3.5rem)] font-light text-background leading-[1.14] text-balance"
              >
                The beauty of being you.
              </h2>
              <div aria-hidden="true" className="w-14 h-px bg-deep-brown/30 my-8" />
              <p className="font-serif text-xl sm:text-2xl font-normal text-deep-brown/90 leading-relaxed max-w-xl text-balance">
                Rooprani celebrates personal style through jewellery that brings elegance to
                everyday moments and special occasions.
              </p>
            </BlurReveal>
          </div>

          {/* Strong Editorial Jewellery Photograph */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <BlurReveal delay={0.14}>
              <div className="aspect-[3/4] w-full max-w-lg mx-auto lg:max-w-none overflow-hidden border border-deep-brown/15 bg-deep-brown/5">
                <ResilientImage
                  src={catalogueMedia.editorialBrandStory}
                  alt="Close-up editorial portrait showcasing layered champagne-gold bangles, sculpted kada, and pearl necklace"
                  fallbackLabel="Rooprani Editorial Portrait"
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover"
                />
              </div>
            </BlurReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
