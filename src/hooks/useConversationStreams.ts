import { Conversation, PublishOptions, Stream, StreamInfo } from '@apirtc/apirtc';
import { useCallback, useEffect, useRef, useState } from 'react';

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
    console.debug(`${HOOK_NAME}|hook render|${conversation?.getName()}`, streamsToPublish.map((obj) => obj?.options))
  }

  // A cache to handle publication differences
  const publishedStreamsCache = useRef<Array<{ stream: Stream, options?: PublishOptions } | undefined | null>>([]);

  const [publishedStreams, setPublishedStreams] = useState<Array<Stream>>(new Array<Stream>());
  const [subscribedStreams, setSubscribedStreams] = useState<Array<Stream>>(new Array<Stream>());

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
            setPublishedStreams((l_streams) => [...l_streams, stream])
            resolve(stream)
          }).catch((error: any) => {
            reject(error)
          })
        }
      })
    }, [conversation]);

  const replacePublishedStream = useCallback((oldStream: Stream, newStream: Stream) => {
    return new Promise<Stream>((resolve, reject) => {
      if (conversation) {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
          console.debug(`${HOOK_NAME}|replacePublishedStream|${conversation.getName()}|${oldStream.getId()} -> ${newStream.getId()}`)
        }
        conversation.replacePublishedStream(oldStream, newStream).then((stream: Stream) => {
          if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
            console.info(`${HOOK_NAME}|stream replaced|${conversation.getName()}`, oldStream, stream)
          }

          // replace old stream by new one at same position
          setPublishedStreams((l_streams) => {
            const index = l_streams.indexOf(oldStream);
            if (index >= 0) {
              l_streams.splice(index, 1, stream)
            }
            return Array.from(l_streams)
          })

          resolve(stream)
        }).catch((error: any) => {
          reject(error)
        })
      }
    })
  }, [conversation]);

  const unpublish: (localStream: Stream) => void = useCallback((localStream: Stream) => {
    if (conversation) {
      if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
        console.debug(`${HOOK_NAME}|unpublish|${conversation.getName()}`, localStream.getId(), localStream)
      }
      conversation.unpublish(localStream)
      setPublishedStreams((l_streams) => l_streams.filter((l_stream) => l_stream !== localStream))
    }
  }, [conversation]);

  const doHandlePublication = useCallback(() => {
    const maxLength = Math.max(publishedStreamsCache.current.length, streamsToPublish.length);
    if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
      console.debug(`${HOOK_NAME}|doHandlePublication`, streamsToPublish,
        JSON.stringify(publishedStreamsCache.current.map(l_s => l_s?.stream.getId())),
        JSON.stringify(streamsToPublish.map(l_s => l_s?.stream.getId())),
        maxLength)
    }

    // make a copy of current cache
    const currentPublishedStreamsCache = [...publishedStreamsCache.current];

    // Strategy for publishedStreamsCache is to initialize it as it should be
    // and remove items if publication fails.
    // Need to do a real copy of options :
    const newPublishedStreamsCache = streamsToPublish.map(elt => {
      if (elt && elt.options) {
        return { stream: elt.stream, options: { ...elt.options } }
      } else {
        return elt
      }
    });
    // Replace cache
    publishedStreamsCache.current.length = 0;
    publishedStreamsCache.current.push(...newPublishedStreamsCache);

    // Prepare a set for Streams to publish, for further optimized check
    const streamsToPublishSet = new Set(streamsToPublish.filter(notEmpty).map((item) => item.stream));

    const doPublish = (index: number, obj: { stream: Stream, options?: PublishOptions }) => {
      publish(obj.stream, obj.options)
        .catch((error: Error) => {
          // Note that publishedStreamsCache is updated asynchronously here (catch)
          // Hence why publishedStreamsCache must always be the same array instance
          publishedStreamsCache.current.splice(index, 1, null)
          if (errorCallback) {
            errorCallback(error)
          } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
            console.warn(`${HOOK_NAME}|publish|error`, error)
          }
        })
    };

    // Loop on arrays index to publish new streams, or replace if necessary
    for (let i = 0; i < maxLength; i++) {
      const previous = currentPublishedStreamsCache[i];
      const next = streamsToPublish[i];

      if (previous && next) {

        const doUnpublishPublish = () => {
          unpublish(previous.stream)
          doPublish(i, next)
        };

        if (previous.stream === next.stream) {
          // Streams are the same, only replace if options are different
          if (JSON.stringify(previous.options) !== JSON.stringify(next.options)) {
            // replacePublishStream does not allow to change PublishOptions, so we need to
            // unpublish and republish
            doUnpublishPublish()
          }
        } else {
          // If position in both new and cached list are defined but are different:
          // replace if and only if stream to unpublish shall not be published (at other position)
          if (streamsToPublishSet.has(previous.stream)) { // previous shall be published
            // Previous shall actually be published (at another position), so don't do anything about it
            // But then we still have to publish new stream (if not already published)
            if (conversation && !conversation.isPublishedStream(next.stream)) {
              doPublish(i, next)
            }
          } else {
            if (conversation && !conversation.isPublishedStream(next.stream)) {
              // replacePublishStream does not allow to change PublishOptions, so we need to
              // unpublish and republish if options also change
              if (JSON.stringify(previous.options) === JSON.stringify(next.options)) {
                replacePublishedStream(previous.stream, next.stream)
                  .catch((error: Error) => {
                    // Note that publishedStreamsCache is updated asynchronously here (catch)
                    // Hence why publishedStreamsCache must always be the same array instance
                    publishedStreamsCache.current.splice(i, 1, null)
                    if (errorCallback) {
                      errorCallback(error)
                    } else if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
                      console.warn(`${HOOK_NAME}|replacePublishedStream|error`, error)
                    }
                  })
              } else {
                doUnpublishPublish()
              }
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
          doPublish(i, next)
        }
      }
    }

  }, [conversation,
    //streamsToPublish, change is captured by JSON.stringify below
    JSON.stringify(streamsToPublish.map(l_s => l_s?.stream.getId() + '-' + JSON.stringify(l_s?.options))),
    //publishedStreamsCache, // no need to put in dependency array as the instance shall never change
    publish, unpublish, replacePublishedStream]);

  const unpublishAndUnsubscribeAll = (i_conversation: Conversation) => {
    // Clear output arrays with new array so that parent gets notified of a change.
    setPublishedStreams((l_streams) => {
      // unpublish all published streams
      l_streams.forEach(stream => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
          console.debug(`${HOOK_NAME}|unpublish|${i_conversation.getName()}`, stream)
        }
        i_conversation.unpublish(stream)
      })
      return new Array()
    })

    // Clear cache
    publishedStreamsCache.current.length = 0;

    setSubscribedStreams((l_streams) => {
      // make sure to unsubscribe to subscribed streams
      l_streams.forEach(stream => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
          console.debug(`${HOOK_NAME}|unsubscribeToStream|${i_conversation.getName()}`, stream)
        }
        i_conversation.unsubscribeToStream(stream.getId())
      })
      return new Array()
    })
  };

  // --------------------------------------------------------------------------
  // useEffect(s) - Order is important
  //
  useEffect(() => {
    if (conversation) {
      const on_streamAdded = (stream: Stream) => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(`${HOOK_NAME}|on_streamAdded|${conversation.getName()}`, stream)
        }
        setSubscribedStreams((l_streams) => [...l_streams, stream])
      };
      const on_streamRemoved = (stream: Stream) => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(`${HOOK_NAME}|on_streamRemoved|${conversation.getName()}`, stream)
        }
        setSubscribedStreams((l_streams) => l_streams.filter((l_stream) => l_stream !== stream))
      };
      const on_streamListChanged = (streamInfo: StreamInfo) => {
        if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
          console.debug(`${HOOK_NAME}|on_streamListChanged|${conversation.getName()}`, streamInfo)
        }
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

        unpublishAndUnsubscribeAll(conversation)
      }
    }
  }, [conversation])

  useEffect(() => {
    if (conversation) {
      if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
        console.debug(`${HOOK_NAME}|useEffect doHandlePublication|${conversation.getName()}`)
      }

      const on_joined = () => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(`${HOOK_NAME}|on_joined|${conversation.getName()}`, streamsToPublish)
        }
        doHandlePublication()
      };
      const on_left = () => {
        if (globalThis.apirtcReactLibLogLevel.isInfoEnabled) {
          console.info(`${HOOK_NAME}|on_left|${conversation.getName()}`)
        }
        // Forcing unpublish will allow to republish if joining again
        unpublishAndUnsubscribeAll(conversation)
      };

      conversation.on('joined', on_joined)
      conversation.on('left', on_left)

      if (conversation.isJoined()) {
        doHandlePublication()
      }

      return () => {
        conversation.removeListener('joined', on_joined)
        conversation.removeListener('left', on_left)
      }
    }
  }, [doHandlePublication]) // Don't add 'conversation' in here because
  // doHandlePublication already changes on conversation change

  return {
    publishedStreams,
    subscribedStreams,
    publish,
    unpublish,
    replacePublishedStream
  }
}
