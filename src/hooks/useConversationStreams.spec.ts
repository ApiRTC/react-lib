import { renderHook, act } from '@testing-library/react-hooks'

import './getDisplayMedia.mock'

import { Conversation, Stream, SubscribeOptions, ConversationUnsubscribeToStream } from '@apirtc/apirtc'

let conversationJoinedFn: Function | undefined = undefined;
let conversationLeftFn: Function | undefined = undefined;

let streamAddedFn: Function | undefined = undefined;
let streamRemovedFn: Function | undefined = undefined;
let streamListChangedFn: Function | undefined = undefined;

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    // Set log level to max to maximize code coverage
    globalThis.apirtcReactLibLogLevel = { isDebugEnabled: true, isInfoEnabled: true, isWarnEnabled: true }

    return {
        __esModule: true,
        ...originalModule,
        Conversation: jest.fn().mockImplementation((name: string, options?: any) => {

            const instance = {
                joined: false,
                publishedStreams: new Set<Stream>(),
                getAvailableStreamList: () => {
                    //TODO: mock this
                    return []
                },
                getName: () => { return name },
                isJoined: () => { return instance.joined },
                isPublishedStream: (stream: Stream) => { return instance.publishedStreams.has(stream) },
                publish: (stream: Stream) => {
                    return new Promise<Stream>((resolve, reject) => {
                        if (stream.getId() === 'publish-fail') {
                            reject('publish-fail')
                        } else {
                            instance.publishedStreams.add(stream)
                            resolve(stream)
                        }
                    })
                },
                unpublish: (stream: Stream) => {
                    instance.publishedStreams.delete(stream)
                },
                getConversationCall: (streamToReplace: Stream) => {
                    return {
                        replacePublishedStream: (stream: Stream) => {
                            return new Promise<Stream>((resolve, reject) => {
                                if (stream.getId() === 'replace-publish-fail') {
                                    reject('replace-publish-fail')
                                } else {
                                    instance.publishedStreams.delete(streamToReplace)
                                    instance.publishedStreams.add(stream)
                                    resolve(stream)
                                }
                            })
                        }
                    }
                },
                subscribeToStream: (streamId: number | string, options?: SubscribeOptions) => { },
                // TODO: ask ApiRTC to give better interface name to unsubscribeToStream options.. by the way what are theses options ?
                unsubscribeToStream: (stream: Stream, options?: ConversationUnsubscribeToStream) => { },
                on: (event: string, fn: Function) => {
                    if (event === 'joined') {
                        conversationJoinedFn = fn;
                    }
                    if (event === 'left') {
                        conversationLeftFn = fn;
                    }
                    if (event === 'streamAdded') {
                        streamAddedFn = fn;
                    }
                    if (event === 'streamRemoved') {
                        streamRemovedFn = fn;
                    }
                    if (event === 'streamListChanged') {
                        streamListChangedFn = fn;
                    }
                    return instance
                },
                removeListener: (event: string, fn: Function) => {
                    if (event === 'joined' && conversationJoinedFn === fn) {
                        conversationJoinedFn = undefined;
                    }
                    if (event === 'left' && conversationLeftFn === fn) {
                        conversationLeftFn = undefined;
                    }
                    if (event === 'streamAdded' && streamAddedFn === fn) {
                        streamAddedFn = undefined;
                    }
                    if (event === 'streamRemoved' && streamRemovedFn === fn) {
                        streamRemovedFn = undefined;
                    }
                    if (event === 'streamListChanged' && streamListChangedFn === fn) {
                        streamListChangedFn = undefined;
                    }
                    return instance
                }
            }
            return instance
        }),
        Stream: jest.fn().mockImplementation((data: MediaStream | null, opts: any) => {
            return {
                //releaseCalled: false,
                getId: () => { return opts.id },
                //release: function () { this.releaseCalled = true }
            }
        }),
    }
})

