# react-lib

This library offers React **ApiRTC** high order components. Theses are mostly hooks to fasten your **ApiRTC** integration.

## Install

`npm install @apirtc/react-lib`

requires to have @apirtc/apirtc peer dependency installed too:

`npm install @apirtc/apirtc`

## Hooks

### useSession

Get a stateful session:

```ts
import { useSession } from '@apirtc/react-lib'
const { session } = useSession({ apiKey: 'your_api_key' });
```
### useUserMediaDevices

Get a stateful list of available media devices:

```ts
import { useUserMediaDevices } from '@apirtc/react-lib'
const { userMediaDevices } = useUserMediaDevices(session);
```

### useCameraStream

Get a stateful value for the camera stream:

```ts
import { useCameraStream } from '@apirtc/react-lib'
const { stream } = useCameraStream(session);
```

### useStreamApplyVideoProcessor

```ts
import { useStreamApplyVideoProcessor } from '@apirtc/react-lib'
const { stream: blurredStream } = useStreamApplyVideoProcessor(stream, 'blur');
```

### usePresence

Get a stateful map of contacts by group:

```ts
import { usePresence } from '@apirtc/react-lib'
const { contactsByGroup } = usePresence(session, ['groupName1', 'groupName2']);
```

### useConversation

Get a stateful **Conversation**:

```ts
import { useConversation } from '@apirtc/react-lib'
const { conversation } = useConversation(session, 'conversationName');
```

### useConversationModeration

Get a set of candidates **Contacts**, and get notified of ejection:

```ts
import { useConversationModeration } from '@apirtc/react-lib'
const { candidates, onEjected, onEjectedSelf } = useConversationModeration(conversation);
```

### useConversationMessages

```ts
import { useConversationMessages } from '@apirtc/react-lib'
const { messages, sendMessage } = useConversationMessages(conversation);
```

### useConversationStreams

Control **Stream**s to publish, and get stateful arrays of published and subscribed **Stream**s:

```ts
import { useConversationStreams } from '@apirtc/react-lib'
const { publishedStreams, subscribedStreams } = useConversationStreams(
        conversation, stream ? [{ stream: stream }] : []);
```

## Components

### VideoStream

Use it to display any **ApiRTC** **Stream**.

```tsx
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

```ts
import { setLogLevel } from '@apirtc/react-lib'

setLogLevel('warn')
```

from console:

```js
setApirtcReactLibLogLevel('debug')
```
