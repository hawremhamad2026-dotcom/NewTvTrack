import re

with open('src/components/DetailModal.tsx', 'r') as f:
    content = f.read()

better_match_code = """
        if (res && res.length > 0) {
          let bestMatch = res[0];
          const queryTitle = (item.title || '').toLowerCase().trim();
          for (const r of res) {
            let rTitle = (r.title || '').toLowerCase();
            rTitle = rTitle.replace(/\(\d{4}\)/g, '').replace(/[\u200E\u200F\u202A-\u202E]/g, '').trim();
            if (rTitle === queryTitle) {
              bestMatch = r;
              break;
            }
          }
          setKurdcinemaSelectedUrl(bestMatch.url || bestMatch.id);
"""

content = content.replace("""        if (res && res.length > 0) {
          const bestMatch = res[0];
          setKurdcinemaSelectedUrl(bestMatch.url || bestMatch.id);""", better_match_code)

with open('src/components/DetailModal.tsx', 'w') as f:
    f.write(content)
