import { test, expect } from '@playwright/test';

/**
 * The zero-scroll proof. Crosses a viewport matrix - real device sizes in
 * both orientations, plus the squat shapes a Home Assistant iframe card can
 * produce - with the data-shape edge cases that can't be produced from live
 * data on demand (see src/services/mockPrices.ts), and asserts the
 * ?audit=1 overflow walk (src/dev/overflowAudit.ts) finds nothing at any
 * combination.
 *
 * A pinned &now= keeps every run deterministic regardless of when it's
 * executed.
 */

interface OverflowFinding {
  selector: string;
  reason: string;
}

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  // Portrait phones
  { name: 'portrait-320x480', width: 320, height: 480 },
  { name: 'portrait-360x584', width: 360, height: 584 },
  { name: 'portrait-375x553-iphone-se', width: 375, height: 553 },
  { name: 'portrait-390x744-iphone14', width: 390, height: 744 },
  { name: 'portrait-430x932', width: 430, height: 932 },
  // Landscape phones and tablets - the case that used to push the chart off-screen entirely
  { name: 'landscape-568x320-iphone5', width: 568, height: 320 },
  { name: 'landscape-667x331-iphone-se', width: 667, height: 331 },
  { name: 'landscape-844x342-iphone14', width: 844, height: 342 },
  { name: 'landscape-800x480-ha-panel', width: 800, height: 480 },
  { name: 'landscape-1024x600-ha-panel', width: 1024, height: 600 },
  // Home Assistant iframe card shapes
  { name: 'ha-iframe-500x250', width: 500, height: 250 },
  { name: 'ha-iframe-300x150', width: 300, height: 150 },
  { name: 'ha-iframe-1280x192', width: 1280, height: 192 },
  // Desktop
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-2560x1440', width: 2560, height: 1440 },
];

const SCENARIOS = [
  'default',
  'negatives',
  'all-negative',
  'flat',
  'all-zero',
  'one-slot',
  'no-tomorrow',
  'huge-range',
  'dst-back',
  'dst-fwd',
  'gas-null',
  'apifail',
];

const PINNED_NOW = '2026-06-15T14:37:00';

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    for (const scenario of SCENARIOS) {
      test(`${scenario} has no overflow`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const params = new URLSearchParams({ mock: scenario, now: PINNED_NOW, audit: '1' });
        await page.goto(`/?${params.toString()}`);

        await page.waitForFunction(
          () => (window as unknown as { __overflowAudit?: OverflowFinding[] }).__overflowAudit !== undefined
        );

        const findings = await page.evaluate(
          () => (window as unknown as { __overflowAudit?: OverflowFinding[] }).__overflowAudit ?? []
        );

        expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
      });
    }
  });
}
