import { firstValueFrom, lastValueFrom, Observable, Subscriber } from 'rxjs'

const asyncCallback = <T, O>(callback: (t: T) => O) => {
  return (t: T) => {
    callback(t)
  }
}

export class PromisedObservable<T> extends Observable<T> {
  constructor(subscribe?: (this: Observable<T>, subscriber: Subscriber<T>) => void) {
    super(subscribe && asyncCallback(subscribe))
  }

  get promise(): Promise<T> {
    return lastValueFrom(this)
  }
}

export { firstValueFrom, lastValueFrom }
