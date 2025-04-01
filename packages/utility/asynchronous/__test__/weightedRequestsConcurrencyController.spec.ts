import { weightedRequestConcurrencyController } from '../src/concurrency/weightedRequestsConcurrencyController'

const mockRequest = async (id: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Response from request ${id}`)
    }, 100)
  })
}

const mockTimestampedRequest = async () => {
  const timestamp = Date.now()
  return new Promise<number>((resolve) => {
    setTimeout(() => {
      resolve(timestamp)
    }, 100)
  })
}

describe('MultirequestAsyncController', () => {
  it('should handle multiple requests resolving in order', async () => {
    const maxConcurrency = 2
    const controller = weightedRequestConcurrencyController(maxConcurrency)
    const requests = Array.from({ length: 5 }, (_, i) => () => mockRequest(i + 1))

    const results = await Promise.all(requests.map((request) => controller(request, 1)))

    expect(results).toEqual([
      'Response from request 1',
      'Response from request 2',
      'Response from request 3',
      'Response from request 4',
      'Response from request 5',
    ])
  })

  it('should handle multiple requests applying without exceeding max concurrency', async () => {
    let counter = 0
    const maxConcurrency = 3
    const requests = Array.from({ length: 5 }, () => async () => {
      if (counter > maxConcurrency) throw new Error('Too many requests')
      counter++
      await mockRequest(counter)
      counter--
    })

    const controller = weightedRequestConcurrencyController(maxConcurrency)
    await expect(
      Promise.all(requests.map((request) => controller(request, 1))),
    ).resolves.not.toThrow()
  })

  it('should handle multiple requests applying without exceeding max concurrency (different weights)', async () => {
    const maxConcurrency = 10
    let counter = 0
    const requests = Array.from({ length: 10 }, (_, i) => async () => {
      if (counter > maxConcurrency) throw new Error('Too many requests')
      counter += i
      await mockRequest(counter)
      counter -= i
    })

    const controller = weightedRequestConcurrencyController(maxConcurrency)
    await expect(
      Promise.all(requests.map((request, i) => controller(request, i))),
    ).resolves.not.toThrow()
  })

  it('should handle light weight requests', async () => {
    const maxConcurrency = 4
    const weights = [3, 3, 3, 1]
    const requests = weights.map(() => mockTimestampedRequest)

    const controller = weightedRequestConcurrencyController(maxConcurrency)
    const results = await Promise.all(requests.map((request, i) => controller(request, weights[i])))

    expect(results[0]).toBeLessThanOrEqual(results[3])
    expect(results[3]).toBeLessThanOrEqual(results[1])
    expect(results[1]).toBeLessThanOrEqual(results[2])
  })

  it('should respect order of execution (using ensureOrder flag)', async () => {
    const maxConcurrency = 4
    const weights = [3, 3, 3, 1]
    const requests = weights.map(() => mockTimestampedRequest)

    const controller = weightedRequestConcurrencyController(maxConcurrency, true)
    const results = await Promise.all(requests.map((request, i) => controller(request, weights[i])))

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i]).toBeLessThanOrEqual(results[i + 1])
    }
  })
})
