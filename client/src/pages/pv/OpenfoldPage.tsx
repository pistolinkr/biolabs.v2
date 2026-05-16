import React from "react";
import PvApiConsole, { PvApiPageShell } from "./PvApiConsole";

export default function OpenfoldPage() {
  return (
    <PvApiPageShell>
      <PvApiConsole
        service="alphafold3"
        title="OpenFold3 structure prediction"
        nimPath="/biology/openfold/openfold3/predict"
        description="공식 `inputs` 배열을 그대로 보내거나, 데모로 최상위 `sequence`만 보내면 서버가 CSV MSA 블록을 붙여 최소 요청을 만듭니다. 완료 후 mmCIF는 워크벤치 뷰어로 로드됩니다."
        docsUrl="https://docs.api.nvidia.com/nim/reference/healthcare-apis"
        chatgptPrompts={[
          "OpenFold3 OF3Request에서 단백질 MSA `AlignmentFileRecord` 규칙(포맷 소문자, CSV 첫 행=서열)을 이 페이지 설명 문단에 녹일 한국어 문장으로 다시 써줘.",
          "`outputs[].structures_with_scores[].structure`에서 mmcifText를 못 찾을 때 사용자 액션(로그 확인, job id)을 포함한 안내를 제안해줘.",
          "power user를 위해 `inputs` 예시 하나(단일 protein + RNA 없음)를 JSON으로 만들어줘. Biolabs 서버 스트립 키(note, mode)는 제외해줘.",
          "Af3ResultLoader 흐름(mmcifText → base64 → URL)을 한 단락으로 설명하고, 디버그용으로 health 엔드포인트를 언급할 문장을 추가해줘.",
        ]}
      />
    </PvApiPageShell>
  );
}
