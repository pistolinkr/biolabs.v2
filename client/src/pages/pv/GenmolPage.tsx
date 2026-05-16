import React from "react";
import PvApiConsole, { PvApiPageShell } from "./PvApiConsole";

export default function GenmolPage() {
  return (
    <PvApiPageShell>
      <PvApiConsole
        service="genmol"
        title="NVIDIA GenMol molecule generation"
        nimPath="/biology/nvidia/genmol/generate"
        description="마스킹된 SAFE/SMILES 입력으로 분자 생성. 필드가 비어 있으면 서버가 보수적인 데모 SMILES를 채웁니다. 빈 문자열 `smiles`는 거절됩니다."
        docsUrl="https://docs.api.nvidia.com/nim/reference/healthcare-apis"
        chatgptPrompts={[
          "GenMol 요청 JSON에 `num_molecules`, `temperature` 외에 문서에 있는 옵션 필드를 추가해 예시를 풍부하게 만들 제안을 해줘.",
          "응답 `molecules[]`가 비었을 때 GenerativeWorkspacePanel과 동일한 톤의 빈 상태 문구를 한국어로 써줘.",
          "SMILES 검증 실패 시 사용자가 고칠 수 있도록 UI에 넣을 짧은 가이드(불릿 3개)를 작성해줘.",
          "화학 워크벤션 맥락에서 ‘Live’ 버튼 옆에 넣을 안전/비용 관련 주의 한 줄을 영문으로 제안해줘.",
        ]}
      />
    </PvApiPageShell>
  );
}
