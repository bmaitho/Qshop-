// UniHive media partners. Add an episode by dropping files into
// public/media/<partner>/ and adding an entry to `episodes` (newest first).
const M = '/media/siwaka';

export const SIWAKA = {
  slug: 'siwaka',
  name: 'The Siwaka Podcast',
  role: 'Official media outlet of UniHive',
  line: 'On the streets, in the crowd, at every Hive moment — the stories behind the buzz.',
  handle: '@thesiwakapodcast',
  tiktok: 'https://www.tiktok.com/@thesiwakapodcast',
  logo: '/partners/siwaka-podcast.png', // shows when the file is added
  hero: { video: `${M}/ep97-voxpop.mp4`, poster: `${M}/ep97-voxpop.webp` },
  episodes: [
    {
      id: 'ep97',
      title: 'Episode 97',
      line: 'Out on the streets with UniHive — and THE HIVE.',
      video: `${M}/ep97.mp4`,
      poster: `${M}/ep97.webp`,
      tiktokUrl: 'https://vt.tiktok.com/ZSgdKmHcP/',
    },
  ],
  moments: [
    { kind: 'video', src: '/hive/video/siwaka-unihive.mp4', poster: '/hive/video/siwaka-unihive.webp' },
    { kind: 'video', src: `${M}/ep97-voxpop.mp4`, poster: `${M}/ep97-voxpop.webp` },
    { kind: 'image', src: `${M}/still-1.webp` },
    { kind: 'image', src: `${M}/still-3.webp` },
    { kind: 'image', src: `${M}/still-2.webp` },
    { kind: 'video', src: `${M}/ep97-hive.mp4`, poster: `${M}/ep97-hive.webp` },
    { kind: 'image', src: `${M}/still-4.webp` },
  ],
};
