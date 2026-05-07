"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { npr } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";

export default function Leaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api("/leaderboard")
      .then(setRows)
      .catch(() => {});
  }, []);
  return (
    <div>
      <PageHeader
        eyebrow="Prize standings"
        title="Leaderboard"
        description="Rankings are calculated from verified tournament winnings."
        action={<Trophy className="text-neon" />}
      />
      <div className="table-wrap">
        {rows.length === 0 ? (
          <EmptyState
            title="No winners yet"
            description="Verified results will appear here after tournaments complete."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Total Won</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-t border-border">
                  <td className="py-2 font-semibold">#{i + 1}</td>
                  <td>{r.ign}</td>
                  <td className="text-neon">{npr(r.prizeEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
