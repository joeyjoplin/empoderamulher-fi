import { useCallback, useEffect, useState } from "react";

import { useApiClient } from "../api/ApiClientProvider";
import { ApiError } from "../api/client";
import { getMyScore, type OnChainScore } from "../api/score";

export type UseMyScoreState =
  | { status: "loading" }
  | { status: "success"; data: OnChainScore }
  | { status: "error"; error: ApiError };

export type UseMyScoreResult = UseMyScoreState & {
  refetch: () => void;
};

export function useMyScore(): UseMyScoreResult {
  const client = useApiClient();
  const [state, setState] = useState<UseMyScoreState>({ status: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    getMyScore(client)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err) => {
        if (cancelled) return;
        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError(0, "unknown_error", String(err));
        setState({ status: "error", error: apiError });
      });

    return () => {
      cancelled = true;
    };
  }, [client, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refetch };
}
