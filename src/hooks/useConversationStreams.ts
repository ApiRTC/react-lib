import { Conversation, PublishOptions, Stream, StreamInfo } from '@apirtc/apirtc';
import { useCallback, useEffect, useState } from 'react';

// TODO?: add pagination ?
// interface Options {
//   streamsSubscribePageSize: number
// }

function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const HOOK_NAME = "useConversationStreams";
export default function useConversationStreams(
  conversation: Conversation | undefined,
  /** fully managed list of Stream(s) to publish, with associated publish options */
  streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | undefined | null> = [],
  errorCallback?: (error: any) => void
) {

  if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
    console.debug(`${HOOK_NAME}|hook render`, streamsToPublish.map((obj) => obj?.options))
  }

  // A cache to handle publication differences
  const [publishedStreamsCache, setPublishedStreamsCache] =
    useState<Array<{ stream: Stream, options?: PublishOptions } | undefined | null>>([]);

  // Use an internal array which will always be the same object as far as React knows
  // This will avoid the need for adding it as a dependency for each callback
  const [publishedStreams] = useState<Array<Stream>>(new Array<Stream>());
  // And use a copy as output array so that client code will react upon change
  // (only a new instance of array is detected by React)
  const [o_publishedStreams, setO_PublishedStreams] = useState<Array<Stream>>(new Array<Stream>());

  const [subscribedStreams] = useState<Array<Stream>>(new Array<Stream>());
  const [o_subscribedStreams, setO_SubscribedStreams] = useState<Array<Stream>>(new Array<Stream>());

  const publish: (localStream: Stream, options?: PublishOptions) => Promise<Stream> =
    useCallback((localStream: Stream, options?: PublishOptions) => {
      return new Promise<Stream>((resolve, reject) => {
        if (conversation) {
          if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
            console.debug(`${HOOK_NAME}|publish|${conversation.getName()}`, localStream, options)
          }
          conversation.publish(localStream, options).then((stream: Stream) => {
            if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
              console.info(`${HOOK_NAME}|published|${conversation.getName()}`, stream)
            }
            //console.log(`PUSHING ${stream.getId()} to publishedStreams`, JSON.stringify(publishedStreams.map(s => s.getId())))
            publishedStreams.push(stream)
            // Returning a new array makes lets React detect changes
            setO_PublishedStreams(Array.from(publishedStreams))
            resolve(stream)
          }).catch((error: any) => {
            reject(error)
          })
        }
      })
    }, [conversation]);

  const replacePublishedStream = useCallback((oldStream: Stream, newStream: Stream, options?: PublishOptions) => {
    return new Promise<Stream>((resolve, reject) => {
      if (conversation) {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
          console.debug(`${HOOK_NAME}|replacePublishedStream|${conversation.getName()}|${oldStream.getId()} -> ${newStream.getId()}(${JSON.stringify(options)})`)
        }
        const conversationCall = conversation.getConversationCall(oldStream);
        if (conversationCall) {
          conversationCall.replacePublishedStream(newStream, undefined, options)
            .then((stream: Stream) => {
              if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
                console.info(`${HOOK_NAME}|stream replaced|${conversation.getName()}`, oldStream, stream, options)
              }
              const index = publishedStreams.indexOf(oldStream);
              if (index >= 0) {
                publishedStreams.splice(index, 1, stream)
                setO_PublishedStreams(Array.from(publishedStreams))
              }
              resolve(stream)
            }).catch((error: any) => {
              reject(error)
            })
        }
      }
    })
  }, [conversation]);

  const unpublish: (localStream: Stream) => void = useCallback((localStream: Stream) => {
    if (conversation) {
      if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
        console.debug(`${HOOK_NAME}|unpublish|${conversation.getName()}`, localStream)
      }
      conversation.unpublish(localStream)
      const index = publishedStreams.indexOf(localStream);
      if (index >= 0) {
        publishedStreams.splice(index, 1)
        setO_PublishedStreams(Array.from(publishedStreams))
      }
    }
  }, [conversation]);

  const doHandlePublication = useCallback(() => {
    const maxLength = Math.max(publishedStreamsCache.length, streamsToPublish.length);
    if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
      console.debug(HOOK_NAME + "|doHandlePublication", streamsToPublish,
        JSON.stringify(publishedStreamsCache.map(l_s => l_s?.stream.getId())), maxLength)
    }

    // Strategy for published streams cache is to initialize it as it should be
    // and remove items if publication fails.
    //const newPublishedStreamsCache = [...streamsToPublish];
    // Need to do a real copy of options !:
    const newPublishedStreamsCache = streamsToPublish.map(elt => {
      if (elt && elt.options) {
        return { stream: elt.stream, options: { ...elt.options } }
      } else {
        return elt
      }
    });
    setPublishedStreamsCache(newPublishedStreamsCache)

    // Prepare a set for Streams to publish, for further optimized check
    const streamsToPublishSet = new Set(streamsToPublish.filter(notEmpty).map((item) => item.stream));

    // Loop on arrays index to publish new streams, or replace if necessary
    for (let i = 0; i < maxLength; i++) {
      const previous = publishedStreamsCache[i];
      const next = streamsToPublish[i];

      if (previous && next) {
        const doReplacePublishedStream = () => {
          replacePublishedStream(previous.stream, next.stream, next.options)
            .catch((error: Error) => {
              newPublishedStreamsCache.splice(i, 1, null)
              if (errorCallback) {
                errorCallback(error)
              } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                console.warn(`${HOOK_NAME}|replacePublishedStream|error`, error)
              }
            })
        }
        if (previous.stream === next.stream) {
          // Streams are the same, only replace if options are different
          if (JSON.stringify(previous.options) !== JSON.stringify(next.options)) {
            doReplacePublishedStream()
          }
        } else {
          // If position in both new and cached list are defined but are different:
          // replace if and only if stream to unpublish shall not be published (at other position)
          if (streamsToPublishSet.has(previous.stream)) { // previous shall be published
            // Previous shall actually be published (at another position), so don't do anything about it
            // But then we still have to publish new stream (if not already published)
            if (conversation && !conversation.isPublishedStream(next.stream)) {
              publish(next.stream, next.options).catch((error: Error) => {
                newPublishedStreamsCache.splice(i, 1, null)
                if (errorCallback) {
                  errorCallback(error)
                } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                  console.warn(`${HOOK_NAME}|publish|error`, error)
                }
              })
            }
          } else {
            if (conversation && !conversation.isPublishedStream(next.stream)) {
              doReplacePublishedStream()
            } else { // new stream is already published
              // So we shall not replace another stream by it, but we need to unpublish the previous
              unpublish(previous.stream)
            }
          }
        }
      } else if (previous && !next) {
        // If position in new list is now undefined(or null) while it was in cache:
        // unpublish if and only if stream to unpublish shall not be published (at other position)
        if (!streamsToPublishSet.has(previous.stream)) {
          unpublish(previous.stream)
        }
      } else if (!previous && next) {
        // If position in new list is valid : publish it whatever the position in cache.
        // Depending on the case the stream might be already published, or it might be not
        // (can happen if the cache was set while Conversation was not joined yet).
        // Note that we could try to publish without checking isPublishedStream, the call would
        // reject with a console error but this would not affect the behavior.
        if (conversation && !conversation.isPublishedStream(next.stream)) {
          publish(next.stream, next.options).catch((error: Error) => {
            newPublishedStreamsCache.splice(i, 1, null)
            if (errorCallback) {
              errorCallback(error)
            } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
              console.warn(`${HOOK_NAME}|publish|error`, error)
            }
          })
        }
      }
    }
  }, [conversation,
    streamsToPublish,
    publishedStreamsCache,
    publish, unpublish, replacePublishedStream]);

  // --------------------------------------------------------------------------
  // useEffect(s) - Order is important
  //
  useEffect(() => {
    if (conversation) {
      const on_streamAdded = (remoteStream: Stream) => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_streamAdded", remoteStream)
        }
        subscribedStreams.push(remoteStream)
        setO_SubscribedStreams(Array.from(subscribedStreams))
      };
      const on_streamRemoved = (remoteStream: Stream) => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_streamRemoved", remoteStream)
        }
        const index = subscribedStreams.indexOf(remoteStream);
        if (index >= 0) {
          subscribedStreams.splice(index, 1)
          setO_SubscribedStreams(Array.from(subscribedStreams))
        }
      };
      const on_streamListChanged = (streamInfo: StreamInfo) => {
        const streamId = String(streamInfo.streamId);
        if (streamInfo.isRemote === true) {
          if (streamInfo.listEventType === 'added') {
            // a remote stream was published
            conversation.subscribeToStream(streamId)
          } else if (streamInfo.listEventType === 'removed') {
            // a remote stream is not published anymore
            conversation.unsubscribeToStream(streamId)
          }
        }
      };
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
      if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
        console.debug(HOOK_NAME + "|unpublish stream", i_conversation, stream)
      }
      i_conversation.unpublish(stream)
    })
    // Clear internal array
    publishedStreams.length = 0;

    // Clear cache
    setPublishedStreamsCache([])

    subscribedStreams.forEach(stream => {
      if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
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
  };

  useEffect(() => {
    if (conversation) {
      if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
        console.debug(HOOK_NAME + "|useEffect doHandlePublication", conversation.getName())
      }

      const on_joined = () => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_joined", conversation.getName(), streamsToPublish)
        }
        doHandlePublication()
      };
      const on_left = () => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(HOOK_NAME + "|on_left", conversation.getName())
        }
        // Forcing unpublish will allow to republish if joining again
        unpublishAndUnsubscribeAll(conversation)
      };

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
      if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
        console.debug(`${HOOK_NAME}|conversation|${conversation.getName()}`, conversation)
      }
      // Subscribe to existing remote streams
      conversation.getAvailableStreamList().forEach((streamInfo: StreamInfo) => {
        const streamId = String(streamInfo.streamId);
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
    if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
      console.debug(`${HOOK_NAME}|useEffect streamsToPublish`,
        JSON.stringify(streamsToPublish.map(l_s => l_s?.stream.getId() + '-' + JSON.stringify(l_s?.options))))
    }
    if (conversation && conversation.isJoined()) {
      doHandlePublication()
    }
  }, [JSON.stringify(streamsToPublish.map(l_s => l_s?.stream.getId() + '-' + JSON.stringify(l_s?.options)))])

  return {
    publishedStreams: o_publishedStreams,
    subscribedStreams: o_subscribedStreams,
    publish,
    unpublish,
    replacePublishedStream
  }
}
