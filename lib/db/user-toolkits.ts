import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "@/lib/errors";
import { userToolkit } from "./schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUserEnabledToolkits(
  userId: string
): Promise<string[]> {
  try {
    const rows = await db
      .select({ slug: userToolkit.slug })
      .from(userToolkit)
      .where(and(eq(userToolkit.userId, userId), eq(userToolkit.enabled, true)))
      .orderBy(asc(userToolkit.slug));
    return rows.map((r) => r.slug);
  } catch (e) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user toolkits"
    );
  }
}

export async function setUserEnabledToolkits(userId: string, slugs: string[]) {
  try {
    // Upsert: disable all, then enable provided
    await db
      .update(userToolkit)
      .set({ enabled: false })
      .where(eq(userToolkit.userId, userId));
    if (slugs.length) {
      const values = slugs.map((slug) => ({ userId, slug, enabled: true }));
      // Insert; on conflict update
      // drizzle-postgres lacks onConflict helper here; do two-step: delete missing and insert missing
      // Ensure rows exist
      for (const v of values) {
        await db
          .insert(userToolkit)
          .values(v as any)
          .onConflictDoUpdate({
            target: [userToolkit.userId, userToolkit.slug],
            set: { enabled: true },
          } as any);
      }
    }
  } catch (e) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to set user toolkits"
    );
  }
}
