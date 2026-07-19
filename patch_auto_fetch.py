import re

with open('src/components/DetailModal.tsx', 'r') as f:
    content = f.read()

auto_fetch_code = """
  // Auto-fetch Kurdcinema comments when tab is opened
  useEffect(() => {
    if (activeReviewTab === 'kurdcinema' && !kurdcinemaComments && !isSearchingKurdcinema && !isFetchingKurdcinemaComments && !kurdcinemaSelectedUrl && kurdcinemaSearchResults.length === 0) {
      setIsSearchingKurdcinema(true);
      fetchKurdcinemaSearch(item.title || '', item.type).then(res => {
        if (res && res.length > 0) {
          const bestMatch = res[0];
          setKurdcinemaSelectedUrl(bestMatch.url || bestMatch.id);
          setIsSearchingKurdcinema(false);
          setIsFetchingKurdcinemaComments(true);
          fetchKurdcinemaComments(bestMatch.url || bestMatch.id, item.type).then(data => {
            setKurdcinemaComments(data);
            setIsFetchingKurdcinemaComments(false);
          });
        } else {
          setKurdcinemaSearchResults([]);
          setIsSearchingKurdcinema(false);
        }
      });
    }
  }, [activeReviewTab, item.title, item.type]);
"""

# Insert after isFetchingKurdcinemaComments definition
content = content.replace("const [isFetchingKurdcinemaComments, setIsFetchingKurdcinemaComments] = useState(false);", "const [isFetchingKurdcinemaComments, setIsFetchingKurdcinemaComments] = useState(false);\n" + auto_fetch_code)

with open('src/components/DetailModal.tsx', 'w') as f:
    f.write(content)
