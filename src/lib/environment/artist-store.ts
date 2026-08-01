class ArtistStore extends EventTarget {
  private preset: string = "sakura";
  private enabled: boolean = true;

  getSnapshot = () => {
    return `${this.preset}:${this.enabled}`;
  };

  getServerSnapshot = () => {
    return "sakura:true";
  };

  subscribe = (callback: () => void) => {
    this.addEventListener("change", callback);
    return () => this.removeEventListener("change", callback);
  };

  setConfig = (preset: string, enabled: boolean) => {
    if (this.preset === preset && this.enabled === enabled) return;
    this.preset = preset;
    this.enabled = enabled;
    this.dispatchEvent(new Event("change"));
  };
}

export const artistStore = new ArtistStore();

export function subscribeArtistConfig(callback: () => void) {
  return artistStore.subscribe(callback);
}

export function getArtistConfigSnapshot() {
  return artistStore.getSnapshot();
}

export function getServerArtistConfigSnapshot() {
  return artistStore.getServerSnapshot();
}
