// src/components/Billboard.jsx
//
// Reusable auto-advancing billboard/slideshow. Used on the Services page
// (homepage billboard, pinned event highlight) and on an event page's
// "Event" tab (event media: promo art, announcements). Pass `slides`
// to override the default HIVE promo set.

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import billboard1 from '../assets/hive/billboard-1.jpeg';
import billboard2 from '../assets/hive/billboard-2.jpeg';
import billboard3 from '../assets/hive/billboard-3.jpeg';
import billboard4 from '../assets/hive/billboard-4.jpeg';
import billboard5 from '../assets/hive/billboard-5.jpeg';
import billboard6 from '../assets/hive/billboard-6.jpeg';
import billboard7 from '../assets/hive/billboard-7.jpeg';
import billboard8 from '../assets/hive/billboard-8.jpeg';
import billboard9 from '../assets/hive/billboard-9.jpeg';

const DEFAULT_SLIDES = [
  { image: billboard1, caption: 'THE HIVE: NO GOING HOME — Halloween Edition, 30 Oct, Sarakasi Dome' },
  { image: billboard9, caption: 'Regular KSh 1,000 · VIP KSh 2,000 — 6PM till late' },
  { image: billboard2, caption: 'On the decks: DJ NIKX' },
  { image: billboard6, caption: 'On the decks: DJ AKUKU' },
  { image: billboard8, caption: 'On the decks: DJ PICCASSO' },
  { image: billboard7, caption: 'On stage: DENZZ' },
  { image: billboard3, caption: 'Who will be taking the stage?' },
  { image: billboard4, caption: 'Unforgettable lineup awaits' },
  { image: billboard5, caption: 'Guess who will be performing?' },
];

const AUTO_ADVANCE_MS = 5000;

export default function Billboard({ slides = DEFAULT_SLIDES, linkTo, aspect = 'aspect-[16/9]' }) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  if (!slides.length) return null;

  const Wrapper = linkTo ? 'a' : 'div';
  const wrapperProps = linkTo ? { href: linkTo } : {};

  return (
    <div className={`relative w-full ${aspect} rounded-3xl overflow-hidden bg-black group`}>
      <Wrapper {...wrapperProps} className="block w-full h-full">
        {slides.map((slide, i) => (
          <img
            key={i}
            src={slide.image}
            alt={slide.caption || ''}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </Wrapper>

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {slides[index]?.caption && (
        <p className="absolute bottom-4 left-5 right-5 text-white font-semibold text-sm sm:text-base drop-shadow">
          {slides[index].caption}
        </p>
      )}

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
