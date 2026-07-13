export class TTSPromiseCache<T> {
  private readonly entries = new Map<string, Promise<T>>();

  constructor(private readonly limit: number = 20) {}

  deleteIfSame(key: string, request: Promise<T>): boolean {
    if (this.entries.get(key) !== request) return false;
    return this.entries.delete(key);
  }

  getOrCreate(key: string, loader: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing) return existing;

    let request: Promise<T>;
    request = Promise.resolve()
      .then(loader)
      .catch((error) => {
        if (this.entries.get(key) === request) {
          this.entries.delete(key);
        }
        throw error;
      });

    this.entries.set(key, request);
    while (this.entries.size > this.limit) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
    return request;
  }
}
