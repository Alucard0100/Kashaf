"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FilterPanel, FilterState } from "@/components/scout/FilterPanel";
import { PlayerRow } from "@/components/scout/PlayerRow";
import type { ScoutSearchPlayer } from "@/components/scout/PlayerRow";

// Tier separator header configuration
const TIER_HEADERS: Record<number, { label: string; description: string; color: string; bgColor: string; borderColor: string; dotColor: string }> = {
  1: { label: "Tier 1 — High Confidence", description: "8–10 analyzed matches", color: "text-dns-green", bgColor: "bg-dns-green/5", borderColor: "border-dns-green/15", dotColor: "bg-dns-green" },
  2: { label: "Tier 2 — Medium Confidence", description: "5–7 analyzed matches", color: "text-dns-blue", bgColor: "bg-dns-blue/5", borderColor: "border-dns-blue/15", dotColor: "bg-dns-blue" },
  3: { label: "Tier 3 — Low Confidence", description: "3–4 analyzed matches", color: "text-amber-400", bgColor: "bg-amber-400/5", borderColor: "border-amber-400/15", dotColor: "bg-amber-400" },
  0: { label: "Unverified", description: "Fewer than 3 analyzed matches", color: "text-white/40", bgColor: "bg-white/2", borderColor: "border-white/6", dotColor: "bg-white/30" },
};

