import * as rxjs from 'rxjs'

const asyncCallback = <T, O>(callback: (t: T) => O) => {
  return (t: T) => {
    callback(t)
  }
}

export class PromisedObservable<T> extends rxjs.Observable<T> {
  constructor(subscribe?: (this: rxjs.Observable<T>, subscriber: rxjs.Subscriber<T>) => void) {
    super(subscribe && asyncCallback(subscribe))
  }

  get promise(): Promise<T> {
    return lastValueFrom(this)
  }
}

export const { firstValueFrom, lastValueFrom } = rxjs
