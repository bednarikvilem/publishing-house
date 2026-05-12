import { useEffect, useRef } from "react";
import { API_BASE_URL, authHeaders } from "../lib/api";

interface UseArticleViewTrackerOptions {
    newspaperId: string | undefined;
    articleId:   string | undefined;
    enabled:     boolean; // only track published articles
}

export function useArticleViewTracker({
    newspaperId,
    articleId,
    enabled,
}: UseArticleViewTrackerOptions) {
    const viewRecorded = useRef(false);
    const readRecorded = useRef(false);
    const sentinelRef  = useRef<HTMLDivElement | null>(null);

    const postView = async (readCompleted: boolean) => {
        await fetch(
            `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/views`,
            {
                method:  "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body:    JSON.stringify({ read_completed: readCompleted }),
            }
        );
    };

    // ── 1. Record initial view after 2 s on page ────────────────────────
    useEffect(() => {
        if (!enabled || !newspaperId || !articleId) return;
        viewRecorded.current = false;
        readRecorded.current = false;
 
        const timer = setTimeout(async () => {
            if (viewRecorded.current) return;
            viewRecorded.current = true;
            try {
                await postView(false);
            } catch {
                // non-critical — silently ignore
            }
        }, 2000);
 
        return () => clearTimeout(timer);
    }, [enabled, newspaperId, articleId]);

    // ── 2. Record read-completion when sentinel is visible ───────────────
    useEffect(() => {
        if (!enabled || !newspaperId || !articleId) return;
 
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
 
        const observer = new IntersectionObserver(
            async ([entry]) => {
                if (!entry?.isIntersecting || readRecorded.current) return;
                readRecorded.current = true;
                observer.disconnect();
                try {
                    await postView(true);
                } catch {
                    // non-critical — silently ignore
                }
            },
            { threshold: 1.0 }
        );
 
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [enabled, newspaperId, articleId]);

    return { sentinelRef };
}