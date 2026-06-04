import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FavoriteButton } from "@/components/favorite-button";

afterEach(cleanup);

describe("FavoriteButton", () => {
  it("renders star when not favorite", () => {
    render(<FavoriteButton isFavorite={false} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /add to favorites/i })).toBeInTheDocument();
    expect(screen.getByRole("button").textContent).toBe("☆");
  });

  it("renders filled star when favorite", () => {
    render(<FavoriteButton isFavorite={true} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /remove from favorites/i })).toBeInTheDocument();
    expect(screen.getByRole("button").textContent).toBe("⭐");
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<FavoriteButton isFavorite={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
