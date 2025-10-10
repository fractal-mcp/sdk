# Parent host helpers

The React component in this directory implements the outermost side of the
sandbox protocol. It mounts an iframe that loads the sandbox bundle and
completes the MessageChannel handshake documented in
`../reversed/message-protocol.md`. The component exposes strongly typed props
for tool input/output, widget metadata, and host callbacks so product surfaces
can integrate without reimplementing the transport glue.
