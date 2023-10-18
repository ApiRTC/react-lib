# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
