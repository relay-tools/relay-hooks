---
id: use-subscription
title: useSubscription
---

```ts
import { useMemo } from 'react';
import { useSubscription, graphql } from 'relay-hooks';

const subscriptionSpec = graphql`
  subscription TodoSubscription {
    todos {
      node {
        id
        text
        complete
      }
    }
  }
`;

const TodoList = (props) => {
  // NOTE: This will re-subscribe every render if config is not memoized. Please
  // do not pass an object defined inline.
  useSubscription(
    useMemo(() => {
      subscription: subscriptionSpec,
      variables: {}
    }, [])
  );

  // ???
};
  