# react-lib

This library offers React **ApiRTC** high order components. Theses are mostly hooks to fasten your **ApiRTC** integration.

## Install

`npm install @apirtc/react-lib`

requires to have @apirtc/apirtc peer dependency installed too:

`npm install @apirtc/apirtc`

## Hooks

### useSession

```
import { useSession } from '@apirtc/react-lib'
const { session } = useSession({ apiKey: 'your_api_key' });
```
### useUserMediaDevices

```
import { useUserMediaDevices } from '@apirtc/react-lib'
const { userMediaDevices } = useUserMediaDevices(session);
```

### useCameraStream

```
import { useCameraStream } from '@apirtc/react-lib'
const { stream } = useCameraStream(session);
```

### useStreamApplyVideoProcessor

```
import { useStreamApplyVideoProcessor } from '@apirtc/react-lib'
const { stream: localStream } = useStreamApplyVideoProcessor(stream, 'blur');
```

### usePresence

```
import { usePresence } from '@apirtc/react-lib'
const { contactsByGroup } = usePresence(session, ['groupName1', 'groupName2']);
```

### useConversation

```
import { useConversation } from '@apirtc/react-lib'
const { conversation } = useConversation(session, 'conversationName', undefined, true);
```

### useConversationModeration

```
import { useConversationModeration } from '@apirtc/react-lib'
const { candidates } = useConversationModeration(conversation);
```

### useConversationMessages

```
import { useConversationMessages } from '@apirtc/react-lib'
const { messages, sendMessage } = useConversationMessages(conversation);
```

### useConversationStreams

```
import { useConversationStreams } from '@apirtc/react-lib'
const { publishedStreams, subscribedStreams } = useConversationStreams(
        conversation, stream ? [{ stream: stream }] : []);
```

## Components

### VideoStream

Use it to display any **ApiRTC** **Stream**.

```
import { VideoStream } from '@apirtc/react-lib'

<VideoStream stream={stream} muted={false}></VideoStream>
```

## Configure log level

Available log levels:

 * **debug**
 * **info**
 * **warn**
 * **error**

from web app code:

```
import { setLogLevel } from '@apirtc/react-lib'

setLogLevel('warn')
```

from console:

```
ApiRtcReactLib.setLogLevel('debug')
```
