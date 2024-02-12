# react-lib

This library offers React **ApiRTC** high order components. Theses are mostly hooks to fasten your **ApiRTC** integration.

## Install

`npm install @apirtc/react-lib @apirtc/apirtc`

Note: @apirtc/apirtc is required as a peer dependency.

## Coding example

Visit this [codesandbox](https://codesandbox.io/s/apirtc-react-lib-demo-nrmcrn) to understand how easy it is to create a simple conferencing application with **@apirtc/react-lib**.

## Hooks

### useSession

Get a stateful session:

```ts
import { useSession } from "@apirtc/react-lib";
const [credentials] = useState({ apiKey: "your_api_key" });
const { session } = useSession(credentials);
```

### useUserMediaDevices

Get a stateful list of available media devices:

```ts
import { useUserMediaDevices } from "@apirtc/react-lib";
const { userMediaDevices } = useUserMediaDevices(session);
```

This hook can also manage devices selection.

### useCameraStream

Get a stateful value for the camera stream:

```ts
import { useCameraStream } from "@apirtc/react-lib";
const { stream } = useCameraStream(session);
```

### useStreamApplyAudioProcessor

```ts
import { useStreamApplyAudioProcessor } from "@apirtc/react-lib";
const { stream: noiseReductionStream } = useStreamApplyAudioProcessor(
  stream,
  "noiseReduction"
);
```

### useStreamApplyVideoProcessor

```ts
import { useStreamApplyVideoProcessor } from "@apirtc/react-lib";
const { stream: blurredStream } = useStreamApplyVideoProcessor(stream, "blur");
```

### usePresence

Get a stateful map of contacts by group:

```ts
import { usePresence } from "@apirtc/react-lib";
const [groups] = useState(["groupName1", "groupName2"]);
const { contactsByGroup } = usePresence(session, groups);
```

### useConversation

Get a stateful **Conversation**:

```ts
import { useConversation } from "@apirtc/react-lib";
const { conversation } = useConversation(session, "conversationName");
```

### useConversationContacts

Get **Conversation** **Contact**s in your state:

```ts
import { useConversationContacts } from "@apirtc/react-lib";
const { contacts } = useConversationContacts(conversation);
```

### useConversationModeration

Get a set of candidates **Contacts**, and get notified of ejection:

```ts
import { useConversationModeration } from "@apirtc/react-lib";
const { candidates, onEjected, onEjectedSelf } =
  useConversationModeration(conversation);
```

### useConversationMessages

```ts
import { useConversationMessages } from "@apirtc/react-lib";
const { messages, sendMessage } = useConversationMessages(conversation);
```

### useConversationStreams

Control **Stream**s to publish, and get stateful arrays of published and subscribed **Stream**s:

```ts
import { useConversationStreams } from "@apirtc/react-lib";
const streamsToPublish = useMemo(
  () => (stream ? [{ stream: stream }] : []),
  [stream]
);
const { publishedStreams, subscribedStreams } = useConversationStreams(
  conversation,
  streamsToPublish
);
```

## Components

### VideoStream

Use it to display any **ApiRTC** **Stream**.

```tsx
import { VideoStream } from "@apirtc/react-lib";

<VideoStream stream={stream} muted={false}></VideoStream>;
```

Note: For more comprehensive set of UI components, please have a look at [@apirtc/mui-react-lib](https://github.com/ApiRTC/mui-react-lib)

## Configure log level

Available log levels:

- **debug**
- **info**
- **warn**
- **error**

from web app code:

```ts
import { setLogLevel } from "@apirtc/react-lib";

setLogLevel("warn");
```

from console:

```js
setApirtcReactLibLogLevel("debug");
```
