import { useState, useEffect, useCallback } from 'react'
import { Conversation, PublishOptions, Stream, StreamInfo } from '@apirtc/apirtc'

// TODO: add pagination ?
// interface Options {
//   streamsSubscribePageSize: number
// }

const HOOK_NAME = "useConversationStreams"
export default function useConversationStreams(
  conversation: Conversation | undefined,
  /** fully managed list of Stream(s) to publish */
  streamsToPublish: Array<Stream | undefined | null> = [],
  errorCallback?: (error: any) => void
) {

  // A cache to handle publication differences
  const [publishedStreamsCache, setPublishedStreamsCache] = useState<Array<Stream | undefined | null>>([])

  // Use an internal array which will always be the same object as far as React knows
  // This will avoid the need for adding it as a dependency for each callback
  const [publishedStreams] = useState<Array<Stream>>(new Array<Stream>())
  // And use a copy as output array so that client code will react upon change
  // (only a new instance of array is detected by React)
  const [o_publishedStreams, setO_PublishedStreams] = useState<Array<Stream>>(new Array<Stream>())

  const [subscribedStreams] = useState<Array<Stream>>(new Array<Stream>())
  const [o_subscribedStreams, setO_SubscribedStreams] = useState<Array<Stream>>(new Array<Stream>())

  const publish: (localStream: Stream, options?: PublishOptions) => Promise<Stream> =
    useCallback((localStream: Stream, options?: PublishOptions) => {
      return new Promise<Stream>((resolve, reject) => {
        if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
          console.debug(HOOK_NAME + "|publish", conversation, localStream, options, localStream instanceof Stream)
        }
        conversation?.publish(localStream, options).then((stream: Stream) => {
          if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
            console.info(HOOK_NAME + "|stream published", stream)
          }
          //console.log(`PUSHING ${stream.getId()} to publishedStreams`, JSON.stringify(publishedStreams.map(s => s.getId())))
          publishedStreams.push(stream)
          // Returning a new array makes lets React detect changes
          setO_PublishedStreams(Array.from(publishedStreams))
          resolve(stream)
        }).catch((error: any) => {
          reject(error)
        })
      })
    }, [conversation])

  const replacePublishedStream = useCallback((oldStream: Stream, newStream: Stream) => {
    return new Promise<Stream>((resolve, reject) => {
      if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
        console.debug(HOOK_NAME + "|replacePublishedStream", oldStream, newStream)
      }
      conversation?.getConversationCall(oldStream)?.replacePublishedStream(newStream)
        .then((stream: Stream) => {
          if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
            console.info(HOOK_NAME + "|stream replaced", oldStream, stream)
          }
          const index = publishedStreams.indexOf(oldStream)
          if (index >= 0) {
            publishedStreams.splice(index, 1, stream)
          } else {
            console.error(HOOK_NAME + "|cannot splice", publishedStreams, index)
          }
          setO_PublishedStreams(Array.from(publishedStreams))
          resolve(stream)
        }).catch(error => {
          reject(error)
        })
    })
  }, [conversation])

  const unpublish: (localStream: Stream) => void = useCallback((localStream: Stream) => {
    if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
      console.debug(HOOK_NAME + "|unpublish", conversation, localStream)
    }
    conversation?.unpublish(localStream)
    const index = publishedStreams.indexOf(localStream)
    if (index >= 0) {
      publishedStreams.splice(index, 1)
      setO_PublishedStreams(Array.from(publishedStreams))
    } else {
      console.error(HOOK_NAME + "|cannot splice", publishedStreams, index)
    }
  }, [conversation])

  const doHandlePublication = useCallback(() => {
    const maxLength = Math.max(publishedStreamsCache.length, streamsToPublish.length)
    if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
      console.debug(HOOK_NAME + "|doHandlePublication", streamsToPublish, publishedStreamsCache, maxLength)
    }
    const newPublishedStreamsCache = new Array<Stream>()
    // Loop on arrays index to publish new streams, or replace if necessary
    for (let i = 0; i < maxLength; i++) {
      const stream = streamsToPublish[i];
      const streamToPublish = publishedStreamsCache[i];
      if (streamToPublish && stream) {
        if (streamToPublish !== stream) {
          // If position in both new and cached list are valid but are different : replace
          replacePublishedStream(streamToPublish, stream).then((l_stream: Stream) => {
            newPublishedStreamsCache.splice(i, 0, l_stream);
          }).catch((error: Error) => {
            if (errorCallback) {
              errorCallback(error)
            } else if (globalThis.apirtcReactLibLogLevel?.isWarnEnabled) {
              console.warn(HOOK_NAME + "|replacePublishedStream", error)
            }
          })
        }
        else {
          newPublishedStreamsCache.splice(i, 0, stream);
        }
      } else if (streamToPublish && !stream) {
        // If position in new list is now undefined(or null) while it was in cache : unpublish
        unpublish(streamToPublish)
      } else if (stream) {
        // If position in new list is valid : publish it whatever the position in cache.
        // Depending on the case the stream might be already published, or it might be not
        // (can happen if the cache was set while Conversation was not joined yet).
        // Note that we could try to publish without checking isPublishedStream, the call would
        // reject with a console error but this would not affect the behaviour.
        if (conversation && !conversation.isPublishedStream(stream)) {
          publish(stream).then((l_stream: Stream) => {
            newPublishedStreamsCache.splice(i, 0, l_stream);
          }).catch((error: Error) => {
            if (errorCallback) {
              errorCallback(error)
            } else if (globalThis.apirtcReactLibLogLevel?.isWarnEnabled) {
              console.warn(HOOK_NAME + "|publish", error)
            }
          })
        }
      }
    }
    setPublishedStreamsCache(newPublishedStreamsCache)
  }, [conversation, streamsToPublish,
    JSON.stringify(publishedStreamsCache.map(l_s => l_s?.getId())),
    publish, unpublish, replacePublishedStream])

  // --------------------------------------------------------------------------
  // useEffect(s) - Order is important
  //
  useEffect(() => {
    if (conversation) {
      const on_streamAdded = (remoteStream: Stream) => {
        if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_streamAdded", remoteStream)
        }
        //console.log(`PUSHING ${remoteStream.getId()} to subscribedStreams`, JSON.stringify(subscribedStreams.map(s => s.getId())))
        subscribedStreams.push(remoteStream)
        setO_SubscribedStreams(Array.from(subscribedStreams))
      }
      const on_streamRemoved = (remoteStream: Stream) => {
        if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_streamRemoved", remoteStream)
        }
        const index = subscribedStreams.indexOf(remoteStream)
        //console.log(`TRY SPLICING ${remoteStream.getId()} from subscribedStreams`, JSON.stringify(subscribedStreams.map(s => s.getId())), index)
        if (index >= 0) {
          subscribedStreams.splice(index, 1)
          setO_SubscribedStreams(Array.from(subscribedStreams))
        } else {
          console.error(HOOK_NAME + "|cannot splice", subscribedStreams, index)
        }
      }
      const on_streamListChanged = (streamInfo: StreamInfo) => {
        const streamId = String(streamInfo.streamId)
        if (streamInfo.isRemote === true) {
          if (streamInfo.listEventType === 'added') {
            // a remote stream was published
            conversation?.subscribeToStream(streamId)
          } else if (streamInfo.listEventType === 'removed') {
            // a remote stream is not published anymore
            conversation?.unsubscribeToStream(streamId)
          }
        }
      }
      // Subscribe to incoming streams
      conversation.on('streamAdded', on_streamAdded)
      conversation.on('streamRemoved', on_streamRemoved)
      conversation.on('streamListChanged', on_streamListChanged)

      return () => {
        // remove listeners
        conversation.removeListener('streamListChanged', on_streamListChanged)
        conversation.removeListener('streamRemoved', on_streamRemoved)
        conversation.removeListener('streamAdded', on_streamAdded)
      }
    }
  }, [conversation])

  const unpublishAndUnsubscribeAll = (i_conversation: Conversation) => {
    publishedStreams.forEach(stream => {
      i_conversation.unpublish(stream)
    })
    // Clear internal array
    publishedStreams.length = 0;

    // Clear cache
    setPublishedStreamsCache([])

    subscribedStreams.forEach(stream => {
      if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
        console.debug(HOOK_NAME + "|unsubscribeToStream stream", i_conversation, stream)
      }
      i_conversation.unsubscribeToStream(stream.getId())
    })
    // Clear internal array
    subscribedStreams.length = 0;

    // Clear output arrays with new array so that parent gets notified of a change.
    // Simply setting length to 0 is not detected by react.
    setO_PublishedStreams(new Array<Stream>())
    setO_SubscribedStreams(new Array<Stream>())
  }

  useEffect(() => {
    if (conversation) {
      if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
        console.debug(HOOK_NAME + "|useEffect doHandlePublication", conversation)
      }

      const on_joined = () => {
        if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_joined", conversation, streamsToPublish)
        }
        doHandlePublication()
      }
      const on_left = () => {
        if (globalThis.apirtcReactLibLogLevel?.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_left", conversation)
        }
        // Forcing unpublish will allow to republish if joining again
        unpublishAndUnsubscribeAll(conversation)
      }

      conversation.on('joined', on_joined)
      conversation.on('left', on_left)

      return () => {
        conversation.removeListener('joined', on_joined)
        conversation.removeListener('left', on_left)
      }
    }
  }, [doHandlePublication]) // Don't add 'conversation' in here because
  // doHandlePublication already changes on conversation change

  // subscribeToStream(s) after having set listeners
  //
  useEffect(() => {
    if (conversation) {
      if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
        console.debug(HOOK_NAME + "|conversation", conversation)
      }
      // Subscribe to existing remote streams
      conversation.getAvailableStreamList().forEach(streamInfo => {
        const streamId = String(streamInfo.streamId)
        if (streamInfo.isRemote === true) {
          conversation.subscribeToStream(streamId)
        }
      })

      return () => {
        unpublishAndUnsubscribeAll(conversation)
      }
    }
  }, [conversation])

  useEffect(() => {
    if (globalThis.apirtcReactLibLogLevel?.isDebugEnabled) {
      console.debug(HOOK_NAME + "|useEffect streamsToPublish", JSON.stringify(streamsToPublish.map(l_s => l_s?.getId())))
    }
    if (conversation) {
      doHandlePublication()
    }
  }, [JSON.stringify(streamsToPublish.map(l_s => l_s?.getId()))])

  return {
    publishedStreams: o_publishedStreams,
    subscribedStreams: o_subscribedStreams,
    publish,
    unpublish,
    replacePublishedStream
  }
}
