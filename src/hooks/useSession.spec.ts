import { act, renderHook } from '@testing-library/react-hooks';

import './getDisplayMedia.mock';

import { RegisterInformation, UserAgentOptions } from '@apirtc/apirtc';

import useSession, { Credentials } from './useSession';

import { setLogLevel } from '..';

// Partial mocking @apirtc/apirtc module
// see https://jestjs.io/docs/mock-functions
jest.mock('@apirtc/apirtc', () => {
	const originalModule = jest.requireActual('@apirtc/apirtc');

	return {
		__esModule: true,
		...originalModule,
		UserAgent: jest.fn().mockImplementation((options: UserAgentOptions) => {
			return {
				register: (registerInfo: RegisterInformation) => {
					return new Promise<any>((resolve, reject) => {
						if (options.uri && options.uri === 'apiKey:fail') {
							reject('fail');
						} else {
							resolve({
								getId: () => {
									return JSON.stringify(options) + JSON.stringify(registerInfo);
								},
								disconnect: () => {
									return new Promise<void>((resolve, reject) => {
										if (
											options.uri &&
											options.uri === 'apiKey:disconnect-fail'
										) {
											reject('disconnect-fail');
										} else {
											resolve();
										}
									});
								},
							});
						}
					});
				},
			};
		}),
	};
});

// Set log level to max to maximize code coverage
setLogLevel('debug');

// Testing guide
// https://www.toptal.com/react/testing-react-hooks-tutorial

describe('useSession', () => {
	test(`Default value of session will be undefined`, () => {
		const { result } = renderHook(() => useSession());
		expect(result.current.session).toBe(undefined);
		expect(result.current.connecting).toBe(false);

		act(() => {
			result.current.disconnect();
		});

		expect(result.current.session).toBe(undefined);
	});

	test(`Unrecognized credentials`, async () => {
		const credentials = { foo: 'bar' } as unknown as Credentials;
		const errorCb = (error: any) => {
			expect(error).toBe('credentials not recognized');
		};
		const { result } = renderHook(() => useSession(credentials, undefined, errorCb));
		expect(result.current.session).toBe(undefined);
		expect(result.current.connecting).toBe(false);
	});

	test(`Unrecognized credentials (not an object), no error callback`, async () => {
		const credentials = 'foo' as unknown as Credentials;
		const { result } = renderHook(() => useSession(credentials));
		expect(result.current.session).toBe(undefined);
		expect(result.current.connecting).toBe(false);
	});

	test(`LoginPassword credentials`, async () => {
		const credentials = { username: 'foo', password: 'bar' };
		const options = { cloudUrl: 'https://my.cloud.address' };
		const { result, waitForNextUpdate } = renderHook(() => useSession(credentials, options));
		expect(result.current.connecting).toBe(true);
		await waitForNextUpdate();
		console.log('SESSION', result.current.session);
		expect(result.current.connecting).toBe(false);
		expect(result.current.session?.getId()).toBe(
			'{"uri":"apirtc:foo"}{"cloudUrl":"https://my.cloud.address","password":"bar"}'
		);
	});

	test(`ApiKey credentials`, async () => {
		const credentials = { apiKey: 'foo' };
		const { result, waitForNextUpdate } = renderHook(() => useSession(credentials));
		expect(result.current.connecting).toBe(true);
		await waitForNextUpdate();
		console.log('SESSION', result.current.session);
		expect(result.current.connecting).toBe(false);
		expect(result.current.session?.getId()).toBe(
			'{"uri":"apiKey:foo"}{"cloudUrl":"https://cloud.apirtc.com"}'
		);
	});

	test(`ApiKey credentials fail`, async () => {
		const credentials = { apiKey: 'fail' };
		const { result, waitForNextUpdate } = renderHook(() => useSession(credentials));
		expect(result.current.connecting).toBe(true);
		await waitForNextUpdate();
		console.log('connecting', result.current.connecting);
		expect(result.current.connecting).toBe(false);
		expect(result.current.session?.getId()).toBe(undefined);
	});

	test(`token credentials`, async () => {
		const credentials = { token: 'foo' };
		const { result, waitForNextUpdate } = renderHook(() => useSession(credentials));
		await waitForNextUpdate();
		console.log('SESSION', result.current.session);
		expect(result.current.session?.getId()).toBe(
			'{"uri":"token:foo"}{"cloudUrl":"https://cloud.apirtc.com"}'
		);
	});

	test(`ApiKey credentials disconnect-fail`, async () => {
		const credentials = { apiKey: 'disconnect-fail' };
		const { result, waitForNextUpdate, rerender } = renderHook(() => useSession(credentials));
		expect(result.current.connecting).toBe(true);
		await waitForNextUpdate();
		console.log('SESSION', result.current.session);
		expect(result.current.connecting).toBe(false);
		expect(result.current.session?.getId()).toBe(
			'{"uri":"apiKey:disconnect-fail"}{"cloudUrl":"https://cloud.apirtc.com"}'
		);

		// trigger disconnect by setting credentials to undefined
		rerender({ credentials: undefined });

		//await waitForNextUpdate()

		expect(result.current.session?.getId()).toBe(
			'{"uri":"apiKey:disconnect-fail"}{"cloudUrl":"https://cloud.apirtc.com"}'
		);
	});
});
