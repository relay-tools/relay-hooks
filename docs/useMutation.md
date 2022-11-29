---
id: use-mutation
title: useMutation
---

## Credit useMutation 

useMutation has been integrated into relay-hooks thanks to the creators of the project [React Relay Mutation](https://github.com/relay-tools/react-relay-mutation)

Higher-level [React](https://facebook.github.io/react/) mutation API for [Relay](http://facebook.github.io/relay/).

## Usage

This package provides a `useMutation` Hook. These wrap up committing Relay mutations and keeping track of the mutation state.

```js
import React from 'react';
import { useMutation } from 'relay-hooks';

/* ... */

function MyComponentWithHook({ myValue }) {
  const [mutate, { loading }] = useMutation(
    graphql`
      mutation ExampleWithHookMutation($input: MyMutationInput) {
        myMutation(input: $input) {
          value
        }
      }
    `,
    {
      onCompleted: ({ myMutation }) => {
        window.alert(`received ${myMutation.value}`);
      },
    },
  );

  return loading ? (
    <LoadingIndicator />
  ) : (
    <button
      onClick={() => {
        mutate({
          variables: {
            input: { value: myValue },
          },
        });
      }}
    >
      Run Mutation
    </button>
  );
}

The `useMutation` hook take a mutation node and optionally any mutation options valid for `commitMutation` in Relay, except that `onCompleted` only takes a single argument for the response, as errors there will be handled identically to request errors. The `useMutation` hook takes the mutation as its first argument, and the optional configuration object as its second argument. `variables` is optional.

`useMutation` provide a tuple of a `mutate` callback and a `mutationState` object. This is the return value for `useMutation`

The `mutate` callback optionally takes a configuration object as above. Any options specified here will override the options specified to `useMutation`. Additionally, if `variables` was not specified above, it must be specified here. The `mutate` callback returns a promise. This will resolve with the mutation response or reject with any error (except when an `onError` callback is specified, in which case it will resolve with no value on errors).

The `mutationState` object has the following properties:

- `loading`: a boolean indicating whether the mutation is currently pending
- `data`: the response data for the mutation
- `error`: any errors returned by the mutation

## Optimistic Updates

To make your UI more responsive you can use the Optimistic UI pattern. You can read more about Optimistic UI in the [Relay Docs](https://relay.dev/docs/en/mutations#optimistic-updates) or the [Apollo Docs](https://www.apollographql.com/docs/react/performance/optimistic-ui/).

An Optimistic Response can be provided via the `optimisticResponse` paramater of the mutation options.

How do you know whether the `data` parameter contains the Optimistic Response you provided, or the the response from the server? 
The `data` property of the `useMutation` hook will contain the `optimisticResponse` when the request is in flight, i.e. when `loading` is `true`. When the response is received and `loading` is set to `false`, the data field contains the data sent by the server.

## Acknowledgements

This library closely follows the mutation API in [React Apollo](https://www.apollographql.com/docs/react/).
