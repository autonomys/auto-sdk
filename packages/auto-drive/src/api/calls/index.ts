import * as downloadCalls from './download'
import * as readCalls from './read'
import * as uploadCalls from './upload'
import * as writeCalls from './write'

export const apiCalls = {
  ...downloadCalls,
  ...readCalls,
  ...uploadCalls,
  ...writeCalls,
}
