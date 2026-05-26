export async function requestPersistence() {
  if (navigator.storage?.persist) {
    return navigator.storage.persist();
  }
  return false;
}
