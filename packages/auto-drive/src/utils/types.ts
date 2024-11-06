export type ArgsWithPagination<T = {}> = T & {
  limit: number
  offset: number
}

export type ArgsWithoutPagination<T = {}> = T
