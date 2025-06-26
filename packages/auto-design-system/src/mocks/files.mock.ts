import {
  CompressionAlgorithm,
  EncryptionAlgorithm,
  OffchainMetadata,
} from '@autonomys/auto-dag-data'

export const fileMock1: OffchainMetadata = {
  name: '431950369-2c9d1115-482a-4f06-9ac7-6605a21847c7.mp4',
  type: 'file',
  chunks: [
    {
      cid: 'bafkr6icidbuhnf2o6z4koeenicrl5u23iseesd7z57xipkdaqwtdrwa6ry',
      size: 65066n,
    },
    {
      cid: 'bafkr6iffb6ua6f7dxz6qszscxhzhk4xsxtazfp427asr2sfca4ayxgfrdi',
      size: 65066n,
    },
    {
      cid: 'bafkr6ihbo42s2tjkdc7epddpoyzjh3rtuvzn3dns2bz3zi6a7tfef5saoa',
      size: 65066n,
    },
    {
      cid: 'bafkr6icxyqzuh6laijaoygzpcufton6sl7adiepctrp6ufnbmss2vv42z4',
      size: 65066n,
    },
    {
      cid: 'bafkr6icjspy5uxgqhmmaliq6ar4igvl6qiyijbcyuvh3v46aqmelqcoqne',
      size: 26303n,
    },
  ],
  dataCid: 'bafkr6iguwo5hj3hjixm36i24vspcm7frxnwmluccu3xwmmvvs27mmbao74',
  mimeType: 'image/png',
  totalSize: 286567n,
  totalChunks: 5,
  uploadOptions: {
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}

export const fileMock2: OffchainMetadata = {
  name: 'Faucet.png',
  type: 'file',
  chunks: [
    {
      cid: 'bafkr6if32l2km23r3kxvvt7oo3q2h657uxv6fwborcv7ldq2w6jldfjzia',
      size: 65066n,
    },
    {
      cid: 'bafkr6ig3gylzdilxbp4oivhptlay3m7pf5e7wmxrv45gqlj7krdrruh464',
      size: 65066n,
    },
    {
      cid: 'bafkr6idwmmfua6hgu62ulym5r7pavogoajhj4blu6nlsc6awm7cnwbmdwe',
      size: 65066n,
    },
    {
      cid: 'bafkr6ibjgkv4lzzneavvbubdhstfamn7cq37j5emf3xlbda2ab7h4mivey',
      size: 65066n,
    },
    {
      cid: 'bafkr6ie6hddrxhtmywwdomzbudtedcyt4oc3zjb4wnmmvrmqys26fgetle',
      size: 65066n,
    },
    {
      cid: 'bafkr6ibv5x5ulwypmlhkagyqzgpssgelvngkk3mpljw4gtju4vacfliozm',
      size: 65066n,
    },
    {
      cid: 'bafkr6iayvmo63begjdcixhqbs4j6wtbe5owwhdqe2dzea6dtzhbsuj6u5a',
      size: 65066n,
    },
    {
      cid: 'bafkr6ihib5thmhqhuwqffwxhofmgmhxapgyxmos2smovtwqkwlttz5xc4i',
      size: 65066n,
    },
    {
      cid: 'bafkr6igddl675m5h73gcrycsaqdtkg3gll754i3webh7xabl3uo3rdb7cy',
      size: 60355n,
    },
  ],
  dataCid: 'bafkr6ifcumi7mbxta6tf4c6cypizevns2gaaakbicjipwio3n6sg4ezliq',
  mimeType: 'image/png',
  totalSize: 580883n,
  totalChunks: 9,
  uploadOptions: {
    encryption: {
      algorithm: EncryptionAlgorithm.AES_256_GCM,
    },
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}

export const fileMock3: OffchainMetadata = {
  name: 'Full Text Search Hasura.html',
  type: 'file',
  chunks: [],
  dataCid: 'bafkr6iahtm4qol5egxcjpm6pmrj7zcelho2fxk6hlwthde2fr7dhm2qyby',
  mimeType: 'text/html',
  totalSize: 1000000n,
  totalChunks: 1,
  uploadOptions: {
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}
export const fileMock4: OffchainMetadata = {
  name: 'document copy 4.json',
  type: 'file',
  chunks: [],
  dataCid: 'bafkr6ibi5y7g623pzyecs7deyp4qd4yeluaaemenf7rcg7llizqou66w2e',
  mimeType: 'application/json',
  totalSize: 1000000n,
  totalChunks: 1,
  uploadOptions: {
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}

export const fileMock5: OffchainMetadata = {
  name: '431950369-2c9d1115-482a-4f06-9ac7-6605a21847c7.mp4',
  type: 'file',
  chunks: [],
  dataCid: 'bafkr6if7hu4m3ulx7usg42t54745ofgctsqkgoc6eputnk5cqooqxfgzty',
  mimeType: 'video/mp4',
  totalSize: 1000000n,
  totalChunks: 1,
  uploadOptions: {
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}

export const fileMock6: OffchainMetadata = {
  name: 'test-folder',
  type: 'folder',
  dataCid: 'bafkr6if7hu4m3ulx7usg42t54745ofgctsqkgoc6eputnk5cqooqxfgzty',
  totalSize: 1000000n,
  totalFiles: 1,
  children: [
    { ...fileMock1, cid: 'bafkr6if7hu4m3ulx7usg42t54745ofgctsqkgoc6eputnk5cqooqxfgzty' },
    { ...fileMock2, cid: 'bafkr6if7hu4m3ulx7usg42t54745ofgctsqkgoc6eputnk5cqooqxfgzty' },
    { ...fileMock3, cid: 'bafkr6if7hu4m3ulx7usg42t54745ofgctsqkgoc6eputnk5cqooqxfgzty' },
    { ...fileMock4, cid: 'bafkr6if7hu4m3ulx7usg42t54745ofgctsqkgoc6eputnk5cqooqxfgzty' },
    { ...fileMock5, cid: 'bafkr6if7hu4m3ulx7usg42t54745ofgctsqkgoc6eputnk5cqooqxfgzty' },
  ],
  uploadOptions: {
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}

export const fileMock7: OffchainMetadata = {
  name: 'Autonomys One-pager.pdf',
  type: 'file',
  chunks: [],
  dataCid: 'bafkr6ie2hgiwiaimkyt4q6t3wkmigxlqgslu4nqlxb3xuie3ewm7c2uzze',
  mimeType: 'application/pdf',
  totalSize: 1000000n,
  totalChunks: 1,
  uploadOptions: {
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}
export const fileMock8: OffchainMetadata = {
  name: 'sample-3s.mp3',
  type: 'file',
  chunks: [],
  dataCid: 'bafkr6igltyc3gmgouds66xws3owkuoj53vm3gzyt6q4cq4ntv6szvidor4',
  mimeType: 'audio/mpeg',
  totalSize: 1000000n,
  totalChunks: 1,
  uploadOptions: {
    compression: {
      algorithm: CompressionAlgorithm.ZLIB,
    },
  },
}
