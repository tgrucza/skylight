import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { decryptToken } from "@/lib/google/tokens";
import { addGroceryItemsDeduped, ensureChecklistId, formatIngredientLabel } from "@/lib/groceryList";
import { zonedIsoDate, zonedDayOfWeek } from "@/lib/dates";
import { callClaude, type AnthropicToolDef, type AnthropicMessage, type AnthropicContentBlock } from "@/lib/anthropic";
import { callOpenAiChat, type OpenAiToolDef, type OpenAiMessage, type OpenAiContentPart } from "@/lib/openai";

const MAX_TOOL_ITERATIONS = 5;

const TOOLS: AnthropicToolDef[] = [
  {
    name: "add_event",
    description: "Add a calendar event for a date and optional time. Use today's date if the user says 'today', etc.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        memberName: { type: "string", description: "First name of the family member this is for, if any" },
        date: { type: "string", description: "YYYY-MM-DD, in the family's local timezone" },
        startTime: { type: "string", description: "24h HH:MM, omit for an all-day event" },
        endTime: { type: "string", description: "24h HH:MM, defaults to one hour after startTime" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "add_grocery_items",
    description: "Add one or more items to the family grocery list (skips duplicates already on the list).",
    input_schema: {
      type: "object",
      properties: { items: { type: "array", items: { type: "string" } } },
      required: ["items"],
    },
  },
  {
    name: "add_todo",
    description: "Add one or more items to the family's To-Do checklist.",
    input_schema: {
      type: "object",
      properties: { items: { type: "array", items: { type: "string" } } },
      required: ["items"],
    },
  },
  {
    name: "add_chore",
    description: "Create a chore assigned to one or more family members.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        memberNames: { type: "array", items: { type: "string" }, description: "First names to assign this chore to" },
        days: { type: "array", items: { type: "number" }, description: "0=Sun..6=Sat, omit for a one-off/every-day chore" },
        stars: { type: "number", description: "1-3, defaults to 1" },
      },
      required: ["title", "memberNames"],
    },
  },
  {
    name: "plan_meal",
    description:
      "Plan a meal for a date and slot. Optionally attach a saved recipe by title, and/or add ingredients to the grocery list. For meals like cheeseburgers or taco night, include the typical fixings in ingredients even if no saved recipe exists.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        slot: { type: "string", enum: ["breakfast", "lunch", "dinner"] },
        title: { type: "string" },
        recipeTitle: { type: "string", description: "Match a saved family recipe by title if one exists" },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "Grocery items / fixings to add (e.g. buns, cheese, lettuce for cheeseburgers)",
        },
        addIngredientsToGroceries: {
          type: "boolean",
          description: "If true (default when ingredients or a recipe with ingredients is present), add them to groceries",
        },
      },
      required: ["date", "slot", "title"],
    },
  },
  {
    name: "save_recipe",
    description: "Save a reusable family recipe with ingredients so it can be planned later.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        ingredients: { type: "array", items: { type: "string" }, description: "Ingredient lines, optionally with quantities" },
        notes: { type: "string" },
        url: { type: "string" },
      },
      required: ["title", "ingredients"],
    },
  },
  {
    name: "ha_call_service",
    description: "Trigger a saved Home Assistant button by its label (e.g. Garage lights, Goodnight).",
    input_schema: {
      type: "object",
      properties: { buttonLabel: { type: "string" } },
      required: ["buttonLabel"],
    },
  },
  {
    name: "answer",
    description: "Answer a question, or reply conversationally, with no data changes. Always call this (or another tool) exactly once to finish.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
  },
];

const OPENAI_TOOLS: OpenAiToolDef[] = TOOLS.map((t) => ({
  type: "function",
  function: { name: t.name, description: t.description, parameters: t.input_schema },
}));

const bodySchema = z
  .object({
    transcript: z.string().max(4000).optional(),
    image: z
      .object({
        mediaType: z.string().min(3).max(100),
        data: z.string().min(1).max(8_000_000),
      })
      .optional(),
  })
  .refine((b) => !!(b.transcript?.trim() || b.image), { message: "transcript or image required" });

