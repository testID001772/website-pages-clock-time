/**
 * Copy for the world-clock page, in English, Arabic, Spanish and French.
 * Other app languages fall back to English here, so the page never shows blanks.
 */
import type { ConditionKey } from "./weather.ts";

export interface WorldClockCopy {
  eyebrow: string;
  title: string;
  featuredLabel: string;
  localLabel: string;
  weatherTitle: string;
  temperature: string;
  humidity: string;
  weatherLoading: string;
  weatherError: string;
  retry: string;
  conditions: Record<ConditionKey, string>;
  addTitle: string;
  addPlaceholder: string;
  addAction: string;
  limitReached: string;
  empty: string;
  sameTime: string;
  vsLocal: (difference: string) => string;
  moveEarlier: (city: string) => string;
  moveLater: (city: string) => string;
  remove: string;
  removeCity: (city: string) => string;
  lightMode: string;
  darkMode: string;
}

const en: WorldClockCopy = {
  eyebrow: "Clock & Time Zone",
  title: "World clocks",
  featuredLabel: "Featured",
  localLabel: "Your local time",
  weatherTitle: "Weather now",
  temperature: "Temperature",
  humidity: "Humidity",
  weatherLoading: "Loading weather…",
  weatherError: "Weather is unavailable right now.",
  retry: "Try again",
  conditions: {
    clear: "Clear",
    partlyCloudy: "Partly cloudy",
    overcast: "Overcast",
    fog: "Fog",
    drizzle: "Drizzle",
    rain: "Rain",
    snow: "Snow",
    showers: "Showers",
    thunderstorm: "Thunderstorm",
    unknown: "Unknown",
  },
  addTitle: "Add a city or time zone",
  addPlaceholder: "Try Tokyo, Madrid or Europe/Paris",
  addAction: "Add",
  limitReached: "You've reached the limit of 12 clocks.",
  empty: "No clocks yet. Search above to add one.",
  sameTime: "Same time",
  vsLocal: (difference) => `${difference} vs local`,
  moveEarlier: (city) => `Move ${city} earlier`,
  moveLater: (city) => `Move ${city} later`,
  remove: "Remove",
  removeCity: (city) => `Remove ${city}`,
  lightMode: "Light mode",
  darkMode: "Dark mode",
};

const ar: WorldClockCopy = {
  eyebrow: "الساعة والمنطقة الزمنية",
  title: "الساعات العالمية",
  featuredLabel: "المدينة المميزة",
  localLabel: "وقتك المحلي",
  weatherTitle: "الطقس الآن",
  temperature: "درجة الحرارة",
  humidity: "الرطوبة",
  weatherLoading: "جارٍ تحميل الطقس…",
  weatherError: "الطقس غير متاح الآن.",
  retry: "حاول مرة أخرى",
  conditions: {
    clear: "صافٍ",
    partlyCloudy: "غائم جزئيًا",
    overcast: "غائم",
    fog: "ضباب",
    drizzle: "رذاذ",
    rain: "مطر",
    snow: "ثلج",
    showers: "زخات مطر",
    thunderstorm: "عاصفة رعدية",
    unknown: "غير معروف",
  },
  addTitle: "أضف مدينة أو منطقة زمنية",
  addPlaceholder: "جرّب طوكيو أو مدريد أو Europe/Paris",
  addAction: "إضافة",
  limitReached: "وصلت إلى الحد الأقصى وهو 12 ساعة.",
  empty: "لا توجد ساعات بعد. ابحث أعلاه لإضافة واحدة.",
  sameTime: "الوقت نفسه",
  vsLocal: (difference) => `${difference} مقارنةً بالمحلي`,
  moveEarlier: (city) => `نقل ${city} إلى الموضع السابق`,
  moveLater: (city) => `نقل ${city} إلى الموضع التالي`,
  remove: "إزالة",
  removeCity: (city) => `إزالة ${city}`,
  lightMode: "الوضع الفاتح",
  darkMode: "الوضع الداكن",
};

const es: WorldClockCopy = {
  eyebrow: "Reloj y zona horaria",
  title: "Relojes mundiales",
  featuredLabel: "Destacada",
  localLabel: "Tu hora local",
  weatherTitle: "Tiempo ahora",
  temperature: "Temperatura",
  humidity: "Humedad",
  weatherLoading: "Cargando el tiempo…",
  weatherError: "El tiempo no está disponible ahora.",
  retry: "Reintentar",
  conditions: {
    clear: "Despejado",
    partlyCloudy: "Parcialmente nublado",
    overcast: "Nublado",
    fog: "Niebla",
    drizzle: "Llovizna",
    rain: "Lluvia",
    snow: "Nieve",
    showers: "Chubascos",
    thunderstorm: "Tormenta",
    unknown: "Desconocido",
  },
  addTitle: "Añade una ciudad o zona horaria",
  addPlaceholder: "Prueba Tokio, Madrid o Europe/Paris",
  addAction: "Añadir",
  limitReached: "Has alcanzado el límite de 12 relojes.",
  empty: "Aún no hay relojes. Busca arriba para añadir uno.",
  sameTime: "Misma hora",
  vsLocal: (difference) => `${difference} respecto a la local`,
  moveEarlier: (city) => `Mover ${city} hacia atrás`,
  moveLater: (city) => `Mover ${city} hacia delante`,
  remove: "Quitar",
  removeCity: (city) => `Quitar ${city}`,
  lightMode: "Modo claro",
  darkMode: "Modo oscuro",
};

const fr: WorldClockCopy = {
  eyebrow: "Horloge et fuseau horaire",
  title: "Horloges du monde",
  featuredLabel: "À la une",
  localLabel: "Votre heure locale",
  weatherTitle: "Météo actuelle",
  temperature: "Température",
  humidity: "Humidité",
  weatherLoading: "Chargement de la météo…",
  weatherError: "La météo est indisponible pour le moment.",
  retry: "Réessayer",
  conditions: {
    clear: "Dégagé",
    partlyCloudy: "Éclaircies",
    overcast: "Couvert",
    fog: "Brouillard",
    drizzle: "Bruine",
    rain: "Pluie",
    snow: "Neige",
    showers: "Averses",
    thunderstorm: "Orage",
    unknown: "Inconnu",
  },
  addTitle: "Ajouter une ville ou un fuseau",
  addPlaceholder: "Essayez Tokyo, Madrid ou Europe/Paris",
  addAction: "Ajouter",
  limitReached: "Vous avez atteint la limite de 12 horloges.",
  empty: "Aucune horloge pour le moment. Recherchez ci-dessus pour en ajouter une.",
  sameTime: "Même heure",
  vsLocal: (difference) => `${difference} par rapport à l'heure locale`,
  moveEarlier: (city) => `Déplacer ${city} vers le haut`,
  moveLater: (city) => `Déplacer ${city} vers le bas`,
  remove: "Retirer",
  removeCity: (city) => `Retirer ${city}`,
  lightMode: "Mode clair",
  darkMode: "Mode sombre",
};

const COPY: Partial<Record<string, WorldClockCopy>> = { en, ar, es, fr };

/** The copy for an app locale, English where the page has no translation yet. */
export function copyFor(locale: string): WorldClockCopy {
  return COPY[locale] ?? en;
}
