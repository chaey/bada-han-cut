import { NextResponse } from "next/server";

export const runtime = "edge";

const PROMPT = `당신은 대한민국 연안 해양생물 사진 판독 보조자입니다. 사진 속 생물의 가장 가능성 높은 한국어 이름을 제시하세요. 확실하지 않으면 절대 단정하지 말고 needs_manual_review를 true로 설정하세요. 아래 JSON 객체만 반환하세요. confidence는 0에서 100의 정수입니다. {"species_name":"string","scientific_name":"string 또는 null","confidence":0,"reason":"사진에서 보이는 특징을 한 문장으로","needs_manual_review":true}`;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Gemini API 키가 아직 연결되지 않았어요." }, { status: 503 });
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || !image.type.startsWith("image/")) return NextResponse.json({ error: "사진 파일을 올려주세요." }, { status: 400 });
  if (image.size > 5 * 1024 * 1024) return NextResponse.json({ error: "사진은 5MB 이하로 올려주세요." }, { status: 400 });

  const bytes = new Uint8Array(await image.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const data = btoa(binary);
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: image.type, data } }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    const detail = errorBody?.error?.message?.replace(/https?:\/\/\S+/g, "").trim();
    const error = response.status === 429
      ? "무료 분석 한도가 소진되었어요. 잠시 후 다시 시도해 주세요."
      : response.status === 401
        ? "Gemini API 키가 올바르지 않거나 삭제되었어요. Vercel의 키 값을 다시 확인해 주세요."
        : response.status === 403
          ? "Gemini API 사용 권한이 아직 활성화되지 않았어요. AI Studio에서 만든 키와 프로젝트를 확인해 주세요."
          : response.status === 400 && detail?.includes("free tier is not available")
            ? "현재 위치에서는 Gemini 무료 할당량을 사용할 수 없어요."
            : `AI 분석 요청이 거절되었어요${detail ? `: ${detail}` : ""}`;
    return NextResponse.json({ error }, { status: response.status });
  }
  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return NextResponse.json({ error: "판독 결과를 읽지 못했어요." }, { status: 502 });
  try { return NextResponse.json(JSON.parse(text)); } catch { return NextResponse.json({ error: "판독 결과 형식이 올바르지 않아요." }, { status: 502 }); }
}
