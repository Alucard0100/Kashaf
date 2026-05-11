import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Admin action to create an analyst account with proper auth credentials.
 * Uses @convex-dev/auth's createAccount to register in the auth system,
 * then patches the user record with the analyst role and profile.
 */
export const createAnalystWithAuth = action({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        analystProfile: v.object({
            nationality: v.string(),
            experience: v.number(),
            certifications: v.array(v.string()),
            languages: v.array(v.string()),
            bio: v.string(),
        }),
    },
    handler: async (ctx, args) => {
        // Step 1: Create the auth account + user record via the auth system
        const { user } = await createAccount(ctx, {
            provider: "password",
            account: {
                id: args.email,
                secret: args.password,
            },
            profile: {
                email: args.email,
                name: args.name,
                role: "analyst" as any,
            },
            shouldLinkViaEmail: false,
        });

        // Step 2: Patch the user with analyst profile + onboarding flags
        await ctx.runMutation(internal.adminActions.patchAnalystProfileInternal, {
            userId: user._id,
            analystProfile: args.analystProfile,
        });

        return { userId: user._id };
    },
});

/**
 * Internal mutation to patch the analyst profile on a user record.
 * Called by the createAnalystWithAuth action after auth account creation.
 */
export const patchAnalystProfileInternal = internalMutation({
    args: {
        userId: v.id("users"),
        analystProfile: v.object({
            nationality: v.string(),
            experience: v.number(),
            certifications: v.array(v.string()),
            languages: v.array(v.string()),
            bio: v.string(),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            role: "analyst",
            analystProfile: args.analystProfile,
            onboardingComplete: true,
        });
    },
});
