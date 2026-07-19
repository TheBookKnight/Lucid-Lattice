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
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    
    await page.goto("/");
    // Fill title
    await page.getByPlaceholder(/flying over the ocean/i).fill("A Wolf Dream");
    // Select emotion
    await page.getByRole("button", { name: "Joy" }).click();
    // Fill transcript
    await page.getByPlaceholder(/describe the dream/i).fill("I dreamed of a silver wolf in a dark forest.");
    await page.getByRole("button", { name: /save dream entry/i }).click();
    await expect(page.getByText(/dream saved offline/i)).toBeVisible();
  });

  test("shows install guidance for storage persistence", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/add lucid lattice to home screen/i)).toBeVisible();
  });

  test("can inject test audio and transcribe it", async ({ page }) => {
    // Increase test timeout because loading the Whisper Tiny model and running WASM inference takes some time
    test.setTimeout(60000);

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    await page.goto("/?test=true");

    // Click [Dev] Inject Test Audio button
    const injectBtn = page.locator("#test-inject-audio");
    await expect(injectBtn).toBeVisible();
    await injectBtn.click();

    // Click Transcribe button
    const transcribeBtn = page.getByRole("button", { name: /transcribe/i });
    await expect(transcribeBtn).toBeVisible();
    await transcribeBtn.click();

    // Wait for the progress to complete and transcript text to be populated
    const transcriptArea = page.getByPlaceholder(/describe the dream/i);
    
    // We expect the textarea to eventually contain a non-empty string
    await expect(async () => {
      const text = await transcriptArea.inputValue();
      expect(text.trim().length).toBeGreaterThan(0);
    }).toPass({
      timeout: 45000,
      intervals: [1000]
    });

    const transcribedText = await transcriptArea.inputValue();
    console.log("\n=================================");
    console.log("TRANSCRIBED TEXT:", transcribedText);
    console.log("=================================\n");
  });
});
