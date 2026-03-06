const LOCATIONS = {
  planoDallas: {
    key: 'planoDallas',
    label: 'Plano / Dallas',
    appTitle: 'Food Service App',
    welcomeTitle: 'Welcome to Food Service App',
    welcomeSubtitle: 'Serving Plano and Dallas communities.',
  },
  garland: {
    key: 'garland',
    label: 'Garland',
    appTitle: 'Food Service App - Garland',
    welcomeTitle: 'Welcome to Food Service App - Garland',
    welcomeSubtitle: 'Serving the Garland community.',
  },
  rowlett: {
    key: 'rowlett',
    label: 'Rowlett',
    appTitle: 'Food Service App - Rowlett',
    welcomeTitle: 'Welcome to Food Service App - Rowlett',
    welcomeSubtitle: 'Serving the Rowlett community.',
  },
};

const LOCATION_ALIASES = {
  plano: 'planoDallas',
  dallas: 'planoDallas',
  planodallas: 'planoDallas',
  plano_dallas: 'planoDallas',
  garland: 'garland',
  rowlett: 'rowlett',
};

function normalizeLocationKey(rawKey) {
  if (!rawKey) {
    return 'planoDallas';
  }

  const normalized = String(rawKey).trim().toLowerCase();
  return LOCATION_ALIASES[normalized] || normalized;
}

export function getCurrentLocationKey() {
  return normalizeLocationKey(process.env.REACT_APP_LOCATION);
}

export function getCurrentLocationConfig() {
  const key = getCurrentLocationKey();
  return LOCATIONS[key] || LOCATIONS.planoDallas;
}

export { LOCATIONS };
