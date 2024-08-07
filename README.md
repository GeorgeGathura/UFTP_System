# UDP File Transfer System

## Objectives

- Build a program that can send a file from a client to a server using UDP.
- Implement basic error checking and recovery mechanisms, such as sequence numbers or checksums, to
  ensure data integrity.
- Contains additional features such as progress tracking and concurrent file transfers.

## Protocol

- The client will send a packet with the following structure:
  - 2 bytes representing sequence number
  - 2 bytes for filename length
  - bytes equal to filename length for the filename
  - 4 bytes for the chunk length
  - bytes equal to the chunk length for the chunk
- Send a packet with chunk length equal to zero when we have sent all the chunks for a given file
- End signal is defined as a packet with chunk length equal to zero
- Proactive client:
  - The client requires server to send acks of chunks
  - If some chunks are not acknowledged, then resend them
  - Wait until all the chunks have been acknowledged before sending end signal
  - Batching acknowledgements:
    - Batching every couple of seconds
    - Batching once a batch reaches a given size
  - Resend missing chunks
    1. Find missing chunks
    2. Resend missing chunks
    3. Repeat (1) and (2) as long as there are missing chunks
    4. When everything has been sent and acknowledged, send end signal
  - Server needs to deal with chunks that are sent multiple times
- Data corruption
  - use md5 for hashing
  - add a checksum of the chunk
  - server to verify the checksum and only send an acknowledgement if checksum matches
- Encryption
  - Encrypt chunk using aes256
- Compression
  - Use gunzip for compression

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


## Discussion on 7th Feb
- Remove setTimeout hack and get batch ack from server & replace with a promise once all ack are received.
- The server will send a packet with the following structure:
  - 2 bytes representing sequence number
  - 2 bytes for filename length
  - bytes equal to filename length for the filename

## Discussion on 20th Feb
- For small file such as package.json, server seems to expect 2 sequences instead of just one
- Implement acknowledgement on client side
- Remove setTimeout hack after implementing acknowledgement on client side

## Discussion on 5th Mar
- Fixed an issue where server seems to expect 2 sequences instead of just one
- Large files seem to be corrupted
- Look into refactoring some of the code

## Discussion on 12th Mar
- Fixed issue where large files seem corrupted
- Refactored some code
- Start handling data corruption for next time
  - Implement checksums
  - Get started on retry mechanism

## Discussion on 19th Mar
- Handling incorrect packet structure
- Implemented checksums but there's something wrong with the code

## Discussion on 9th Apr
- We are now able to get the checksum from the client side but checksum validation is still failing because for some reason, we are unable to read all the data that's sent from the client side.

## Discussion on 23rd Apr
- Got checksum validation to work
- Next time we should simulate packet corruption and see if corrupted packets are detected
- We can then get started on a retry mechanism so the client can resend a packet that's not successfully sent

## Discussion on 21st May
- Managed to simulate packet loss
- Retry mechanism:
  - for each chunk sent, we set a timeout for it
  - if timeout elapses before the chunk is ack'ed then we resend it
  - we need to set MAX_RETRIES
- Worked on first iteration of retry mechanism
  - Client side never seems to terminate
  - Server side doesn't seem to receive all chunks
  - Getting an error where a sequence number is not in the sequences map

## Discussion on 28th May
- Figure out why some sequence numbers cannot be found in the sequences map
  - Increment value of `sequenceNumber` was being used in the callbacks
- Increasing the timeout value for resends allows us to send a small file
- Need to figure out a better solution

## Discussion on 11th June
- Figure out a better solution than increasing timeouts on the client side
- Maybe next time
  - Remove timeouts when sequence is ack'ed
  - Add dynamic flags on client side to manage timeouts
  - Add support for multiple files on client side
  - Fix corner case for empty file
  - Test across the Internet
  - Handle program exit
  - When resending, we should rely on start and end of sequence instead of entire chunk

## Discussion on 23rd July

-- Use of Octets instead of hexadecimal
  - Effiency in parsing
  - Simplicity and standradization
* (Already implemented low level)
- Send multiple files

## Discussion on 6th August

  - Fix corner case for empty file

## Conclusion






