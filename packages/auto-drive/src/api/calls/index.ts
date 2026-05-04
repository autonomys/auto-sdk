import * as downloadCalls from './download'
import * as paymentCalls from './payment'
import * as readCalls from './read'
import * as uploadCalls from './upload'
import * as writeCalls from './write'

export const apiCalls = {
  ...downloadCalls,
  ...paymentCalls,
  ...readCalls,
  ...uploadCalls,
  ...writeCalls,
}

// Re-export payment utilities as named exports so callers can use them
// as standalone functions without going through the apiCalls object.
export {
  getStoragePrice,
  getPaymentContractInfo,
  createPaymentIntent,
  watchPaymentTransaction,
  getPaymentIntentStatus,
  waitForPaymentCompletion,
} from './payment'
