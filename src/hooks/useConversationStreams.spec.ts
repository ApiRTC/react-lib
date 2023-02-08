import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Conversation, ConversationCall, ConversationUnsubscribeToStream, PublishOptions, Stream, SubscribeOptions } from '@apirtc/apirtc';

let conversationJoinedFn: Function | undefined = undefined;
let conversationLeftFn: Function | undefined = undefined;

let streamAddedFn: Function | undefined = undefined;
let streamRemovedFn: Function | undefined = undefined;
let streamListChangedFn: Function | undefined = undefined;

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
    const originalModule = jest.requireActual('@apirtc/apirtc');

    return {
        __esModule: true,
        ...originalModule,
        ConversationCall: jest.fn().mockImplementation(() => {
            const instance = {
                stream: null as unknown,
                conversation: null,
                replacePublishedStream: (new_stream: Stream, callbacks?: any, options?: PublishOptions) => {
                    return new Promise<Stream>((resolve, reject) => {
                        if ((instance.stream as any).getOpts().replaceFail) {
                            reject('replace-fail')
                        } else {
                            (instance.conversation as any).publishedStreams.delete(instance.stream);
                            (instance.conversation as any).conversationCalls.delete(instance.stream);
                            instance.stream = new_stream;
                            (instance.conversation as any).publishedStreams.add(new_stream);
                            (instance.conversation as any).conversationCalls.set(new_stream, instance);
                            resolve(new_stream)
                        }
                    })
                }
            }
            return instance
        }),
        Conversation: jest.fn().mockImplementation((name: string, options?: any) => {
            const instance = {
                joined: false,
                publishedStreams: new Set<Stream>(),
                conversationCalls: new Map<Stream, ConversationCall>(),
                getAvailableStreamList: () => {
                    //TODO: mock this
                    return [{ streamId: 's01', isRemote: true }, { streamId: 's00', isRemote: false }]
                },
                getName: () => { return name },
                isJoined: () => { return instance.joined },
                isPublishedStream: (stream: Stream) => { return instance.publishedStreams.has(stream) },
                publish: (stream: Stream, options?: PublishOptions) => {
                    return new Promise<Stream>((resolve, reject) => {
                        if ((stream as any).getOpts().publishFail) {
                            reject('publish-fail')
                        } else {
                            instance.publishedStreams.add(stream)
                            const conversationCall = new ConversationCall();
                            (conversationCall as any).stream = stream;
                            (conversationCall as any).conversation = instance;
                            instance.conversationCalls.set(stream, conversationCall)
                            resolve(stream)
                        }
                    })
                },
                unpublish: (stream: Stream) => {
                    instance.publishedStreams.delete(stream)
                    instance.conversationCalls.delete(stream)
                },
                getConversationCall: (stream: Stream) => {
                    return instance.conversationCalls.get(stream)
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
                getOpts: () => { return opts },
            }
        }),
    }
})

import useConversationStreams from './useConversationStreams';

import { setLogLevel } from '..';

