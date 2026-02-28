export interface Collector {
  name: string;
  collect(): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}

export interface CollectorOptions {
  enabled?: boolean;
  interval?: number;
  [key: string]: unknown;
}
