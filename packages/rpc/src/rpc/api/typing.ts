import { ZodType } from 'zod'
import { PromiseOr } from '../../utils/types'
import { RpcCallback } from '../types'

export interface UnvalidatedType<T> {
  _type?: T
}

export const defineUnvalidatedType = <T>(type?: T): UnvalidatedType<T> => {
  return {
    _type: type,
  }
}

export type MethodDefinition = {
  params: DefinitionType
  returns: DefinitionType
}

export type DefinitionType = ZodType | UnvalidatedType<any>

export type DefinitionTypeOutput<T extends DefinitionType> =
  T extends ZodType<any> ? T['_output'] : T extends UnvalidatedType<infer U> ? U : never

export type ApiDefinition = Record<string, MethodDefinition>

export type ApiClientType<S extends ApiDefinition> = {
  [K in keyof S]: (
    params: DefinitionTypeOutput<S[K]['params']>,
  ) => Promise<DefinitionTypeOutput<S[K]['returns']>>
}

export type ApiServerHandlers<S extends ApiDefinition> = {
  [K in keyof S]: RpcCallback<
    DefinitionTypeOutput<S[K]['params']>,
    PromiseOr<DefinitionTypeOutput<S[K]['returns']>>
  >
}

export const isZodType = <T extends DefinitionType>(type: T): type is T & ZodType => {
  return type instanceof ZodType
}
