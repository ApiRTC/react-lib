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

  const [publishedStreams] = useState<Array<Stream>>(new Array<Stream>())
  const [o_publishedStreams, setO_PublishedStreams] = useState<Array<Stream>>(new Array<Stream>())

  const [subscribedStreams] = useState<Array<Stream>>(new Array<Stream>());
  const [o_subscribedStreams, setO_SubscribedStreams] = useState<Array<Stream>>(new Array<Stream>());

  const publish: (localStream: Stream) => Promise<Stream> = useCallback((localStream: Stream) => {
    return new Promise<Stream>((resolve, reject) => {
      console.log(HOOK_NAME + "|publish", conversation, localStream)
      conversation?.publish(localStream).then(stream => {
        console.log(HOOK_NAME + "|stream published", stream);
        //console.log(`PUSHING ${stream.getId()} to publishedStreams`, JSON.stringify(publishedStreams.map(s => s.getId())))
        publishedStreams.push(stream)
        // Returning a new array makes lets React detect changes
        setO_PublishedStreams(Array.from(publishedStreams))
        resolve(stream);
      }).catch((error: any) => {
        console.error(HOOK_NAME + "|publish", error)
        reject(error)
      });
    })
  }, [conversation]) //publishedStreams

  const replacePublishedStream = useCallback((oldStream: Stream, newStream: Stream) => {
    console.log(HOOK_NAME + "|replacePublishedStream", oldStream, newStream)
    conversation?.getConversationCall(oldStream).replacePublishedStream(newStream)
      .then((stream: Stream) => {
        console.log(HOOK_NAME + "|stream replaced", oldStream, stream);
        const index = publishedStreams.indexOf(oldStream)
        if (index >= 0) {
          publishedStreams.splice(index, 1, stream);
        } else {
          console.error(HOOK_NAME + "|cannot splice", publishedStreams, index)
        }
        setO_PublishedStreams(Array.from(publishedStreams))
      }).catch(error => {
        console.error(HOOK_NAME + "|replacePublishedStream", error)
      });
  }, [conversation]) //publishedStreams

  const unpublish: (localStream: Stream) => void = useCallback((localStream: Stream) => {
    console.log(HOOK_NAME + "|unpublish", conversation, localStream)
    conversation?.unpublish(localStream);
    const index = publishedStreams.indexOf(localStream)
    if (index >= 0) {
      publishedStreams.splice(index, 1)
      setO_PublishedStreams(Array.from(publishedStreams))
    } else {
      console.error(HOOK_NAME + "|cannot splice", publishedStreams, index)
    }
  }, [conversation]) //publishedStreams

  const doHandlePublication = useCallback((streams: Array<Stream>) => {
    const maxLength = Math.max(s_streamsToPublish.length, streams.length);
    for (let i = 0; i < maxLength; i++) {
      if (s_streamsToPublish[i] && streams[i] && (s_streamsToPublish[i] !== streams[i])) {
        replacePublishedStream(s_streamsToPublish[i], streams[i])
      } else if (s_streamsToPublish[i] && !streams[i]) {
        unpublish(s_streamsToPublish[i]);
      } else if (streams[i]) {
        publish(streams[i]);
      }
    }
  }, [JSON.stringify(s_streamsToPublish.map(l_s => l_s.getId())), publish, unpublish, replacePublishedStream])

  // --------------------------------------------------------------------------
  // Effects - Order is important

  useEffect(() => {

    //useCallback(
    const on_streamAdded = (remoteStream: Stream) => {
      console.log(HOOK_NAME + "|on_streamAdded", remoteStream)
      //console.log(`PUSHING ${remoteStream.getId()} to subscribedStreams`, JSON.stringify(subscribedStreams.map(s => s.getId())))
      subscribedStreams.push(remoteStream)
      setO_SubscribedStreams(Array.from(subscribedStreams));
    }//, [subscribedStreams])

    // useCallback(
    const on_streamRemoved = (remoteStream: Stream) => {
      console.log(HOOK_NAME + "|on_streamRemoved", remoteStream);
      const index = subscribedStreams.indexOf(remoteStream)
      //console.log(`TRY SPLICING ${remoteStream.getId()} from subscribedStreams`, JSON.stringify(subscribedStreams.map(s => s.getId())), index)
      if (index >= 0) {
        subscribedStreams.splice(index, 1)
        setO_SubscribedStreams(Array.from(subscribedStreams));
      } else {
        console.error(HOOK_NAME + "|cannot splice", subscribedStreams, index)
      }
    }//, [subscribedStreams])

    // useCallback(
    const on_streamListChanged = (streamInfo: StreamInfo) => {
      const streamId = String(streamInfo.streamId)
      if (streamInfo.isRemote === true) {
        if (streamInfo.listEventType === 'added') {
          // a remote stream was published
          conversation?.subscribeToStream(streamId);
        } else if (streamInfo.listEventType === 'removed') {
          // a remote stream is not published anymore
          conversation?.unsubscribeToStream(streamId)
        }
      }
    }//, [conversation])

    if (conversation) {
      //console.log(HOOK_NAME + "|ON streamAdded/streamRemoved subscribedStreams", conversation, JSON.stringify(subscribedStreams.map(l_s => l_s.getId())))
      // Subscribe to incoming streams
      conversation.on('streamAdded', on_streamAdded);
      conversation.on('streamRemoved', on_streamRemoved);
      conversation.on('streamListChanged', on_streamListChanged);
    }

    return () => {
      if (conversation) {
        //console.log(HOOK_NAME + "|REMOVE streamAdded/streamRemoved subscribedStreams", conversation, JSON.stringify(subscribedStreams.map(l_s => l_s.getId())))
        // remove listeners
        conversation.removeListener('streamListChanged', on_streamListChanged);
        conversation.removeListener('streamRemoved', on_streamRemoved);
        conversation.removeListener('streamAdded', on_streamAdded);
      }
    }
  }, [conversation]);

  const on_joined = useCallback(() => {
    console.log(HOOK_NAME + "|on_joined", conversation);
    doHandlePublication(streamsToPublish)
    setToPublish(streamsToPublish)
  }, [conversation, doHandlePublication]) //setToPublish

  useEffect(() => {
    // Subscribe to incoming streams
    if (conversation) {
      //console.log(HOOK_NAME + "|new Conversation on_joined", conversation, JSON.stringify(publishedStreams.map(l_s => l_s.getId())))
      conversation.on('joined', on_joined);
    }

    return () => {
      if (conversation) {
        // remove listeners
        conversation.removeListener('joined', on_joined);
      }
    }
  }, [conversation, on_joined]);

  // subscribeToStream(s) after having setting listeners
  //
  useEffect(() => {

    if (conversation) {
      //console.log(HOOK_NAME + "|new Conversation (subscribeToStream)", conversation, JSON.stringify(publishedStreams.map(l_s => l_s.getId())))
      // Subscribe to existing remote streams
      conversation.getAvailableStreamList().forEach(streamInfo => {
        const streamId = String(streamInfo.streamId)
        if (streamInfo.isRemote === true) {
          conversation.subscribeToStream(streamId);
        }
      })
    }

    return () => {
      // Get a handle on the conversation because it will be used next in forEach callback
      // which otherwise using 'conversation' handle may change during the loop.
      const l_conversation = conversation;
      //console.log(HOOK_NAME + "|conversation clear", l_conversation, JSON.stringify(publishedStreams.map(l_s => l_s.getId())))
      if (l_conversation) {
        publishedStreams.forEach(stream => {
          console.log(HOOK_NAME + "|conversation clear, unpublish stream", l_conversation, stream)
          l_conversation.unpublish(stream);
        });

        // Clear internal arrays
        publishedStreams.length = 0;
        subscribedStreams.length = 0;

        // Clear output arrays with new array so that parent gets notified of a change.
        // Simply setting length to 0 is not detected by react.
        setO_PublishedStreams(new Array<Stream>());
        setO_SubscribedStreams(new Array<Stream>());
      }
    }
  }, [conversation]);

  useEffect(() => {
    if (conversation) {
      //console.log(HOOK_NAME + "|new streamsToPublish", conversation, JSON.stringify(streamsToPublish.map(l_s => l_s.getId())))
      doHandlePublication(streamsToPublish)
      setToPublish(streamsToPublish)
    }
  }, [JSON.stringify(streamsToPublish.map(l_s => l_s.getId()))]);

  return {
    publishedStreams: o_publishedStreams,
    subscribedStreams: o_subscribedStreams,
    publish,
    unpublish,
    replacePublishedStream
  };
}
