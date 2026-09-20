"use client";

import { useState, useTransition } from "react";

interface VersionBadgeProps {
  version?: string;
  commit?: string;
  buildTime?: string;
}

export function VersionBadge({
  version = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
  commit = process.env.NEXT_PUBLIC_GIT_COMMIT || "dev",
  buildTime = process.env.NEXT_PUBLIC_BUILD_TIME,
}: VersionBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formattedVersion = version.startsWith("v") ? version : `v${version}`;
  const displayLabel = `${formattedVersion} · ${commit}`;

  async function handleCheckForUpdates() {
    if (!("serviceWorker" in navigator)) {
      setUpdateStatus("Service worker is not supported in this browser.");
      return;
    }

    setUpdateStatus("Checking for updates...");
    startTransition(async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (!registrations || registrations.length === 0) {
          // Attempt registering / checking active registration
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            setUpdateStatus(
              reg.waiting
                ? "New update is available! Reload to apply."
                : "Application is up to date.",
            );
          } else {
            setUpdateStatus("No active service worker registered.");
          }
          return;
        }

        let updatedFound = false;
        for (const reg of registrations) {
          await reg.update();
          if (reg.waiting || reg.installing) {
            updatedFound = true;
          }
        }

        if (updatedFound) {
          setUpdateStatus("New update found! Reload page to activate.");
        } else {
          setUpdateStatus("Application is up to date.");
        }
      } catch {
        setUpdateStatus("Unable to check for updates while offline.");
      }
    });
  }

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fuchsia-400"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="View build metadata & service worker status"
        title="View build metadata & service worker status"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/60 transition-transform group-hover:scale-125" />
        <span data-testid="version-display">{displayLabel}</span>
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Build Information"
            className="fixed bottom-6 left-4 right-4 z-50 rounded-2xl border border-white/10 bg-zinc-950/95 p-4 text-left shadow-2xl backdrop-blur-md sm:absolute sm:bottom-full sm:left-1/2 sm:right-auto sm:mb-2 sm:w-80 sm:-translate-x-1/2"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Build Reference
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-zinc-400 hover:text-white"
                aria-label="Close build details"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Version:</span>
                <span className="font-mono text-zinc-200" data-testid="detail-version">
                  {formattedVersion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Git Commit:</span>
                <span className="font-mono text-zinc-200" data-testid="detail-commit">
                  {commit}
                </span>
              </div>
              {buildTime ? (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Build Date:</span>
                  <span className="font-mono text-zinc-300" data-testid="detail-build-time">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(buildTime))}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={isPending}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? "Checking..." : "Check for SW updates"}
              </button>
              {updateStatus ? (
                <p
                  data-testid="update-status"
                  className="mt-2 text-center text-xs text-zinc-400"
                >
                  {updateStatus}
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
