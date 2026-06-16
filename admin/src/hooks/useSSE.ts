import { useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { apiBase } from '../lib/api';
import { toast } from 'sonner';

export function useSSE() {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Determine token retrieval based on portal logic
    const getToken = () => {
      try {
        const raw = localStorage.getItem("apronhanger.admin.session");
        if (!raw) return null;
        return JSON.parse(raw).token;
      } catch {
        return null;
      }
    };

    const token = getToken();
    if (!token) return; // Don't connect if not logged in

    abortControllerRef.current = new AbortController();

    fetchEventSource(`${apiBase()}/api/admin/notifications/stream`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: abortControllerRef.current.signal,
      async onopen(res) {
        if (res.ok && res.status === 200) {
          console.log('SSE connection opened.');
        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          // Client-side errors are usually non-retriable:
          throw new Error('SSE Auth failed');
        }
      },
      onmessage(event) {
        if (event.event === 'notification') {
          const data = JSON.parse(event.data);
          toast.info(data.title, {
            description: data.message,
          });
          // Dispatch a custom window event so other components (like NotificationBell) can update
          window.dispatchEvent(new CustomEvent('sse_notification', { detail: data }));
        }
      },
      onclose() {
        console.log('SSE connection closed by server');
      },
      onerror(err) {
        console.error('SSE Error:', err);
        // Return nothing to auto-retry, or throw to stop retrying
      }
    });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
}
