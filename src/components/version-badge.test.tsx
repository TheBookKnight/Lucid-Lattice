import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VersionBadge } from "./version-badge";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("VersionBadge Component", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("renders with default fallback values when env vars are missing", () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.NEXT_PUBLIC_GIT_COMMIT;

    render(<VersionBadge />);
    const display = screen.getByTestId("version-display");
    expect(display).toHaveTextContent(/v0\.1\.0 · dev/);
  });

  it("renders custom version and commit props correctly", () => {
    render(<VersionBadge version="0.4.2" commit="8e86fd7" />);
    const display = screen.getByTestId("version-display");
    expect(display).toHaveTextContent("v0.4.2 · 8e86fd7");
  });

  it("normalizes version with existing leading v prefix", () => {
    render(<VersionBadge version="v2.0.1" commit="abc1234" />);
    const display = screen.getByTestId("version-display");
    expect(display).toHaveTextContent("v2.0.1 · abc1234");
  });

  it("toggles build reference modal on badge click", () => {
    render(
      <VersionBadge
        version="1.0.0"
        commit="1a2b3c4"
        buildTime="2026-09-20T12:00:00Z"
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    // Click badge to open
    const button = screen.getByRole("button", { name: /view build metadata/i });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("detail-version")).toHaveTextContent("v1.0.0");
    expect(screen.getByTestId("detail-commit")).toHaveTextContent("1a2b3c4");
    expect(screen.getByTestId("detail-build-time")).toBeInTheDocument();

    // Close button dismisses dialog
    const closeBtn = screen.getByRole("button", { name: /close build details/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("handles service worker update checks when serviceWorker is not supported", async () => {
    const originalNavigator = window.navigator;
    // Mock navigator without serviceWorker
    Object.defineProperty(window, "navigator", {
      value: { ...originalNavigator },
      configurable: true,
      writable: true,
    });
    // Ensure serviceWorker property is not present
    delete (window.navigator as unknown as { serviceWorker?: unknown }).serviceWorker;

    render(<VersionBadge />);
    const button = screen.getByRole("button", { name: /view build metadata/i });
    fireEvent.click(button);

    const checkBtn = screen.getByRole("button", { name: /check for sw updates/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByTestId("update-status")).toHaveTextContent(
        /service worker is not supported/i
      );
    });
  });

  it("checks for updates with active service worker registration", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      update: mockUpdate,
      waiting: null,
      installing: null,
    };

    Object.defineProperty(window, "navigator", {
      value: {
        ...window.navigator,
        serviceWorker: {
          getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
          getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        },
      },
      configurable: true,
      writable: true,
    });

    render(<VersionBadge />);
    const button = screen.getByRole("button", { name: /view build metadata/i });
    fireEvent.click(button);

    const checkBtn = screen.getByRole("button", { name: /check for sw updates/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByTestId("update-status")).toHaveTextContent(
        /application is up to date/i
      );
    });
  });

  it("reports when an updated service worker is waiting or installing", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      update: mockUpdate,
      waiting: { postMessage: vi.fn() },
      installing: null,
    };

    Object.defineProperty(window, "navigator", {
      value: {
        ...window.navigator,
        serviceWorker: {
          getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
          getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        },
      },
      configurable: true,
      writable: true,
    });

    render(<VersionBadge />);
    const button = screen.getByRole("button", { name: /view build metadata/i });
    fireEvent.click(button);

    const checkBtn = screen.getByRole("button", { name: /check for sw updates/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByTestId("update-status")).toHaveTextContent(
        /new update found! reload page to activate/i
      );
    });
  });
});