interface ExecutedAction {
  tool: string;
  summary: string;
  clientInvoke?: string;
}

function resolveMemberId(name: string | undefined, members: { id: string; name: string }[]): string | null {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  const exact = members.find((m) => m.name.toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = members.find((m) => m.name.toLowerCase().startsWith(needle) || needle.startsWith(m.name.toLowerCase()));
  return partial?.id ?? null;
}

function parseIngredientLine(line: string): { name: string; qty: string } {
  const trimmed = line.trim();
  const m = trimmed.match(/^([\d./]+\s*(?:cups?|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|cloves?|cans?|bunches?)?)\s+(.+)$/i);
  if (m) return { qty: m[1]!.trim(), name: m[2]!.trim() };
  return { name: trimmed, qty: "" };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { transcript, image } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const [{ data: integration }, { data: family }, { data: members }, { data: recipes }, { data: haButtons }] = await Promise.all([
    supabase
      .from("integration_settings")
      .select("ai_provider, ai_api_key_enc, openai_api_key_enc, ai_model, openai_model, ha_base_url, ha_token_enc")
      .eq("family_id", membership.familyId)
      .maybeSingle(),
    supabase.from("families").select("timezone").eq("id", membership.familyId).single(),
    supabase.from("family_members").select("id, name").eq("family_id", membership.familyId),
    supabase.from("recipes").select("id, title, ingredients").eq("family_id", membership.familyId),
    supabase.from("ha_buttons").select("id, label").eq("family_id", membership.familyId),
  ]);

  const provider = integration?.ai_provider === "openai" ? "openai" : "anthropic";
  const keyEnc = provider === "openai" ? integration?.openai_api_key_enc : integration?.ai_api_key_enc;
  if (!keyEnc) {
    return NextResponse.json({ error: "The AI assistant isn't set up yet — an adult can add a key in Settings." }, { status: 400 });
  }

  const timezone = family?.timezone ?? "America/New_York";
  const apiKey = decryptToken(keyEnc);
  const model = (provider === "openai" ? integration?.openai_model : integration?.ai_model) ?? undefined;
  const now = new Date();
  const todayIso = zonedIsoDate(now, timezone);
  const todayDow = zonedDayOfWeek(now, timezone);
  const memberList = members ?? [];
  const recipeList = recipes ?? [];
  const buttonList = haButtons ?? [];
  const haConfigured = !!(integration?.ha_base_url && integration?.ha_token_enc);

  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("title, starts_at, ends_at, all_day, member_id")
    .eq("family_id", membership.familyId)
    .is("deleted_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + 7 * 86400000).toISOString())
    .order("starts_at")
    .limit(20);

  const eventsSummary = (upcomingEvents ?? [])
    .map((e) => {
      const member = memberList.find((m) => m.id === e.member_id);
      return `- ${e.title}${member ? ` (${member.name})` : ""}: ${e.all_day ? "all day" : e.starts_at} on ${e.starts_at.slice(0, 10)}`;
    })
    .join("\n");

  const recipesSummary =
    recipeList.length > 0
      ? recipeList.map((r) => `- ${r.title}`).join("\n")
      : "(none saved yet — you can invent typical ingredients for common meals, or call save_recipe)";

  const haSummary = haConfigured
    ? buttonList.length > 0
      ? buttonList.map((b) => `- ${b.label}`).join("\n")
      : "(configured, but no buttons saved yet)"
    : "(not configured)";

  const system = `You are Judy, the family's home assistant for Orbit, a family command center.
Today is ${todayIso} (day-of-week index ${todayDow}, 0=Sun..6=Sat) in the family's timezone (${timezone}).
Family members: ${memberList.map((m) => m.name).join(", ") || "none yet"}.
Saved recipes:
${recipesSummary}
Home Assistant buttons:
${haSummary}
Upcoming week's events:
${eventsSummary || "(nothing scheduled)"}

Use the tools to make changes; never invent a family member who isn't listed above — ask via the answer tool instead if it's ambiguous. Pick sensible defaults rather than asking clarifying questions when reasonable.

When the user plans a meal like "cheeseburgers tonight" or "taco night": call plan_meal for dinner (today if they said tonight), include typical fixings in ingredients, and set addIngredientsToGroceries true. Prefer matching a saved recipe via recipeTitle when the name is close.

If the user sends a photo or document (school supply list, flyer, handwritten note): read it carefully, then use add_grocery_items and/or add_todo (and add_event if dates are clear). Summarize briefly what you captured.

For Home Assistant, only use ha_call_service with an exact button label from the list above.

Always finish by calling exactly one tool: either a data tool or "answer" for pure Q&A/conversation. Keep spoken replies short — one or two sentences.`;

  const userText =
    transcript?.trim() ||
    (image
      ? "Please read this image/document and put anything actionable onto our grocery list and/or to-do list. Create calendar reminders only if dates are clear."
      : "");

  const actions: ExecutedAction[] = [];
  let reply = "";

  const toolCtx = {
    supabase,
    familyId: membership.familyId,
    timezone,
    members: memberList,
    recipes: recipeList,
    haButtons: buttonList,
    haConfigured,
    req,
  };

  if (provider === "openai") {
    const userContent: OpenAiContentPart[] = [{ type: "text", text: userText }];
    if (image) {
      userContent.unshift({
        type: "image_url",
        image_url: { url: `data:${image.mediaType};base64,${image.data}` },
      });
    }
    const messages: OpenAiMessage[] = [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await callOpenAiChat({ apiKey, model: model || "gpt-4o", messages, tools: OPENAI_TOOLS });
      const message = response.choices[0]?.message;
      const toolCalls = message?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        reply = (typeof message?.content === "string" ? message.content : "")?.trim() || "Done.";
        break;
      }

      messages.push({ role: "assistant", content: message?.content ?? null, tool_calls: toolCalls });

      let answered = false;
      for (const call of toolCalls) {
        const input = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        const { summary, result, clientInvoke } = await executeTool(call.function.name, input, toolCtx);
        if (call.function.name === "answer") {
          reply = (input.text as string) ?? summary;
          answered = true;
        } else {
          actions.push({ tool: call.function.name, summary, clientInvoke });
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }

      if (answered) break;
    }
  } else {
    const userContent: AnthropicContentBlock[] = [];
    if (image) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: image.mediaType, data: image.data },
      });
    }
    userContent.push({ type: "text", text: userText });
    const messages: AnthropicMessage[] = [{ role: "user", content: userContent }];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await callClaude({ apiKey, model, system, messages, tools: TOOLS });
      const toolUses = response.content.filter((b): b is Extract<AnthropicContentBlock, { type: "tool_use" }> => b.type === "tool_use");
      const textBlocks = response.content.filter((b): b is Extract<AnthropicContentBlock, { type: "text" }> => b.type === "text");

      if (toolUses.length === 0) {
        reply = textBlocks.map((b) => b.text).join(" ").trim() || "Done.";
        break;
      }

      messages.push({ role: "assistant", content: response.content });
      const toolResults: AnthropicContentBlock[] = [];

      for (const use of toolUses) {
        const { summary, result, clientInvoke } = await executeTool(use.name, use.input, toolCtx);
        if (use.name === "answer") {
          reply = (use.input.text as string) ?? summary;
        } else {
          actions.push({ tool: use.name, summary, clientInvoke });
        }
        toolResults.push({ type: "tool_result", tool_use_id: use.id, content: result });
      }

      messages.push({ role: "user", content: toolResults });

      if (toolUses.some((u) => u.name === "answer")) break;
    }
  }

  if (!reply) reply = actions.length > 0 ? actions.map((a) => a.summary).join(" ") : "I wasn't able to finish that.";

  return NextResponse.json({ reply, actions });
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: {
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
    familyId: string;
    timezone: string;
    members: { id: string; name: string }[];
    recipes: { id: string; title: string; ingredients: unknown }[];
    haButtons: { id: string; label: string }[];
    haConfigured: boolean;
    req: NextRequest;
  }
): Promise<{ summary: string; result: string; clientInvoke?: string }> {
  const { supabase, familyId, timezone, members, recipes, haButtons, haConfigured, req } = ctx;

  try {
    switch (name) {
      case "answer": {
        return { summary: "", result: "ok" };
      }

      case "add_event": {
        const title = String(input.title ?? "").trim();
        const date = String(input.date ?? "");
        const memberId = resolveMemberId(input.memberName as string | undefined, members);
        const startTime = input.startTime as string | undefined;
        const endTime = input.endTime as string | undefined;
        const allDay = !startTime;

        const startsAt = allDay ? fromZonedTime(`${date}T00:00:00`, timezone) : fromZonedTime(`${date}T${startTime}:00`, timezone);
        const endsAt = allDay
          ? fromZonedTime(`${date}T23:59:59`, timezone)
          : endTime
            ? fromZonedTime(`${date}T${endTime}:00`, timezone)
            : new Date(startsAt.getTime() + 3600_000);

        const res = await fetch(new URL("/api/events", req.nextUrl.origin), {
          method: "POST",
          headers: { "content-type": "application/json", cookie: req.headers.get("cookie") ?? "" },
          body: JSON.stringify({
            title,
            memberId: memberId ?? undefined,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            allDay,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Couldn't add the event");
        const member = members.find((m) => m.id === memberId);
        const summary = `Added "${title}"${member ? ` for ${member.name}` : ""} on ${date}`;
        return { summary, result: summary };
      }

      case "add_grocery_items": {
        const items = (input.items as string[] | undefined)?.filter((i) => i.trim()) ?? [];
        if (items.length === 0) throw new Error("No items given");
        const { added, skipped, labelsAdded } = await addGroceryItemsDeduped(supabase, familyId, items);
        const summary =
          added > 0
            ? `Added ${labelsAdded.join(", ")} to groceries${skipped ? ` (${skipped} already listed)` : ""}`
            : `Those were already on the grocery list`;
        return { summary, result: summary };
      }

      case "add_todo": {
        const items =
          (input.items as string[] | undefined)?.filter((i) => i.trim()) ??
          (input.text ? [String(input.text)] : []);
        if (items.length === 0) throw new Error("No text given");
        const listId = await ensureChecklistId(supabase, familyId);
        const { error } = await supabase.from("list_items").insert(items.map((label) => ({ list_id: listId, label: label.trim() })));
        if (error) throw new Error(error.message);
        const summary = items.length === 1 ? `Added "${items[0]}" to the to-do list` : `Added ${items.length} to-dos`;
        return { summary, result: summary };
      }

      case "add_chore": {
        const title = String(input.title ?? "").trim();
        const memberNames = (input.memberNames as string[] | undefined) ?? [];
        const days = (input.days as number[] | undefined) ?? [];
        const stars = (input.stars as number | undefined) ?? 1;
        const memberIds = memberNames.map((n) => resolveMemberId(n, members)).filter((id): id is string => !!id);

        const { data: chore, error } = await supabase
          .from("chores")
          .insert({ family_id: familyId, title, star_value: stars, schedule_days: days })
          .select("id")
          .single();
        if (error || !chore) throw new Error(error?.message ?? "Couldn't create the chore");
        if (memberIds.length > 0) {
          await supabase.from("chore_assignments").insert(memberIds.map((member_id) => ({ chore_id: chore.id, member_id })));
        }
        const names = memberIds.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean);
        const summary = `Added the chore "${title}"${names.length ? ` for ${names.join(", ")}` : ""}`;
        return { summary, result: summary };
      }

      case "plan_meal": {
        const date = String(input.date ?? "");
        const slotInput = String(input.slot ?? "");
        const slot = (["breakfast", "lunch", "dinner"] as const).includes(slotInput as "breakfast" | "lunch" | "dinner")
          ? (slotInput as "breakfast" | "lunch" | "dinner")
          : "dinner";
        const title = String(input.title ?? "").trim();
        const recipeTitle = (input.recipeTitle as string | undefined)?.trim();
        const freeIngredients = ((input.ingredients as string[] | undefined) ?? []).map((i) => i.trim()).filter(Boolean);
        const addFlag = input.addIngredientsToGroceries as boolean | undefined;

        let recipeId: string | null = null;
        let recipeIngredients: string[] = [];
        if (recipeTitle) {
          const needle = recipeTitle.toLowerCase();
          const match =
            recipes.find((r) => r.title.toLowerCase() === needle) ??
            recipes.find((r) => r.title.toLowerCase().includes(needle) || needle.includes(r.title.toLowerCase()));
          if (match) {
            recipeId = match.id;
            const ings = Array.isArray(match.ingredients) ? (match.ingredients as { name: string; qty?: string }[]) : [];
            recipeIngredients = ings.map(formatIngredientLabel);
          }
        } else {
          const needle = title.toLowerCase();
          const match =
            recipes.find((r) => r.title.toLowerCase() === needle) ??
            recipes.find((r) => r.title.toLowerCase().includes(needle) || needle.includes(r.title.toLowerCase()));
          if (match) {
            recipeId = match.id;
            const ings = Array.isArray(match.ingredients) ? (match.ingredients as { name: string; qty?: string }[]) : [];
            recipeIngredients = ings.map(formatIngredientLabel);
          }
        }

        const { error } = await supabase
          .from("meal_plan_entries")
          .upsert({ family_id: familyId, date, slot, title, recipe_id: recipeId }, { onConflict: "family_id,date,slot" });
        if (error) throw new Error(error.message);

        const groceryItems = [...new Set([...recipeIngredients, ...freeIngredients])];
        const shouldAdd = addFlag ?? groceryItems.length > 0;
        let groceryNote = "";
        if (shouldAdd && groceryItems.length > 0) {
          const { added, labelsAdded } = await addGroceryItemsDeduped(supabase, familyId, groceryItems);
          if (added > 0) groceryNote = ` Added ${labelsAdded.join(", ")} to groceries.`;
        }

        const summary = `Planned ${title} for ${slot} on ${date}.${groceryNote}`;
        return { summary, result: summary };
      }

      case "save_recipe": {
        const title = String(input.title ?? "").trim();
        const lines = ((input.ingredients as string[] | undefined) ?? []).map((i) => i.trim()).filter(Boolean);
        if (!title || lines.length === 0) throw new Error("Need a title and ingredients");
        const ingredients = lines.map(parseIngredientLine);
        const { error } = await supabase.from("recipes").insert({
          family_id: familyId,
          title,
          ingredients,
          notes: (input.notes as string | undefined)?.trim() || null,
          url: (input.url as string | undefined)?.trim() || null,
        });
        if (error) throw new Error(error.message);
        const summary = `Saved recipe "${title}" with ${ingredients.length} ingredients`;
        return { summary, result: summary };
      }

      case "ha_call_service": {
        if (!haConfigured) throw new Error("Home Assistant isn't configured");
        const buttonLabel = String(input.buttonLabel ?? "").trim().toLowerCase();
        const button =
          haButtons.find((b) => b.label.toLowerCase() === buttonLabel) ??
          haButtons.find((b) => b.label.toLowerCase().includes(buttonLabel) || buttonLabel.includes(b.label.toLowerCase()));
        if (!button) throw new Error(`No Home Assistant button matching "${input.buttonLabel}"`);
        // Client must invoke LAN HA — return a clientInvoke instruction.
        const summary = `Turning on ${button.label}`;
        return { summary, result: summary, clientInvoke: button.id };
      }

      default:
        return { summary: "", result: `Unknown tool ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return { summary: `Failed: ${message}`, result: `error: ${message}` };
  }
}
