import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface DailyRecapData {
  to: string;
  userName: string | null;
  offerCount: number;
  topOffers: Array<{
    title: string;
    company: string | null;
    score: number;
  }>;
  feedUrl: string;
}

export async function sendDailyRecap(data: DailyRecapData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not set, skipping email");
    return false;
  }

  const greeting = data.userName ? `Bonjour ${data.userName}` : "Bonjour";
  const topList = data.topOffers
    .map((o) => `• ${o.title}${o.company ? ` — ${o.company}` : ""} (${o.score}%)`)
    .join("\n");

  try {
    await resend.emails.send({
      from: "JobFindeer <noreply@jobfindeer.fr>",
      to: data.to,
      subject: `${data.offerCount} nouvelles offres dans ton feed`,
      text: `${greeting},

${data.offerCount} nouvelles offres correspondent à ton profil aujourd'hui.

Top offres :
${topList}

Consulte ton feed : ${data.feedUrl}

— JobFindeer`,
    });
    return true;
  } catch (err) {
    console.error("[EMAIL] Send failed:", err);
    return false;
  }
}