// Set log level to max to maximize code coverage
setLogLevel('debug')

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
        const EMPTY_STREAMS: Array<{ stream: Stream, options?: PublishOptions } | null> = [];
        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: EMPTY_STREAMS } });

        expect(result.current.publishedStreams).toBeDefined()
        expect(result.current.publishedStreams.length).toBe(0)

        const stream01 = new Stream(null, { id: 'stream-01' });
        const streams: Array<{ stream: Stream, options?: PublishOptions } | null> = [{ stream: stream01 }];

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
        streams[0] = { stream: stream02 };
        streams.push({ stream: stream03 })
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

    test(`streams publication with options change [{stream01, audioOnly}] to [{stream01, videoOnly}]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const audioOnly = { audioOnly: true };
        const videoOnly = { videoOnly: true };

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01, options: audioOnly }] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalledWith(stream01, audioOnly)

        const spy_replacePublishedStream = jest.spyOn((conversation as any).conversationCalls.get(stream01), 'replacePublishedStream');

        // change to videoOnly
        rerender({ conversation, streamsToPublish: [{ stream: stream01, options: videoOnly }] })

        //expect(spy_getConversationCall).toHaveBeenCalledTimes(1)
        //expect(spy_getConversationCall).toHaveBeenCalledWith(stream01)
        // TODO : expect replacePublishedStream instead of getConversationCall, so that we can test videoOnly more easily
        // To do that, ApiRTC should expose replacePublishedStream on Conversation directly
        // #JIRA APIRTC-1059 : replacePublishedStream
        //expect(spy_replacePublishedStream).toHaveBeenCalledWith(stream01, undefined, videoOnly)

        //expect(spy_unpublish).not.toHaveBeenCalled()
        //expect(spy_publish).toHaveBeenCalled() // first publish

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).toHaveBeenCalledTimes(1)
        expect(spy_publish).toHaveBeenCalledTimes(2) // initial and second publish
        expect(spy_publish).toHaveBeenCalledWith(stream01, videoOnly)

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()
    })

    test(`streams publication with options change by value [{stream01, videoOnly:false}] to [{stream01, videoOnly:true}]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const videoOnlyFalse = { videoOnly: false };
        const videoOnly = { videoOnly: true };

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        let localStream = { stream: stream01, options: videoOnlyFalse };
        //const streamsToPublish = [{ stream: stream01, options: videoOnlyFalse }];

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [localStream] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalledWith(stream01, videoOnlyFalse)

        const spy_replacePublishedStream = jest.spyOn((conversation as any).conversationCalls.get(stream01), 'replacePublishedStream');

        // change to videoOnly
        localStream.options.videoOnly = true;
        //localStream.options = { videoOnly: true };
        //localStream = { stream: stream01, options: { videoOnly: true } };
        rerender({ conversation, streamsToPublish: [localStream] })

        //expect(spy_getConversationCall).toHaveBeenCalledTimes(1)
        //expect(spy_getConversationCall).toHaveBeenCalledWith(stream01)
        // TODO : expect replacePublishedStream instead of getConversationCall, so that we can test videoOnly more easily
        // To do that, ApiRTC should expose replacePublishedStream on Conversation directly
        // #JIRA APIRTC-1059 : replacePublishedStream
        //expect(spy_replacePublishedStream).toHaveBeenCalledWith(stream01, undefined, videoOnly)

        //expect(spy_unpublish).not.toHaveBeenCalled()
        //expect(spy_publish).toHaveBeenCalled() // first publish

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).toHaveBeenCalledTimes(1)
        expect(spy_publish).toHaveBeenCalledTimes(2)
        expect(spy_publish).toHaveBeenCalledWith(stream01, videoOnly)

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()
    })

    test(`streams publication with options change by value [{stream01, videoOnly:false}] to [{stream02, videoOnly:true}]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });
        const videoOnlyFalse = { videoOnly: false };
        const videoOnly = { videoOnly: true };

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        let localStream = { stream: stream01, options: videoOnlyFalse };
        //const streamsToPublish = [{ stream: stream01, options: videoOnlyFalse }];

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [localStream] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalled()
        expect(spy_publish).toHaveBeenCalledWith(stream01, videoOnlyFalse)

        // change to stream02 and videoOnly
        localStream.stream = stream02;
        localStream.options.videoOnly = true;
        //localStream.options = { videoOnly: true };
        //localStream = { stream: stream01, options: { videoOnly: true } };
        rerender({ conversation, streamsToPublish: [localStream] })

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).toHaveBeenCalledTimes(1)
        expect(spy_publish).toHaveBeenCalledTimes(2)
        expect(spy_publish).toHaveBeenCalledWith(stream02, videoOnly)

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream01)).toBeFalsy()
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()
    })

    test(`streams publication [null, stream02] to [stream01, stream02]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [null, { stream: stream02 }] } });

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
        rerender({ conversation, streamsToPublish: [{ stream: stream01 }, { stream: stream02 }] })

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

    test(`streams publication [stream01] to [null, stream01]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).not.toHaveBeenCalled()

        // go from [stream01] to [null, stream01]
        rerender({ conversation, streamsToPublish: [null, { stream: stream01 }] } as any)

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        expect(spy_unpublish).not.toHaveBeenCalled()
        expect(spy_publish).not.toHaveBeenCalled()

        //await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        // go from [null, stream01] to []
        rerender({ conversation, streamsToPublish: [] } as any)

        expect(spy_getConversationCall).not.toHaveBeenCalled()
        //expect(spy_unpublish).toHaveBeenCalled()
        expect(spy_publish).not.toHaveBeenCalled()

        expect(result.current.publishedStreams.length).toBe(0)
        //expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeFalsy()
    })

    test(`streams publication [stream01, stream02] to [stream02, stream01]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }, { stream: stream02 }] } });

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
        rerender({ conversation, streamsToPublish: [{ stream: stream02 }, { stream: stream01 }] })

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

    test(`streams publication [stream01, stream02] to [stream02, stream03]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });
        const stream03 = new Stream(null, { id: 'stream-03' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }, { stream: stream02 }] } });

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
        //      to [stream02, stream03]
        rerender({ conversation, streamsToPublish: [{ stream: stream02 }, { stream: stream03 }] })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(0)
        expect(spy_unpublish).toHaveBeenCalledTimes(1)
        expect(spy_publish).toHaveBeenCalledTimes(1)

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(2)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()
        expect(result.current.publishedStreams[1]).toBe(stream03)
        expect(conversation.isPublishedStream(stream03)).toBeTruthy()
    })

    test(`streams publication [stream01], with publish error, with errorCallback`, (done) => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01', publishFail: true });

        const { result } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish, (error: any) => {
                    done()
                    expect(error).toBe('publish-fail')
                    expect(result.current.publishedStreams.length).toBe(0)
                    expect(conversation.isPublishedStream(stream01)).toBeFalsy()
                }),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }] } });
    })

    test(`streams publication [stream01], with publish error, with no errorCallback`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01', publishFail: true });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }] } });

        //await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(0)
        expect(conversation.isPublishedStream(stream01)).toBeFalsy()
    })

    test(`streams publication [stream01] to [stream02], simulate replace error`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01', replaceFail: true });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish, (error: any) => {
                    expect(error).toBe('replace-fail')
                }),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        rerender({ conversation, streamsToPublish: [{ stream: stream02 }] })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(1)
        expect(spy_unpublish).toHaveBeenCalledTimes(0)
        expect(spy_publish).toHaveBeenCalledTimes(0)

        //await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        //expect(error).toBe('publish-fail')
    })

    test(`streams publication [stream01] to [stream02], simulate replace error, no errorCallback`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01', replaceFail: true });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }] } });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        rerender({ conversation, streamsToPublish: [{ stream: stream02 }] })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(1)
        expect(spy_unpublish).toHaveBeenCalledTimes(0)
        expect(spy_publish).toHaveBeenCalledTimes(0)

        //await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream01)
        expect(conversation.isPublishedStream(stream01)).toBeTruthy()

        //expect(error).toBe('publish-fail')
    })

    test(`streams publication [stream01, stream02] to [stream02, stream03], simulate publish error`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01', publishFail: true });
        const stream02 = new Stream(null, { id: 'stream-02' });
        const stream03 = new Stream(null, { id: 'stream-03', publishFail: true });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: {
                conversation: Conversation,
                streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null>,
                errorCallback: (error: any) => void
            }) => useConversationStreams(
                props.conversation, props.streamsToPublish, props.errorCallback),
            {
                initialProps: {
                    conversation, streamsToPublish: [{ stream: stream01 }, { stream: stream02 }], errorCallback: (error: any) => {
                        expect(error).toBe('publish-fail')
                    }
                }
            });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        // expect(result.current.publishedStreams[0]).toBe(stream01)
        // expect(conversation.isPublishedStream(stream01)).toBeTruthy()
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        // go from [stream01, stream02]
        //      to [stream02, stream03]
        rerender({
            conversation, streamsToPublish: [{ stream: stream02 }, { stream: stream03 }], errorCallback: (error: any) => {
                expect(error).toBe('publish-fail')
            }
        })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(0)
        expect(spy_unpublish).toHaveBeenCalledTimes(0)
        expect(spy_publish).toHaveBeenCalledTimes(1)

        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        expect(conversation.isPublishedStream(stream03)).toBeFalsy()
    })

    test(`streams publication [stream01, stream02] to [stream02, stream03], simulate publish error, no errorCallback`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01', publishFail: true });
        const stream02 = new Stream(null, { id: 'stream-02' });
        const stream03 = new Stream(null, { id: 'stream-03', publishFail: true });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: {
                conversation: Conversation,
                streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null>
            }) => useConversationStreams(
                props.conversation, props.streamsToPublish),
            {
                initialProps: {
                    conversation, streamsToPublish: [{ stream: stream01 }, { stream: stream02 }]
                }
            });

        await waitForNextUpdate()
        expect(result.current.publishedStreams.length).toBe(1)
        // expect(result.current.publishedStreams[0]).toBe(stream01)
        // expect(conversation.isPublishedStream(stream01)).toBeTruthy()
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        const spy_getConversationCall = jest.spyOn(conversation, 'getConversationCall');
        const spy_publish = jest.spyOn(conversation, 'publish');
        const spy_unpublish = jest.spyOn(conversation, 'unpublish');

        // go from [stream01, stream02]
        //      to [stream02, stream03]
        rerender({
            conversation, streamsToPublish: [{ stream: stream02 }, { stream: stream03 }]
        })

        expect(spy_getConversationCall).toHaveBeenCalledTimes(0)
        expect(spy_unpublish).toHaveBeenCalledTimes(0)
        expect(spy_publish).toHaveBeenCalledTimes(1)

        expect(result.current.publishedStreams.length).toBe(1)
        expect(result.current.publishedStreams[0]).toBe(stream02)
        expect(conversation.isPublishedStream(stream02)).toBeTruthy()

        expect(conversation.isPublishedStream(stream03)).toBeFalsy()
    })

    test(`streams publication [stream01, stream02] to [stream02]`, async () => {
        const conversation = new Conversation('joined-conversation', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 'stream-01' });
        const stream02 = new Stream(null, { id: 'stream-02' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation, streamsToPublish: Array<{ stream: Stream, options?: PublishOptions } | null> }) => useConversationStreams(props.conversation, props.streamsToPublish),
            { initialProps: { conversation, streamsToPublish: [{ stream: stream01 }, { stream: stream02 }] } });

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
        rerender({ conversation, streamsToPublish: [{ stream: stream02 }] })

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

    test(`streams subscription to available streams`, async () => {
        const conversation = new Conversation('whatever', {});
        (conversation as any).joined = true;

        const stream01 = new Stream(null, { id: 's01' });

        const { result, rerender, waitForNextUpdate } = renderHook(
            (props: { conversation: Conversation }) => useConversationStreams(props.conversation),
            { initialProps: { conversation } });

        expect(streamListChangedFn).toBeDefined()

        const spy_subscribeToStream = jest.spyOn(conversation, 'subscribeToStream');
        const spy_unsubscribeToStream = jest.spyOn(conversation, 'unsubscribeToStream');

        //await waitForNextUpdate()
        expect(result.current.subscribedStreams.length).toBe(0)

        act(() => {
            streamAddedFn?.call(this, stream01)
        })

        expect(result.current.subscribedStreams.length).toBe(1)

        rerender({ conversation: null } as any)

        expect(result.current.subscribedStreams.length).toBe(0)

        expect(spy_unsubscribeToStream).toHaveBeenCalledTimes(1)

        //await waitForNextUpdate()
        //expect(spy_unsubscribeToStream).toHaveBeenCalledTimes(1)
        // TODO test streams already available when joining

    })

})