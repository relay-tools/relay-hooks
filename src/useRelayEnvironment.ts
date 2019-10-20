import * as React from "react";
import { ReactRelayContext } from "react-relay";
import { IEnvironment } from "relay-runtime";

function useRelayEnvironment(): IEnvironment {
  const { environment } = React.useContext(ReactRelayContext);
  return environment;
}

export default useRelayEnvironment;
