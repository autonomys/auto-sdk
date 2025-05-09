export type Job<T> = () => Promise<T>

type ConcurrencyController = <T>(job: Job<T>, concurrency: number) => Promise<T>

interface ScheduleTask<T> {
  job: Job<T>
  concurrency: number
}

export const weightedRequestConcurrencyController = (
  maxConcurrency: number,
  ensureOrder: boolean = false,
): ConcurrencyController => {
  if (maxConcurrency <= 0) {
    throw new Error('Max concurrency must be greater than 0')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queue: ScheduleTask<any>[] = []
  let active = 0

  const enqueue = <T>(task: Job<T>, concurrency: number): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push({
        job: () => task().then(resolve).catch(reject),
        concurrency,
      })
    })
  }

  const findExecutableTask = () => {
    const index = queue.findIndex((e) => active + e.concurrency <= maxConcurrency)
    const notMatched = index === -1
    const notFirst = ensureOrder && index !== 0
    if (notMatched || notFirst) {
      return null
    }

    return queue.splice(index, 1).at(0)
  }

  const manageJobFinalization = async (concurrency: number) => {
    active -= concurrency
    const executableTask = findExecutableTask()
    if (executableTask) {
      setImmediate(() => internalRunJob(executableTask.job, executableTask.concurrency))
    }
  }

  const internalRunJob = async <T>(job: Job<T>, concurrency: number): Promise<T> => {
    active += concurrency
    return job().finally(() => manageJobFinalization(concurrency))
  }

  const runJob = async <T>(job: Job<T>, concurrency: number): Promise<T> => {
    if (concurrency <= 0) {
      throw new Error('Concurrency must be greater than 0')
    }
    if (concurrency > maxConcurrency) {
      throw new Error('Concurrency must be less than or equal to max concurrency')
    }

    const exceededMaxConcurrency = active + concurrency > maxConcurrency
    const shouldRespectOrder = ensureOrder && queue.length > 0
    if (exceededMaxConcurrency || shouldRespectOrder) {
      return enqueue(job, concurrency)
    }

    return internalRunJob(job, concurrency)
  }

  return runJob
}