import useConversationStreams from './useConversationStreams'

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useConversationStreams', () => {

    beforeEach(() => {
        // Init
        conversationJoinedFn = undefined;
        conversationLeftFn = undefined;
        streamAddedFn = undefined;
        streamRemovedFn = undefined;
        streamListChangedFn = undefined;
    });

    test(`If conversation is undefined, messages is empty, no listener`, () => {
        const { result } = renderHook(() => useConversationStreams(undefined));
        expect(result.current.publishedStreams).toBeDefined()
        expect(result.current.publishedStreams.length).toBe(0)
        expect(result.current.subscribedStreams).toBeDefined()
        expect(result.current.subscribedStreams.length).toBe(0)

        expect(result.current.publish).toBeDefined()
        expect(result.current.unpublish).toBeDefined()
        expect(result.current.replacePublishedStream).toBeDefined()

        expect(conversationJoinedFn).toBeUndefined()
        expect(conversationLeftFn).toBeUndefined()
        expect(streamAddedFn).toBeUndefined()
        expect(streamRemovedFn).toBeUndefined()
        expect(streamListChangedFn).toBeUndefined()
    })

    test(`conversation, not joined`, () => {
        const conversation = new Conversation('not-joined-conversation', {});

        const spy = jest.spyOn(conversation, 'getAvailableStreamList');

        const { result, rerender } = renderHook(
            (props: { conversation: Conversation }) => useConversationStreams(props.conversation),
            { initialProps: { conversation } });

        expect(result.current.publishedStreams).toBeDefined()
        expect(result.current.publishedStreams.length).toBe(0)
        expect(result.current.subscribedStreams).toBeDefined()
        expect(result.current.subscribedStreams.length).toBe(0)

        expect(conversationJoinedFn).toBeDefined()
        expect(conversationLeftFn).toBeDefined()
        expect(streamAddedFn).toBeDefined()
        expect(streamRemovedFn).toBeDefined()
        expect(streamListChangedFn).toBeDefined()

        expect(spy).toHaveBeenCalled();

        // rerender with no conversation shall remove listeners
        // and change published/subscribed streams arrays
        //
        const l_publishedStreams = result.current.publishedStreams;
        const l_subscribedStreams = result.current.subscribedStreams;

        rerender({ conversation: undefined } as any)

        expect(result.current.publishedStreams).not.toBe(l_publishedStreams)
        expect(result.current.subscribedStreams).not.toBe(l_subscribedStreams)

        expect(result.current.publishedStreams).toBeDefined()
        expect(result.current.publishedStreams.length).toBe(0)
        expect(result.current.subscribedStreams).toBeDefined()
        expect(result.current.subscribedStreams.length).toBe(0)

        expect(conversationJoinedFn).toBeUndefined()
        expect(conversationLeftFn).toBeUndefined()
        expect(streamAddedFn).toBeUndefined()
        expect(streamRemovedFn).toBeUndefined()
        expect(streamListChangedFn).toBeUndefined()
    })

    test(`conversation, joined, streams publication`, async () => {
        const conversation = new Conversation('whatever', {});
        (conversation as any).joined = true;

        // First, render with empty streamsToPublish
        const EMPTY_STREAMS: Array<Stream | null> = [];
        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<Stream | null> }) => useConversationStreams(props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: EMPTY_STREAMS } });

        expect(result.current.publishedStreams).toBeDefined()
        expect(result.current.publishedStreams.length).toBe(0)

        const stream01 = new Stream(null, { id: 'stream-01' });
        const streams: Array<Stream | null> = [stream01];

        // Change streamsToPublish array, to [stream01]

        const spy_isPublishedStream = jest.spyOn(conversation, 'isPublishedStream');
        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        rerender({ conversation, streamsToPublish: streams })

        expect(spy_isPublishedStream).toHaveBeenCalledTimes(1)

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalledTimes(1)

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams).toContain(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        // Go from [stream01] to [stream02, stream03] in same array
        //
        const stream02 = new Stream(null, { id: 'stream-02' });
        const stream03 = new Stream(null, { id: 'stream-03' });
        streams[0] = stream02;
        streams.push(stream03)
        rerender({ conversation, streamsToPublish: streams })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(1)
        expect(spy_unpublish).not.toHaveBeenCalled()
        //expect(spy_isPublishedStream).toHaveBeenCalledTimes(2)
        expect(spy_publish).toHaveBeenCalledTimes(2)

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(2)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()
        expect(result.current.publishedStreams[1]).toBe(stream03)
        expect(conversation.isPublishedStream(stream03)).toBeTruthy()

        expect(conversation.isPublishedStream(stream01)).toBeFalsy()

        // Nullify first stream, in same array
        // [stream02, stream03] => [null, stream03]
        streams[0] = null;
        rerender({ conversation, streamsToPublish: streams })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(1)
        expect(spy_unpublish).toHaveBeenCalledTimes(1)
        expect(spy_publish).toHaveBeenCalledTimes(2)

        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream03)
        expect(conversation.isPublishedStream(stream03)).toBeTruthy()

        expect(conversation.isPublishedStream(stream01)).toBeFalsy()
        expect(conversation.isPublishedStream(stream02)).toBeFalsy()
    })

    test(`streams publication [null, stream02] to [stream01, stream02]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<Stream | null> }) => useConversationStreams(props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [null, stream02] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).not.toHaveBeenCalled()

        // go from [null, stream02] to [stream01, stream02]
        rerender({ conversation, streamsToPublish: [stream01, stream02] })

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalledTimes(1)

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(2)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()
        expect(result.current.publishedStreams[1]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()
    })

    test(`streams publication [stream01, stream02] to [stream02, stream01]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<Stream | null> }) => useConversationStreams(props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [stream01, stream02] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(2)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()
        expect(result.current.publishedStreams[1]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        // go from [stream01, stream02]
        //      to [stream02, stream01]
        rerender({ conversation, streamsToPublish: [stream02, stream01] })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(0)
        expect(spy_unpublish).toHaveBeenCalledTimes(0)
        expect(spy_publish).toHaveBeenCalledTimes(0)

        //await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(2)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()
        expect(result.current.publishedStreams[1]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()
    })

    test(`streams publication [stream01, stream02] to [stream02]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<Stream | null> }) => useConversationStreams(props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [stream01, stream02] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(2)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()
        expect(result.current.publishedStreams[1]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        // go from [stream01, stream02]
        //      to [stream02]
        rerender({ conversation, streamsToPublish: [stream02] })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(0)
        expect(spy_unpublish).toHaveBeenCalledTimes(1)
        expect(spy_publish).toHaveBeenCalledTimes(0)

        //await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        expect(conversation.isPublishedStream(stream01)).toBeFalsy()
    })

    test(`conversation on join, on left`, async () => {
        const conversation = new Conversation('whatever', {});
        (conversation as any).joined = false;

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation }) => useConversationStreams(props.conversation),
            { initialProps: { conversation } });

        expect(conversationJoinedFn).toBeDefined()
        expect(conversationLeftFn).toBeDefined()

        act(() => {
            conversationJoinedFn?.call(this)
        })

        act(() => {
            conversationLeftFn?.call(this)
        })

    })

    test(`streams subscription`, async () => {
        const conversation = new Conversation('whatever', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation }) => useConversationStreams(props.conversation),
            { initialProps: { conversation } });

        expect(streamListChangedFn).toBeDefined()

        const spy_subscribeToStream = jest.spyOn(conversation, 'subscribeToStream');
        const spy_unsubscribeToStream = jest.spyOn(conversation, 'unsubscribeToStream');

        //await waitForNextUpdate()
        expect(result.current.subscribedStreams.length).toBe(0)

        act(() => {
            streamListChangedFn?.call(this, { streamId: 'stream-01', listEventType: 'added', isRemote: true })
        })

        expect(spy_subscribeToStream).toHaveBeenCalledTimes(1)

        act(() => {
            streamAddedFn?.call(this, stream01)
        })

        expect(result.current.subscribedStreams.length).toBe(1)

        act(() => {
            streamListChangedFn?.call(this, { streamId: 'stream-01', listEventType: 'removed', isRemote: true })
        })

        expect(spy_unsubscribeToStream).toHaveBeenCalledTimes(1)

        act(() => {
            streamRemovedFn?.call(this, stream01)
        })

        expect(result.current.subscribedStreams.length).toBe(0)

        //await waitForNextUpdate()
        //expect(spy_unsubscribeToStream).toHaveBeenCalledTimes(1)
        // TODO test streams already available when joining

    })

})