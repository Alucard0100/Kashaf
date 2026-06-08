import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { Doc } from "@/convex/_generated/dataModel";

export type ScoutSearchPlayer = Doc<"users"> & {
  positionProfile: { position: string; percentage: number }[];
  totalMatchesAnalyzed: number;
  engineUnit: string | null;
  engineTopArchetype: string | null;
  engineTopPct: number | null;
  engineMatchCount: number;
  engineArchetypes: Record<string, number> | null;
  reliabilityTier: 0 | 1 | 2 | 3;
};

interface PlayerRowProps {
  profile: ScoutSearchPlayer;
  highlightArchetype: string | null;
  isTopArchetypeMatch: boolean;
  archetypeMatchPct: number | null;
}

// Tier display configuration
const TIER_CONFIG: Record<number, { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }> = {
  1: { label: "Tier 1 · High", color: "text-dns-green", bgColor: "bg-dns-green/8", borderColor: "border-dns-green/20", dotColor: "bg-dns-green" },
  2: { label: "Tier 2 · Medium", color: "text-dns-blue", bgColor: "bg-dns-blue/8", borderColor: "border-dns-blue/20", dotColor: "bg-dns-blue" },
  3: { label: "Tier 3 · Low", color: "text-amber-400", bgColor: "bg-amber-400/8", borderColor: "border-amber-400/20", dotColor: "bg-amber-400" },
  0: { label: "Unverified", color: "text-white/40", bgColor: "bg-white/3", borderColor: "border-white/8", dotColor: "bg-white/30" },
};

export function PlayerRow({ profile, highlightArchetype, isTopArchetypeMatch, archetypeMatchPct }: PlayerRowProps) {
  const matchCount = Math.max(profile.totalMatchesAnalyzed, profile.engineMatchCount);
  const tier = TIER_CONFIG[profile.reliabilityTier] ?? TIER_CONFIG[0];

  // Derive display values from user profile
  const playerName = profile.name || "Unknown Player";
  const age = profile.playerProfile?.age || "--";
  const height = profile.playerProfile?.height || "--";
  const foot = profile.playerProfile?.foot ? profile.playerProfile.foot.charAt(0).toUpperCase() + profile.playerProfile.foot.slice(1) : "Unknown";
  
  // Prefer engine-derived unit & archetype when available, fall back to legacy position profile
  const topPos = profile.positionProfile && profile.positionProfile.length > 0
      ? profile.positionProfile.reduce((prev: { position: string; percentage: number }, current: { position: string; percentage: number }) => (prev.percentage > current.percentage) ? prev : current)
      : null;

  const UNIT_LABELS: Record<string, string> = {
    cb: "Center Back",
    fb: "Fullback",
    mf: "Midfielder",
    wg: "Winger",
    st: "Striker",
  };

  const unit = profile.engineUnit
    ? (UNIT_LABELS[profile.engineUnit.toLowerCase()] ?? profile.engineUnit.toUpperCase())
    : (profile.playerProfile?.position || "Unknown");
  const topArchetype = profile.engineTopArchetype ?? (topPos ? topPos.position : "N/A");
  const topPct = profile.engineTopPct != null ? Math.round(profile.engineTopPct) : (topPos ? Math.round(topPos.percentage) : 0);

  // Highlight styling when this player's top archetype matches the search
  const highlighted = highlightArchetype && isTopArchetypeMatch;

  return (
    <Link
      href={`/players/${profile._id}`}
      className={`group relative flex items-center rounded-2xl p-4 transition-all duration-300 overflow-hidden shadow-sm cursor-pointer ${
        highlighted
          ? "bg-dns-green/5 hover:bg-dns-green/8 border border-dns-green/20 hover:border-dns-green/30"
          : "bg-white/2 hover:bg-white/5 border border-white/4 hover:border-white/10"
      }`}
    >
      {/* Highlight glow for top archetype matches */}
      {highlighted && (
        <div className="absolute inset-0 bg-gradient-to-r from-dns-green/5 via-transparent to-dns-green/3 pointer-events-none" />
      )}

      {/* Core Player Info */}
      <div className="flex-1 min-w-0 pr-4 relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-bold text-white truncate">{playerName}</h3>
          {/* Tier Badge */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${tier.bgColor} ${tier.borderColor}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${tier.dotColor}`} />
            <span className={`text-[9px] font-bold uppercase tracking-wider ${tier.color}`}>{tier.label}</span>
          </div>
          {highlighted && (
            <Badge className="bg-dns-green/15 text-dns-green border-dns-green/25 text-[9px] uppercase tracking-wider px-1.5 py-0 font-bold">
              Top Match
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-white/60 mb-2">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"/> {age} y/o</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"/> {height} cm</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20"/> {foot} Foot</span>
          <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${tier.dotColor}`}/> {matchCount} {matchCount === 1 ? "match" : "matches"}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-white/10 text-white font-bold uppercase tracking-wider px-2 py-0.5 text-[9px] border-transparent hover:bg-white/15">
            {unit}
          </Badge>
          {topArchetype !== "N/A" && (
            <Badge variant="outline" className="text-dns-green bg-dns-green/5 border-dns-green/20 px-2 py-0.5 font-medium hover:bg-dns-green/10 text-[10px] uppercase tracking-wider">
              {topArchetype} ({topPct}%)
            </Badge>
          )}
          {highlightArchetype && archetypeMatchPct !== null && archetypeMatchPct > 0 && !isTopArchetypeMatch && (
            <Badge variant="outline" className="text-amber-400 bg-amber-400/5 border-amber-400/20 px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider">
              {highlightArchetype}: {archetypeMatchPct.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Archetype % indicator when filtering */}
      {highlightArchetype && archetypeMatchPct !== null && archetypeMatchPct > 0 && (
        <div className="shrink-0 flex flex-col items-center justify-center px-4 border-l border-white/5 relative z-10">
          <span className={`text-xl font-black ${highlighted ? "text-dns-green" : "text-white/70"}`}>
            {archetypeMatchPct.toFixed(1)}
          </span>
          <span className={`text-[9px] uppercase tracking-widest mt-0.5 font-semibold ${highlighted ? "text-dns-green/60" : "text-white/30"}`}>
            {highlightArchetype.split(" ")[0]} %
          </span>
        </div>
      )}

      {/* Arrow indicator */}
      <div className="shrink-0 pl-4 text-white/20 group-hover:text-white/60 transition-colors relative z-10">
        <ChevronRight className="w-5 h-5" />
      </div>
    </Link>
  );
}
