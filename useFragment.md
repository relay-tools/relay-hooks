# useFragment

useFragment allows components to specify their data requirements. A container does not directly fetch data, but instead declares a specification of the data needed for rendering, and then Relay will guarantee that this data is available before rendering occurs.

The hook is automatically subscribed to updates to the fragment data: if the data for this particular User is updated anywhere in the app (e.g. via fetching new data, or mutating existing data), the component will automatically re-render with the latest updated data.

## Arguments:

  * `fragment`: GraphQL fragment specified using a graphql template literal.
  * `fragmentReference`: The fragment reference is an opaque Relay object that Relay uses to read the data for the fragment from the store; more specifically, it contains information about which particular object instance the data should be read from. 
    * The type of the fragment reference can be imported from the generated Flow types, from the file `<fragment_name>.graphql.js`, and can be used to declare the type of your `Props`. The name of the fragment reference type will be: `<fragment_name>$key`. We use our [lint rule](https://github.com/relayjs/eslint-plugin-relay) to enforce that the type of the fragment reference prop is correctly declared.

## Return Value:

  * `data`: Object that contains data which has been read out from the Relay store; the object matches the shape of specified fragment.

```ts
import { useFragment, graphql } from 'relay-hooks';

const fragmentSpec = graphql`
    fragment TodoApp_user on User {
      id
      userId
      totalCount
    }
  `;

const TodoApp = (props) => {
    const user = useFragment(fragmentSpec, props.user);
    return (   
        <div>
            <p> {user.id} </p>
            <p> {user.userId} </p>
            <p> {user.totalCount} </p>
        </div>
        );
};
```
  


# useSuspenseFragment (with suspense, like relay-experimental)

```ts
import { useSuspenseFragment } from 'relay-hooks';
```

[See useFragment](https://relay.dev/docs/en/api-reference#usefragment)