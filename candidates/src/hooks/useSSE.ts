import { useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { apiBase } from '../lib/api';
import { toast } from 'sonner';

export function useSSE() {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const getToken = () => localStorage.getItem("apronhanger.candidate.token");
    const token = getToken();
    if (!token) return;

    abortControllerRef.current = new AbortController();

    fetchEventSource(`${apiBase()}/api/notifications/stream`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: abortControllerRef.current.signal,
      async onopen(res) {
        if (res.ok && res.status === 200) {
          console.log('SSE connection opened.');
        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error('SSE Auth failed');
        }
      },
      onmessage(event) {
        if (event.event === 'notification') {
          const data = JSON.parse(event.data);
          toast.info(data.title, {
            description: data.message,
          });
          window.dispatchEvent(new CustomEvent('sse_notification', { detail: data }));
        }
      },
      onclose() {
        console.log('SSE connection closed by server');
      },
      onerror(err) {
        console.error('SSE Error:', err);
      }
    });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
}
