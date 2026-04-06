const LOCALE = "es-HN";
const TIME_ZONE = "America/Tegucigalpa";

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatTime = (value) => {
  const date = normalizeDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date).replace(/\s?a\.?\s?m\.?/i, " a. m.").replace(/\s?p\.?\s?m\.?/i, " p. m.");
};

export const formatDateTime = (value) => {
  const date = normalizeDate(value);
  if (!date) return "—";
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const formatNow = () => formatDateTime(new Date());
