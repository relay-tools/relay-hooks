import { useEffect, useRef } from "react";
import * as ReactRelayQueryFetcher from 'react-relay/lib/ReactRelayQueryFetcher';

const usePrevious = function usePrevious(value): any {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }, [value]);
    return ref.current;
  }

export default usePrevious;