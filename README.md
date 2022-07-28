# react-lib

This library offers React ApiRTC high order components. Theses are mostly hooks to fasten your ApiRTC integration.

## Install

`npm install @apirtc/react-lib

## Use Hooks

### useSession

```
const { session: apirtcSession, connecting: apiRTCLoading } = useSession(
   { apiKey: apirtcConfig.apiKey },
   { cloudUrl: 'https://cloud.apirtc.com'});
```

### useConversation



## Configure log level

In console, or from web app code :

```
globalThis.apirtcReactLibLogLevel.isDebugEnabled=true
globalThis.apirtcReactLibLogLevel.isInfoEnabled=true
```

Available LogLevels : isDebugEnabled, isInfoEnabled, isWarnEnabled
