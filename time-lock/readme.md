### Time-Lock Encryption for Secret Sharing
--------------------------------------------


#### Core Components:

1. Shamir's Secret Sharing Scheme
2. Decentralized Sources of Wall-clock Time
3. Peer-to-peer Discovery of Key-Service Providers
4. Consensus of Key-Service Providers
5. Decentralized Storage of Encrypted Content


#### Plan Summary:

There will be `N` number of active key-service providers discovered by a user in a given time such that `2 < K < (N/2) < M < N` where `K` is the number of key-service providers that will be chosen randomly in the time-lock encryption process and `m` is the number of the providers that will approve the selection of `K` providers.

The user will set the number of total shares as `t`<sub>`s`</sub> such that `t`<sub>`s`</sub>` = K` and the minimum shares as `m`<sub>`s`</sub> to encrypt their secret using Shamir's Secret Sharing Scheme.

**Decentralized Sources of Wall-clock Time**

`TODO`

Plans:
- Block timestamp from Decentralized Blockchains
- Self-hosted NTP servers

**Peer-to-peer Discovery of Key-Service Providers**

`TODO`

Plans:
- IPFS Pub-Sub
- Self-hosted Signaling for WebRTC
- Self-hosted HTTP API

**Consensus of Key-Service Providers**

`TODO`

Plans:
- Majority voting counted by the user
- Surprisingly Popular algorithm

**Decentralized Storage of Encrypted Content**

`TODO`

Plans:
- IPFS
- Arweave
- Self-hosted

