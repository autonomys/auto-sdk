export const MAX_FILE_SIZE = BigInt(100 * 1024 * 1024) // 100 MB

export const EXTERNAL_ROUTES = {
  gatewayObjectDownload: (cid: string) => `https://gateway.autonomys.xyz/file/${cid}`,
}
