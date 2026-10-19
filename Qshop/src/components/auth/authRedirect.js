// Where to send someone after they log in or sign up, and whether this device
// has an account on it yet (new visitors land on sign-up, not log-in).

const LAST_PATH = 'lastPath';
const POST_LOGIN = 'postLoginRedirect';
const HAS_ACCOUNT = 'hasLoggedInBefore';

const safeGet = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const safeSet = (store, key, value) => { try { store.setItem(key, value); } catch { /* storage blocked */ } };
const safeRemove = (store, key) => { try { store.removeItem(key); } catch { /* storage blocked */ } };

const isAuthPath = (path) => !path || path.startsWith('/auth');

// Called on every route change so we can bring people back where they were.
export const rememberPath = (path) => {
  if (!isAuthPath(path)) safeSet(sessionStorage, LAST_PATH, path);
};

// The page to land on after a successful log-in / sign-up. Consumes the
// explicit redirect some pages set (e.g. the staff scanner).
export const takeAuthDestination = () => {
  const explicit = safeGet(sessionStorage, POST_LOGIN);
  safeRemove(sessionStorage, POST_LOGIN);
  const last = safeGet(sessionStorage, LAST_PATH);
  const dest = [explicit, last].find((p) => p && !isAuthPath(p) && p.startsWith('/'));
  return dest || '/home';
};

// Same as takeAuthDestination but leaves the stored values in place.
export const peekAuthDestination = () => {
  const dest = [safeGet(sessionStorage, POST_LOGIN), safeGet(sessionStorage, LAST_PATH)]
    .find((p) => p && !isAuthPath(p) && p.startsWith('/'));
  return dest || '/home';
};

export const markHasAccount = () => safeSet(localStorage, HAS_ACCOUNT, 'true');
export const deviceHasAccount = () => safeGet(localStorage, HAS_ACCOUNT) === 'true';
