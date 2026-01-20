import { renderHook, act } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import useTranscriptService from './useTranscriptService';
import { setLogLevel } from '..';
import { Conference } from '@apirtc/apirtc';

jest.doMock(
	'@apirtc/ia',
	() => {
		class MockTranscriptService {
			listeners: Record<string, Function[]> = {};

			start = jest.fn(() => Promise.resolve());
			stop = jest.fn(() => Promise.resolve());

			addEventListener = (type: string, cb: Function) => {
				this.listeners[type] = this.listeners[type] || [];
				this.listeners[type].push(cb);
			};

			removeEventListener = (type: string, cb: Function) => {
				this.listeners[type] = (this.listeners[type] || []).filter((l) => l !== cb);
			};

			emit(type: string, event: any) {
				(this.listeners[type] || []).forEach((cb) => cb(event));
			}
		}

		return {
			__esModule: true,
			TranscriptService: MockTranscriptService,
			Transcript: class {},
		};
	},

	{ virtual: true }
);

// Set log level to max to maximize code coverage
setLogLevel('debug');

async function waitUntilStarted(
	result: any,
	waitForNextUpdate: () => Promise<void>
): Promise<void> {
	while (!result.current.hasStarted) {
		await waitForNextUpdate();
	}
}

describe('useTranscriptService', () => {
	const conversationMock: any = { id: 'conversation-id' };

	test('Default state', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(undefined, false)
		);

		// Wait for dynamic import
		await waitForNextUpdate();

		expect(result.current.transcriptService).toBeDefined();
		expect(result.current.hasStarted).toBe(false);
		expect(result.current.transcripts).toEqual([]);
	});

	test('Start aborted if conversation is undefined', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(undefined, false)
		);

		await waitForNextUpdate();

		await act(async () => {
			await result.current.startTranscriptService();
		});

		expect(result.current.hasStarted).toBe(false);
	});

	test('Start transcript service', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(conversationMock, false)
		);

		await waitForNextUpdate();

		await act(async () => {
			await result.current.startTranscriptService();
		});

		expect(result.current.hasStarted).toBe(true);
	});

	test('Start twice should be ignored', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(conversationMock, false)
		);

		await waitForNextUpdate();

		await act(async () => {
			await result.current.startTranscriptService();
			await result.current.startTranscriptService();
		});

		expect(result.current.hasStarted).toBe(true);
	});

	test('Stop transcript service', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(conversationMock, false)
		);

		await waitForNextUpdate();

		await act(async () => {
			await result.current.startTranscriptService();
		});

		expect(result.current.hasStarted).toBe(true);

		await act(async () => {
			await result.current.stopTranscriptService();
		});

		expect(result.current.hasStarted).toBe(false);
	});

	test('Stop aborted if not started', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(conversationMock, false)
		);

		await waitForNextUpdate();

		await act(async () => {
			await result.current.stopTranscriptService();
		});

		expect(result.current.hasStarted).toBe(false);
	});

	test('Auto-start when autoStart=true', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(conversationMock, true)
		);

		await waitUntilStarted(result, waitForNextUpdate);

		expect(result.current.hasStarted).toBe(true);
	});

	test('Receive transcript event', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(conversationMock, false)
		);

		await waitForNextUpdate();

		const service: any = result.current.transcriptService;

		const transcript = { text: 'hello world' };

		act(() => {
			service.emit('transcript', { transcript });
		});

		expect(result.current.transcripts).toHaveLength(1);
		expect(result.current.transcripts[0]).toBe(transcript);
	});

	test('Cleanup removes event listener', async () => {
		const { result, waitForNextUpdate, unmount } = renderHook(() =>
			useTranscriptService(conversationMock, false)
		);

		await waitForNextUpdate();

		const service: any = result.current.transcriptService;
		const spy = jest.spyOn(service, 'removeEventListener');

		unmount();

		expect(spy).toHaveBeenCalledWith('transcript', expect.any(Function));
	});

	test('startTranscriptService failure triggers catch', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(conversationMock, false)
		);

		await waitForNextUpdate();

		const service: any = result.current.transcriptService;
		service.start = jest.fn(() => Promise.reject('Start failed'));

		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		await act(async () => {
			await result.current.startTranscriptService();
		});

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('useTranscriptService|startTranscriptService - failed'),
			'Start failed'
		);

		errorSpy.mockRestore();
	});

	test('stopTranscriptService aborted if transcriptService not initialized', async () => {
		const { result } = renderHook(() => useTranscriptService(conversationMock, false));

		// transcriptService not instanciated, so it's null
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

		await act(async () => {
			await result.current.stopTranscriptService();
		});

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				'useTranscriptService|stopTranscriptService aborted - transcriptService not initialized'
			)
		);

		warnSpy.mockRestore();
	});

	test('stopTranscriptService aborted if conversation is undefined', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService(undefined, false)
		);

		await waitForNextUpdate(); // wait for transcriptService to be instanciated

		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

		await act(async () => {
			await result.current.stopTranscriptService();
		});

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				'useTranscriptService|stopTranscriptService aborted - conversation not provided'
			)
		);
		expect(result.current.hasStarted).toBe(false);

		warnSpy.mockRestore();
	});

	test('auto-start aborted if conversation is undefined', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

		// autoStart = true, but conversation = undefined
		renderHook(() => useTranscriptService(undefined, true));

		// We wait for a tick for the useEffect to be executed
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				'useTranscriptService|useEffect - auto start transcription not possible if conversation not provided'
			)
		);

		warnSpy.mockRestore();
	});

	test('stopTranscriptService failure triggers catch', async () => {
		const { result, waitForNextUpdate } = renderHook(() =>
			useTranscriptService({ id: 'conversation-id' } as unknown as Conference, false)
		);

		// Wait for service instanciation
		await waitForNextUpdate();

		// Force an eror on stop
		const service: any = result.current.transcriptService;
		service.stop = jest.fn(() => Promise.reject('Stop failed'));

		// Spy sur console.error
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		await act(async () => {
			await result.current.startTranscriptService();
		});

		await act(async () => {
			await result.current.stopTranscriptService();
		});

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('useTranscriptService|stopTranscriptService - failed'),
			'Stop failed'
		);

		errorSpy.mockRestore();
	});
});

describe('useTranscriptService deferred import', () => {
	// Deffered import resolve mock
	function deferred<T>() {
		let resolve!: (value: T) => void;
		let reject!: (reason?: any) => void;

		const promise = new Promise<T>((res, rej) => {
			resolve = res;
			reject = rej;
		});

		return { promise, resolve, reject };
	}

	test('Instantiation aborted if component unmounts before dynamic import resolves', async () => {
		const importDeferred = deferred<any>();

		jest.doMock('@apirtc/ia', () => importDeferred.promise);

		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

		const { unmount } = renderHook(() => useTranscriptService(undefined, false));

		// Unmount BEFORE resolving the import
		unmount();

		// Resolve AFTER unmount
		await act(async () => {
			importDeferred.resolve({
				TranscriptService: class {},
				Transcript: class {},
			});
		});

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('instanciation aborted - component unmounted')
		);

		warnSpy.mockRestore();
	});
});
