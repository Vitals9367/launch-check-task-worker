/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
    /** The Standard Schema properties. */
    readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}
declare namespace StandardSchemaV1 {
    /** The Standard Schema properties interface. */
    interface Props<Input = unknown, Output = Input> {
        /** The version number of the standard. */
        readonly version: 1;
        /** The vendor name of the schema library. */
        readonly vendor: string;
        /** Validates unknown input values. */
        readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
        /** Inferred types associated with the schema. */
        readonly types?: Types<Input, Output> | undefined;
    }
    /** The result interface of the validate function. */
    type Result<Output> = SuccessResult<Output> | FailureResult;
    /** The result interface if validation succeeds. */
    interface SuccessResult<Output> {
        /** The typed output value. */
        readonly value: Output;
        /** The non-existent issues. */
        readonly issues?: undefined;
    }
    /** The result interface if validation fails. */
    interface FailureResult {
        /** The issues of failed validation. */
        readonly issues: ReadonlyArray<Issue>;
    }
    /** The issue interface of the failure output. */
    interface Issue {
        /** The error message of the issue. */
        readonly message: string;
        /** The path of the issue, if any. */
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }
    /** The path segment interface of the issue. */
    interface PathSegment {
        /** The key representing a path segment. */
        readonly key: PropertyKey;
    }
    /** The Standard Schema types interface. */
    interface Types<Input = unknown, Output = Input> {
        /** The input type of the schema. */
        readonly input: Input;
        /** The output type of the schema. */
        readonly output: Output;
    }
    /** Infers the input type of a Standard Schema. */
    type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["input"];
    /** Infers the output type of a Standard Schema. */
    type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}
type StandardSchemaDictionary = Record<string, StandardSchemaV1>;
declare namespace StandardSchemaDictionary {
    /**
     * A dictionary of Standard Schemas that match the input and output types.
     */
    type Matching<Input, Output extends Record<keyof Input, unknown> = Input> = {
        [K in keyof Input]-?: StandardSchemaV1<Input[K], Output[K]>;
    };
    type InferInput<T extends StandardSchemaDictionary> = {
        [K in keyof T]: StandardSchemaV1.InferInput<T[K]>;
    };
    type InferOutput<T extends StandardSchemaDictionary> = {
        [K in keyof T]: StandardSchemaV1.InferOutput<T[K]>;
    };
}

