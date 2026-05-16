import React from "react";
import PvApiConsole, { PvApiPageShell } from "./PvApiConsole";

export default function MsaSearchPage() {
  return (
    <PvApiPageShell>
      <PvApiConsole
        service="msa_search"
        title="ColabFold MSA search (NIM)"
        nimPath="/biology/colabfold/msa-search/predict"
        description="단백질 서열에 대한 MSA 검색·정렬. `sequence`(필수), `databases`, `search_type`, `output_alignment_formats` 등을 JSON으로 전달합니다."
        docsUrl="https://docs.api.nvidia.com/nim/reference/healthcare-apis"
        chatgptPrompts={[
          "이 콘솔의 데모 JSON이 ColabFold MSA Search OpenAPI 스키마와 맞는지 필드 단위로 점검해줘. 틀린 키가 있으면 수정 예시를 줘.",
          "vendor 응답에 `alignments` 트리는 있는데 정렬 텍스트가 비는 경우 사용자에게 보여줄 한국어 메시지를 다듬어줘.",
          "문서에 나온 `search_type` 옵션을 요약한 한 줄 설명과 툴팁용 영문을 각각 작성해줘.",
          "과학자용 UI로서 이 페이지 상단 히어로 블록에 추가하면 좋은 스펙 링크·경고(예: 서열 길이 한도) 문구를 제안해줘.",
        ]}
      />
    </PvApiPageShell>
  );
}
