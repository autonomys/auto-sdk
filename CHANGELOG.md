## [Unreleased]

Future changes will appear here.


## [1.5.12] - 2025-07-29

### Features

- add moderation system handlers to auto-files pkg ([#458](https://github.com/autonomys/auto-sdk/pull/458)) [@clostao](https://github.com/clostao)
- add report features to auto-drive pkg ([#457](https://github.com/autonomys/auto-sdk/pull/457)) [@clostao](https://github.com/clostao)

### Chores

- remove Xm0on from codeowners ([#456](https://github.com/autonomys/auto-sdk/pull/456)) [@Xm0onh](https://github.com/Xm0onh)
- v1.5.11 ([#455](https://github.com/autonomys/auto-sdk/pull/455)) [@clostao](https://github.com/clostao)
- fix changelog generator ([#452](https://github.com/autonomys/auto-sdk/pull/452)) [@clostao](https://github.com/clostao)
- update dependency eslint-config-prettier to ^10.1.5 ([#370](https://github.com/autonomys/auto-sdk/pull/370)) [@renovate[bot]](https://github.com/apps/renovate)

## [1.5.11] - 2025-07-21

### Features

- add get node method ([#454](https://github.com/autonomys/auto-sdk/pull/454)) [@clostao](https://github.com/clostao)

## [1.5.10] - 2025-07-17

### Features

- add support for byte range cache retrieval ([#453](https://github.com/autonomys/auto-sdk/pull/453)) [@clostao](https://github.com/clostao)

### Chores

- release v1.5.9 ([#451](https://github.com/autonomys/auto-sdk/pull/451)) [@jfrank-summit](https://github.com/jfrank-summit)


## [1.5.9] - 2025-07-15

### Features

- simplify `nominatorPosition` to use runtime api ([#450](https://github.com/autonomys/auto-sdk/pull/450)) [@jfrank-summit](https://github.com/jfrank-summit)


## [1.5.8] - 2025-07-15

### Features

- add input sanitization for FilePreview ([#447](https://github.com/autonomys/auto-sdk/pull/447)) [@clostao](https://github.com/clostao)

### Bug Fixes

- fix runtime upgrade compatibility for operator epoch share prices ([#449](https://github.com/autonomys/auto-sdk/pull/449)) [@jfrank-summit](https://github.com/jfrank-summit)

### Chores

- bump version to v1.5.7 ([#445](https://github.com/autonomys/auto-sdk/pull/445)) [@clostao](https://github.com/clostao)


## [1.5.7] - 2025-07-09

### Code Refactoring

- update sdk structure for avoid deps issues ([#443](https://github.com/autonomys/auto-sdk/pull/443)) [@clostao](https://github.com/clostao)


## [1.5.6] - 2025-07-08

### Features

- add utils for testing rpc integrations ([#442](https://github.com/autonomys/auto-sdk/pull/442)) [@clostao](https://github.com/clostao)

### Chores

- v1.5.5 ([#441](https://github.com/autonomys/auto-sdk/pull/441)) [@jfrank-summit](https://github.com/jfrank-summit)


## [1.5.5] - 2025-07-02

### Features

- add headDomainNumber function to retrieve latest block number for a specific domain ([#440](https://github.com/autonomys/auto-sdk/pull/440)) [@jfrank-summit](https://github.com/jfrank-summit)
- add storage fee refund to pending withdrawals ([#439](https://github.com/autonomys/auto-sdk/pull/439)) [@jfrank-summit](https://github.com/jfrank-summit)


## [1.5.4] - 2025-07-01

### Features

- enable passing http options to HttpClient & methods ([#438](https://github.com/autonomys/auto-sdk/pull/438)) [@clostao](https://github.com/clostao)

### Chores

- v1.5.3 ([#437](https://github.com/autonomys/auto-sdk/pull/437)) [@clostao](https://github.com/clostao)


## [1.5.3] - 2025-07-01

### Features

- improve type infer ([#436](https://github.com/autonomys/auto-sdk/pull/436)) [@clostao](https://github.com/clostao)
- ✨ file preview component ([#433](https://github.com/autonomys/auto-sdk/pull/433)) [@iamnamananand996](https://github.com/iamnamananand996)

### Documentation

- add comprehensive JSDoc documentation for @autonomys/auto-utils package ([#434](https://github.com/autonomys/auto-sdk/pull/434)) [@cursor[bot]](https://github.com/apps/cursor)
- add comprehensive JSDoc documentation for @autonomys/auto-consensus exported functions ([#432](https://github.com/autonomys/auto-sdk/pull/432)) [@cursor[bot]](https://github.com/apps/cursor)

### Code Refactoring

- nominatorPosition calculation into smaller, easier to follow functions ([#435](https://github.com/autonomys/auto-sdk/pull/435)) [@jfrank-summit](https://github.com/jfrank-summit)

### Chores

- Chore v1.5.2 ([#431](https://github.com/autonomys/auto-sdk/pull/431)) [@clostao](https://github.com/clostao)


## [1.5.2] - 2025-06-24

### Features

- advanced staking position tracking ([#429](https://github.com/autonomys/auto-sdk/pull/429)) [@jfrank-summit](https://github.com/jfrank-summit)

### Bug Fixes

- downloads should be perfomed in raw mode ([#430](https://github.com/autonomys/auto-sdk/pull/430)) [@clostao](https://github.com/clostao)


## [1.5.1] - 2025-06-19

### Features

- support conditional fetching from cache or dsn ([#428](https://github.com/autonomys/auto-sdk/pull/428)) [@clostao](https://github.com/clostao)

### Chores

- bump to v1.5.0 ([#426](https://github.com/autonomys/auto-sdk/pull/426)) [@clostao](https://github.com/clostao)


## [1.5.0] - 2025-06-13

### Features

- create @autonomys/auto-files pkg ([#425](https://github.com/autonomys/auto-sdk/pull/425)) [@clostao](https://github.com/clostao)
- add `streamToBuffer` method ([#424](https://github.com/autonomys/auto-sdk/pull/424)) [@clostao](https://github.com/clostao)

### Bug Fixes

- `Cache.has` method was not returning a boolean but throwing if failing ([#423](https://github.com/autonomys/auto-sdk/pull/423)) [@clostao](https://github.com/clostao)

### Chores

- remove Marc-Aurele from codeowners file ([#422](https://github.com/autonomys/auto-sdk/pull/422)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- v1.4.35 ([#421](https://github.com/autonomys/auto-sdk/pull/421)) [@clostao](https://github.com/clostao)


## [1.4.35] - 2025-05-29

### Features

- ✨ add async download functionality to AutoDrive API ([#413](https://github.com/autonomys/auto-sdk/pull/413)) [@clostao](https://github.com/clostao)

### Chores

- bump to v1.4.34 ([#420](https://github.com/autonomys/auto-sdk/pull/420)) [@clostao](https://github.com/clostao)


## [1.4.34] - 2025-05-29

### Features

- enable to redirect to a separate download service ([#419](https://github.com/autonomys/auto-sdk/pull/419)) [@clostao](https://github.com/clostao)

### Chores

- bump version to v1.4.33 ([#418](https://github.com/autonomys/auto-sdk/pull/418)) [@clostao](https://github.com/clostao)


## [1.4.33] - 2025-05-28

### Bug Fixes

- remove cross-dependency on env vars ([#415](https://github.com/autonomys/auto-sdk/pull/415)) [@jfrank-summit](https://github.com/jfrank-summit)

### Chores

- v1.4.32 ([#417](https://github.com/autonomys/auto-sdk/pull/417)) [@clostao](https://github.com/clostao)


## [1.4.32] - 2025-05-28

### Features

- add "has" method to file cache ([#416](https://github.com/autonomys/auto-sdk/pull/416)) [@clostao](https://github.com/clostao)
- redirect to public instances for downloads ([#414](https://github.com/autonomys/auto-sdk/pull/414)) [@clostao](https://github.com/clostao)
- ✨ add astral component ([#412](https://github.com/autonomys/auto-sdk/pull/412)) [@iamnamananand996](https://github.com/iamnamananand996)
- safe fork stream method for asynchronous pkg ([#410](https://github.com/autonomys/auto-sdk/pull/410)) [@clostao](https://github.com/clostao)
- add `forkStream` method to `@autonomys/asynchronous` ([#405](https://github.com/autonomys/auto-sdk/pull/405)) [@clostao](https://github.com/clostao)
- ✨ add release cycle and changelog ([#394](https://github.com/autonomys/auto-sdk/pull/394)) [@iamnamananand996](https://github.com/iamnamananand996)
- ✨ add auto-design-system sdk ([#393](https://github.com/autonomys/auto-sdk/pull/393)) [@iamnamananand996](https://github.com/iamnamananand996)
- ✨ add design tokens sdk ([#389](https://github.com/autonomys/auto-sdk/pull/389)) [@iamnamananand996](https://github.com/iamnamananand996)
- make server respond to http post request ([#385](https://github.com/autonomys/auto-sdk/pull/385)) [@clostao](https://github.com/clostao)
- Feat: Improve user session ([#373](https://github.com/autonomys/auto-sdk/pull/373)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- Feat: Add WAI3 contract ([#364](https://github.com/autonomys/auto-sdk/pull/364)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- Feat: user session package ([#334](https://github.com/autonomys/auto-sdk/pull/334)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- add auto-dag-data methods ([#326](https://github.com/autonomys/auto-sdk/pull/326)) [@clostao](https://github.com/clostao)
- Feat: Add auto xdm deno example ([#318](https://github.com/autonomys/auto-sdk/pull/318)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- Feat: Add support for creation of ethereum wallet in auto-utils ([#315](https://github.com/autonomys/auto-sdk/pull/315)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- Feat: Add more XDM function ([#303](https://github.com/autonomys/auto-sdk/pull/303)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)

### Bug Fixes

- 🐛 publish action workflow and version sync ([#409](https://github.com/autonomys/auto-sdk/pull/409)) [@iamnamananand996](https://github.com/iamnamananand996)
- b2 ([#404](https://github.com/autonomys/auto-sdk/pull/404)) [@iamnamananand996](https://github.com/iamnamananand996)
- 🐛 read publish version number from lerna ([#402](https://github.com/autonomys/auto-sdk/pull/402)) [@iamnamananand996](https://github.com/iamnamananand996)
- 🐛 push changelog berfore publish to npm ([#400](https://github.com/autonomys/auto-sdk/pull/400)) [@iamnamananand996](https://github.com/iamnamananand996)
- 🐛 add dynamic import to support ES modules ([#399](https://github.com/autonomys/auto-sdk/pull/399)) [@iamnamananand996](https://github.com/iamnamananand996)
- 🐛 remove lint and format check and have PR title check on the work flow ([#398](https://github.com/autonomys/auto-sdk/pull/398)) [@iamnamananand996](https://github.com/iamnamananand996)
- express http requests handling ([#395](https://github.com/autonomys/auto-sdk/pull/395)) [@clostao](https://github.com/clostao)
- stream handling ([#391](https://github.com/autonomys/auto-sdk/pull/391)) [@clostao](https://github.com/clostao)
- Fix: Remove fs ([#371](https://github.com/autonomys/auto-sdk/pull/371)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- temporary file path ([#367](https://github.com/autonomys/auto-sdk/pull/367)) [@clostao](https://github.com/clostao)
- failing mkdir when dir exists ([#362](https://github.com/autonomys/auto-sdk/pull/362)) [@clostao](https://github.com/clostao)
- caching policy ([#352](https://github.com/autonomys/auto-sdk/pull/352)) [@clostao](https://github.com/clostao)
- update dependency mime-types to ^3.0.1 ([#340](https://github.com/autonomys/auto-sdk/pull/340)) [@renovate[bot]](https://github.com/apps/renovate)
- missing export in api typings ([#330](https://github.com/autonomys/auto-sdk/pull/330)) [@clostao](https://github.com/clostao)
- update dependency mime-types to v3 ([#324](https://github.com/autonomys/auto-sdk/pull/324)) [@renovate[bot]](https://github.com/apps/renovate)
- Fix: Default ss58 prefix ([#319](https://github.com/autonomys/auto-sdk/pull/319)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- update dependency @polkadot/extension-dapp to ^0.58.6 ([#308](https://github.com/autonomys/auto-sdk/pull/308)) [@renovate[bot]](https://github.com/apps/renovate)
- Fix: createDomainsChainIdType falsy assumption on domainId 0 ([#306](https://github.com/autonomys/auto-sdk/pull/306)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- update dependency zod to ^3.24.2 ([#296](https://github.com/autonomys/auto-sdk/pull/296)) [@renovate[bot]](https://github.com/apps/renovate)
- update dependency multiformats to ^13.3.2 ([#292](https://github.com/autonomys/auto-sdk/pull/292)) [@renovate[bot]](https://github.com/apps/renovate)
- update dependency @ipld/dag-pb to ^4.1.3 ([#291](https://github.com/autonomys/auto-sdk/pull/291)) [@renovate[bot]](https://github.com/apps/renovate)

### Chores

- release v1.4.31 ([#411](https://github.com/autonomys/auto-sdk/pull/411)) [@clostao](https://github.com/clostao)
- Fix b5 ([#408](https://github.com/autonomys/auto-sdk/pull/408)) [@iamnamananand996](https://github.com/iamnamananand996)
- docs ([#407](https://github.com/autonomys/auto-sdk/pull/407)) [@iamnamananand996](https://github.com/iamnamananand996)
- docs ([#406](https://github.com/autonomys/auto-sdk/pull/406)) [@iamnamananand996](https://github.com/iamnamananand996)
- docs ([#403](https://github.com/autonomys/auto-sdk/pull/403)) [@iamnamananand996](https://github.com/iamnamananand996)
- Fix missing wrap of RPC handler http request ([#397](https://github.com/autonomys/auto-sdk/pull/397)) [@clostao](https://github.com/clostao)
- Chore v1.4.22 ([#396](https://github.com/autonomys/auto-sdk/pull/396)) [@clostao](https://github.com/clostao)
- v1.4.21 ([#392](https://github.com/autonomys/auto-sdk/pull/392)) [@clostao](https://github.com/clostao)
- Add validation to `weightedRequestConcurrencyController` ([#390](https://github.com/autonomys/auto-sdk/pull/390)) [@clostao](https://github.com/clostao)
- Chore 1.4.20 ([#388](https://github.com/autonomys/auto-sdk/pull/388)) [@clostao](https://github.com/clostao)
- Add Agent Experiences MCP Server and Improve CID Manager functionality ([#386](https://github.com/autonomys/auto-sdk/pull/386)) [@jfrank-summit](https://github.com/jfrank-summit)
- update: file response model ([#384](https://github.com/autonomys/auto-sdk/pull/384)) [@clostao](https://github.com/clostao)
- Convert auto-agents to nodenext ([#383](https://github.com/autonomys/auto-sdk/pull/383)) [@jfrank-summit](https://github.com/jfrank-summit)
- Add auto-agents package ([#382](https://github.com/autonomys/auto-sdk/pull/382)) [@jfrank-summit](https://github.com/jfrank-summit)
- Feature: Add download object and search object tools to auto-drive mcp ([#377](https://github.com/autonomys/auto-sdk/pull/377)) [@jfrank-summit](https://github.com/jfrank-summit)
- Fix auto-mcp-server package usage ([#376](https://github.com/autonomys/auto-sdk/pull/376)) [@jfrank-summit](https://github.com/jfrank-summit)
- Add auto-mcp-servers package ([#375](https://github.com/autonomys/auto-sdk/pull/375)) [@jfrank-summit](https://github.com/jfrank-summit)
- Publish v1.4.18 ([#374](https://github.com/autonomys/auto-sdk/pull/374)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- Chore: Publish 1.4.17 ([#372](https://github.com/autonomys/auto-sdk/pull/372)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- v1.4.16 ([#368](https://github.com/autonomys/auto-sdk/pull/368)) [@clostao](https://github.com/clostao)
- v1.4.15 ([#366](https://github.com/autonomys/auto-sdk/pull/366)) [@clostao](https://github.com/clostao)
- Update dependency typescript to ^5.8.3 ([#363](https://github.com/autonomys/auto-sdk/pull/363)) [@renovate[bot]](https://github.com/apps/renovate)
- Update dependency eslint to ^9.25.1 ([#361](https://github.com/autonomys/auto-sdk/pull/361)) [@renovate[bot]](https://github.com/apps/renovate)
- v1.4.14 ([#355](https://github.com/autonomys/auto-sdk/pull/355)) [@clostao](https://github.com/clostao)
- v1.4.13 ([#354](https://github.com/autonomys/auto-sdk/pull/354)) [@clostao](https://github.com/clostao)
- Update callback naming ([#353](https://github.com/autonomys/auto-sdk/pull/353)) [@clostao](https://github.com/clostao)
- update dependency ts-jest to ^29.3.1 ([#351](https://github.com/autonomys/auto-sdk/pull/351)) [@renovate[bot]](https://github.com/apps/renovate)
- Chore: Add codeowners ([#350](https://github.com/autonomys/auto-sdk/pull/350)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- fix eslint setup ([#349](https://github.com/autonomys/auto-sdk/pull/349)) [@clostao](https://github.com/clostao)
- Publish 1.4.12 ([#348](https://github.com/autonomys/auto-sdk/pull/348)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- Chore: Re-organize utility packages in packages/utility/ ([#346](https://github.com/autonomys/auto-sdk/pull/346)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- update dependency eslint to ^9.23.0 ([#345](https://github.com/autonomys/auto-sdk/pull/345)) [@renovate[bot]](https://github.com/apps/renovate)
- v1.4.11 ([#343](https://github.com/autonomys/auto-sdk/pull/343)) [@clostao](https://github.com/clostao)
- Add notifications support to Type-Safe RPC ([#342](https://github.com/autonomys/auto-sdk/pull/342)) [@clostao](https://github.com/clostao)
- lock file maintenance ([#338](https://github.com/autonomys/auto-sdk/pull/338)) [@renovate[bot]](https://github.com/apps/renovate)
- Fix `returns` rpc api definition ([#332](https://github.com/autonomys/auto-sdk/pull/332)) [@clostao](https://github.com/clostao)
- v1.4.9 ([#331](https://github.com/autonomys/auto-sdk/pull/331)) [@clostao](https://github.com/clostao)
- Fix cid format ([#329](https://github.com/autonomys/auto-sdk/pull/329)) [@clostao](https://github.com/clostao)
- v1.4.7 ([#328](https://github.com/autonomys/auto-sdk/pull/328)) [@clostao](https://github.com/clostao)
- Add RPC API definitions for implementing type-safe RPC protocols ([#327](https://github.com/autonomys/auto-sdk/pull/327)) [@clostao](https://github.com/clostao)
- update dependency ts-jest to ^29.3.0 ([#325](https://github.com/autonomys/auto-sdk/pull/325)) [@renovate[bot]](https://github.com/apps/renovate)
- Fixing/enhancing RPC server ([#323](https://github.com/autonomys/auto-sdk/pull/323)) [@clostao](https://github.com/clostao)
- v1.4.6 ([#322](https://github.com/autonomys/auto-sdk/pull/322)) [@clostao](https://github.com/clostao)
- Fix rpc response ([#321](https://github.com/autonomys/auto-sdk/pull/321)) [@clostao](https://github.com/clostao)
- Chore/v1.4.5 ([#320](https://github.com/autonomys/auto-sdk/pull/320)) [@clostao](https://github.com/clostao)
- Publish v1.4.4 ([#317](https://github.com/autonomys/auto-sdk/pull/317)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- Chore/v.1.4.3 ([#316](https://github.com/autonomys/auto-sdk/pull/316)) [@clostao](https://github.com/clostao)
- File caching package ([#314](https://github.com/autonomys/auto-sdk/pull/314)) [@clostao](https://github.com/clostao)
- update dependency @types/jest to ^29.5.14 ([#313](https://github.com/autonomys/auto-sdk/pull/313)) [@renovate[bot]](https://github.com/apps/renovate)
- fix import error in documentation ([#312](https://github.com/autonomys/auto-sdk/pull/312)) [@clostao](https://github.com/clostao)
- Add custom-RPC package ([#311](https://github.com/autonomys/auto-sdk/pull/311)) [@clostao](https://github.com/clostao)
- update dependency eslint to ^9.23.0 ([#310](https://github.com/autonomys/auto-sdk/pull/310)) [@renovate[bot]](https://github.com/apps/renovate)
- Chore: Publish 1.4.2 ([#309](https://github.com/autonomys/auto-sdk/pull/309)) [@marc-aurele-besner](https://github.com/marc-aurele-besner)
- update dependency @polkadot/extension-inject to ^0.58.6 ([#307](https://github.com/autonomys/auto-sdk/pull/307)) [@renovate[bot]](https://github.com/apps/renovate)
- lock file maintenance ([#305](https://github.com/autonomys/auto-sdk/pull/305)) [@renovate[bot]](https://github.com/apps/renovate)
- Published v1.4.1 ([#302](https://github.com/autonomys/auto-sdk/pull/302)) [@clostao](https://github.com/clostao)
- update dependency prettier to ^3.5.3 ([#300](https://github.com/autonomys/auto-sdk/pull/300)) [@renovate[bot]](https://github.com/apps/renovate)
- update dependency eslint to ^9.22.0 ([#299](https://github.com/autonomys/auto-sdk/pull/299)) [@renovate[bot]](https://github.com/apps/renovate)
- update dependency @types/jest to ^29.5.14 ([#298](https://github.com/autonomys/auto-sdk/pull/298)) [@renovate[bot]](https://github.com/apps/renovate)
- update dependency ts-jest to ^29.2.6 ([#290](https://github.com/autonomys/auto-sdk/pull/290)) [@renovate[bot]](https://github.com/apps/renovate)
- update dependency @rollup/plugin-node-resolve to ^16.0.1 ([#289](https://github.com/autonomys/auto-sdk/pull/289)) [@renovate[bot]](https://github.com/apps/renovate)
- Add async library ([#288](https://github.com/autonomys/auto-sdk/pull/288)) [@clostao](https://github.com/clostao)

### Dependencies

- Update dependency cache-manager to ^6.4.2 ([#365](https://github.com/autonomys/auto-sdk/pull/365)) [@renovate[bot]](https://github.com/apps/renovate)


## [1.4.31] - 2025-05-14

### Features

- safe fork stream method for asynchronous pkg ([#410](https://github.com/autonomys/auto-sdk/pull/410)) [@clostao](https://github.com/clostao)
- add `forkStream` method to `@autonomys/asynchronous` ([#405](https://github.com/autonomys/auto-sdk/pull/405)) [@clostao](https://github.com/clostao)

### Bug Fixes

- 🐛 publish action workflow and version sync ([#409](https://github.com/autonomys/auto-sdk/pull/409)) [@iamnamananand996](https://github.com/iamnamananand996)

[Unreleased]: https://github.com/autonomys/auto-sdk/compare/v1.5.12...HEAD
[1.5.12]: https://github.com/autonomys/auto-sdk/compare/v1.5.11...v1.5.12
[1.5.11]: https://github.com/autonomys/auto-sdk/releases/tag/v1.5.11
