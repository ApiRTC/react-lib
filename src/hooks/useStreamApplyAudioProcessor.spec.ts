import { renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { AudioProcessorType, Stream } from '@apirtc/apirtc';

import useStreamApplyAudioProcessor from './useStreamApplyAudioProcessor';

import { setLogLevel } from '..';

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
	const originalModule = jest.requireActual('@apirtc/apirtc');

	return {
		__esModule: true,
		...originalModule,
		Stream: jest.fn().mockImplementation((data: MediaStream | null, opts: any) => {
			const initial = {
				audioAppliedFilter: opts._initialAudioAppliedProcessor || 'none',
				getId: () => {
					return 'id';
				},
				applyAudioProcessor: (type: string) => {
					return new Promise<any>((resolve, reject) => {
						if (opts.fail) {
							reject('fail');
						} else {
							const streamWithEffect = {
								audioAppliedFilter: type,
								getId: () => {
									return 'id-' + type;
								},
							};
							resolve(streamWithEffect);
						}
					});
				},
			};
			return initial;
		}),
	};
});

// Set log level to max to maximize code coverage
setLogLevel('debug');

describe('useStreamApplyAudioProcessor', () => {
	test(`Default value of stream will be undefined`, () => {
		const { result } = renderHook(() =>
			useStreamApplyAudioProcessor(undefined, 'noiseReduction')
		);
		expect(result.current.stream).toBe(undefined);
		expect(result.current.applied).toBe('none');
		expect(result.current.error).toBeUndefined();
	});

	test(`undefined stream, no effect`, () => {
		const { result } = renderHook(() => useStreamApplyAudioProcessor(undefined, 'none'));
		expect(result.current.stream).toBe(undefined);
		expect(result.current.applied).toBe('none');
		expect(result.current.error).toBeUndefined();
	});

	test(`undefined stream, noiseReduction effect`, () => {
		const { result } = renderHook(() =>
			useStreamApplyAudioProcessor(undefined, 'noiseReduction')
		);
		expect(result.current.stream).toBe(undefined);
		expect(result.current.applied).toBe('none');
		expect(result.current.error).toBeUndefined();
	});

	test(`With a Stream, no effect`, async () => {
		const initStream = new Stream(null, {});
		const { result } = renderHook(() => useStreamApplyAudioProcessor(initStream, 'none'));
		expect(result.current.stream?.getId()).toBe('id');
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();
	});

	test(`With a Stream, effect to be applied`, async () => {
		const initStream = new Stream(null, {});
		const { result, waitForNextUpdate, rerender } = renderHook(
			(type: AudioProcessorType) => useStreamApplyAudioProcessor(initStream, type),
			{ initialProps: 'noiseReduction' }
		);
		expect(result.current.applying).toBeTruthy();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.stream).toBeDefined();
		expect(result.current.stream).not.toBe(initStream);
		const appliedStream = result.current.stream;
		expect(appliedStream?.getId()).toBe('id-noiseReduction');
		expect(result.current.applied).toBe('noiseReduction');

		// Reset to no effect
		rerender('none');
		expect(result.current.applying).toBeTruthy();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.stream?.getId()).toBe('id-none');
		expect(result.current.applied).toBe('none');
	});

	test(`With a Stream, effect to be applied, effect fails`, async () => {
		const initStream = new Stream(null, { fail: true });
		const { result, waitForNextUpdate } = renderHook(() =>
			useStreamApplyAudioProcessor(initStream, 'noiseReduction')
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

	test(`With a Stream, effect to be applied, effect fails, with callback`, async () => {
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
			useStreamApplyAudioProcessor(initStream, 'noiseReduction', callback)
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

	test(`With a Stream already with effect, to be left with effect`, async () => {
		const initStream = new Stream(null, { _initialAudioAppliedProcessor: 'noiseReduction' });
		const { result, waitForNextUpdate, rerender } = renderHook(
			(type: AudioProcessorType) => useStreamApplyAudioProcessor(initStream, type),
			{ initialProps: 'noiseReduction' }
		);

		expect(result.current.stream).toBe(initStream);
		expect(result.current.applied).toBe('noiseReduction');
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

	test(`Init with no stream, then add a Stream already with effect, to be left with effect`, async () => {
		const { result, rerender } = renderHook(
			({ stream, type }) => useStreamApplyAudioProcessor(stream, type),
			{
				initialProps: {
					stream: undefined as unknown as Stream,
					type: 'noiseReduction' as AudioProcessorType,
				},
			}
		);

		expect(result.current.stream).toBeUndefined();
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();

		const aStream = new Stream(null, { _initialAudioAppliedProcessor: 'noiseReduction' });

		// Then make stream defined
		rerender({ stream: aStream, type: 'noiseReduction' });
		expect(result.current.applied).toBe('noiseReduction');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.stream).toBe(aStream);
		expect(result.current.error).toBeUndefined();
	});

	test(`Init with no stream, then add a Stream already with effect, to be un-effect`, async () => {
		const { result, waitForNextUpdate, rerender } = renderHook(
			({ stream, type }) => useStreamApplyAudioProcessor(stream, type),
			{
				initialProps: {
					stream: undefined as unknown as Stream,
					type: 'none' as AudioProcessorType,
				},
			}
		);

		expect(result.current.stream).toBeUndefined();
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();

		const aStream = new Stream(null, { _initialAudioAppliedProcessor: 'noiseReduction' });

		// Then make stream defined
		rerender({ stream: aStream, type: 'none' });
		expect(result.current.applying).toBeTruthy();
		expect(result.current.applied).toBe('noiseReduction');
		expect(result.current.stream).toBe(aStream);
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.applied).toBe('none');
		expect(result.current.stream?.getId()).toBe('id-none');
		expect(result.current.error).toBeUndefined();
	});

	test(`Changing streams`, async () => {
		const { result, waitForNextUpdate, rerender } = renderHook(
			({ stream, type }) => useStreamApplyAudioProcessor(stream, type),
			{
				initialProps: {
					stream: undefined as unknown as Stream,
					type: 'none' as AudioProcessorType,
				},
			}
		);

		expect(result.current.stream).toBeUndefined();
		expect(result.current.applied).toBe('none');
		expect(result.current.applying).toBeFalsy();
		expect(result.current.error).toBeUndefined();

		const stream01 = new Stream(null, { _initialAudioAppliedProcessor: 'none' });

		// Then make stream defined
		rerender({ stream: stream01, type: 'noiseReduction' });
		expect(result.current.applying).toBeTruthy();
		expect(result.current.applied).toBe('none');
		expect(result.current.stream).toBe(stream01);
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.applied).toBe('noiseReduction');
		expect(result.current.stream?.getId()).toBe('id-noiseReduction');
		expect(result.current.error).toBeUndefined();

		// Change stream
		const stream02 = new Stream(null, { _initialAudioAppliedProcessor: 'none' });
		rerender({ stream: stream02, type: 'noiseReduction' });
		expect(result.current.applying).toBeTruthy();
		expect(result.current.applied).toBe('none');
		expect(result.current.stream).toBe(stream02);
		expect(result.current.error).toBeUndefined();

		await waitForNextUpdate();
		expect(result.current.applying).toBeFalsy();
		expect(result.current.applied).toBe('noiseReduction');
		expect(result.current.stream?.getId()).toBe('id-noiseReduction');
		expect(result.current.error).toBeUndefined();
	});
});
