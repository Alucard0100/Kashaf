import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function assertAdmin(ctx: any) {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean);
    if (!adminEmails.includes(user.email.toLowerCase())) {
        throw new Error("Not authorized");
    }
    return userId;
}

// ── Create a match (player uploads YouTube URL) ──────────────────────────
export const createMatch = mutation({
    args: {
        youtubeUrl: v.string(),
        youtubeVideoId: v.string(),
        opponentName: v.optional(v.string()),
        matchDate: v.optional(v.number()),
        shirtNumber: v.number(),
        playerNote: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "player") {
            throw new Error("Only players can upload matches");
        }

        const matchId = await ctx.db.insert("matches", {
            playerId: userId,
            youtubeUrl: args.youtubeUrl,
            youtubeVideoId: args.youtubeVideoId,
            opponentName: args.opponentName,
            matchDate: args.matchDate,
            shirtNumber: args.shirtNumber,
            playerNote: args.playerNote,
            status: "pending_analyst",
            createdAt: Date.now(),
        });

        // Auto-assign an analyst via least-busy round-robin
        await ctx.scheduler.runAfter(0, internal.autoAssign.autoAssignAnalyst, { matchId });

        return matchId;
    },
});

// ── Get matches by player ────────────────────────────────────────────────
export const getMatchesByPlayer = query({
    args: { playerId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        const userId = args.playerId ?? (await getAuthUserId(ctx));
        if (!userId) return [];

        return await ctx.db
            .query("matches")
            .withIndex("by_playerId", (q) => q.eq("playerId", userId))
            .order("desc")
            .collect();
    },
});

// ── Get matches by analyst ───────────────────────────────────────────────
export const getMatchesByAnalyst = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const matches = await ctx.db
            .query("matches")
            .withIndex("by_analystId", (q) => q.eq("analystId", userId))
            .order("desc")
            .collect();

        if (args.status) {
            return matches.filter((m) => m.status === args.status);
        }
        return matches;
    },
});

// ── Get matches by analyst with player details (name + shirt number) ─────
export const getMatchesByAnalystWithPlayerDetails = query({
    args: { status: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        let matches = await ctx.db
            .query("matches")
            .withIndex("by_analystId", (q) => q.eq("analystId", userId))
            .order("desc")
            .collect();

        if (args.status) {
            matches = matches.filter((m) => m.status === args.status);
        }

        const enriched = await Promise.all(
            matches.map(async (match) => {
                const player = await ctx.db.get(match.playerId);
                return {
                    ...match,
                    playerName: player?.name ?? "Unknown Player",
                    playerShirtNumber: match.shirtNumber ?? 5,
                };
            })
        );

        return enriched;
    },
});

// ── Get match by ID ──────────────────────────────────────────────────────
export const getMatchById = query({
    args: { matchId: v.id("matches") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.matchId);
    },
});

