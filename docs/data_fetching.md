# Data fetching (frontend)

All data fetching in `apps/web` goes through **TanStack Query** on top of the
typed **Eden** client. Do **not** call `fetch()` directly inside components.

- **Reads** → `useQuery`
- **Writes** → `useMutation` + invalidate the affected query
- **Transport** → the Eden `client` from `src/lib/api.ts` (no URL strings, types
  come from the server `App` type)

The `QueryClient` is configured in `src/lib/queryClient.ts` and provided at the
app root in `src/frontend.tsx`.

## Reads — `useQuery`

The Eden client returns `{ data, error }`; throw on `error` so the query exposes
it via `isError`. Use `enabled` to wait for required params, and put every value
the request depends on into the `queryKey` (this is what caches, dedupes, and
refetches correctly).

```tsx
// src/components/Navbar.tsx
const { data: categories = [] } = useQuery({
  queryKey: ["categories", newspaper?.id],
  enabled: !!newspaper,
  queryFn: async () => {
    const { data, error } = await client.api
      .newspapers({ newspaper_id: newspaper!.id })
      .categories.get();
    if (error) throw error;
    return data.data;
  },
});
```

Replaces the old pattern (don't do this anymore):

```tsx
const [categories, setCategories] = useState<Category[]>([]);
useEffect(() => {
  if (!newspaper) return;
  fetch(`${API_BASE_URL}/api/newspapers/${newspaper.id}/categories`)
    .then((res) => res.json())
    .then((data) => setCategories(data.data))
    .catch(() => {}); // errors silently swallowed
}, [newspaper]);
```

## Writes — `useMutation`

Invalidate the queries the write affects in `onSuccess` so the UI refetches.

```tsx
// src/pages/dashboard/EditorialQueueSection.tsx
const queryClient = useQueryClient();

const assignEditor = useMutation({
  mutationFn: async ({ articleId, editorId }: { articleId: string; editorId: string }) => {
    const { error } = await client.api
      .newspapers({ newspaper_id: newspaperId })
      .articles({ article_id: articleId })["assign-editor"]
      .post({ editor_id: editorId });
    if (error) throw error;
  },
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ["editorial-queue", newspaperId] }),
  onError: () => alert("Failed to assign editor. Please try again."),
});

// in JSX: assignEditor.mutate({ articleId, editorId });
// loading state: assignEditor.isPending
```

For a per-row pending state across one mutation, derive it from the in-flight
variables: `mutation.isPending && mutation.variables?.articleId === row.id`.

## Conventions

- **`queryKey`**: array starting with a stable name, then every dependency, most
  general first — e.g. `["editorial-queue", newspaperId, currentPage]`,
  `["category", newspaperId, categorySlug]`. Mutations invalidate by a prefix
  (`["editorial-queue", newspaperId]`) to refresh all pages of that list.
- **Eden path → call**: `/api/newspapers/:newspaper_id/categories` becomes
  `client.api.newspapers({ newspaper_id }).categories.get()`; hyphenated
  segments use bracket access (`["assign-editor"]`); query/body go as
  `.get({ query })` / `.post(body, { query })`.
- **Errors**: always `if (error) throw error;` in the `queryFn`/`mutationFn`.
  Never swallow with `.catch(() => {})`.
- **Shared lookups** (newspaper, category from the URL) live in `src/hooks/` and
  already wrap `useQuery` — reuse `useNewspaper` / `useCategory`.

## Reference implementations

- Simple read: `src/components/Navbar.tsx`
- Shared hooks: `src/hooks/useNewspaper.ts`, `src/hooks/useCategory.ts`
- Read + writes: `src/pages/dashboard/EditorialQueueSection.tsx`
