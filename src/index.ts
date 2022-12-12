export * from './components'
export * from './hooks'

type LogLevel = {
    level: 'debug' | 'info' | 'warn' | 'error'
    isDebugEnabled: boolean
    isInfoEnabled: boolean
    isWarnEnabled: boolean
}

const INFO: LogLevel = { level: 'info', isDebugEnabled: false, isInfoEnabled: true, isWarnEnabled: true };

declare global {
    var apirtcReactLibLogLevel: LogLevel;
    var setApirtcReactLibLogLevel: Function;
}

// a default value MUST be set in case application using the library does not override it
globalThis.apirtcReactLibLogLevel = INFO;

export function setLogLevel(logLevelText: 'debug' | 'info' | 'warn' | 'error' | string) {
    switch (logLevelText) {
        case 'debug':
            globalThis.apirtcReactLibLogLevel = { level: 'debug', isDebugEnabled: true, isInfoEnabled: true, isWarnEnabled: true };
            break
        case 'info':
            globalThis.apirtcReactLibLogLevel = INFO;
            break
        case 'warn':
            globalThis.apirtcReactLibLogLevel = { level: 'warn', isDebugEnabled: false, isInfoEnabled: false, isWarnEnabled: true };
            break
        case 'error':
            globalThis.apirtcReactLibLogLevel = { level: 'error', isDebugEnabled: false, isInfoEnabled: false, isWarnEnabled: false };
            break
        default:
            // in case null is passed as input, default to 'info'
            globalThis.apirtcReactLibLogLevel = INFO;
    }
    return globalThis.apirtcReactLibLogLevel
}

globalThis.setApirtcReactLibLogLevel = setLogLevel;
