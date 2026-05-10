"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, ShieldCheck, Swords, Trophy, Users, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fmtDate, npr } from "@/lib/utils";
import { GoogleAuthPanel } from "@/components/GoogleAuthPanel";
import { EmptyState, PageLoading } from "@/components/ui";

const CHALLENGE_TONES: Record<string, string> = {
  OPEN: "fs-badge-green",
  MATCHED: "fs-badge-amber",
  ROOM_SHARED: "fs-badge-amber",
  ONGOING: "fs-badge-red",
  PENDING_RESULTS: "fs-badge-amber",
  COMPLETED: "fs-badge-gray",
  CANCELLED: "fs-badge-gray",
  DISPUTED: "fs-badge-red",
};

export default function MyMatchesPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

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
    () => challenges.filter((challenge: any) => challenge.creatorId === user?.id),
    [challenges, user?.id],
  );
  const joinedChallenges = useMemo(
    () => challenges.filter((challenge: any) => challenge.opponentId === user?.id),
    [challenges, user?.id],
  );

  const nextTournament = useMemo(
    () =>
      joinedTournaments
        .map((item: any) => item.tournament)
        .filter((item: any) => item && new Date(item.dateTime).getTime() >= Date.now())
        .sort(
          (a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        )[0],
    [joinedTournaments],
  );

  const latestChallenge = challenges[0];

  if (loading || busy) return <PageLoading label="Loading your matches..." />;
  if (!user) {
    return (
      <div className="pt-6">
        <GoogleAuthPanel title="Sign in to view your matches" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--fs-text-3)]">Match hub</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--fs-text-1)]">My Matches</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--fs-text-3)]">
          Track every tournament join and challenge room in one place. You can see what is waiting, what is matched, and what needs action next.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Tournaments" value={data?.counts?.tournaments ?? 0} icon={<Trophy size={16} />} />
          <Stat label="Challenges" value={data?.counts?.challenges ?? 0} icon={<Swords size={16} />} />
          <Stat label="Created" value={data?.counts?.createdChallenges ?? 0} icon={<Users size={16} />} />
          <Stat label="Joined" value={data?.counts?.joinedChallenges ?? 0} icon={<Wallet size={16} />} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <InfoCard
          icon={<ShieldCheck size={18} />}
          title="Transparent flow"
          text="Joined matches move through open, matched, room shared, live, results, and dispute states so you always know what happens next."
        />
        <InfoCard
          icon={<Clock3 size={18} />}
          title="Fast follow-up"
          text="Room IDs, opponent assignment, and result review are all surfaced here instead of being hidden in the join screen."
        />
      </section>

      {nextTournament && (
        <Link
          href={`/tournaments/${nextTournament.id}`}
          className="block rounded-2xl border border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)] p-4"
        >
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--fs-text-3)]">Next tournament</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--fs-text-1)]">{nextTournament.title}</p>
              <p className="text-sm text-[var(--fs-text-3)]">{fmtDate(nextTournament.dateTime)}</p>
            </div>
            <ArrowRight className="text-[var(--fs-green)]" size={18} />
          </div>
        </Link>
      )}

      <section className="space-y-3">
        <SectionHeader title="Created by you" count={createdChallenges.length} />
        {createdChallenges.length === 0 ? (
          <EmptyState
            title="No created challenges yet"
            description="Create a challenge and it will appear here as soon as it is live."
          />
        ) : (
          <div className="space-y-3">
            {createdChallenges.map((challenge: any) => (
              <ChallengeRow key={challenge.id} challenge={challenge} roleLabel="Creator" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Joined challenges" count={joinedChallenges.length} />
        {joinedChallenges.length === 0 ? (
          <EmptyState
            title="No joined challenges yet"
            description="When you accept a challenge, the full room and result flow will show up here."
          />
        ) : (
          <div className="space-y-3">
            {joinedChallenges.map((challenge: any) => (
              <ChallengeRow key={challenge.id} challenge={challenge} roleLabel="Opponent" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Joined tournaments" count={joinedTournaments.length} />
        {joinedTournaments.length === 0 ? (
          <EmptyState
            title="No tournament joins yet"
            description="Join a tournament and the details will appear here for quick access."
          />
        ) : (
          <div className="space-y-3">
            {joinedTournaments.map((entry: any) => (
              <Link
                key={entry.id}
                href={`/tournaments/${entry.tournament.id}`}
                className="block rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--fs-text-3)]">Tournament</p>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--fs-text-1)]">{entry.tournament.title}</p>
                    <p className="text-sm text-[var(--fs-text-3)]">
                      {fmtDate(entry.tournament.dateTime)} · {npr(entry.tournament.entryFeeNpr ?? 0)} entry
                    </p>
                  </div>
                  <span className="fs-badge fs-badge-green">{entry.tournament.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {latestChallenge && (
        <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--fs-text-3)]">Latest challenge</p>
          <Link href={`/challenges/${latestChallenge.id}`} className="mt-2 block">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--fs-text-1)]">{latestChallenge.title}</p>
                <p className="text-sm text-[var(--fs-text-3)]">
                  {latestChallenge.status} · {latestChallenge.creatorId === user.id ? "created by you" : "joined by you"}
                </p>
              </div>
              <span className={CHALLENGE_TONES[latestChallenge.status] ?? "fs-badge"}>{latestChallenge.status}</span>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
      <div className="flex items-center gap-2 text-[var(--fs-red)]">
        {icon}
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--fs-text-3)]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--fs-text-1)]">{value}</p>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="flex items-center gap-2 text-[var(--fs-red)]">
        {icon}
        <p className="font-semibold text-[var(--fs-text-1)]">{title}</p>
      </div>
      <p className="mt-2 text-sm text-[var(--fs-text-3)]">{text}</p>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--fs-text-2)]">{title}</h2>
      <span className="fs-badge">{count}</span>
    </div>
  );
}

function ChallengeRow({ challenge, roleLabel }: { challenge: any; roleLabel: string }) {
  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="block rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 transition hover:border-[rgba(255,255,255,0.16)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--fs-text-3)]">{roleLabel}</p>
          <p className="mt-1 truncate font-semibold text-[var(--fs-text-1)]">{challenge.title}</p>
          <p className="mt-1 text-sm text-[var(--fs-text-3)]">
            {challenge.challengeNumber ?? challenge.gameMode} · {challenge.opponentId ? "Head-to-head" : "Waiting for opponent"}
          </p>
        </div>
        <span className={CHALLENGE_TONES[challenge.status] ?? "fs-badge"}>{challenge.status}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--fs-text-3)]">
        <span>{fmtDate(challenge.createdAt)}</span>
        <span>{challenge.opponentId ? "Opponent assigned" : "Waiting"}</span>
      </div>
    </Link>
  );
}