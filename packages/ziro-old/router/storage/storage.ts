export interface Storage {
  get(key: string): string | null
  set(name: string, value: string, options?: any): void
  delete(name: string, options?: any): void
}
