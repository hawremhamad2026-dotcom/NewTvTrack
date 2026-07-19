import re

with open('src/components/DetailModal.tsx', 'r') as f:
    content = f.read()

kurdcinema_ui = """            ) : activeReviewTab === 'kurdcinema' ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 animate-pulse">
                      <MessageSquare className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-zinc-100 text-sm sm:text-base uppercase tracking-wider">
                        Kurdcinema Reviews
                      </h3>
                      <p className="text-[10px] text-zinc-500">
                        Comments and discussions from Kurdcinema
                      </p>
                    </div>
                  </div>
                </div>

                {!kurdcinemaSelectedUrl ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={kurdcinemaSearchQuery}
                        onChange={(e) => setKurdcinemaSearchQuery(e.target.value)}
                        placeholder="Search movie/series..."
                        className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsSearchingKurdcinema(true);
                            fetchKurdcinemaSearch(kurdcinemaSearchQuery, item.type === 'show' ? 'series' : 'movie').then(res => {
                              setKurdcinemaSearchResults(res || []);
                              setIsSearchingKurdcinema(false);
                            });
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          setIsSearchingKurdcinema(true);
                          fetchKurdcinemaSearch(kurdcinemaSearchQuery, item.type === 'show' ? 'series' : 'movie').then(res => {
                            setKurdcinemaSearchResults(res || []);
                            setIsSearchingKurdcinema(false);
                          });
                        }}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        {isSearchingKurdcinema ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                      </button>
                    </div>
                    
                    {kurdcinemaSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                        {kurdcinemaSearchResults.map((res: any, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setKurdcinemaSelectedUrl(res.url || res.id);
                              setIsFetchingKurdcinemaComments(true);
                              fetchKurdcinemaComments(res.url || res.id, item.type === 'show' ? 'series' : 'movie').then(data => {
                                setKurdcinemaComments(data);
                                setIsFetchingKurdcinemaComments(false);
                              });
                            }}
                            className="w-full text-left bg-zinc-900/30 hover:bg-zinc-800/50 border border-white/5 hover:border-emerald-500/30 rounded-xl p-3 transition-all flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-zinc-200 text-sm">{res.title}</div>
                              <div className="text-xs text-zinc-500">{res.typeLabel || 'Unknown'}</div>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-emerald-500 rotate-180" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        setKurdcinemaSelectedUrl(null);
                        setKurdcinemaComments(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" /> Back to search
                    </button>

                    {isFetchingKurdcinemaComments ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3 bg-zinc-900/10 border border-white/5 rounded-2xl">
                        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-sm text-zinc-400 font-medium animate-pulse">Fetching comments...</span>
                      </div>
                    ) : kurdcinemaComments ? (
                      <div className="space-y-4">
                        <div className="bg-zinc-900/50 border border-emerald-500/20 rounded-xl p-4 mb-4 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-zinc-200">{kurdcinemaComments.title}</div>
                            <div className="text-xs text-zinc-400">Rating: {kurdcinemaComments.average_rating} • {kurdcinemaComments.total_reviews_label}</div>
                          </div>
                        </div>
                        {kurdcinemaComments.comments && kurdcinemaComments.comments.length > 0 ? (
                          kurdcinemaComments.comments.map((cmt: any, idx: number) => (
                            <div key={idx} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 space-y-4 text-sm relative">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                    {cmt.user_photo ? (
                                      <img src={cmt.user_photo} alt={cmt.user_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-emerald-500 font-bold text-sm">{(cmt.user_name || '?').charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-zinc-200">{cmt.user_name || 'Anonymous'}</span>
                                      {cmt.user_badge && (
                                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                                          {cmt.user_badge}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-2">
                                      {cmt.date}
                                      {cmt.rating && (
                                        <span className="text-yellow-500 flex items-center gap-0.5">
                                          <Star className="w-3 h-3 fill-current" /> {cmt.rating}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className={`text-zinc-300 leading-relaxed text-[13px] ${cmt.is_spoiler ? 'blur-sm hover:blur-none transition-all cursor-pointer' : ''}`}>
                                {cmt.text}
                              </p>
                              {cmt.replies && cmt.replies.length > 0 && (
                                <div className="mt-4 pl-4 border-l-2 border-white/5 space-y-3">
                                  {cmt.replies.map((reply: any, ridx: number) => (
                                    <div key={ridx} className="flex gap-3">
                                      <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                        {reply.user_photo ? (
                                          <img src={reply.user_photo} alt={reply.user_name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-emerald-500 text-[10px] font-bold">
                                            {(reply.user_name || '?').charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-baseline gap-2">
                                          <span className="font-bold text-zinc-300 text-xs">{reply.user_name}</span>
                                          <span className="text-[9px] text-zinc-500">{reply.date}</span>
                                        </div>
                                        <p className={`text-zinc-400 text-xs mt-1 ${reply.is_spoiler ? 'blur-sm hover:blur-none transition-all cursor-pointer' : ''}`}>
                                          {reply.text}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-zinc-500 text-sm">No comments found.</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}"""

old_snippet = """                  </div>
                )}
              </div>
            ) : null}"""

content = content.replace(kurdcinema_ui, old_snippet)

with open('src/components/DetailModal.tsx', 'w') as f:
    f.write(content)
