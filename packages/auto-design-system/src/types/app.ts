import { NetworkId } from '@autonomys/auto-utils'

export interface Route {
  name: string
  title: string
  networks?: NetworkId[]
  hidden?: boolean
  children?: Route[]
}
