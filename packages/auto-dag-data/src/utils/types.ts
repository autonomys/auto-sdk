export type PickPartial<T, K extends keyof T> = Pick<T, K> & Partial<T>
