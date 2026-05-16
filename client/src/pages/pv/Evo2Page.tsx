import React from "react";
import PvApiConsole, { PvApiPageShell } from "./PvApiConsole";

export default function Evo2Page() {
  return (
    <PvApiPageShell>
      <PvApiConsole
        service="evo2_40b"
        title="Arc Evo2-40b DNA generation"
        nimPath="/biology/arc/evo2-40b/generate"
        description="DNA `sequence` 후속 토큰 생성 API. 서버는 ACGT 외 문자를 사전 검증합니다. `num_tokens`, `temperature` 등은 OpenAPI 기본값과 맞추세요."
        docsUrl="https://docs.api.nvidia.com/nim/reference/healthcare-apis"
        chatgptPrompts={[
          "Evo2 generate 요청에서 `prompt` 대신 `sequence`만 쓰는 현재 정책이 NIM 문서와 어떻게 맞는지 설명하고, UI에 넣을 한 문장 도움말을 써줘.",
          "생성 결과에 `generated_sequence`만 있고 sections가 비었을 때 Evo2AnnotationPanel에 보여줄 fallback 카피를 개선해줘.",
          "비정상 DNA 입력·422 detail 메시지를 일반 사용자에게 보여줄 짧은 한국어 설명 템플릿을 제안해줘.",
          "샘플링 파라미터(top_k, top_p)에 대한 툴팁 문구(한국어, 2문장 이하)를 작성해줘.",
        ]}
      />
    </PvApiPageShell>
  );
}
