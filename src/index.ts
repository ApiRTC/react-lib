export * from './components'
export * from './hooks'

type LogLevel = {
    isDebugEnabled: boolean
    isInfoEnabled: boolean
    isWarnEnabled: boolean
}

declare global {
    var apirtcReactLibLogLevel: LogLevel;
}

// a default value MUST be set in case application using the library does not override it
globalThis.apirtcReactLibLogLevel = { isDebugEnabled: false, isInfoEnabled: true, isWarnEnabled: true };
