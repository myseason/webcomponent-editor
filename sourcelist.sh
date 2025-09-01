#!/bin/bash

# 인자 확인
if [ "$#" -ne 1 ]; then
    echo "사용법: $0 <브랜치_이름>"
    echo "예: $0 main"
    exit 1
fi

REPO_OWNER="myseason"
REPO_NAME="webcomponent-editor"
BRANCH="$1"
FILE_EXTS=".ts .tsx"  # 공백으로 구분된 확장자 목록, 예: ".py .md .js"
OUTPUT_FILE="$(echo "${1}" | tr '/' '_')_list.txt"

# GitHub API URL (특정 브랜치의 파일 목록 가져오기)
API_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/git/trees/$BRANCH?recursive=1"

# GitHub 토큰 (선택 사항, 환경 변수로 설정)
# 90일 유효 : 2025.09.01 생성"
GITHUB_TOKEN=""

# 출력 파일 초기화
> "$OUTPUT_FILE"

# curl로 GitHub API 호출 및 파일 목록 가져오기
if [ -n "$GITHUB_TOKEN" ]; then
    TREE_JSON=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$API_URL")
else
    TREE_JSON=$(curl -s "$API_URL")
fi

# API 호출 결과 확인
if echo "$TREE_JSON" | grep -q "message"; then
    echo "에러: $(echo "$TREE_JSON" | jq -r '.message')"
    exit 1
fi

# 확장자를 배열로 변환
IFS=' ' read -r -a EXT_ARRAY <<< "$FILE_EXTS"

# jq 필터 생성: 각 확장자에 대해 endswith 조건 생성
JQ_FILTER=".tree[] | select(.type == \"blob\" and ("
for i in "${!EXT_ARRAY[@]}"; do
    if [ $i -gt 0 ]; then
        JQ_FILTER="$JQ_FILTER or"
    fi
    JQ_FILTER="$JQ_FILTER (.path | endswith(\"${EXT_ARRAY[$i]}\"))"
done
JQ_FILTER="$JQ_FILTER )) | .path"

# 특정 파일 확장자에 해당하는 raw URL 생성
echo "$TREE_JSON" | jq -r "$JQ_FILTER" | while read -r path; do
    if [[ "${path}" == *"src"* ]]; then
      RAW_URL="https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/$BRANCH/$path"
      echo "$RAW_URL" >> "$OUTPUT_FILE"
    fi
done

# 결과 확인
if [ -s "$OUTPUT_FILE" ]; then
    echo "Raw URL 목록이 $OUTPUT_FILE에 저장되었습니다."
else
    echo "지정한 확장자($FILE_EXTS)에 해당하는 파일을 찾지 못했습니다."
    exit 1
fi