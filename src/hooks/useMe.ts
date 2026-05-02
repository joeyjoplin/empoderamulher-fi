import { useEffect, useState } from "react";

import { useApiClient } from "../api/ApiClientProvider";
import { ApiError } from "../api/client";
import { getMe } from "../api/me";
import type { BackendPersona } from "../api/types";

export type UseMeState =
  | { status: "loading" }
  | { status: "success"; data: BackendPersona }
  | { status: "error"; error: ApiError };

export function useMe(): UseMeState {
  const client = useApiClient();
  const [state, setState] = useState<UseMeState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    getMe(client)
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
  }, [client]);

  return state;
}
