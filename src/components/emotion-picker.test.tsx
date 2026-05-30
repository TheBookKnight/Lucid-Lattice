import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EmotionPicker } from "@/components/emotion-picker";
import { useJournalStore } from "@/store/use-journal-store";

afterEach(cleanup);

beforeEach(() => {
  useJournalStore.getState().resetDraft();
});

describe("EmotionPicker", () => {
  it("renders all eight Plutchik emotions", () => {
    render(<EmotionPicker />);
    const emotions = ["Joy", "Trust", "Fear", "Surprise", "Sadness", "Disgust", "Anger", "Anticipation"];
    for (const emotion of emotions) {
      expect(screen.getByRole("button", { name: emotion })).toBeInTheDocument();
    }
  });

  it("toggles an emotion on click", () => {
    render(<EmotionPicker />);
    const fearButton = screen.getByRole("button", { name: "Fear" });
    fireEvent.click(fearButton);
    expect(useJournalStore.getState().draft.emotions).toHaveLength(1);
    expect(useJournalStore.getState().draft.emotions[0].emotion).toBe("Fear");
  });

  it("deselects an emotion on second click", () => {
    render(<EmotionPicker />);
    const joyButton = screen.getByRole("button", { name: "Joy" });
    fireEvent.click(joyButton);
    fireEvent.click(joyButton);
    expect(useJournalStore.getState().draft.emotions).toHaveLength(0);
  });

  it("shows intensity slider after selecting an emotion", () => {
    render(<EmotionPicker />);
    fireEvent.click(screen.getByRole("button", { name: "Sadness" }));
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThanOrEqual(1);
  });

  it("updates intensity via the range slider", () => {
    render(<EmotionPicker />);
    fireEvent.click(screen.getByRole("button", { name: "Joy" }));
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "9" } });
    const joy = useJournalStore.getState().draft.emotions.find((e) => e.emotion === "Joy");
    expect(joy?.intensity).toBe(9);
  });
});
