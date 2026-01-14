import { renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { Stream, VideoProcessorType } from '@apirtc/apirtc';

import useStreamApplyVideoProcessor from './useStreamApplyVideoProcessor';

import { setLogLevel } from '..';

// const initRelease = jest.fn();

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
	const originalModule = jest.requireActual('@apirtc/apirtc');

	return {
		__esModule: true,
		...originalModule,
		Stream: jest.fn().mockImplementation((data: MediaStream | null, opts: any) => {
			const initial = {
				videoAppliedFilter: opts._initialVideoAppliedProcessor || 'none',
				getId: () => {
					return 'id';
				},
				applyVideoProcessor: (type: string) => {
					return new Promise<any>((resolve, reject) => {
						if (opts.fail) {
							reject('fail');
						} else {
							const streamWithEffect = {
								videoAppliedFilter: type,
								getId: () => {
									return 'id-' + type;
								},
							};
							resolve(streamWithEffect);
						}
					});
				},
				//release: initRelease
			};
			return initial;
		}),
	};
});

// Set log level to max to maximize code coverage
setLogLevel('debug');

describe('useStreamApplyVideoProcessor', () => {
	test(`Default value of stream will be undefined`, () => {
		const { result } = renderHook(() => useStreamApplyVideoProcessor(undefined, 'blur'));
		expect(result.current.stream).toBe(undefined);
		expect(result.current.applied).toBe('none');
		expect(result.current.error).toBeUndefined();
	});

	test(`undefined stream, no effect`, () => {
		const { result } = renderHook(() => useStreamApplyVideoProcessor(undefined, 'none'));
		expect(result.current.stream).toBe(undefined);
		expect(result.current.applied).toBe('none');
		expect(result.current.error).toBeUndefined();
	});

	test(`undefined stream, blur effect`, () => {
		const { result } = renderHook(() => useStreamApplyVideoProcessor(undefined, 'blur'));
		expect(result.current.stream).toBe(undefined);
		expect(result.current.applied).toBe('none');
		expect(result.current.error).toBeUndefined();
	});

	test(`With a Stream, no effect`, async () => {
		const initStream = new Stream(null, {});
		const { result } = renderHook(() => useStreamApplyVideoProcessor(initStream, 'none'));
		expect(result.current.stream?.getId()).toBe('id');
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();
	});

	test(`With a Stream, to be blurred`, async () => {
		const initStream = new Stream(null, {});
		const { result, waitForNextUpdate, rerender } = renderHook(
			(type: VideoProcessorType) => useStreamApplyVideoProcessor(initStream, type),
			{ initialProps: 'blur' }
		);
		expect(result.current.applying).toBeTruthy();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.stream).toBeDefined();
		expect(result.current.stream).not.toBe(initStream);
		const blurredStream = result.current.stream;
		expect(blurredStream?.getId()).toBe('id-blur');
		expect(result.current.applied).toBe('blur');

		// Reset to no effect
		rerender('none' as VideoProcessorType);
		expect(result.current.applying).toBeTruthy();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.stream?.getId()).toBe('id-none');
		expect(result.current.applied).toBe('none');
		// the out stream shall now be the initial stream
		// expect(result.current.stream).toBe(initStream)
	});

	test(`With a Stream, to be blurred, blur fails`, async () => {
		const initStream = new Stream(null, { fail: true });
		const { result, waitForNextUpdate } = renderHook(() =>
			useStreamApplyVideoProcessor(initStream, 'blur')
		);
		// the values don't change, so no need to wait for next update
		//await waitForNextUpdate()
		expect(result.current.stream?.getId()).toBe('id');
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeTruthy();
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeDefined();
	});

	test(`With a Stream, to be blurred, blur fails, with callback`, async () => {
		// As this is  almost same test as above, try with different logs level config to complete code coverage
		setLogLevel('error');
		const initStream = new Stream(null, { fail: true });

		let tested = false;

		const callback = (error: any) => {
			console.log('ERROR', error);
			try {
				expect(error).toBe('fail');
				tested = true;
			} catch (err) {}
		};

		const { result, waitForNextUpdate } = renderHook(() =>
			useStreamApplyVideoProcessor(initStream, 'blur', undefined, callback)
		);
		// the values don't change, so no need to wait for next update
		expect(result.current.stream?.getId()).toBe('id');
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeTruthy();
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeDefined();
		expect(tested).toBe(true);
	});

	test(`With a Stream already blurred, to be left blurred`, async () => {
		const initStream = new Stream(null, { _initialVideoAppliedProcessor: 'blur' });
		const { result, waitForNextUpdate, rerender } = renderHook(
			(type: VideoProcessorType) => useStreamApplyVideoProcessor(initStream, type),
			{ initialProps: 'blur' }
		);

		expect(result.current.stream).toBe(initStream);
		expect(result.current.applied).toBe('blur');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();

		// Then set remove effect
		rerender('none');
		expect(result.current.applying).toBeTruthy();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.stream?.getId()).toBe('id-none');
		expect(result.current.applied).toBe('none');
		// the out stream shall now be the initial stream
		//expect(result.current.stream).toBe(initStream)
	});

	test(`Init with no stream, then add a Stream already blurred, to be left blurred`, async () => {
		const { result, rerender } = renderHook(
			({ stream, type }) => useStreamApplyVideoProcessor(stream, type),
			{
				initialProps: {
					stream: undefined as unknown as Stream,
					type: 'blur' as VideoProcessorType,
				},
			}
		);

		expect(result.current.stream).toBeUndefined();
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();

		const aStream = new Stream(null, { _initialVideoAppliedProcessor: 'blur' });

		// Then make stream defined
		rerender({ stream: aStream, type: 'blur' });
		expect(result.current.applied).toBe('blur');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.stream).toBe(aStream);
		expect(result.current.error).toBeUndefined();
	});

	test(`Init with no stream, then add a Stream already blurred, to be un-blurred`, async () => {
		const { result, waitForNextUpdate, rerender } = renderHook(
			({ stream, type }) => useStreamApplyVideoProcessor(stream, type),
			{
				initialProps: {
					stream: undefined as unknown as Stream,
					type: 'none' as VideoProcessorType,
				},
			}
		);

		expect(result.current.stream).toBeUndefined();
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();

		const aStream = new Stream(null, { _initialVideoAppliedProcessor: 'blur' });

		// Then make stream defined
		rerender({ stream: aStream, type: 'none' });
		expect(result.current.applying).toBeTruthy();
		expect(result.current.applied).toBe('blur');
		expect(result.current.stream).toBe(aStream);
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.applied).toBe('none');
		expect(result.current.stream).not.toBe(aStream);
		expect(result.current.stream?.getId()).toBe('id-none');
		expect(result.current.error).toBeUndefined();
	});

	test(`Changing streams`, async () => {
		const { result, waitForNextUpdate, rerender } = renderHook(
			({ stream, type }) => useStreamApplyVideoProcessor(stream, type),
			{
				initialProps: {
					stream: undefined as unknown as Stream,
					type: 'none' as VideoProcessorType,
				},
			}
		);

		expect(result.current.stream).toBeUndefined();
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();

		const stream01 = new Stream(null, { _initialVideoAppliedProcessor: 'none' });

		// Then make stream defined
		rerender({ stream: stream01, type: 'blur' });
		expect(result.current.applying).toBeTruthy();
		expect(result.current.applied).toBe('none');
		expect(result.current.stream).toBe(stream01);
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.applied).toBe('blur');
		expect(result.current.stream?.getId()).toBe('id-blur');
		expect(result.current.error).toBeUndefined();

		// Change stream
		const stream02 = new Stream(null, { _initialVideoAppliedProcessor: 'none' });
		rerender({ stream: stream02, type: 'blur' });
		expect(result.current.applying).toBeTruthy();
		expect(result.current.applied).toBe('none');
		expect(result.current.stream).toBe(stream02);
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.applied).toBe('blur');
		expect(result.current.stream?.getId()).toBe('id-blur');
		expect(result.current.error).toBeUndefined();
	});
});
