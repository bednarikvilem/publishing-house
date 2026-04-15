import type { ArticlesResponse, ArticleDetail } from "../types/article";

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

// Sample data matching GET /api/newspapers/:newspaper_id/articles/:article_id response shape
export const sampleArticleDetail: ArticleDetail = {
  id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  title: "Senate Passes Landmark Infrastructure Bill After Months of Debate",
  perex:
    "In a landmark moment for American governance, Senate leaders from both parties unveiled a sweeping $2.3 trillion infrastructure package that promises to reshape the nation's roads, bridges, broadband networks, and clean energy systems over the next decade.",
  content: `## A Historic Investment in Transportation

The transportation portion of the bill addresses what experts have long described as a crisis in American infrastructure. According to the American Society of Civil Engineers, the country's infrastructure received a C-minus grade in its most recent report card, with an estimated $2.59 trillion in needed repairs over the next decade.

The proposal allocates $645 billion for transportation infrastructure alone — the single largest federal investment in roads and bridges since the Interstate Highway System was built in the 1950s. An additional $120 billion is earmarked for Amtrak and public transit systems, which advocates say will reduce highway congestion and cut emissions.

> "This is not a Democratic plan or a Republican plan. This is an American plan, and it's long overdue. Our infrastructure has been crumbling for decades, and today we take the first step toward fixing it."
> — Senator Maria Collins (D-WA), Co-sponsor

## Broadband for All Americans

Perhaps the most transformative element of the package is its $400 billion investment in broadband infrastructure. The plan aims to bring high-speed internet access to every American household by 2030, with particular emphasis on rural and underserved communities that have long been left behind in the digital revolution.

Studies show that roughly 21 million Americans still lack access to reliable broadband — a gap that became acutely visible during the COVID-19 pandemic when remote work and schooling exposed stark inequalities in connectivity. The bill would fund new fiber-optic lines, subsidize internet service providers operating in low-income areas, and establish a digital literacy training program for seniors.

## Clean Energy and the Path Forward

The clean energy component commits $300 billion to accelerate the transition away from fossil fuels. This includes tax incentives for electric vehicle manufacturers, grants for solar and wind installation on federal lands, and funding for next-generation nuclear research. Environmental groups have cautiously welcomed the investment while calling for more ambitious timelines.

The bill now heads to the House, where it is expected to face a more contentious debate. Speaker advocates must navigate competing demands from progressive members seeking a larger climate investment and moderates concerned about the price tag.`,
  publication_date: "2026-04-09T10:00:00Z",
  category: "Politics",
  keywords: ["politics", "infrastructure", "senate", "broadband", "clean energy"],
  likes_count: 284,
  liked_by_me: false,
  author: {
    id: "u2",
    full_name: "James Rivera",
    profile_picture: "https://picsum.photos/seed/james/40/40",
  },
  images: [
    {
      url: "https://picsum.photos/seed/senate/1440/480",
      caption: "Senate chamber during the infrastructure vote. Photo: Reuters",
      is_primary: true,
    },
    {
      url: "https://picsum.photos/seed/broadband/800/360",
      caption: "Senators gathered on the floor to discuss the infrastructure proposal. Photo: Reuters",
      is_primary: false,
    },
  ],
  comments: [
    {
      id: "c1",
      content: "This is a huge deal for rural communities. Finally some real investment.",
      created_at: "2026-04-09T11:30:00Z",
      author: { id: "u10", username: "ruralvoice" },
    },
    {
      id: "c2",
      content: "Let's see if it actually passes the House. We've been here before.",
      created_at: "2026-04-09T12:45:00Z",
      author: { id: "u11", username: "skeptic99" },
    },
    {
      id: "c3",
      content: "The broadband provisions alone make this worth it. 21 million without internet in 2026 is embarrassing.",
      created_at: "2026-04-09T14:00:00Z",
      author: { id: "u12", username: "techpolicy" },
    },
  ],
};
