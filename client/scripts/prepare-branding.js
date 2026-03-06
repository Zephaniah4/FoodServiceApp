const fs = require('fs');
const path = require('path');

const location = (process.env.REACT_APP_LOCATION || 'planoDallas').trim();

const brandingByLocation = {
  planoDallas: {
    shortName: 'FSA Plano',
    name: 'Food Service App - Plano/Dallas',
    icon192: 'logo1.png',
    icon512: 'logo2.png',
  },
  garland: {
    shortName: 'FSA Garland',
    name: 'FSA Garland',
    icon192: 'FA Icon Garland.png',
    icon512: 'FA Icon Garland.png',
  },
  rowlett: {
    shortName: 'FSA Rowlett',
    name: 'FSA Rowlett',
    icon192: 'FSA Rowlett Icon.png',
    icon512: 'FSA Rowlett Icon.png',
  },
};

const branding = brandingByLocation[location] || brandingByLocation.planoDallas;

const manifest = {
  short_name: branding.shortName,
  name: branding.name,
  icons: [
    {
      src: 'app.png',
      sizes: '64x64 32x32 24x24 16x16',
      type: 'image/png',
    },
    {
      src: branding.icon192,
      type: 'image/png',
      sizes: '192x192',
    },
    {
      src: branding.icon512,
      type: 'image/png',
      sizes: '512x512',
    },
  ],
  start_url: '/',
  display: 'standalone',
  theme_color: '#000000',
  background_color: '#ffffff',
};

const publicDir = path.resolve(__dirname, '..', 'public');
const manifestPath = path.join(publicDir, 'manifest.json');

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Prepared branding for location: ${location}`);
console.log(`Manifest name: ${branding.name}`);
console.log(`Manifest icons: ${branding.icon192}, ${branding.icon512}`);