// ── Update match status ──────────────────────────────────────────────────
export const updateMatchStatus = mutation({
    args: {
        matchId: v.id("matches"),
        status: v.union(
            v.literal("pending_analyst"),
            v.literal("analyst_assigned"),
            v.literal("analysis_in_progress"),
            v.literal("completed")
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await ctx.db.patch(args.matchId, { status: args.status });
    },
});

// ── Complete match (analyst) ───────────────────────────────────────────
export const completeMatch = mutation({
    args: {
        matchId: v.id("matches"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user || user.role !== "analyst") {
            throw new Error("Only analysts can complete matches");
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) throw new Error("Match not found");
        if (match.analystId !== userId) {
            throw new Error("You are not assigned to this match");
        }

        await ctx.db.patch(args.matchId, { status: "completed" });

        await ctx.db.insert("notifications", {
            userId: match.playerId,
            type: "analysis_complete",
            message: "Your match analysis is complete! Check your dashboard to view the results.",
            relatedId: args.matchId,
            isRead: false,
            createdAt: Date.now(),
        });
    },
});

// ── Assign analyst to match ──────────────────────────────────────────────
export const assignAnalyst = mutation({
    args: {
        matchId: v.id("matches"),
        analystId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await ctx.db.patch(args.matchId, {
            analystId: args.analystId,
            status: "analyst_assigned",
        });
    },
});

// ── Get completed matches for public profile ─────────────────────────────
export const getCompletedMatchesByPlayer = query({
    args: { playerId: v.id("users") },
    handler: async (ctx, args) => {
        const matches = await ctx.db
            .query("matches")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .order("desc")
            .collect();

        return matches.filter((m) => m.status === "completed");
    },
});

// ── Get all matches with player/analyst details (admin) ──────────────────
export const getAllMatchesWithDetails = query({
    args: {},
    handler: async (ctx) => {
        const matches = await ctx.db
            .query("matches")
            .order("desc")
            .collect();

        const enriched = await Promise.all(
            matches.map(async (match) => {
                const player = await ctx.db.get(match.playerId);
                const analyst = match.analystId
                    ? await ctx.db.get(match.analystId)
                    : null;
                return {
                    ...match,
                    playerName: player?.name ?? "Unknown Player",
                    playerEmail: player?.email ?? "",
                    analystName: match.analystId
                        ? (analyst?.name ?? "Deleted Analyst")
                        : null,
                    analystEmail: match.analystId ? (analyst?.email ?? null) : null,
                };
            })
        );

        return enriched;
    },
});

// ── Admin reassign match to a different analyst ──────────────────────────
export const adminReassignMatch = mutation({
    args: {
        matchId: v.id("matches"),
        newAnalystId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) throw new Error("Match not found");

        const newAnalyst = await ctx.db.get(args.newAnalystId);
        if (!newAnalyst || newAnalyst.role !== "analyst") {
            throw new Error("Selected user is not an analyst");
        }

        const player = await ctx.db.get(match.playerId);

        // Update the match assignment
        await ctx.db.patch(args.matchId, {
            analystId: args.newAnalystId,
            status: match.status === "completed" ? "completed" : "analyst_assigned",
        });

        // Create a new analysis request for the new analyst
        const requestId = await ctx.db.insert("analysisRequests", {
            playerId: match.playerId,
            analystId: args.newAnalystId,
            matchId: args.matchId,
            status: "accepted",
            createdAt: Date.now(),
        });

        // Notify the new analyst
        await ctx.db.insert("notifications", {
            userId: args.newAnalystId,
            type: "new_assignment",
            message: `You've been reassigned a match to analyze${player?.name ? ` for ${player.name}` : ""} (admin action).`,
            relatedId: requestId,
            isRead: false,
            createdAt: Date.now(),
        });

        // Notify the player
        await ctx.db.insert("notifications", {
            userId: match.playerId,
            type: "analyst_reassigned",
            message: `Your match analyst has been updated to ${newAnalyst.name ?? "a new analyst"}.`,
            relatedId: args.matchId,
            isRead: false,
            createdAt: Date.now(),
        });

        return requestId;
    },
});

// ── Admin cascading delete match ───────────────────────────────────────
export const deleteMatchCascading = mutation({
    args: {
        matchId: v.id("matches"),
    },
    handler: async (ctx, args) => {
        await assertAdmin(ctx);

        const match = await ctx.db.get(args.matchId);
        if (!match) throw new Error("Match not found");

        const playerId = match.playerId;

        // Delete analysis events
        const events = await ctx.db
            .query("analysisEvents")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .collect();
        await Promise.all(events.map((e) => ctx.db.delete(e._id)));

        // Delete engine logs
        const logs = await ctx.db
            .query("engineLogs")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .collect();
        await Promise.all(logs.map((l) => ctx.db.delete(l._id)));

        // Delete engine jobs
        const jobs = await ctx.db
            .query("engineJobs")
            .filter((q) => q.eq(q.field("matchId"), args.matchId))
            .collect();
        await Promise.all(jobs.map((j) => ctx.db.delete(j._id)));

        // Delete analysis requests
        const requests = await ctx.db
            .query("analysisRequests")
            .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
            .collect();
        await Promise.all(requests.map((r) => ctx.db.delete(r._id)));

        // Delete the match itself
        await ctx.db.delete(args.matchId);

        // Determine remaining completed matches
        const remainingMatches = await ctx.db
            .query("matches")
            .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
            .collect();

        const completedRemaining = remainingMatches
            .filter((m) => m.status === "completed")
            .sort((a, b) => b.createdAt - a.createdAt);

        if (completedRemaining.length === 0) {
            const engineProfile = await ctx.db
                .query("playerEngineProfiles")
                .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
                .first();
            if (engineProfile) {
                await ctx.db.delete(engineProfile._id);
            }

            const positionProfile = await ctx.db
                .query("playerPositionProfiles")
                .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
                .first();
            if (positionProfile) {
                await ctx.db.delete(positionProfile._id);
            }

            return {
                remainingCompleted: 0,
                profileCleared: true,
            };
        }

        const recalcMatch = completedRemaining[0];
        return {
            remainingCompleted: completedRemaining.length,
            profileCleared: false,
            recalcMatchId: recalcMatch._id,
            recalcPlayerId: recalcMatch.playerId,
            recalcAnalystId: recalcMatch.analystId,
        };
    },
});
