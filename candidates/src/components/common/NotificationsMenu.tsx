import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LottiePlayer } from "./LottiePlayer";
import { apiBase, apiFetch } from "@/lib/api";
import { authHeader } from "@/store/authStore";

type Item = {
  id: string;
  title: string;
  detail?: string;
  time?: string;
  unread?: boolean;
};

type Props = {
  items?: Item[];
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  contentClassName?: string;
};

export function NotificationsMenu({
  items: initialItems = [],
  align = "end",
  triggerClassName,
  contentClassName = "w-[360px]",
}: Props) {
  const [items, setItems] = useState<Item[]>(initialItems);
  useEffect(() => {
    let mounted = true;
    apiFetch(`${apiBase()}/api/notifications`, { headers: authHeader() })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => {
        if (!mounted) return;
        setItems(
          (data.data || []).map((n: any) => ({
            id: n.id,
            title: n.title,
            detail: n.message,
            unread: !n.read,
            time: new Date(n.createdAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            link: n.link,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    await apiFetch(`${apiBase()}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: authHeader(),
    }).catch(() => undefined);
  };

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={
            triggerClassName ??
            "relative inline-flex h-9 w-9 items-center justify-center rounded-full border bg-surface text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          }
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={`p-0 ${contentClassName}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator className="my-0" />
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <LottiePlayer src="/normal_seach.json" loop className="mx-auto h-14 w-14" />
            <p className="text-sm font-medium text-foreground mt-3">No notifications yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Updates on applications and saved roles will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {items.map((n: Item & { link?: string | null }) => {
              const content = (
                <div
                  onClick={() => markRead(n.id)}
                  className="flex gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                      {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                    </div>
                    {n.detail && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.detail}
                      </p>
                    )}
                    {n.time && <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>}
                  </div>
                </div>
              );
              return n.link ? (
                <a key={n.id} href={n.link}>
                  {content}
                </a>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
