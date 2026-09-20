import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { DietreEvent, DietResponse } from "@/shared/lib/types";

export interface GuestComplexRuleEntry {
  rule: string;
  guestTokens: string[];
  severity: "high" | "medium" | "low";
  notes?: string;
}

export interface EventComplexContext {
  eventId: string;
  eventName: string;
  generatedAt: string;
  eventLimitations: {
    address: string;
    radiusMiles: number;
    budgetRange: string;
    budgetPerPerson?: number;
    expectedHeadcount: number;
    hostNotes: string;
    checklistItems: Array<{ id: string; label: string }>;
  };
  guestComplexRestrictions: GuestComplexRuleEntry[];
  aggregatedHardExcludes: string[];
}

function getContextDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production") {
    return path.join(os.tmpdir(), "dietre_events");
  }
  return path.join(process.cwd(), ".data", "events");
}

function guestToken(index: number): string {
  return `Guest ${String(index + 1).padStart(2, "0")}`;
}

export function buildEventComplexContext(
  event: DietreEvent,
  responses: DietResponse[]
): { context: EventComplexContext; markdown: string } {
  // Only guests tied to this event — never aggregate across events.
  const eventResponses = responses.filter((resp) => resp.event_id === event.id);

  // Aggregate complex restrictions across all responses
  const ruleToTokens = new Map<string, { tokens: string[]; severity: "high" | "medium" | "low" }>();
  const allHardExcludes = new Set<string>();

  eventResponses.forEach((resp, idx) => {
    const token = guestToken(idx);
    for (const h of resp.parsed_rules.hard_excludes) {
      allHardExcludes.add(h);
    }

    const compList = [...(resp.parsed_rules.complex_restrictions ?? [])];
    // If meat dairy combo is present without an explicit complex restriction string, normalize it
    if (
      resp.parsed_rules.hard_excludes.includes("meat dairy combo") &&
      !compList.some((r) => /meat.*dairy|dairy.*meat/i.test(r))
    ) {
      compList.push("yes dairy, yes meat, not together");
    }

    for (const rule of compList) {
      const existing = ruleToTokens.get(rule);
      if (existing) {
        if (!existing.tokens.includes(token)) existing.tokens.push(token);
        if (resp.parsed_rules.severity === "high") existing.severity = "high";
      } else {
        ruleToTokens.set(rule, { tokens: [token], severity: resp.parsed_rules.severity });
      }
    }
  });

  const guestComplexRestrictions: GuestComplexRuleEntry[] = Array.from(ruleToTokens.entries()).map(
    ([rule, data]) => ({
      rule,
      guestTokens: data.tokens,
      severity: data.severity,
    })
  );

  const context: EventComplexContext = {
    eventId: event.id,
    eventName: event.name,
    generatedAt: new Date().toISOString(),
    eventLimitations: {
      address: event.location,
      radiusMiles: event.radius,
      budgetRange: event.budget_range,
      budgetPerPerson: event.budget_per_person,
      expectedHeadcount: event.expected_headcount,
      hostNotes: event.limitations ?? "",
      checklistItems: event.limitations_checklist ?? [],
    },
    guestComplexRestrictions,
    aggregatedHardExcludes: Array.from(allHardExcludes),
  };

  // Build markdown representation for Gemini prompting and auditing
  const checklistLines =
    context.eventLimitations.checklistItems.length > 0
      ? context.eventLimitations.checklistItems.map((c) => `  - [x] ${c.label}`).join("\n")
      : "  - Standard venue accessibility and dining parameters.";

  const complexRuleLines =
    context.guestComplexRestrictions.length > 0
      ? context.guestComplexRestrictions
          .map(
            (cr) =>
              `- **"${cr.rule}"** (Applicable to: ${cr.guestTokens.join(", ")} | Strictness: ${cr.severity})`
          )
          .join("\n")
      : "- No compound dietary restrictions submitted yet.";

  const hardExcludesLine =
    context.aggregatedHardExcludes.length > 0
      ? context.aggregatedHardExcludes.join(", ")
      : "None reported.";

  const markdown = `# Unified Event Context File: Complex Dietary Restrictions & Event Limitations
**Event**: ${event.name}
**Event ID**: ${event.id}
**Updated At**: ${context.generatedAt}
**Location**: ${event.location} (Radius: ${event.radius} miles | Budget: $${event.budget_per_person ?? event.budget_range}/person | Expected Headcount: ${event.expected_headcount})

## 1. Event Detail Limits (Host Parameters)
- **Host Notes**: "${context.eventLimitations.hostNotes || "No extra host limitations specified."}"
- **Host Limitations Checklist**:
${checklistLines}

## 2. Specific Guest Complex & Relational Restrictions
${complexRuleLines}

## 3. Aggregated Hard Allergen Excludes
${hardExcludesLine}
`;

  return { context, markdown };
}

export async function saveEventComplexContext(
  event: DietreEvent,
  responses: DietResponse[]
): Promise<{ context: EventComplexContext; markdown: string; jsonPath: string; mdPath: string }> {
  const { context, markdown } = buildEventComplexContext(event, responses);
  let jsonPath = "";
  let mdPath = "";

  try {
    const dir = getContextDir();
    await fs.mkdir(dir, { recursive: true });

    jsonPath = path.join(dir, `${event.id}_complex_context.json`);
    mdPath = path.join(dir, `${event.id}_complex_context.md`);

    await fs.writeFile(jsonPath, JSON.stringify(context, null, 2), "utf8");
    await fs.writeFile(mdPath, markdown, "utf8");
  } catch (err) {
    console.warn("Notice: could not write complex context file to disk (continuing with in-memory context):", err);
  }

  return { context, markdown, jsonPath, mdPath };
}

export async function readEventComplexContext(eventId: string): Promise<string | null> {
  try {
    const dir = getContextDir();
    const mdPath = path.join(dir, `${eventId}_complex_context.md`);
    return await fs.readFile(mdPath, "utf8");
  } catch {
    return null;
  }
}

