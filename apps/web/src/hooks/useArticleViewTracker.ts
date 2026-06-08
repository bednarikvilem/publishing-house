import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "../lib/api";

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

    const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        setSentinelEl(node);
    }, []);

    const postView = async (readCompleted: boolean): Promise<void> => {
        if (!newspaperId || !articleId) return;
        const { error } = await client.api
            .newspapers({ newspaper_id: newspaperId })
            .articles({ article_id: articleId })
            .views.post({ read_completed: readCompleted });
        if (error) throw error;
    };

    // ── 1. Record initial view after 2 s on page ────────────────────────
    useEffect(() => {
        if (!enabled || !newspaperId || !articleId) return;
        viewRecorded.current = false;
        readRecorded.current = false;

        const timer = setTimeout(async () => {
            if (viewRecorded.current) return;
            try {
                await postView(false);
                viewRecorded.current = true;
            } catch (err) {
                console.error("[ViewTracker]", err);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [enabled, newspaperId, articleId]);

    // ── 2. Record read-completion when sentinel becomes visible ──────────
    useEffect(() => {
        if (!enabled || !newspaperId || !articleId || !sentinelEl) return;

        const observer = new IntersectionObserver(
            async ([entry]) => {
                if (!entry?.isIntersecting || readRecorded.current) return;

                if (!viewRecorded.current) {
                    await new Promise<void>(resolve => {
                        const interval = setInterval(() => {
                            if (viewRecorded.current) { clearInterval(interval); resolve(); }
                        }, 100);
                    });
                }

                try {
                    await postView(true);
                    readRecorded.current = true;
                    observer.disconnect();
                } catch (err) {
                    console.error("[ViewTracker] read-completion failed:", err);
                }
            },
            { 
                root: null,
                threshold: 0.1,
            }
        );

        observer.observe(sentinelEl);
        return () => observer.disconnect();
    }, [enabled, newspaperId, articleId, sentinelEl]);

    return { sentinelRef };
}