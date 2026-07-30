/**
 * StorageRepository Interface Contract
 * Abstracts LocalStorage vs Expo/React Native SecureStore for Web + Mobile compatibility.
 */

export interface IStorageRepository {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
