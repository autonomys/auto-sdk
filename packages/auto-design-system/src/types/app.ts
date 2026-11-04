import { NetworkId } from '@autonomys/auto-utils/constants'

export interface Route {
  name: string
  title: string
  networks?: NetworkId[]
  hidden?: boolean
  children?: Route[]
}
