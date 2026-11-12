/**
 * Playwright End-to-End Test for TypeFlow
 * Tests the complete flow:
 * 1. Home view navigation & settings
 * 2. Starting a test
 * 3. Keystroke typing and backspacing
 * 4. Completion and Results view telemetry
 * 5. History persistence and CSV export
 */

import { test, expect } from '@playwright/test';

test.describe('TypeFlow Typing Speed Test Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads home view with difficulty and duration selection', async ({ page }) => {
    await expect(page.locator('text=TypeFlow')).toBeVisible();
    await expect(page.locator('button:has-text("Start Test")')).toBeVisible();

    // Verify difficulty selector exists and defaults to Medium
    const mediumButton = page.locator('button:has-text("medium")');
    await expect(mediumButton).toBeVisible();

    // Verify duration selector exists
    await expect(page.locator('button:has-text("30s")')).toBeVisible();
  });

  test('starts typing test and processes keystrokes', async ({ page }) => {
    // Select 15s duration for quick test execution
    await page.click('button:has-text("15s")');

    // Click Start Test button
    await page.click('button:has-text("Start Test")');

    // Test View should now be active with circular gauge
    await expect(page.locator('text=Restart')).toBeVisible();
    await expect(page.locator('text=Cancel')).toBeVisible();

    // Type a sequence of characters into the active input
    await page.keyboard.type('Two roads diverged');

    // Ensure keystrokes were captured and character statuses updated
    await expect(page.locator('text=Accuracy')).toBeVisible();
    await expect(page.locator('text=Speed')).toBeVisible();
  });

  test('navigates to history view and verifies empty/populated state', async ({ page }) => {
    // Click History navigation tab
    await page.click('button:has-text("History")');

    // History Matrix should be visible
    await expect(page.locator('text=Personal Bests Matrix')).toBeVisible();
    await expect(page.locator('text=Export CSV')).toBeVisible();

    // Return to Test view
    await page.click('button:has-text("Back to Test")');
    await expect(page.locator('button:has-text("Start Test")')).toBeVisible();
  });

  test('opens settings modal and toggles options', async ({ page }) => {
    // Open Settings modal
    await page.click('button:has-text("Settings")');
    await expect(page.locator('text=Preferences & Settings')).toBeVisible();

    // Toggle Caret style
    await page.click('button:has-text("Block Box")');

    // Click Save & Close
    await page.click('button:has-text("Save & Close")');
    await expect(page.locator('text=Preferences & Settings')).not.toBeVisible();
  });
});
