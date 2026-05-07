import TournamentDetailClient from "./TournamentDetailClient";

// Required for Next.js static export. The Capacitor APK loads pages from the
// remote server URL at runtime, so no params need to be prerendered.
export async function generateStaticParams() {
  // Placeholder so Next.js can build the static export. Real tournaments load
  // dynamically — the APK fetches data from the live API at runtime.
  return [{ id: "_" }];
}
export const dynamicParams = true;

export default function Page() {
  return <TournamentDetailClient />;
}
