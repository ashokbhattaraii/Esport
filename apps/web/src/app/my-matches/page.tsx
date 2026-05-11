"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Swords, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fmtDate, npr } from "@/lib/utils";
import { GoogleAuthPanel } from "@/components/GoogleAuthPanel";
import { EmptyState, PageLoading } from "@/components/ui";

type Tab = "tournaments" | "created" | "joined";

const STATUS_COLORS: Record<string, string> = {
  UPCOMING: "var(--fs-green)",
  LIVE: "var(--fs-green)",
  ONGOING: "var(--fs-green)",
  OPEN: "var(--fs-green)",
  MATCHED: "var(--fs-amber)",
  ROOM_SHARED: "var(--fs-amber)",
  PENDING_RESULTS: "var(--fs-amber)",
  COMPLETED: "var(--fs-text-3)",
  CANCELLED: "var(--fs-text-3)",
  DISPUTED: "var(--fs-red)",
};

export default function MyMatchesPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("tournaments");

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    api("/me/matches")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setBusy(false));
  }, [user]);

  const joinedTournaments = useMemo(() => data?.tournaments ?? [], [data]);
  const challenges = useMemo(() => data?.challenges ?? [], [data]);
  const createdChallenges = useMemo(
    () => challenges.filter((c: any) => c.creatorId === user?.id),
    [challenges, user?.id],
  );
  const joinedChallenges = useMemo(
    () => challenges.filter((c: any) => c.opponentId === user?.id),
    [challenges, user?.id],
  );

  const nextTournament = useMemo(
    () =>
      joinedTournaments
        .map((item: any) => item.tournament)
        .filter((t: any) => t && new Date(t.dateTime).getTime() >= Date.now())
        .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0],
    [joinedTournaments],
  );

  if (loading || busy) return <PageLoading label="Loading your matches..." />;
  if (!user) {
    return (
      <div className="pt-6">
        <GoogleAuthPanel title="Sign in to view your matches" />
      </div>
    );
  }

  const tabItems: { key: Tab; label: string; count: number }[] = [
    { key: "tournaments", label: "Tournaments", count: joinedTournaments.length },
    { key: "created", label: "Created", count: createdChallenges.length },
    { key: "joined", label: "Joined", count: joinedChallenges.length },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div style={{ padding: "4px 0" }}>
        <h1 className="text-lg font-bold" style={{ color: "var(--fs-text-1)" }}>My Matches</h1>
        <p className="text-xs" style={{ color: "var(--fs-text-3)", marginTop: 2 }}>
          {joinedTournaments.length} tournament{joinedTournaments.length !== 1 ? "s" : ""} · {challenges.length} challenge{challenges.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Next tournament banner */}
      {nextTournament && (
        <Link
          href={`/tournaments/${nextTournament.id}`}
          className="flex items-center justify-between gap-3 rounded-xl p-3"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--fs-green)", letterSpacing: "0.05em" }}>Next up</p>
            <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: "var(--fs-text-1)" }}>{nextTournament.title}</p>
            <p className="text-xs" style={{ color: "var(--fs-text-3)" }}>{fmtDate(nextTournament.dateTime)}</p>
          </div>
          <ArrowRight size={16} style={{ color: "var(--fs-green)", flexShrink: 0 }} />
        </Link>
      )}

      {/* Tab bar */}
      <div
        className="flex rounded-lg p-1"
        style={{ background: "var(--fs-surface-1)", border: "1px solid var(--fs-border)" }}
      >
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.key ? "var(--fs-surface-2)" : "transparent",
              color: tab === t.key ? "var(--fs-text-1)" : "var(--fs-text-3)",
              border: tab === t.key ? "1px solid var(--fs-border)" : "1px solid transparent",
            }}
          >
            {t.label}
            <span
              className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]"
              style={{ background: tab === t.key ? "var(--fs-red)" : "var(--fs-surface-2)", color: tab === t.key ? "#fff" : "var(--fs-text-3)" }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "tournaments" && (
        <div className="space-y-2">
          {joinedTournaments.length === 0 ? (
            <EmptyState title="No tournaments joined" description="Join a tournament and it'll show up here." />
          ) : (
            joinedTournaments.map((entry: any) => (
              <TournamentRow key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}

      {tab === "created" && (
        <div className="space-y-2">
          {createdChallenges.length === 0 ? (
            <EmptyState title="No challenges created" description="Create a challenge to get started." />
          ) : (
            createdChallenges.map((c: any) => (
              <ChallengeRow key={c.id} challenge={c} role="Creator" />
            ))
          )}
        </div>
      )}

      {tab === "joined" && (
        <div className="space-y-2">
          {joinedChallenges.length === 0 ? (
            <EmptyState title="No challenges joined" description="Accept a challenge and it'll appear here." />
          ) : (
            joinedChallenges.map((c: any) => (
              <ChallengeRow key={c.id} challenge={c} role="Opponent" />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TournamentRow({ entry }: { entry: any }) {
  const t = entry.tournament;
  if (!t) return null;
  const statusColor = STATUS_COLORS[t.status] ?? "var(--fs-text-3)";
  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="flex items-center gap-3 rounded-xl p-3"
      style={{ background: "var(--fs-surface-1)", border: "1px solid var(--fs-border)" }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(229,57,53,0.1)" }}
      >
        <Trophy size={16} style={{ color: "var(--fs-red)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--fs-text-1)" }}>{t.title}</p>
        <p className="text-xs" style={{ color: "var(--fs-text-3)" }}>
          {fmtDate(t.dateTime)} · {npr(t.entryFeeNpr ?? 0)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: statusColor }} />
        <span className="text-[11px] font-medium" style={{ color: statusColor }}>{t.status}</span>
      </div>
    </Link>
  );
}

function ChallengeRow({ challenge, role }: { challenge: any; role: string }) {
  const statusColor = STATUS_COLORS[challenge.status] ?? "var(--fs-text-3)";
  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="flex items-center gap-3 rounded-xl p-3"
      style={{ background: "var(--fs-surface-1)", border: "1px solid var(--fs-border)" }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(255,170,0,0.1)" }}
      >
        <Swords size={16} style={{ color: "var(--fs-amber)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--fs-text-1)" }}>{challenge.title}</p>
        <p className="text-xs" style={{ color: "var(--fs-text-3)" }}>
          {role} · {challenge.gameMode ?? challenge.challengeNumber}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: statusColor }} />
        <span className="text-[11px] font-medium" style={{ color: statusColor }}>{challenge.status}</span>
      </div>
    </Link>
  );
}
