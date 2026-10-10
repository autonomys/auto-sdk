/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodType } from 'zod'
import { PromiseOr } from '../../utils/types'
import { RpcServer, TypedRpcCallback, TypedRpcNotificationHandler } from '../types'
import { StandardSchemaV1, StandardSchemaV1Output } from './standardSchema'

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

export type DefinitionType = StandardSchemaV1 | UnvalidatedType<any>

export type DefinitionTypeOutput<T extends DefinitionType> = T extends StandardSchemaV1
  ? StandardSchemaV1Output<T>
  : T extends UnvalidatedType<infer U>
    ? U
    : never

export type ApiDefinition = {
  methods: Record<string, MethodDefinition>
  notifications: Record<string, MessageDefinition>
}

export type HttpClientOptions = {
  headers?: Record<string, string>
}

export type WsClientType<S extends ApiDefinition> = {
  [K in keyof S['methods']]: (
    params: DefinitionTypeOutput<S['methods'][K]['params']>,
  ) => Promise<DefinitionTypeOutput<S['methods'][K]['returns']>>
}

export type HttpClientType<S extends ApiDefinition> = {
  [K in keyof S['methods']]: (
    params: DefinitionTypeOutput<S['methods'][K]['params']>,
    options?: HttpClientOptions,
  ) => Promise<DefinitionTypeOutput<S['methods'][K]['returns']>>
}

export type ApiServerHandlers<S extends ApiDefinition> = {
  [K in keyof S['methods']]: TypedRpcCallback<
    DefinitionTypeOutput<S['methods'][K]['params']>,
    PromiseOr<DefinitionTypeOutput<S['methods'][K]['returns']>>,
    S
  >
}

export type ApiServerNotificationHandlers<S extends ApiDefinition> = {
  [K in keyof S['notifications']]: TypedRpcNotificationHandler<
    DefinitionTypeOutput<S['notifications'][K]['content']>
  >
}

/**
 * Detects schemas that implement Standard Schema (https://standardschema.dev), like zod >= 3.24
 * and zod 4. It checks the shape instead of using instanceof, so schemas from any copy or version
 * of the validation library are detected. Some libraries (e.g. ArkType) use functions as schemas.
 */
export const isStandardSchema = (type: unknown): type is StandardSchemaV1 => {
  return (
    (typeof type === 'object' || typeof type === 'function') && type !== null && '~standard' in type
  )
}

/**
 * @deprecated Use isStandardSchema instead. This function will be removed in a future major release.
 */
export const isZodType = <T extends DefinitionType>(type: T): type is T & ZodType => {
  return type instanceof ZodType
}

export type ApiDefinitionClient<S extends ApiDefinition> = {
  api: WsClientType<S>
  close: () => void
  onNotification: <T extends keyof S['notifications']>(
    notificationName: T,
    handler: (params: DefinitionTypeOutput<S['notifications'][T]['content']>) => void,
  ) => void
}

export type ApiMockServerClient<S extends ApiDefinition> = ApiDefinitionClient<S> & {
  notificationClient: ApiServerNotificationHandlers<S>
}

export type TypedRpcServerClient<S extends ApiDefinition> = RpcServer & {
  notificationClient: ApiServerNotificationHandlers<S>
}
