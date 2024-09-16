import { createNode } from '@ipld/dag-pb'
import { CID } from 'multiformats'
import { cidOfNode, cidToString, stringToCid } from '../src/cid/index.js'

const randomCIDString = cidOfNode(createNode(new Uint8Array([]), [])).toString()

describe('CID', () => {
  it('should generate a valid CID from a node', () => {
    const node = createNode(new Uint8Array([1, 2, 3]), [])
    const cid = cidOfNode(node).toString()
    expect(cid).toBeDefined()
    expect(cidToString(stringToCid(cid))).toEqual(cid)
  })

  it('should convert CID string back to CID object', () => {
    const cidObject = stringToCid(randomCIDString)
    expect(cidObject).toBeInstanceOf(CID)
    expect(cidToString(cidObject)).toEqual(randomCIDString)
  })
})
