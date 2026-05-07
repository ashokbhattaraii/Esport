"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    setItems(await api("/notifications"));
  }
  useEffect(() => {
    load().catch(() => {});
  }, []);
  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "POST" });
    load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Payment reviews, room unlocks, result updates, wallet alerts, and system messages."
      />
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="Important match and wallet updates will appear here."
          />
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`card flex justify-between items-center ${n.read ? "opacity-60" : ""}`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{n.title}</p>
                  <StatusBadge status={n.type} />
                </div>
                <p className="text-sm text-white/70">{n.body}</p>
                <p className="text-xs text-white/40 mt-1">
                  {fmtDate(n.createdAt)}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="btn-outline text-xs"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
