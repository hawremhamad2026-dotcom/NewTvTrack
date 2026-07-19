import re

with open('src/components/DetailModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("fetchKurdcinemaSearch(item.title || '', item.type)", "fetchKurdcinemaSearch(item.title || '', item.type === 'show' ? 'series' : 'movie')")
content = content.replace("fetchKurdcinemaComments(bestMatch.url || bestMatch.id, item.type)", "fetchKurdcinemaComments(bestMatch.url || bestMatch.id, item.type === 'show' ? 'series' : 'movie')")
content = content.replace("fetchKurdcinemaSearch(kurdcinemaSearchQuery, item.type)", "fetchKurdcinemaSearch(kurdcinemaSearchQuery, item.type === 'show' ? 'series' : 'movie')")
content = content.replace("fetchKurdcinemaComments(res.url || res.id, item.type)", "fetchKurdcinemaComments(res.url || res.id, item.type === 'show' ? 'series' : 'movie')")


with open('src/components/DetailModal.tsx', 'w') as f:
    f.write(content)
