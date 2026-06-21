import { useEffect, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { apiBase } from "../lib/api";
import { toast } from "sonner";

function getAdminToken(): string | null {
  try {
    const raw = localStorage.getItem("apronhanger.admin.session");
    if (!raw) return null;
    return JSON.parse(raw).token ?? null;
  } catch {
    return null;
  }
}

/** Connect admin SSE when authenticated; reconnects when `enabled` flips true after login. */
export function useSSE(enabled: boolean) {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    abortControllerRef.current = new AbortController();

    fetchEventSource(`${apiBase()}/api/admin/notifications/stream`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: abortControllerRef.current.signal,
      async onopen(res) {
        if (res.ok && res.status === 200) {
          console.log("SSE connection opened.");
        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error("SSE Auth failed");
        }
      },
      onmessage(event) {
        if (event.event === "notification") {
          const data = JSON.parse(event.data);
          if (!data.id) {
            console.warn("[useSSE] notification event missing id — skipped for dedup safety");
            return;
          }
          toast.info(data.title, {
            description: data.message,
          });
          window.dispatchEvent(new CustomEvent("sse_notification", { detail: data }));
        } else if (event.event === "job_created") {
          const data = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent("sse_job_created", { detail: data }));
        }
      },
      onclose() {
        console.log("SSE connection closed by server");
      },
      onerror(err) {
        console.error("SSE Error:", err);
      },
    });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [enabled]);
}
