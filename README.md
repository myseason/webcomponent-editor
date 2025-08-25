# webcomponent-editor


## github에서 소스 바로 보기

### https://raw.githubusercontent.com/myseason/webcomponent-editor/refs/heads/master/src/figmaV3/{package경로 + 파일이름}
### 예) core/types.ts 의 경우
### https://raw.githubusercontent.com/myseason/webcomponent-editor/refs/heads/master/src/figmaV3/core/types.ts  



find [검색 경로] -name "[파일 형식]" | sed 's/^/[추가할 문장]/'


find [검색 경로] -name "[파일 형식]" | awk '{print [추가할 문장] $0}'
find . -name "[파일 형식]" | awk '{sub(/^\.\//, "/"); print "[추가할 문장]"$0}'

find ./ -name "*.ts*" | awk '{sub(/^\.\//, "/"); print "https://raw.githubusercontent.com/myseason/webcomponent-editor/refs/heads/master/src/figmaV3"$0}' > source_list.txt