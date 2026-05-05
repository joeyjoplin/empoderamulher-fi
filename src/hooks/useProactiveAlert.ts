import { useEffect, useState } from "react";

import { useApiClient } from "../api/ApiClientProvider";
import { ApiError } from "../api/client";
import { getProactiveAlert, type ProactiveAlert } from "../api/insights";

export type UseProactiveAlertState =
  | { status: "loading" }
  | { status: "success"; data: ProactiveAlert }
  | { status: "error"; error: ApiError };

export function useProactiveAlert(): UseProactiveAlertState {
  const client = useApiClient();
  const [state, setState] = useState<UseProactiveAlertState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    getProactiveAlert(client)
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