export default function ScoutDashboard() {
  const user = useQuery(api.users.getCurrentUser);

  const [filters, setFilters] = useState<FilterState>({
    unit: "all",
    topArchetype: "any",
    archetypeThreshold: 0,
    minMatches: 3, // Default to verified data only
    ageRange: [10, 50],
    heightRange: [100, 220],
    preferredFoot: 'any'
  });

  const rawProfiles = useQuery(api.users.searchPlayers, {
    position: filters.unit !== "all" ? filters.unit : undefined,
    minAge: filters.ageRange[0],
    maxAge: filters.ageRange[1],
    minHeight: filters.heightRange[0] > 100 ? filters.heightRange[0] : undefined,
    foot: filters.preferredFoot !== 'any' ? (filters.preferredFoot as "left" | "right" | "both") : undefined,
    minAnalyzedMatches: filters.minMatches > 0 ? filters.minMatches : undefined,
  });

  // Gate: scout must be approved
  if (user && user.role === "scout" && user.scoutApprovalStatus && user.scoutApprovalStatus !== "approved") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
        <div className="w-20 h-20 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center text-4xl mb-2">
          {user.scoutApprovalStatus === "rejected" ? "❌" : "⏳"}
        </div>
        <h1 className="text-2xl font-bold text-white">
          {user.scoutApprovalStatus === "rejected" ? "Application Rejected" : "Pending Approval"}
        </h1>
        <p className="text-white/40 text-sm max-w-md">
          {user.scoutApprovalStatus === "rejected"
            ? "Your scout application was not approved. Please contact support for more information."
            : "Your verification document is being reviewed by our team. You'll get full access once approved."}
        </p>
      </div>
    );
  }

  // Sort players by archetype relevance when an archetype is selected
  const selectedArchetype = filters.topArchetype !== "any" ? filters.topArchetype : null;

  const getArchetypePct = (profile: ScoutSearchPlayer, archetype: string): number => {
    if (!profile.engineArchetypes) return 0;
    const archetypes = profile.engineArchetypes as Record<string, number>;
    return archetypes[archetype] ?? 0;
  };

  // Tier-first sort: group by reliability tier (1 → 2 → 3 → 0), then by archetype fit within each tier
  const players = rawProfiles ? [...rawProfiles].sort((a, b) => {
    const aProfile = a as ScoutSearchPlayer;
    const bProfile = b as ScoutSearchPlayer;

    // Primary sort: tier (1 first, then 2, then 3, then 0)
    const tierOrder = (t: number) => (t === 0 ? 4 : t); // Push unverified (0) to end
    const aTier = tierOrder(aProfile.reliabilityTier);
    const bTier = tierOrder(bProfile.reliabilityTier);
    if (aTier !== bTier) return aTier - bTier;

    // Secondary sort: archetype fit (if archetype selected)
    if (selectedArchetype) {
      const aIsTop = aProfile.engineTopArchetype === selectedArchetype ? 1 : 0;
      const bIsTop = bProfile.engineTopArchetype === selectedArchetype ? 1 : 0;
      if (aIsTop !== bIsTop) return bIsTop - aIsTop;

      const aPct = getArchetypePct(aProfile, selectedArchetype);
      const bPct = getArchetypePct(bProfile, selectedArchetype);
      return bPct - aPct;
    }

    return 0;
  }) : [];

  // Group players by tier for rendering with separators
  const tierGroups: { tier: number; players: ScoutSearchPlayer[] }[] = [];
  const tierOrder = [1, 2, 3, 0];
  for (const tier of tierOrder) {
    const tierPlayers = players.filter((p) => (p as ScoutSearchPlayer).reliabilityTier === tier) as ScoutSearchPlayer[];
    if (tierPlayers.length > 0) {
      tierGroups.push({ tier, players: tierPlayers });
    }
  }

  // Count per tier for the metrics bar
  const tierCounts = tierGroups.reduce((acc, g) => {
    acc[g.tier] = g.players.length;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="flex h-full w-full bg-dns-bg text-white overflow-hidden p-6 gap-6 relative selection:bg-dns-blue/30">
      {/* Ambient Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-dns-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-dns-green/5 rounded-full blur-[100px]" />
      </div>

      {/* Left Filter Sidebar */}
      <div className="w-[340px] shrink-0 relative z-10 flex flex-col pt-2">
        <FilterPanel filters={filters} setFilters={setFilters} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative z-10 pr-2 pt-2 custom-scrollbar">
        
        {/* Header Section */}
        <div className="mb-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  Player Search Engine
                </h1>
                <p className="text-sm font-medium text-white/50 mt-1">
                  Discover talent matching your exact criteria — grouped by data reliability.
                </p>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="flex items-center justify-between bg-white/2 border border-white/4 backdrop-blur-xl px-5 py-3 rounded-xl shadow-lg">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Results</span>
                  <span className="text-sm font-bold text-white">{players.length} Players Found</span>
                </div>
                <div className="flex items-center gap-3">
                  {tierCounts[1] !== undefined && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-dns-green" />
                      <span className="text-dns-green">{tierCounts[1]}</span>
                      <span className="text-white/30">High</span>
                    </span>
                  )}
                  {tierCounts[2] !== undefined && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-dns-blue" />
                      <span className="text-dns-blue">{tierCounts[2]}</span>
                      <span className="text-white/30">Med</span>
                    </span>
                  )}
                  {tierCounts[3] !== undefined && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-amber-400">{tierCounts[3]}</span>
                      <span className="text-white/30">Low</span>
                    </span>
                  )}
                  {tierCounts[0] !== undefined && (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-white/30" />
                      <span className="text-white/40">{tierCounts[0]}</span>
                      <span className="text-white/30">Unv.</span>
                    </span>
                  )}
                  {selectedArchetype && (
                    <>
                      <span className="w-px h-4 bg-white/10" />
                      <span className="text-xs font-bold text-dns-green bg-dns-green/10 px-2 py-1 rounded border border-dns-green/20">{selectedArchetype} %</span>
                    </>
                  )}
                </div>
            </div>
        </div>

        {rawProfiles === undefined ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-dns-green border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-white/10 rounded-2xl bg-white/2 backdrop-blur-md">
            <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">No Matches Found</h3>
            <p className="text-white/50 max-w-sm text-sm">
              Try broadening your search constraints (Age, Height, or Minimum Tier).
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-12">
            {tierGroups.map((group) => {
              const header = TIER_HEADERS[group.tier];
              return (
                <div key={group.tier}>
                  {/* Tier Separator Header */}
                  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-2 mt-4 first:mt-0 border ${header.bgColor} ${header.borderColor} backdrop-blur-sm`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${header.dotColor} shadow-sm`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${header.color}`}>
                      {header.label}
                    </span>
                    <span className="text-[10px] text-white/30 font-medium">
                      {header.description}
                    </span>
                    <span className="ml-auto text-[10px] text-white/25 font-semibold">
                      {group.players.length} {group.players.length === 1 ? "player" : "players"}
                    </span>
                  </div>

                  {/* Players in this tier */}
                  <div className="space-y-3">
                    {group.players.map((p) => {
                      const profile = p as ScoutSearchPlayer;
                      const isTopMatch = selectedArchetype ? profile.engineTopArchetype === selectedArchetype : false;
                      const archetypePct = selectedArchetype ? getArchetypePct(profile, selectedArchetype) : null;
                      return (
                        <PlayerRow
                          key={p._id}
                          profile={profile}
                          highlightArchetype={selectedArchetype}
                          isTopArchetypeMatch={isTopMatch}
                          archetypeMatchPct={archetypePct}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
