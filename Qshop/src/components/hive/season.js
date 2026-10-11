// Seasonal skin for event pages — swap `CURRENT_SEASON` to re-theme
// (e.g. 'christmas') without touching page components.
export const SEASONS = {
  halloween: { webs: true, embers: true, spider: true, grain: true },
  none: { webs: false, embers: false, spider: false, grain: false },
};

export const CURRENT_SEASON = 'halloween';

export const season = SEASONS[CURRENT_SEASON] || SEASONS.none;
