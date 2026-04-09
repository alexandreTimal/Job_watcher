import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { extractProfileFromCV } from "~/lib/extract-cv";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/data/uploads";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("cv") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF requis" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5MB)" }, { status: 400 });
  }

  // Save file
  const filename = `${crypto.randomUUID()}.pdf`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // Extract text (basic — for PDF text extraction, a library like pdf-parse would be needed)
  const textContent = buffer.toString("utf-8").replace(/[^\x20-\x7E\xC0-\xFF\n]/g, " ");

  try {
    const extraction = await extractProfileFromCV(textContent);
    return NextResponse.json({ filepath: filename, extraction });
  } catch {
    return NextResponse.json(
      { filepath: filename, extraction: null, error: "Extraction failed" },
      { status: 200 },
    );
  }
}
