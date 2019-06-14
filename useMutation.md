## Credit useMutation 

useMutation has been integrated into relay-hooks thanks to the creators of the project [React Relay Mutation](https://github.com/relay-tools/react-relay-mutation)

Higher-level [React](https://facebook.github.io/react/) mutation API for [Relay](http://facebook.github.io/relay/).

## Usage

This package provides a `useMutation` Hook and a `<Mutation>` component. These wrap up committing Relay mutations and keeping track of the mutation state.

```js
import React from 'react';
import { Mutation, useMutation } from 'react-relay-mutation';

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

function MyComponentWithComponent({ myValue }) {
  return (
    <Mutation
      mutation={graphql`
        mutation ExampleWithComponentMutation($input: MyMutationInput) {
          myMutation(input: $input) {
            value
          }
        }
      `}
      onCompleted={({ myMutation }) => {
        window.alert(`received ${myMutation.value}`);
      }}
    >
      {([mutate, { loading }]) =>
        loading ? (
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
        )
      }
    </Mutation>
  );
}
```

The `useMutation` hook and the `<Mutation>` component take a mutation node and optionally any mutation options valid for `commitMutation` in Relay, except that `onCompleted` only takes a single argument for the response, as errors there will be handled identically to request errors. The `useMutation` hook takes the mutation as its first argument, and the optional configuration object as its second argument. The `<Mutation>` component takes the mutation node as the `mutation` prop, and any other options as props by name. In both cases, `variables` is optional.

Both `useMutation` and `<Mutation>` provide a tuple of a `mutate` callback and a `mutationState` object. This is the return value for `useMutation` and the argument passed into the function child for `<Mutation>`.

The `mutate` callback optionally takes a configuration object as above. Any options specified here will override the options specified to `useMutation` or to `<Mutation>`. Additionally, if `variables` was not specified above, it must be specified here. The `mutate` callback returns a promise. This will resolve with the mutation response or reject with any error (except when an `onError` callback is specified, in which case it will resolve with no value on errors).

The `mutationState` object has the following properties:

- `loading`: a boolean indicating whether the mutation is currently pending
- `data`: the response data for the mutation
- `error`: any errors returned by the mutation

## Acknowledgements

This library closely follows the mutation API in [React Apollo](https://www.apollographql.com/docs/react/).
