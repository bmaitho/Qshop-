// Swipeable billboard used across the site (Services, Marketplace ad-spot,
// event pages). `variant="reel"` is a wall of poster/video screens;
// `variant="banner"` is a single full-width ad slot.
import MediaCarousel from './hive/MediaCarousel';
import { BILLBOARD_SLIDES, POSTERS, VIDEOS, HIVE_SLUG } from './hive/hiveMedia';

const AD_SLIDES = [
  { type: 'image', src: POSTERS.bannerWide, caption: 'THE HIVE · NO GOING HOME — Everyone will be there', href: `/events/${HIVE_SLUG}` },
  { type: 'video', ...VIDEOS.recap, caption: 'Relive the last Hive — 30 Oct, Sarakasi Dome', href: `/events/${HIVE_SLUG}` },
  { type: 'image', src: POSTERS.master, caption: 'Tickets, drinks & bites — all on UniHive', href: `/events/${HIVE_SLUG}` },
  { type: 'image', src: POSTERS.afterDark, caption: 'AFTER DARK — where the darkness dances', href: `/events/${HIVE_SLUG}?tab=packs` },
];

export default function Billboard({ variant = 'reel', slides, linkTo, height, aspect }) {
  if (variant === 'banner') {
    return <MediaCarousel mode="banner" slides={slides || AD_SLIDES} aspect={aspect} autoplayMs={6500} />;
  }
  const list = (slides || BILLBOARD_SLIDES).map((s) => (linkTo && !s.href ? { ...s, href: linkTo } : s));
  return <MediaCarousel mode="reel" slides={list} height={height} />;
}
