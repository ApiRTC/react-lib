# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-01-14

### Added

- Prettier

## [1.2.0] - 2026-01-12

### Added

- useTranscriptService: start, stop, and get messages from a TranscriptService in a conversation

## [1.1.8] - 2024-02-13

### Enhanced

- useStreamApplyVideoProcessor: better performances and error cases management

## [1.1.7] - 2024-02-12

### Fixed

- useStreamApplyVideoProcessor: do not raise error when applying 'none' on no processor applied stream

## [1.1.6] - 2024-02-12

### Added

- useStreamApplyAudioProcessor

## [1.1.4] - 2024-01-22

### Enhanced

- useCameraStream: return error on createStream
- global performances improvements

## [1.1.3] - 2024-01-22

### Enhanced

- useUserMediaDevices performances

## [1.1.2] - 2024-01-17

### Enhanced

- global performances improvements, rely on inputs expected immutability. Comply with es-lint react.
  Updated examples in README doc accordingly.

## [1.1.1] - 2023-10-31

### Added

- useConversationStreams: Added unsubscribeAll output convenient method

### Enhanced

- useConversationStreams: improved state management

## [1.1.0] - 2023-10-18

### Added

- useConversationContacts: To manage Conversation Contact(s)

## [1.0.19] - 2023-10-16

### Enhanced

- useUserMediaDevices: storageKeyPrefix undefined value indicates to NOT use local storage to get and store selected devices ids

## [1.0.17] - 2023-07-18

### Enhanced

- useConversation/Session: improve logging

## [1.0.16] - 2023-07-13

### Enhanced

- useConversationStreams: logging and performance

## [1.0.14] - 2023-05-17

### Fixed

- useUserMediaDevices: fix issue trying to access localStorage in incognito mode

## [1.0.13] - 2023-05-16

### Enhanced

- useConversation: added joinOptions support

## [1.0.12] - 2023-05-09

### Enhanced

- useCameraStream: added grabbing return status

- useStreamApplyVideoProcessor: added applying return status

## [1.0.11] - 2023-05-05

### Enhanced

- logging: avoid using JSON.stringify in logs arguments

## [1.0.10] - 2023-04-17

### Fixed

- useUserMediaDevices, useCameraStream

## [1.0.9] - 2023-04-17

### Enhanced

- useUserMediaDevices: manage selected devices in local storage.

## [1.0.7] - 2023-02-20

### Fixed

- useConversation fix: changing conversation was overridden by previous conversation leave setting it to undefined
- useConversationStreams fix: un-publish/publish rather than replace stream when PublishOptions differ
- useConversationStreams fix: better handle publishOptions change

## [1.0.6] - 2023-02-03

### Changed

- useConversation input parameter join default to true

### Fixed

- useStreamApplyVideoProcessor fix to work with apirtc>=5.0.x

## [1.0.5] - 2023-01-19

### Added

- CHANGELOG.md, LICENSE.md
- repository

### Fixed

- Depend on react>=17 to allow library to be used with both react 17 and 18

## [1.0.4]

### Added

- Initial publication
