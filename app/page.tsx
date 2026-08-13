"use client";

import { ChangeEvent, RefObject, useRef, useState } from "react";

type Analysis = {
  species_name: string;
  scientific_name: string | null;
  confidence: number;
  reason: string;
  needs_manual_review: boolean;
};

export default function Home() {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  function openFilePicker(ref: RefObject<HTMLInputElement | null>) {
    if (!ref.current) return;
    // Resetting the native input lets a user select the same photo again.
    ref.current.value = "";
    ref.current.click();
    setPickerOpen(false);
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setState("error");
      setMessage("사진 파일만 올릴 수 있어요.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setState("error");
      setMessage("JPG, PNG 또는 WEBP 사진을 올려주세요. iPhone HEIC 사진은 JPG로 변환한 뒤 올려주세요.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setState("error");
      setMessage("사진은 5MB 이하로 올려주세요.");
      return;
    }
    setFile(selected);
    setImage(URL.createObjectURL(selected));
    setResult(null);
    setMessage("");
    setState("idle");
  }

  async function analyse() {
    if (!file) return;
    setState("loading");
    setMessage("");
    const data = new FormData();
    data.append("image", file);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "분석에 실패했어요.");
      setResult(payload);
      setState("idle");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "분석에 실패했어요.");
    }
  }

  return (
    <main>
      <section className="hero">
        <span className="eyebrow">MARINE LIFE SNAP</span>
        <h1>사진 한 장으로<br />바다 생물을 알아보세요.</h1>
        <p>Gemini AI가 사진 속 특징을 읽어 가장 가능성 높은 생물을 안내합니다.</p>
        <span className="free-badge">무료 할당량 안에서만 분석</span>
      </section>

      <section className="analyzer" aria-label="해양생물 사진 판독">
        {!image ? (
          <button className="dropzone" type="button" onClick={() => setPickerOpen(true)}>
            <span className="camera">⌾</span>
            <strong>사진 촬영 또는 업로드</strong>
            <small>생물의 특징이 잘 보이도록 가까이 찍어주세요</small>
          </button>
        ) : (
          <div className="preview-wrap">
            <img src={image} alt="판독할 해양생물 사진 미리보기" className="preview" />
            <button className="replace" type="button" onClick={() => setPickerOpen(true)}>사진 바꾸기</button>
          </div>
        )}
        <input ref={cameraRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={selectImage} />
        <input ref={uploadRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} />

        {pickerOpen && (
          <div className="photo-dialog-backdrop" role="presentation" onClick={() => setPickerOpen(false)}>
            <section className="photo-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-dialog-title" onClick={(event) => event.stopPropagation()}>
              <h2 id="photo-dialog-title">사진 추가하기</h2>
              <p>사진을 촬영하거나 앨범에서 선택해 주세요.</p>
              <button type="button" onClick={() => openFilePicker(cameraRef)}>카메라로 촬영</button>
              <button type="button" onClick={() => openFilePicker(uploadRef)}>앨범에서 업로드</button>
              <button type="button" className="dialog-cancel" onClick={() => setPickerOpen(false)}>취소</button>
            </section>
          </div>
        )}

        {image && !result && (
          <button className="analyse-button" type="button" onClick={analyse} disabled={state === "loading"}>
            {state === "loading" ? "AI가 사진을 살펴보는 중…" : "AI로 사진 판독하기"}
          </button>
        )}

        {result && (
          <article className="result" aria-live="polite">
            <div className="result-head"><span>✦</span><div><p>AI 판독 결과</p><h2>{result.species_name}</h2></div><b>{result.confidence}%</b></div>
            {result.scientific_name && <em>{result.scientific_name}</em>}
            <p className="reason">{result.reason}</p>
            {result.needs_manual_review && <p className="warning">사진만으로 확정하기 어려워요. 전문가 확인이 필요합니다.</p>}
            <button className="analyse-button secondary" type="button" onClick={analyse}>다시 분석</button>
          </article>
        )}
        {state === "error" && <p className="error" role="alert">{message}</p>}
      </section>

      <section className="notice">
        <h2>안내</h2>
        <p>AI 결과는 관찰 보조 정보이며, 정확한 종 식별은 전문가 확인이 필요할 수 있습니다. 사진은 분석 요청에만 사용됩니다.</p>
      </section>
    </main>
  );
}
