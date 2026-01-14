import { useEffect, useState, useCallback } from 'react';
import type { Conference } from '@apirtc/apirtc';

type TranscriptService = InstanceType<(typeof import('@apizee/ia'))['TranscriptService']>;
type Transcript = InstanceType<(typeof import('@apizee/ia'))['Transcript']>;

const HOOK_NAME = 'useTranscriptService';
/**
 * A hook to start/stop and get messages from a transcriptService
 * @param conversation an ApiRTC conversation
 * @param autoStart boolean to automatically start transcription
 */
export default function useTranscriptService(
	conversation: Conference | undefined,
	autoStart: boolean | undefined
) {
	const [transcriptService, setTranscriptService] = useState<TranscriptService | null>(null);
	const [hasStarted, setHasStarted] = useState<boolean>(false);

	const [transcripts, setTranscripts] = useState<Transcript[]>([]);

	// Instanciation
	useEffect(() => {
		if (transcriptService) return;

		let mounted = true;

		// Dynamic import @apizee/ia
		import('@apizee/ia').then(({ TranscriptService }) => {
			if (!mounted) {
				if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
					console.warn(`${HOOK_NAME}|instanciation aborted - component unmounted`);
				}
				return;
			}

			const service = new TranscriptService();
			setTranscriptService(service);
		});

		return () => {
			mounted = false;
		};
	}, [transcriptService]);

	// EventTranscript listener
	useEffect(() => {
		if (!transcriptService) {
			if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
				console.warn(
					`${HOOK_NAME}|useEffect transcript listener skipped - transcriptService not ready`
				);
			}
			return;
		}

		const onTranscript = (event: Event) => {
			// Necessary cast because EventTranscript extends Event
			const { transcript } = event as any;

			if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
				console.debug(`${HOOK_NAME}|onTranscript`, transcript);
			}

			setTranscripts((prev) => [...prev, transcript]);
		};

		transcriptService.addEventListener('transcript', onTranscript);

		return () => {
			transcriptService.removeEventListener('transcript', onTranscript);
			if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
				console.debug(`${HOOK_NAME}|useEffect cleanup`, 'onTranscript');
			}
		};
	}, [transcriptService]);

	// Start
	const startTranscriptService = useCallback(async () => {
		if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
			console.debug(
				`${HOOK_NAME}|startTranscriptService transcriptService, hasStarted`,
				transcriptService,
				hasStarted
			);
		}

		if (!transcriptService) {
			if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
				console.warn(
					`${HOOK_NAME}|startTranscriptService aborted - transcriptService not initialized`
				);
			}
			return;
		}

		if (hasStarted) {
			if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
				console.warn(`${HOOK_NAME}|startTranscriptService aborted - already started`);
			}
			return;
		}

		if (!conversation) {
			console.warn(`${HOOK_NAME}|startTranscriptService aborted - conversation not provided`);
			return;
		}

		await transcriptService
			.start(conversation)
			.then(() => {
				console.log(`${HOOK_NAME}|startTranscriptService - started`);
				setHasStarted(true);
			})
			.catch((error: string) => {
				console.error(`${HOOK_NAME}|startTranscriptService - failed`, error);
			});
	}, [transcriptService, hasStarted, conversation]);

	// Stop
	const stopTranscriptService = useCallback(async () => {
		if (!transcriptService) {
			if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
				console.warn(
					`${HOOK_NAME}|stopTranscriptService aborted - transcriptService not initialized`
				);
			}
			return;
		}

		if (!conversation) {
			console.warn(`${HOOK_NAME}|stopTranscriptService aborted - conversation not provided`);
			return;
		}

		await transcriptService
			.stop(conversation)
			.then(() => {
				console.log(`${HOOK_NAME}|stopTranscriptService - stopped`);
				setHasStarted(false);
			})
			.catch((error: string) => {
				console.error(`${HOOK_NAME}|stopTranscriptService - failed`, error);
			});
	}, [transcriptService, conversation]);

	// Auto-start
	useEffect(() => {
		if (globalThis.apirtcReactLibLogLevel.isDebugEnabled) {
			console.debug(
				`${HOOK_NAME}|useEffect autoStartTranscriptService autoStart, conversation`,
				autoStart,
				conversation
			);
		}

		if (!autoStart) {
			if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
				console.warn(`${HOOK_NAME}|useEffect autoStart skipped - autoStart=false`);
			}
			return;
		}

		if (!conversation) {
			if (globalThis.apirtcReactLibLogLevel.isWarnEnabled) {
				console.warn(
					`${HOOK_NAME}|useEffect - auto start transcription not possible if conversation not provided`
				);
			}
			return;
		}

		startTranscriptService();
	}, [autoStart, conversation, startTranscriptService]);

	return {
		transcriptService,
		hasStarted,
		transcripts,
		startTranscriptService,
		stopTranscriptService,
	};
}
