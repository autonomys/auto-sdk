// Minimal copy of the Standard Schema v1 types (https://standardschema.dev). The spec
// recommends copying them, so accepting schemas doesn't tie the package to a validation library.

export type StandardSchemaV1Issue = {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>
}

export type StandardSchemaV1Result<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaV1Issue> }

export type StandardSchemaV1<Input = unknown, Output = Input> = {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown,
    ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>
    readonly types?: { readonly input: Input; readonly output: Output }
  }
}

export type StandardSchemaV1Output<Schema extends StandardSchemaV1> = NonNullable<
  Schema['~standard']['types']
>['output']
