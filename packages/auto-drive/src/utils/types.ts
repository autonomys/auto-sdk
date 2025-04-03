export type ArgsWithPagination<T = object> = T & {
  limit: number
  offset: number
}

export type ArgsWithoutPagination<T = object> = T
