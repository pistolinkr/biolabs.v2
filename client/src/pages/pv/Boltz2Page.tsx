import React from "react";
import PvApiConsole, { PvApiPageShell } from "./PvApiConsole";

export default function Boltz2Page() {
  return (
    <PvApiPageShell>
      <PvApiConsole
        service="boltz2"
        title="MIT Boltz-2 structure prediction"
        nimPath="/biology/mit/boltz2/predict"
        description="단백질 등 복합체 구조 예측. `polymers` 배열을 넣거나, 데모로 최상위 `sequence`만 보내면 서버 빌더가 단일 체인 `polymers`를 구성합니다."
        docsUrl="https://docs.api.nvidia.com/nim/reference/healthcare-apis"
        chatgptPrompts={[
          "Biolabs Boltz2 PV 콘솔의 JSON 예시가 NVIDIA BoltzPredictionRequest OpenAPI와 필드별로 일치하는지 검토하고, 누락된 필수 필드를 알려줘.",
          "`structures[].structure` mmCIF가 비어 있거나 짧을 때 사용자에게 보여줄 한국어/영문 에러·빈 상태 문구를 제안해줘.",
          "폴리머+리간드 복합체 데모용으로 확장하려면 입력 JSON에 어떤 블록을 추가해야 하는지 단계별로 정리해줘.",
          "이 페이지의 정보 밀도와 대비(다크 워크스테이션 톤)를 유지하면서 접근성(포커스 링, 라벨)을 개선할 체크리스트를 만들어줘.",
        ]}
      />
    </PvApiPageShell>
  );
}
