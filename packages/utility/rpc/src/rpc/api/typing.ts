import { ZodType } from 'zod'
import { PromiseOr } from '../../utils/types'
import { RpcCallback, TypedRpcCallback, TypedRpcNotificationHandler } from '../types'

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

export type MessageDefinition = {
  content: DefinitionType
}

export type DefinitionType = ZodType | UnvalidatedType<any>

export type DefinitionTypeOutput<T extends DefinitionType> =
  T extends ZodType<any> ? T['_output'] : T extends UnvalidatedType<infer U> ? U : never

export type ApiDefinition = {
  methods: Record<string, MethodDefinition>
  notifications: Record<string, MessageDefinition>
}

export type ApiClientType<S extends ApiDefinition> = {
  [K in keyof S['methods']]: (
    params: DefinitionTypeOutput<S['methods'][K]['params']>,
  ) => Promise<DefinitionTypeOutput<S['methods'][K]['returns']>>
}

export type ApiServerHandlers<S extends ApiDefinition> = {
  [K in keyof S['methods']]: TypedRpcCallback<
    DefinitionTypeOutput<S['methods'][K]['params']>,
    PromiseOr<DefinitionTypeOutput<S['methods'][K]['returns']>>,
    S
  >
}

export type ApiServerNotifications<S extends ApiDefinition> = {
  [K in keyof S['notifications']]: TypedRpcNotificationHandler<
    DefinitionTypeOutput<S['notifications'][K]['content']>
  >
}

export const isZodType = <T extends DefinitionType>(type: T): type is T & ZodType => {
  return type instanceof ZodType
}
