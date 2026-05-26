export interface DeviceCapabilities {
  webGPU: boolean;
  storageQuota: number | null;
  speechRecognition: boolean;
  localOnly: boolean;
}

export async function detectCapabilities(): Promise<DeviceCapabilities> {
  const webGPU = "gpu" in navigator && !!(navigator as Navigator & { gpu?: unknown }).gpu;

  let storageQuota: number | null = null;
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    storageQuota = estimate.quota ?? null;
  }

  const speechRecognition =
    "SpeechRecognition" in globalThis || "webkitSpeechRecognition" in globalThis;

  const localOnly = !navigator.onLine || webGPU;

  return {
    webGPU,
    storageQuota,
    speechRecognition,
    localOnly,
  };
}
