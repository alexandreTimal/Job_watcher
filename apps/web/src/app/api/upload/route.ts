import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { extractText } from "unpdf";

import { auth } from "@jobfindeer/auth";
import { extractProfileFromCV } from "~/lib/extract-cv";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/data/uploads";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("cv") as File | null;
  const modelId = (formData.get("model") as string) || "gemini-2.5-flash";

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF requis" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5MB)" }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}.pdf`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // Extract real text from PDF
  const { text: pages } = await extractText(new Uint8Array(buffer));
  const textContent = Array.isArray(pages) ? pages.join("\n") : String(pages);

  try {
    const { profile, metrics } = await extractProfileFromCV(textContent, modelId);
    return NextResponse.json({ filepath: filename, extraction: profile, metrics });
  } catch (err) {
    console.error("[UPLOAD] Extraction failed:", err);
    return NextResponse.json(
      { filepath: filename, extraction: null, metrics: null, error: "Extraction failed" },
      { status: 200 },
    );
  }
}
