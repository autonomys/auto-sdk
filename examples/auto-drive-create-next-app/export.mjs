import { createAutoDriveApi, uploadFolderFromFolderPath } from '@autonomys/auto-drive'
import path from 'path'

async function uploadBuild() {
  const apiKey =
    process.env.AUTO_DRIVE_API_KEY ||
    process.argv.find((arg) => arg.startsWith('--auto-drive-api-key='))?.split('=')[1]

  if (!apiKey) {
    console.error(
      'Error: AUTO_DRIVE_API_KEY environment variable or --auto-drive-api-key argument is required',
    )
    process.exit(1)
  }

  const api = createAutoDriveApi({ apiKey })
  const outDir = path.join('out')

  try {
    console.log('Starting upload of build files to Auto-Drive...')
    const folderCID = await uploadFolderFromFolderPath(api, outDir, {
      onProgress: (progress) => {
        console.log(`Upload progress: ${Math.round(progress)}%`)
      },
    })
    console.log(`Upload complete! Folder CID: ${folderCID}`)
    return folderCID
  } catch (error) {
    console.error('Error uploading to Auto-Drive:', error)
    process.exit(1)
  }
}

uploadBuild()