type ErrorMessage<T extends string> = T;
type Simplify<T> = {
    [P in keyof T]: T[P];
} & {};
type Impossible<T extends Record<string, any>> = Partial<Record<keyof T, never>>;
type UnReadonlyObject<T> = T extends Readonly<infer U> ? U : T;
type Reduce<TArr extends Array<Record<string, unknown>>, TAcc = {}> = TArr extends [] ? TAcc : TArr extends [infer Head, ...infer Tail] ? Tail extends Array<Record<string, unknown>> ? Head & Reduce<Tail, TAcc> : never : never;
interface BaseOptions<TShared extends Record<string, StandardSchemaV1>, TExtends extends Array<Record<string, unknown>>> {
    /**
     * How to determine whether the app is running on the server or the client.
     * @default typeof window === "undefined"
     */
    isServer?: boolean;
    /**
     * Shared variables, often those that are provided by build tools and is available to both client and server,
     * but isn't prefixed and doesn't require to be manually supplied. For example `NODE_ENV`, `VERCEL_URL` etc.
     */
    shared?: TShared;
    /**
     * Extend presets
     */
    extends?: TExtends;
    /**
     * Called when validation fails. By default the error is logged,
     * and an error is thrown telling what environment variables are invalid.
     */
    onValidationError?: (issues: readonly StandardSchemaV1.Issue[]) => never;
    /**
     * Called when a server-side environment variable is accessed on the client.
     * By default an error is thrown.
     */
    onInvalidAccess?: (variable: string) => never;
    /**
     * Whether to skip validation of environment variables.
     * @default false
     */
    skipValidation?: boolean;
    /**
     * By default, this library will feed the environment variables directly to
     * the Zod validator.
     *
     * This means that if you have an empty string for a value that is supposed
     * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
     * it as a type mismatch violation. Additionally, if you have an empty string
     * for a value that is supposed to be a string with a default value (e.g.
     * `DOMAIN=` in an ".env" file), the default value will never be applied.
     *
     * In order to solve these issues, we recommend that all new projects
     * explicitly specify this option as true.
     */
    emptyStringAsUndefined?: boolean;
}
interface LooseOptions<TShared extends Record<string, StandardSchemaV1>, TExtends extends Array<Record<string, unknown>>> extends BaseOptions<TShared, TExtends> {
    runtimeEnvStrict?: never;
    /**
     * What object holds the environment variables at runtime. This is usually
     * `process.env` or `import.meta.env`.
     */
    runtimeEnv: Record<string, string | boolean | number | undefined>;
}
interface StrictOptions<TPrefix extends string | undefined, TServer extends Record<string, StandardSchemaV1>, TClient extends Record<string, StandardSchemaV1>, TShared extends Record<string, StandardSchemaV1>, TExtends extends Array<Record<string, unknown>>> extends BaseOptions<TShared, TExtends> {
    /**
     * Runtime Environment variables to use for validation - `process.env`, `import.meta.env` or similar.
     * Enforces all environment variables to be set. Required in for example Next.js Edge and Client runtimes.
     */
    runtimeEnvStrict: Record<{
        [TKey in keyof TClient]: TPrefix extends undefined ? never : TKey extends `${TPrefix}${string}` ? TKey : never;
    }[keyof TClient] | {
        [TKey in keyof TServer]: TPrefix extends undefined ? TKey : TKey extends `${TPrefix}${string}` ? never : TKey;
    }[keyof TServer] | {
        [TKey in keyof TShared]: TKey extends string ? TKey : never;
    }[keyof TShared], string | boolean | number | undefined>;
    runtimeEnv?: never;
}
interface ClientOptions<TPrefix extends string | undefined, TClient extends Record<string, StandardSchemaV1>> {
    /**
     * The prefix that client-side variables must have. This is enforced both at
     * a type-level and at runtime.
     */
    clientPrefix: TPrefix;
    /**
     * Specify your client-side environment variables schema here. This way you can ensure the app isn't
     * built with invalid env vars.
     */
    client: Partial<{
        [TKey in keyof TClient]: TKey extends `${TPrefix}${string}` ? TClient[TKey] : ErrorMessage<`${TKey extends string ? TKey : never} is not prefixed with ${TPrefix}.`>;
    }>;
}
interface ServerOptions<TPrefix extends string | undefined, TServer extends Record<string, StandardSchemaV1>> {
    /**
     * Specify your server-side environment variables schema here. This way you can ensure the app isn't
     * built with invalid env vars.
     */
    server: Partial<{
        [TKey in keyof TServer]: TPrefix extends undefined ? TServer[TKey] : TPrefix extends "" ? TServer[TKey] : TKey extends `${TPrefix}${string}` ? ErrorMessage<`${TKey extends `${TPrefix}${string}` ? TKey : never} should not prefixed with ${TPrefix}.`> : TServer[TKey];
    }>;
}
type ServerClientOptions<TPrefix extends string | undefined, TServer extends Record<string, StandardSchemaV1>, TClient extends Record<string, StandardSchemaV1>> = (ClientOptions<TPrefix, TClient> & ServerOptions<TPrefix, TServer>) | (ServerOptions<TPrefix, TServer> & Impossible<ClientOptions<never, never>>) | (ClientOptions<TPrefix, TClient> & Impossible<ServerOptions<never, never>>);
type EnvOptions<TPrefix extends string | undefined, TServer extends Record<string, StandardSchemaV1>, TClient extends Record<string, StandardSchemaV1>, TShared extends Record<string, StandardSchemaV1>, TExtends extends Array<Record<string, unknown>>> = (LooseOptions<TShared, TExtends> & ServerClientOptions<TPrefix, TServer, TClient>) | (StrictOptions<TPrefix, TServer, TClient, TShared, TExtends> & ServerClientOptions<TPrefix, TServer, TClient>);
type TPrefixFormat = string | undefined;
type TServerFormat = Record<string, StandardSchemaV1>;
type TClientFormat = Record<string, StandardSchemaV1>;
type TSharedFormat = Record<string, StandardSchemaV1>;
type TExtendsFormat = Array<Record<string, unknown>>;
type CreateEnv<TServer extends TServerFormat, TClient extends TClientFormat, TShared extends TSharedFormat, TExtends extends TExtendsFormat> = Readonly<Simplify<StandardSchemaDictionary.InferOutput<TServer> & StandardSchemaDictionary.InferOutput<TClient> & StandardSchemaDictionary.InferOutput<TShared> & UnReadonlyObject<Reduce<TExtends>>>>;
declare function createEnv<TPrefix extends TPrefixFormat, TServer extends TServerFormat = NonNullable<unknown>, TClient extends TClientFormat = NonNullable<unknown>, TShared extends TSharedFormat = NonNullable<unknown>, const TExtends extends TExtendsFormat = []>(opts: EnvOptions<TPrefix, TServer, TClient, TShared, TExtends>): CreateEnv<TServer, TClient, TShared, TExtends>;

export { type BaseOptions, type ClientOptions, type CreateEnv, type EnvOptions, type ErrorMessage, type LooseOptions, type ServerClientOptions, type ServerOptions, type Simplify, StandardSchemaDictionary, StandardSchemaV1, type StrictOptions, createEnv };
