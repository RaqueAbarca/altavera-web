export type AdminSoundKind = "new-order" | "payment-confirmed";

const ENABLED_KEY = "altavera_admin_sounds_enabled";
const VOLUME_KEY = "altavera_admin_sounds_volume";
const DEFAULT_VOLUME = 0.85;

export const ADMIN_SOUNDS: Record<
  AdminSoundKind,
  { label: string; sourceLabel: string; sourcePage: string; audioUrl: string }
> = {
  "new-order": {
    label: "New Notification 09",
    sourceLabel: "Pixabay · Universfield",
    sourcePage:
      "https://pixabay.com/sound-effects/film-special-effects-new-notification-09-352705/",
    // Copia pública del mismo asset, acreditado como "New Notification 09 by Universfield".
    audioUrl:
      "https://raw.githubusercontent.com/oop7/YTSage/main/ytsage/assets/sound/notification.mp3",
  },
  "payment-confirmed": {
    label: "Correct answer tone",
    sourceLabel: "Mixkit",
    sourcePage: "https://mixkit.co/free-sound-effects/notification/",
    audioUrl:
      "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
  },
};

let audioCache: Map<AdminSoundKind, HTMLAudioElement> | null = null;
let unlocked = false;

function getCache() {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }

  if (!audioCache) audioCache = new Map();
  return audioCache;
}

function getAudio(kind: AdminSoundKind) {
  const cache = getCache();
  if (!cache) return null;

  const existing = cache.get(kind);
  if (existing) return existing;

  const audio = new Audio(ADMIN_SOUNDS[kind].audioUrl);
  audio.preload = "auto";
  cache.set(kind, audio);
  return audio;
}

export function getAdminSoundsEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ENABLED_KEY) !== "false";
}

export function setAdminSoundsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, String(enabled));
}

export function getAdminSoundsVolume() {
  if (typeof window === "undefined") return DEFAULT_VOLUME;

  const value = Number(window.localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : DEFAULT_VOLUME;
}

export function setAdminSoundsVolume(volume: number) {
  if (typeof window === "undefined") return;
  const normalized = Math.min(1, Math.max(0, volume));
  window.localStorage.setItem(VOLUME_KEY, String(normalized));
}

export function preloadAdminSounds() {
  (Object.keys(ADMIN_SOUNDS) as AdminSoundKind[]).forEach((kind) => {
    getAudio(kind)?.load();
  });
}

export async function unlockAdminSounds() {
  if (unlocked || typeof window === "undefined") return;

  const audios = (Object.keys(ADMIN_SOUNDS) as AdminSoundKind[])
    .map((kind) => getAudio(kind))
    .filter((audio): audio is HTMLAudioElement => Boolean(audio));

  if (audios.length === 0) return;

  await Promise.allSettled(
    audios.map(async (audio) => {
      const previousVolume = audio.volume;
      audio.volume = 0;
      try {
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
      } finally {
        audio.volume = previousVolume;
      }
    })
  );

  unlocked = true;
}

export async function playAdminSound(
  kind: AdminSoundKind,
  options: { force?: boolean } = {}
) {
  if (!options.force && !getAdminSoundsEnabled()) return false;

  const audio = getAudio(kind);
  if (!audio) return false;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = getAdminSoundsVolume();

  try {
    await audio.play();
    return true;
  } catch (error) {
    console.warn(`No se pudo reproducir el sonido ${kind}:`, error);
    return false;
  }
}
