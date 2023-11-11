# UDP File Transfer System

## Objectives

- Build a program that can send a file from a client to a server using UDP.
- Implement basic error checking and recovery mechanisms, such as sequence numbers or checksums, to
  ensure data integrity.
- Contains additional features such as progress tracking and concurrent file transfers.

## Implementations / Strategies
1. Multiple Single file transfer
2. Concurrent file transfer to a client
3. Concurrent file transfer to multiple clients from the sender
4. Encrypting Data. e.g. SSL, cryptography
5. Compression mechanisms

## Global Considerations for all implementations
- Packet ordering
- Error checking (checksum validation)
- Progress tracking - estimated times, timeouts, retransmissions,
- Storage of transmissions i.e buffer or on-disk storage
## Glossary

Sender -
Receiver -

## Troubleshooting

1. `EMSGSIZE` error can be resolved on Mac OS by running `sudo sysctl net.inet.udp.maxdgram=65536`

## Todos for next session:

- Handle large file transfer
    - server:
        - Create a temporary file where all the chunks get saved
        - Decide when to ask for chunks that haven't been received
        - Re-arrange after we receive everything
        - How do we decide that we have received everything: if we receive a chunk that doesn't have any data. It will have only a sequence number, file name length, the file name and the data length (should be zero).
    - client:
        - Should be able to resend chunks
        - Save temporary file that holds chunks and some metadata
        - Save metadata about chunks saved into temporary file

## Questions to handle next time:

- Dropped packets
- Corrupted packets

## Corner cases:

- Empty text file
