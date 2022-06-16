Object.defineProperty(navigator, 'getDisplayMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => new Promise<void>(resolve => {
        resolve()
    })),
});