"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Plus, Trophy, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fmtDate, npr } from "@/lib/utils";
import { TournamentCard } from "@/components/TournamentCard";
import { CardSkeleton, EmptyState, LoadingState } from "@/components/ui";
import { DownloadBanner } from "@/components/home/DownloadBanner";
import { HeroSlider } from "@/components/home/HeroSlider";
import { Gamepad2 } from "lucide-react";

interface CategoryChild {
  id: string;
  name: string;
  slug: string;
  gameMode?: string | null;
  description?: string | null;
  coverUrl?: string | null;
}
interface Category {
  id: string;
  name: string;
  slug: string;
  coverUrl?: string | null;
  isActive: boolean;
  comingSoon: boolean;
  children: CategoryChild[];
}

interface GameChoice {
  id: string;
  name: string;
  slug: string;
  parentName?: string;
  description?: string | null;
  comingSoon?: boolean;
  coverUrl?: string | null;
}

export default function HomePage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [matches, setMatches] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<{ activeUsers: number; totalDownloads: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/tournaments").then(setTournaments),
      api("/challenges?limit=4").then(setChallenges).catch(() => setChallenges([])),
      api("/categories").then(setCategories).catch(() => setCategories([])),
      api("/app/stats").then(setStats).catch(() => null),
      user ? api("/me/matches").then(setMatches).catch(() => null) : Promise.resolve(),
      user
        ? api("/wallet")
            .then(setWallet)
            .catch(() => null)
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [user]);

  const liveCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tournaments) {
      const m = (t.mode ?? "") as string;
      let key: string | null = null;
      if (m.startsWith("BR_")) key = "ff-br";
      else if (m.startsWith("CS_")) key = "ff-cs";
      else if (m.startsWith("LW_")) key = "ff-lone-wolf";
      if (key) map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [tournaments]);

  const gameChoices = useMemo<GameChoice[]>(() => {
    const choices = categories.flatMap((category) =>
      category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        parentName: category.name,
        description: child.description,
        coverUrl: child.coverUrl ?? category.coverUrl,
      })),
    );

    if (choices.length) return choices;

    return categories
      .filter((category) => category.isActive && !category.comingSoon)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: null,
        coverUrl: category.coverUrl,
      }));
  }, [categories]);

  const comingSoonGames = useMemo<GameChoice[]>(
    () =>
      categories
        .filter((category) => category.comingSoon)
        .map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          comingSoon: true,
        })),
    [categories],
  );

  const activeCount = tournaments.filter((t) => t.status === "ONGOING" || t.status === "UPCOMING").length;
  const totalPrize = tournaments.reduce((sum, t) => sum + (t.prizePoolNpr ?? 0), 0);
  const latestMatch = matches
    ? [...(matches.tournaments ?? []), ...(matches.challenges ?? [])].sort((a: any, b: any) => {
        const left = new Date(a.joinedAt ?? a.createdAt ?? 0).getTime();
        const right = new Date(b.joinedAt ?? b.createdAt ?? 0).getTime();
        return right - left;
      })[0]
    : null;

  return (
    <>
      <div className="-mx-4 -mt-4">
        <HeroSlider />
      </div>

      <div className="mt-4 space-y-5">
        {/* Quick Stats Bar */}
        <div
          className="flex items-center justify-center gap-4 rounded-full px-4 py-2.5 mx-auto w-fit"
          style={{ background: 'var(--fs-surface-1)', border: '0.5px solid var(--fs-border)' }}
        >
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--fs-green)' }} />
            <span className="font-semibold" style={{ color: 'var(--fs-text-1)' }}>{activeCount}</span>
            <span style={{ color: 'var(--fs-text-3)' }}>Live</span>
          </div>
          <div className="h-3 w-px" style={{ background: 'var(--fs-border-md)' }} />
          <div className="flex items-center gap-1.5 text-xs">
            <span style={{ color: 'var(--fs-text-3)' }}>👥</span>
            <span className="font-semibold" style={{ color: 'var(--fs-text-1)' }}>{stats?.activeUsers ?? tournaments.length * 3}</span>
            <span style={{ color: 'var(--fs-text-3)' }}>Active Users</span>
          </div>
          <div className="h-3 w-px" style={{ background: 'var(--fs-border-md)' }} />
          <div className="flex items-center gap-1.5 text-xs">
            <span style={{ color: 'var(--fs-text-3)' }}>⬇️</span>
            <span className="font-semibold" style={{ color: 'var(--fs-text-1)' }}>{stats?.totalDownloads ?? '—'}</span>
            <span style={{ color: 'var(--fs-text-3)' }}>Downloads</span>
          </div>
          <div className="h-3 w-px" style={{ background: 'var(--fs-border-md)' }} />
          <div className="flex items-center gap-1.5 text-xs">
            <span style={{ color: 'var(--fs-text-3)' }}>🏆</span>
            <span className="font-semibold" style={{ color: 'var(--fs-gold)' }}>Rs {totalPrize}</span>
          </div>
        </div>

        {/* Game Modes */}
        <section>
          <div className="fs-section-header">
            <span className="fs-section-title">Game Modes</span>
          </div>
          <div className="fs-hscroll">
            {loading ? (
              <>
                <div className="fs-skeleton" style={{ width: '120px', height: '60px', flexShrink: 0 }} />
                <div className="fs-skeleton" style={{ width: '120px', height: '60px', flexShrink: 0 }} />
                <div className="fs-skeleton" style={{ width: '120px', height: '60px', flexShrink: 0 }} />
              </>
            ) : (
              <>
                {gameChoices.map((game) => {
                  const liveCount = liveCounts[game.slug] ?? 0;
                  return (
                    <Link
                      key={game.id}
                      href={`/tournaments?category=${game.slug}`}
                      className="relative flex-shrink-0 rounded-xl px-4 py-3 text-left transition"
                      style={{
                        backgroundColor: 'var(--fs-surface-1)',
                        backgroundImage: game.coverUrl ? `url("${game.coverUrl}")` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        border: '0.5px solid var(--fs-border)',
                        minWidth: '120px',
                        color: game.coverUrl ? 'white' : undefined,
                      }}
                    >
                      {game.coverUrl && (
                        <div className="absolute inset-0 rounded-xl bg-black/35" />
                      )}
                      <div className="relative z-10">
                        {liveCount > 0 && (
                          <span className="absolute right-2 top-2 fs-badge fs-badge-green" style={{ fontSize: '8px' }}>
                            {liveCount} LIVE
                          </span>
                        )}
                        <Flame size={16} style={{ color: 'var(--fs-red)' }} />
                        <p className="mt-2 text-xs font-semibold" style={{ color: game.coverUrl ? 'white' : 'var(--fs-text-1)' }}>{game.name}</p>
                        {game.parentName && (
                          <p className="text-[10px]" style={{ color: game.coverUrl ? 'rgba(255,255,255,0.8)' : 'var(--fs-text-3)' }}>{game.parentName}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {comingSoonGames.map((game) => (
                  <div
                    key={game.id}
                    className="relative flex-shrink-0 rounded-xl px-4 py-3 opacity-60"
                    style={{
                      background: 'var(--fs-surface-1)',
                      border: '0.5px solid var(--fs-border)',
                      minWidth: '120px',
                    }}
                  >
                    <span className="absolute right-2 top-2 fs-badge fs-badge-amber" style={{ fontSize: '8px' }}>
                      Soon
                    </span>
                    <Gamepad2 size={16} style={{ color: 'var(--fs-text-3)' }} />
                    <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--fs-text-2)' }}>{game.name}</p>
                  </div>
                ))}
              </>
            )}
          </div>
          {!loading && gameChoices.length === 0 && comingSoonGames.length === 0 && (
            <EmptyState
              title="No games available"
              description="Active game categories will appear here."
            />
          )}
        </section>

        {/* Upcoming Matches */}
        <section>
          <div className="fs-section-header">
            <span className="fs-section-title">Upcoming Matches</span>
            <Link href="/tournaments" className="fs-section-link">View all</Link>
          </div>
          {loading ? (
            <LoadingState label="Loading tournaments..." />
          ) : tournaments.length === 0 ? (
            <EmptyState
              title="No tournaments yet"
              description="Admin-created rooms will appear here first."
            />
          ) : (
            <div className="space-y-4">
              {tournaments.slice(0, 5).map((t) => (
                <TournamentCard key={t.id} t={t} />
              ))}
            </div>
          )}
        </section>

        {/* Challenge Rooms */}
        <section>
          <div className="fs-section-header">
            <span className="fs-section-title">Challenge Rooms</span>
            <Link href="/challenges" className="fs-section-link">View all</Link>
          </div>
          {loading ? (
            <LoadingState label="Loading challenges..." />
          ) : challenges.length === 0 ? (
            <EmptyState
              title="No challenges yet"
              description="Fresh custom rooms will appear here as soon as players create them."
            />
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <ChallengeRoomCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </section>

        {user && latestMatch && (
          <section>
            <div className="fs-section-header">
              <span className="fs-section-title">My Matches</span>
              <Link href="/my-matches" className="fs-section-link">Open hub</Link>
            </div>
            <Link
              href={latestMatch.tournament ? `/tournaments/${latestMatch.tournament.id}` : `/challenges/${latestMatch.id}`}
              className="block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--fs-text-3)]">Latest activity</p>
              <p className="mt-2 text-sm font-semibold text-[var(--fs-text-1)]">
                {latestMatch.title ?? latestMatch.tournament?.title ?? "Match"}
              </p>
              <p className="mt-1 text-xs text-[var(--fs-text-3)]">
                {latestMatch.status ?? latestMatch.tournament?.status ?? "ACTIVE"} · Check room, results, and dispute status in one place.
              </p>
            </Link>
          </section>
        )}

        <DownloadBanner />

        {/* Quick Links */}
        <section className="fs-grid-2">
          <Link
            href="/challenges"
            className="fs-card fs-card-body"
          >
            <Trophy size={20} style={{ color: 'var(--fs-red)' }} />
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--fs-text-1)' }}>Challenges</p>
            <p className="text-[11px]" style={{ color: 'var(--fs-text-3)' }}>Public custom rooms</p>
          </Link>
          <Link
            href="/leaderboard"
            className="fs-card fs-card-body"
          >
            <Flame size={20} style={{ color: 'var(--fs-gold)' }} />
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--fs-text-1)' }}>Leaderboard</p>
            <p className="text-[11px]" style={{ color: 'var(--fs-text-3)' }}>Top prize winners</p>
          </Link>
        </section>
      </div>
    </>
  );
}

function ChallengeRoomCard({ challenge }: { challenge: any }) {
  const createdAt = challenge.createdAt ? new Date(challenge.createdAt) : null;
  const statusTone: Record<string, string> = {
    OPEN: "fs-badge-green",
    MATCHED: "fs-badge-amber",
    ROOM_SHARED: "fs-badge-amber",
    ONGOING: "fs-badge-red",
    PENDING_RESULTS: "fs-badge-amber",
    COMPLETED: "fs-badge",
    CANCELLED: "fs-badge",
    DISPUTED: "fs-badge-red",
  };

  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 transition hover:border-[rgba(255,255,255,0.16)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--fs-text-3)]">
            {challenge.challengeNumber ?? "Challenge"}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[var(--fs-text-1)]">
            {challenge.title}
          </p>
          <p className="mt-1 text-xs text-[var(--fs-text-3)]">
            {challenge.opponentId ? "Matched room" : "Open room"} · {challenge.gameMode}
          </p>
        </div>
        <span className={statusTone[challenge.status] ?? "fs-badge"}>
          {challenge.status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--fs-text-3)]">
        <span>{createdAt ? fmtDate(createdAt.toISOString()) : "New"}</span>
        <span>{challenge.opponentId ? "Opponent locked" : "Waiting for opponent"}</span>
      </div>
    </Link>
  );
}
