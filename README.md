# react-lib

This library offers React ApiRTC high order components. Theses are mostly hooks to fasten your ApiRTC integration.

## Install

`npm install @apirtc/react-lib`

## Use Hooks

### useSession

```
import { useSession } from '@apirtc/react-lib'
const { session: apirtcSession, connecting: apiRTCLoading } = useSession(
   { apiKey: apirtcConfig.apiKey },
   { cloudUrl: 'https://cloud.apirtc.com'});
```

### useConversation

```
import { useConversation } from '@apirtc/react-lib'
...
```


## Configure log level

In console, or from web app code:

```
globalThis.apirtcReactLibLogLevel.isDebugEnabled=true
```

Available LogLevels : isDebugEnabled, isInfoEnabled, isWarnEnabled
