import { useState, useEffect, useCallback } from "react";

import { Conversation, Stream, StreamInfo } from '@apirtc/apirtc';

// TODO?: get a streamsToPublish input array
// and handle publish/replace/unpublish internally. This would avoid
// developper to manage this lifecycle (especially for replace...)
// Not sure because the conversation joined state is handled in another hook...

// TODO: add pagination ?
// TODO: make thoses hooks open-source

// interface Options {
//   // TODO: implement pagination ?
//   remoteStreamsPageSize: number
// }

const HOOK_NAME = "useConversationStreams"
export default function useConversationStreams(
  conversation: Conversation | undefined,
  /** fully managed Stream to published */
  streamsToPublish: Array<Stream> = []
) {
  // , options?:Options

  const [s_streamsToPublish, setToPublish] = useState<Array<Stream>>([])

  const [publishedStreams, setPublishedStreams] = useState<Array<Stream>>(new Array<Stream>())
  const [subscribedStreams, setSubscribedStreams] = useState<Array<Stream>>(new Array<Stream>());

  useEffect(() => {
    doHandlePublication(streamsToPublish)
    setToPublish(streamsToPublish)
  }, [JSON.stringify(streamsToPublish.map(l_s => l_s.getId()))]);

  const publish: (localStream: Stream) => Promise<Stream> = useCallback((localStream: Stream) => {
    return new Promise<Stream>((resolve, reject) => {
      console.log(HOOK_NAME + "|publish", conversation, localStream)
      conversation?.publish(localStream).then(stream => {
        console.log(HOOK_NAME + "|stream published", stream);
        publishedStreams.push(stream)
        // Returning a new array makes lets React detect changes
        setPublishedStreams(Array.from(publishedStreams))
        resolve(stream);
      }).catch((error: any) => {
        console.error(HOOK_NAME + "|publish", error)
        reject(error)
      });
    })
  }, [conversation, publishedStreams])

  const replacePublishedStream = useCallback((oldStream: Stream, newStream: Stream) => {
    console.log(HOOK_NAME + "|replacePublishedStream", oldStream, newStream)
    conversation?.getConversationCall(oldStream).replacePublishedStream(newStream)
      .then((stream: Stream) => {
        console.log(HOOK_NAME + "|stream replaced", oldStream, stream);
        publishedStreams.splice(publishedStreams.indexOf(oldStream), 1, stream);
        setPublishedStreams(Array.from(publishedStreams))
      }).catch(error => {
        console.error(HOOK_NAME + "|replacePublishedStream", error)
      });
  }, [conversation, publishedStreams])

  const unpublish: (localStream: Stream) => void = useCallback((localStream: Stream) => {
    console.log(HOOK_NAME + "|unpublish", conversation, localStream)
    conversation?.unpublish(localStream);
    publishedStreams.splice(publishedStreams.indexOf(localStream), 1)
    setPublishedStreams(Array.from(publishedStreams))
  }, [conversation, publishedStreams])

  const doHandlePublication = useCallback((streams: Array<Stream>) => {
    if (s_streamsToPublish[0] && streams[0] && (s_streamsToPublish[0] !== streams[0])) {
      replacePublishedStream(s_streamsToPublish[0], streams[0])
    }
    else if (s_streamsToPublish[0] && !streams[0]) {
      unpublish(s_streamsToPublish[0]);
    } else if (streams[0]) {
      publish(streams[0]);
    }
  }, [JSON.stringify(s_streamsToPublish.map(l_s => l_s.getId())), publish, unpublish, replacePublishedStream])

  const on_streamAdded = useCallback((remoteStream: Stream) => {
    // display media stream
    console.log(HOOK_NAME + "|on_streamAdded", remoteStream)
    // Because on_streamAdded is a library event listener, using useState remoteStreams
    // is bogus (seems an diffrent instance is created in that context)
    // Using useCallback with remoteStreams as dependencies fixes it
    // Also, returning a new array makes lets React detect changes
    // setRemoteStreams(l_remoteStreams => {
    //   l_remoteStreams.push(remoteStream); return Array.from(l_remoteStreams);
    // });
    subscribedStreams.push(remoteStream)
    setSubscribedStreams(Array.from(subscribedStreams));
  }, [subscribedStreams])

  const on_streamRemoved = useCallback((remoteStream: Stream) => {
    console.log(HOOK_NAME + "|on_streamRemoved", remoteStream);
    subscribedStreams.splice(subscribedStreams.indexOf(remoteStream), 1)
    setSubscribedStreams(Array.from(subscribedStreams));
  }, [subscribedStreams])

  const on_streamListChanged = useCallback((streamInfo: StreamInfo) => {
    const streamId = String(streamInfo.streamId)
    //const contactId = String(streamInfo.contact?.getId());
    if (streamInfo.isRemote === true) {
      if (streamInfo.listEventType === 'added') {
        // a remote stream was published
        conversation?.subscribeToStream(streamId);
      } else if (streamInfo.listEventType === 'removed') {
        // a remote stream is not published anymore
        conversation?.unsubscribeToStream(streamId)
      }
    }
  }, [conversation])

  useEffect(() => {
    // Subscribe to incoming streams
    if (conversation) {
      conversation.on('streamAdded', on_streamAdded);
      conversation.on('streamRemoved', on_streamRemoved);
      conversation.on('streamListChanged', on_streamListChanged);

      // Subscribe to existing remote streams
      conversation.getAvailableStreamList().forEach(streamInfo => {
        const streamId = String(streamInfo.streamId)
        if (streamInfo.isRemote === true) {
          conversation.subscribeToStream(streamId);
        }
      })
    }
    
    return () => {
      console.log(HOOK_NAME + "|conversation clear", conversation, publishedStreams)
      if (conversation) {
        publishedStreams.forEach(stream => {
          console.log(HOOK_NAME + "|conversation clear, unpublish", conversation, stream)
          conversation.unpublish(stream);
        });
        setPublishedStreams(new Array<Stream>());

        // remove listeners
        conversation.removeListener('streamListChanged', on_streamListChanged);
        conversation.removeListener('streamAdded', on_streamAdded);
        conversation.removeListener('streamRemoved', on_streamRemoved);

        // Clear remote streams with new array so that parent gets notified of a change.
        // Simply setting length to 0 is not detected by react.
        setSubscribedStreams(new Array<Stream>());
      }
    }
  }, [conversation]);

  return {
    publishedStreams,
    subscribedStreams,
    publish,
    unpublish,
    replacePublishedStream
  };
}
