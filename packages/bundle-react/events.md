[Max thots]
1. Event Routing
We should expose a global message router which accepts messages that have component ids on them. 
```ts
type SuperMessage {
    destinationId: string; // id of ui component instance to route message to.
    messageId: string;
    type: string;
    payload: {};
}
```

2. Event Replaying.
While messages that originate from inside the iframe are generally non-problematic, messages that orgiinate from the agent and trigger component updates will need to be run again in the same order in order to reconstruct component state properly on reload.

But we don't actually have a complete history! The user's actions aren't being saved. Any nondeterministic operations aren't replayable. So we either need to provide a component session snapshotting mechanism, or we need to outlaw components which have messages in -- Any component render needs a sessionId. When triggering an event on the component, we need to compare its session id against the component's current sessionId.

The easiest way to do this would be to require all state is global and snapshottable. In this case, we don't even need to replay any events - just find the snapshot after the most recent event. Use lookupSnapshotForComponent(componentId) which should find a snapshot from somewhere. Where? Could be localstorage (which would give the host access to user's privileged guest-related info) Or it could be user's onepassword for agents account.

[Fractal Vault = onepassword for agents]
- this is half backed by the way. Who uses this? provider? consumer? Both?
Why doesnt provider just make an api call back to its hosting to save component state, then revive it later? Oh because it needs to make its own endpoint... Can fractal provide a utility: useFractalState<T>() where everything is checkpointed nicely on some schedule, and all operations only modify the state...

OK so we need to be able to configure components (providers need to, to be specific) to either 
- load from a snapshot or not
- allow replaying events from different sessions or not.

Possible cases:
- never replay events, always load latest snapshot.
- replay events (basic form filling is fine.)
- No snapshot or replay: sessionId mismatch -> error, no render
- No snapshot or replay: sessionId mismatch -> success, but renders original data.

What happens if the host doesnt supply session IDs but the guest can use them?
- with no session ID, guests can decide what to do.

Is there ever a case where we want the consumer to supply the snapshot?
How do we know what the sessionId is? Oh its not for the component, its for the page load.
The fractal client library can manage the pageLoadId, but how does the agent what the value is? the pageLoadId is in metadata.

OK lets figure out this flow before 5:45 so we can start to code lol. We're almost halfway in. 

Who makes the pageLoadId? the host ui does. It needs to send it with each agent call. 
- the tool calls can easily get it from the request context of the agent.
I think theres no way around having to send metadata with the requests so u know which page id something came from

OK I may have a better plan. By default we should play each event exactly once. Every event should atually be played at least once (meaning we try again if we didn't get a response) throughout the system except for inside of the component, where a proper log is kept. Message bus is responsible for receiving and logging events from outside the iframe. This protects against incompetent clients. Providers can guarantee by using our libraries that events wont be replayed twice. But we need to protect against events that have already been responded to.

Man the most robust way is really to assign a sessionId to the messages and let the provider decide how to handle.