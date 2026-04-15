import type { ArticlesResponse } from "../types/article";

export const sampleArticles: ArticlesResponse = {
  data: [
    {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Global Climate Summit Reaches Historic Agreement on Carbon Emissions",
      perex:
        "World leaders have unanimously agreed on a groundbreaking framework to reduce global carbon emissions by 60% before 2035, marking the most ambitious climate commitment in history.",
      publication_date: "2026-04-10T08:00:00Z",
      category: "World",
      keywords: ["climate", "environment", "politics"],
      primary_image: {
        url: "https://picsum.photos/seed/climate/800/500",
        caption: "World leaders at the climate summit",
      },
      author: {
        id: "u1",
        full_name: "Sarah Mitchell",
        profile_picture: "https://picsum.photos/seed/sarah/40/40",
      },
    },
    {
      id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      title: "Senate Passes Landmark Infrastructure Bill After Months of Debate",
      perex:
        "The bipartisan bill allocates $2 trillion for roads, bridges, and broadband expansion across rural communities.",
      publication_date: "2026-04-09T10:00:00Z",
      category: "Politics",
      keywords: ["politics", "infrastructure", "senate"],
      primary_image: {
        url: "https://picsum.photos/seed/senate/800/500",
        caption: "Senate vote session",
      },
      author: {
        id: "u2",
        full_name: "James Rivera",
        profile_picture: "https://picsum.photos/seed/james/40/40",
      },
    },
    {
      id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
      title: "AI Breakthrough: New Model Achieves Human-Level Reasoning in Scientific Research",
      perex:
        "Researchers unveil an artificial intelligence system capable of independently designing and conducting complex experiments.",
      publication_date: "2026-04-08T09:00:00Z",
      category: "Technology",
      keywords: ["AI", "technology", "research"],
      primary_image: {
        url: "https://picsum.photos/seed/ailab/800/500",
        caption: "AI research laboratory",
      },
      author: {
        id: "u3",
        full_name: "Elena Park",
        profile_picture: "https://picsum.photos/seed/elena/40/40",
      },
    },
    {
      id: "d4e5f6a7-b8c9-0123-defa-234567890123",
      title: "Champions League Final Set: Madrid to Host Historic All-English Showdown",
      perex:
        "Two English clubs will face off in Madrid for the first time since 2019 in what promises to be a thrilling finale.",
      publication_date: "2026-04-07T14:00:00Z",
      category: "Sports",
      keywords: ["football", "Champions League", "UEFA"],
      primary_image: {
        url: "https://picsum.photos/seed/football/800/500",
        caption: "Champions League trophy",
      },
      author: {
        id: "u4",
        full_name: "Marcus Webb",
        profile_picture: "https://picsum.photos/seed/marcus/40/40",
      },
    },
    {
      id: "e5f6a7b8-c9d0-1234-efab-345678901234",
      title: "Metropolitan Museum Unveils Largest Collection of Recovered Ancient Artifacts",
      perex:
        "The museum opens a new wing housing over 2,000 pieces of ancient art repatriated from private collections worldwide.",
      publication_date: "2026-04-06T11:00:00Z",
      category: "Culture",
      keywords: ["culture", "museum", "art"],
      primary_image: {
        url: "https://picsum.photos/seed/museum/800/500",
        caption: "Ancient artifact exhibition",
      },
      author: {
        id: "u5",
        full_name: "Priya Sharma",
        profile_picture: "https://picsum.photos/seed/priya/40/40",
      },
    },
  ],
  pagination: { page: 1, limit: 20, total: 5, total_pages: 1 },
};
