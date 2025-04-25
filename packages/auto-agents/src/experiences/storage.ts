import { AutoDriveApi } from '@autonomys/auto-drive'
import { ethers } from 'ethers'
import { AgentExperience, ExperienceHeader, ExperienceUploadOptions } from './types.js'

export const uploadExperience = async (
  autoDriveApi: AutoDriveApi,
  wallet: ethers.Wallet,
  header: ExperienceHeader,
  data: unknown,
  { compression, password }: ExperienceUploadOptions,
) => {
  const fileName = `${header.agentName}-agent-${header.agentVersion}-memory-${header.timestamp}.json`

  const signature = await wallet.signMessage(JSON.stringify({ header, data }))
  const cid = await autoDriveApi.uploadObjectAsJSON({ header, data, signature }, fileName, {
    compression,
    password,
  })
  return cid
}

export const downloadExperience = async (
  autoDriveApi: AutoDriveApi,
  cid: string,
): Promise<AgentExperience> => {
  const stream = await autoDriveApi.downloadFile(cid)
  let file = Buffer.alloc(0)
  for await (const chunk of stream) {
    file = Buffer.concat([file, chunk])
  }

  const jsonString = new TextDecoder().decode(file)
  const data = JSON.parse(jsonString)
  return data
}
