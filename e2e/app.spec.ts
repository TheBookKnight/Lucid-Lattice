import { expect, test } from "@playwright/test";

test.describe("App shell", () => {
  test("renders the main heading and entry form", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /capture dreams/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save dream entry/i })).toBeVisible();
  });

  test("shows all eight emotion buttons", async ({ page }) => {
    await page.goto("/");
    const emotions = ["Joy", "Trust", "Fear", "Surprise", "Sadness", "Disgust", "Anger", "Anticipation"];
    for (const emotion of emotions) {
      await expect(page.getByRole("button", { name: emotion })).toBeVisible();
    }
  });

  test("analytics dashboard renders with empty state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/pattern dashboard/i)).toBeVisible();
    await expect(page.getByText(/save a few entries/i)).toBeVisible();
  });

  test("can type a transcript and save an entry", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/describe the dream/i).fill("I dreamed of a silver wolf in a dark forest.");
    await page.getByRole("button", { name: /save dream entry/i }).click();
    await expect(page.getByText(/dream saved offline/i)).toBeVisible();
  });

  test("shows install guidance for storage persistence", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/add lucid lattice to home screen/i)).toBeVisible();
  });
});
