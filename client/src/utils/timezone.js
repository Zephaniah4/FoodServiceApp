import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configure dayjs with timezone support once for the entire client bundle.
dayjs.extend(utc);
dayjs.extend(timezone);

export const APP_TIME_ZONE = 'America/Chicago';

export const dayjsInAppTz = (input) => {
  if (input !== undefined && input !== null) {
    // Interpret numeric timestamps as millis
    if (typeof input === 'number') {
      return dayjs.tz(input, APP_TIME_ZONE);
    }
    return dayjs(input).tz(APP_TIME_ZONE);
  }
  return dayjs().tz(APP_TIME_ZONE);
};

export const formatDateInput = (input) => dayjsInAppTz(input).format('YYYY-MM-DD');

export const toRangeMillis = (startDateString, endDateString) => {
  const start = dayjs.tz(startDateString, APP_TIME_ZONE).startOf('day');
  const end = dayjs.tz(endDateString, APP_TIME_ZONE).endOf('day');
  if (!start.isValid() || !end.isValid()) {
    return {
      startMillis: Number.NaN,
      endMillis: Number.NaN
    };
  }
  return {
    startMillis: start.valueOf(),
    endMillis: end.valueOf()
  };
};

export const formatDisplayDate = (input, fallback = '') => {
  if (!input) return fallback;
  const candidate = typeof input === 'object' && typeof input.toDate === 'function'
    ? input.toDate()
    : input;
  const millis = candidate instanceof Date ? candidate.getTime() : candidate;
  if (millis === undefined || millis === null) return fallback;
  const result = dayjsInAppTz(millis);
  return result.isValid() ? result.format('YYYY-MM-DD') : fallback;
};

export const formatDateTimeDisplay = (input, fallback = '') => {
  if (!input) return fallback;
  const candidate = typeof input === 'object' && typeof input.toDate === 'function'
    ? input.toDate()
    : input;
  const millis = candidate instanceof Date ? candidate.getTime() : candidate;
  if (millis === undefined || millis === null) return fallback;
  const result = dayjsInAppTz(millis);
  return result.isValid() ? result.format('MMM D, YYYY h:mm A') : fallback;
};

export const formatTimeDisplay = (input, fallback = '') => {
  if (!input) return fallback;
  const candidate = typeof input === 'object' && typeof input.toDate === 'function'
    ? input.toDate()
    : input;
  const millis = candidate instanceof Date ? candidate.getTime() : candidate;
  if (millis === undefined || millis === null) return fallback;
  const result = dayjsInAppTz(millis);
  return result.isValid() ? result.format('h:mm A') : fallback;
};

export default dayjs;
