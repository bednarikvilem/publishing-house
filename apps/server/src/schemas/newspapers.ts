import { t } from "elysia";
import { Uuid } from "./shared";

export const VALID_COLORS = ["blue", "rose", "emerald", "violet", "orange", "teal"] as const;
export type NewspaperColor = typeof VALID_COLORS[number];

export const newspaperIdParam = t.Object({ newspaper_id: Uuid });

export const newspaperListResponse = t.Object({
	data: t.Array(
		t.Object({
			id: Uuid,
			name: t.String(),
			slug: t.String(),
		})
	),
});

export const updateNewspaperColorBody = t.Object({
	primary_color: t.Nullable(t.String({ enum: [...VALID_COLORS] })),
});
