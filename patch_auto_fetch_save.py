import re

with open('src/components/DetailModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("setKurdcinemaSelectedUrl(bestMatch.url || bestMatch.id);", "setKurdcinemaSearchResults(res);\n          setKurdcinemaSelectedUrl(bestMatch.url || bestMatch.id);")

with open('src/components/DetailModal.tsx', 'w') as f:
    f.write(content)
