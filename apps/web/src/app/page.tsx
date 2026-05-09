"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Plus, Trophy, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { npr } from "@/lib/utils";
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
}

export default function HomePage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/tournaments").then(setTournaments),
      api("/categories").then(setCategories).catch(() => setCategories([])),
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

  const profileSection = (
    <section className="card">
      {user ? (
        <>
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-lg border border-border"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-neon-cyan">
                <Wallet />
              </div>
            )}
            <div className="min-w-0">
              <p className="label">Profile Balance</p>
              <p className="truncate font-semibold text-white">
                {user.profile?.ign ?? user.name ?? user.email}
              </p>
            </div>
          </div>
          <p className="mt-4 font-display text-3xl text-white">
            {npr(wallet?.wallet?.balanceNpr ?? user.wallet?.balanceNpr ?? 0)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/wallet?tab=deposit" className="btn-primary">
              <Plus size={16} /> Deposit
            </Link>
            <Link href="/wallet?tab=withdraw" className="btn-outline">
              Withdraw
            </Link>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label">Profile</p>
            <p className="font-semibold text-white">
              Google sign-in required
            </p>
            <p className="mt-1 text-sm text-white/60">
              Create your player wallet instantly.
            </p>
          </div>
          <Link href="/login" className="btn-primary whitespace-nowrap">
            Sign in
          </Link>
        </div>
      )}
    </section>
  );

  return (
    <>
      <div className="-mx-4 -mt-4">
        <HeroSlider />
      </div>
      <div className="mt-5 space-y-5">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="label">Choose Your Game</p>
            <h2 className="font-display text-xl text-white">Games</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {loading ? (
            <>
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
            </>
          ) : (
            <>
              {gameChoices.map((game) => {
                const liveCount = liveCounts[game.slug] ?? 0;
                return (
                  <Link
                    key={game.id}
                    href={`/tournaments?category=${game.slug}`}
                    className="relative min-h-[112px] rounded-lg border border-border bg-card/80 p-4 text-left transition hover:border-neon-cyan/50 hover:bg-neon-cyan/10"
                  >
                    {liveCount > 0 && (
                      <span className="absolute right-2 top-2 rounded-md bg-neon-cyan/20 px-1.5 py-0.5 text-[9px] font-semibold text-neon-cyan">
                        {liveCount} LIVE
                      </span>
                    )}
                    <Flame className="text-neon" size={20} />
                    <p className="mt-3 font-semibold text-white text-sm">{game.name}</p>
                    {game.parentName && (
                      <p className="mt-1 text-[11px] text-white/45">{game.parentName}</p>
                    )}
                  </Link>
                );
              })}
              {comingSoonGames.map((game) => (
                <div
                  key={game.id}
                  className="relative min-h-[112px] rounded-lg border border-border bg-card/80 p-4 opacity-60"
                >
                  <span className="absolute right-2 top-2 rounded-md bg-neon-orange/20 px-2 py-0.5 text-[9px] font-semibold text-neon-orange">
                    Coming Soon
                  </span>
                  <Gamepad2 className="text-white/40" size={20} />
                  <p className="mt-3 font-semibold text-white/70 text-sm">{game.name}</p>
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="label">Available Matches</p>
            <h2 className="font-display text-xl text-white">Tournaments</h2>
          </div>
          <Link href="/tournaments" className="text-sm text-neon-cyan">
            View all
          </Link>
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

      <DownloadBanner />

      {profileSection}

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/challenges"
          className="rounded-lg border border-border bg-card/80 p-4"
        >
          <Trophy className="text-neon-cyan" />
          <p className="mt-3 font-semibold text-white">Challenges</p>
          <p className="text-xs text-white/50">Public custom rooms</p>
        </Link>
        <Link
          href="/leaderboard"
          className="rounded-lg border border-border bg-card/80 p-4"
        >
          <Flame className="text-neon" />
          <p className="mt-3 font-semibold text-white">Leaderboard</p>
          <p className="text-xs text-white/50">Top prize winners</p>
        </Link>
      </section>
      </div>
    </>
  );
}
