import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type BabyJson = {
  name?: string;
  birthDate?: string;
  weight?: string;
  gender?: "boy" | "girl" | null;
  allergies?: string[];
  diversificationStartDate?: string | null;
};

function mapProfileRow(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  const baby: BabyJson =
    row.baby_json && typeof row.baby_json === "object"
      ? (row.baby_json as BabyJson)
      : {};
  return {
    parentName: typeof row.parent_name === "string" ? row.parent_name : "",
    baby: {
      name: baby.name ?? "",
      birthDate: baby.birthDate ?? "",
      weight: baby.weight ?? "",
      gender: baby.gender ?? null,
      allergies: Array.isArray(baby.allergies) ? baby.allergies : [],
      diversificationStartDate:
        baby.diversificationStartDate !== undefined
          ? baby.diversificationStartDate
          : null,
    },
    isPremium: Boolean(row.is_premium),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();

  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (profileErr) {
    console.error("[sync GET] profiles", profileErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const { data: foodRows, error: foodErr } = await supabase
    .from("food_entries")
    .select("payload")
    .eq("user_email", email);

  if (foodErr) {
    console.error("[sync GET] food_entries", foodErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const { data: allergyRows, error: allergyErr } = await supabase
    .from("allergy_records")
    .select("payload")
    .eq("user_email", email);

  if (allergyErr) {
    console.error("[sync GET] allergy_records", allergyErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const foodEntries =
    foodRows?.map((r) => r.payload as unknown).filter((p) => p != null) ?? [];
  const allergies =
    allergyRows?.map((r) => r.payload as unknown).filter((p) => p != null) ?? [];

  return NextResponse.json({
    profile: mapProfileRow(profileRow as Record<string, unknown> | null),
    foodEntries,
    allergies,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();

  let body: {
    profile?: {
      parentName?: string;
      baby?: BabyJson;
      isPremium?: boolean;
    };
    foodEntries?: unknown[];
    allergies?: unknown[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = body.profile;
  if (profile) {
    const babyJson: BabyJson = {
      name: profile.baby?.name ?? "",
      birthDate: profile.baby?.birthDate ?? "",
      weight: profile.baby?.weight ?? "",
      gender: profile.baby?.gender ?? null,
      allergies: Array.isArray(profile.baby?.allergies)
        ? profile.baby.allergies
        : [],
      diversificationStartDate:
        profile.baby?.diversificationStartDate !== undefined
          ? profile.baby.diversificationStartDate
          : null,
    };

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        parent_name: profile.parentName ?? "",
        baby_json: babyJson,
        is_premium: Boolean(profile.isPremium),
      })
      .eq("email", email);

    if (upErr) {
      console.error("[sync POST] profiles update", upErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }

  const foodEntries = Array.isArray(body.foodEntries) ? body.foodEntries : [];
  const { error: delFoodErr } = await supabase
    .from("food_entries")
    .delete()
    .eq("user_email", email);

  if (delFoodErr) {
    console.error("[sync POST] food_entries delete", delFoodErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (foodEntries.length > 0) {
    const rows = foodEntries
      .map((raw) => {
        const o = raw as Record<string, unknown>;
        const id =
          typeof o.id === "string" && o.id.length > 0
            ? o.id
            : `fe_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        return {
          id,
          user_email: email,
          payload: o,
          updated_at: new Date().toISOString(),
        };
      })
      .filter((r) => r.id.length > 0);

    const { error: insFoodErr } = await supabase.from("food_entries").insert(rows);
    if (insFoodErr) {
      console.error("[sync POST] food_entries insert", insFoodErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }

  const allergies = Array.isArray(body.allergies) ? body.allergies : [];
  const { error: delAlErr } = await supabase
    .from("allergy_records")
    .delete()
    .eq("user_email", email);

  if (delAlErr) {
    console.error("[sync POST] allergy_records delete", delAlErr);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (allergies.length > 0) {
    const rows = allergies
      .map((raw) => {
        const o = raw as Record<string, unknown>;
        const foodId =
          typeof o.foodId === "string" && o.foodId.length > 0
            ? o.foodId
            : `al_${Math.random().toString(36).slice(2, 9)}`;
        const id = `${email.replace(/[^a-z0-9]+/gi, "_")}_${foodId}`.slice(
          0,
          200
        );
        return {
          id,
          user_email: email,
          payload: o,
          updated_at: new Date().toISOString(),
        };
      })
      .filter((r) => r.id.length > 0);

    const { error: insAlErr } = await supabase
      .from("allergy_records")
      .insert(rows);
    if (insAlErr) {
      console.error("[sync POST] allergy_records insert", insAlErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
