import re

with open('src/components/DetailModal.tsx', 'r') as f:
    content = f.read()

# Remove the episode tab button we injected
to_remove = """                      <button
                        onClick={() => setActiveEpisodeReviewTab('kurdcinema')}
                        className={`px-3 py-1.5 rounded transition-all cursor-pointer select-none ${
                          activeEpisodeReviewTab === 'kurdcinema'
                            ? 'bg-amber-500 text-zinc-950 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                        }`}
                      >
                        KURDCINEMA
                      </button>
"""

content = content.replace(to_remove, "")

# Ensure activeEpisodeReviewTab state doesn't have kurdcinema anymore
content = content.replace("useState<'trakt' | 'imdb' | 'kurdcinema'>('trakt')", "useState<'trakt' | 'imdb'>('trakt')")

with open('src/components/DetailModal.tsx', 'w') as f:
    f.write(content)
