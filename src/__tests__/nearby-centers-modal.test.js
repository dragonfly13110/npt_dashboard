import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const landingPage = fs.readFileSync(
  path.resolve('src/pages/LandingPage.jsx'),
  'utf8'
);
const nearbyWidget = fs.readFileSync(
  path.resolve('src/components/widgets/NearbyServiceCentersWidget.jsx'),
  'utf8'
);

describe('nearby service centers card', () => {
  it('opens its dedicated widget modal', () => {
    expect(landingPage).toContain("modal: 'nearbyCenters'");
    expect(landingPage).toContain('<NearbyServiceCentersWidget />');
    expect(landingPage).toContain("activeInfoModal === 'nearbyCenters'");
  });

  it('keeps the widget header free of the duplicate title', () => {
    expect(nearbyWidget).not.toContain('<h3>ศูนย์บริการเกษตรใกล้บ้าน</h3>');
  });

  it('links ศดปช. to its registered dashboard route', () => {
    expect(nearbyWidget).toContain(
      "route: '/dashboard/protection/soil-fertilizer'"
    );
  });
});
