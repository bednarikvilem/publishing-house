# DB Seed Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded generic seed data with five realistic themed newspapers, each with topic-specific categories, article titles, author biographies, keywords, and images.

**Architecture:** A single config file (`seeds/data/newspapers.ts`) becomes the source of truth for all newspaper/category/template data. A shared `seeds/helpers.ts` exports `generateFromTemplate` used by both article title and author bio generation. Three seed files are updated to consume the config; one dead file is deleted.

**Tech Stack:** TypeScript, Bun, Drizzle ORM, @faker-js/faker, Loremflickr (URL-only, no API key)

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/server/src/db/seeds/helpers.ts` |
| Create | `apps/server/src/db/seeds/helpers.test.ts` |
| Create | `apps/server/src/db/seeds/data/newspapers.ts` |
| Modify | `apps/server/src/db/seeds/seedNewspaper.ts` |
| Modify | `apps/server/src/db/seeds/seedArticleCategories.ts` |
| Modify | `apps/server/src/db/seeds/seedArticles.ts` |
| Modify | `apps/server/src/db/seeds/seedRandomAuthors.ts` |
| Delete | `apps/server/src/db/seeds/seedAddAuthors.ts` |

---

## Task 1: Create `seeds/helpers.ts` with `generateFromTemplate`

**Files:**
- Create: `apps/server/src/db/seeds/helpers.ts`
- Create: `apps/server/src/db/seeds/helpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/server/src/db/seeds/helpers.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { generateFromTemplate } from "./helpers";

describe("generateFromTemplate", () => {
    test("replaces a single slot with a value from the word bank", () => {
        const result = generateFromTemplate("{artist} releases new album", {
            artist: ["Taylor Swift"],
        });
        expect(result).toBe("Taylor Swift releases new album");
    });

    test("replaces multiple slots independently", () => {
        const result = generateFromTemplate("{artist} collaborates with {collab}", {
            artist: ["Kendrick Lamar"],
            collab: ["Drake"],
        });
        expect(result).toBe("Kendrick Lamar collaborates with Drake");
    });

    test("picks randomly from word bank entries", () => {
        const options = ["A", "B", "C", "D", "E", "F"];
        const results = new Set(
            Array.from({ length: 50 }, () =>
                generateFromTemplate("{x}", { x: options })
            )
        );
        expect(results.size).toBeGreaterThan(1);
    });

    test("leaves unknown slots as their key name", () => {
        const result = generateFromTemplate("Hello {unknown}", {});
        expect(result).toBe("Hello unknown");
    });

    test("replaces same slot used twice", () => {
        const result = generateFromTemplate("{team} beats {team}", {
            team: ["Arsenal"],
        });
        expect(result).toBe("Arsenal beats Arsenal");
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/server && bun test src/db/seeds/helpers.test.ts
```

Expected: error — `helpers.ts` does not exist yet.

- [ ] **Step 3: Implement `seeds/helpers.ts`**

Create `apps/server/src/db/seeds/helpers.ts`:

```ts
import { faker } from "@faker-js/faker";

export function generateFromTemplate(
    template: string,
    wordBank: Record<string, string[]>
): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) =>
        faker.helpers.arrayElement(wordBank[key] ?? [key])
    );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/server && bun test src/db/seeds/helpers.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/db/seeds/helpers.ts apps/server/src/db/seeds/helpers.test.ts
git commit -m "feat(seed): add generateFromTemplate helper"
```

---

## Task 2: Create `seeds/data/newspapers.ts` config

**Files:**
- Create: `apps/server/src/db/seeds/data/newspapers.ts`

- [ ] **Step 1: Create the config file**

Create `apps/server/src/db/seeds/data/newspapers.ts`:

```ts
export interface CategoryConfig {
    name: string;
    slug: string;
    templates: string[];
    wordBank: Record<string, string[]>;
    imageKeywords: string;
}

export interface NewspaperConfig {
    name: string;
    slug: string;
    bioTemplates: string[];
    bioWordBank: Record<string, string[]>;
    categories: CategoryConfig[];
}

export const NEWSPAPERS: NewspaperConfig[] = [
    {
        name: "AudioWire",
        slug: "audiowire",
        bioTemplates: [
            "{role} covering {genre} for AudioWire since {year}.",
            "{adjective} {role} specialising in {genre} at AudioWire.",
            "Based in {city}, {role} writing about {genre} for AudioWire.",
            "{role} at AudioWire since {year}, focused on {genre}.",
        ],
        bioWordBank: {
            role: ["Music critic", "Staff writer", "Senior journalist", "Freelance contributor"],
            genre: ["pop and rock", "electronic music", "hip-hop", "live events"],
            year: ["2018", "2019", "2020", "2021"],
            adjective: ["Award-winning", "Veteran", "Rising", "Acclaimed"],
            city: ["London", "New York", "Berlin", "Manchester"],
        },
        categories: [
            {
                name: "Pop & Rock",
                slug: "pop-rock",
                templates: [
                    "{artist} Announces {adjective} World Tour for {year}",
                    "{artist} and {collab} Drop Surprise Collaboration",
                    "{artist}'s New Album Breaks {record} Records",
                    "{artist} Performs {adjective} Set at {festival}",
                ],
                wordBank: {
                    artist: ["Taylor Swift", "Billie Eilish", "Arctic Monkeys", "The Weeknd", "Olivia Rodrigo", "Harry Styles"],
                    collab: ["Dua Lipa", "Ed Sheeran", "Post Malone", "Ariana Grande", "Drake", "Lana Del Rey"],
                    adjective: ["Sold-Out", "Surprise", "Historic", "Record-Breaking", "Epic", "Emotional"],
                    year: ["2025", "2026", "Summer 2026", "Autumn 2025"],
                    festival: ["Glastonbury", "Coachella", "Reading Festival", "Lollapalooza", "Bonnaroo", "Primavera"],
                    record: ["Streaming", "Chart", "Ticket Sales", "Billboard", "Spotify", "Grammy"],
                },
                imageKeywords: "concert,music,rock",
            },
            {
                name: "Rap",
                slug: "rap",
                templates: [
                    "{rapper} Drops {adjective} New Single Amid {controversy}",
                    "{rapper} and {collab} Announce Joint Album",
                    "{rapper}'s Tour Grosses {amount} in Opening Weekend",
                    "{rapper} Wins {award} at {ceremony}",
                ],
                wordBank: {
                    rapper: ["Kendrick Lamar", "Drake", "Tyler the Creator", "J. Cole", "Cardi B", "Nicki Minaj"],
                    collab: ["Future", "Travis Scott", "21 Savage", "Lil Baby", "Gunna", "Megan Thee Stallion"],
                    adjective: ["Hard-Hitting", "Emotional", "Surprise", "Controversial", "Chart-Topping", "Viral"],
                    controversy: ["Feud Rumors", "Label Dispute", "Social Media Drama", "Tour Cancellation Rumors"],
                    amount: ["$10M", "$25M", "$50M", "$100M", "$200M"],
                    award: ["Best Rap Album", "Artist of the Year", "Best Collaboration", "Best New Artist"],
                    ceremony: ["BET Awards", "Grammy Awards", "MTV VMAs", "Billboard Music Awards"],
                },
                imageKeywords: "rap,hiphop,music",
            },
            {
                name: "Electronic",
                slug: "electronic",
                templates: [
                    "{artist} Releases {adjective} {format} on {label}",
                    "{artist} Headlining {festival} After {hiatus} Hiatus",
                    "{artist} and {collab} Collaborate on {adjective} EP",
                    "{artist}'s {venue} Show Sells Out in {time}",
                ],
                wordBank: {
                    artist: ["Aphex Twin", "Bicep", "Four Tet", "Burial", "Fred Again", "Bonobo"],
                    collab: ["Jon Hopkins", "Max Cooper", "Rival Consoles", "Floating Points", "Moderat"],
                    adjective: ["Ambient", "Hypnotic", "Genre-Defying", "Introspective", "Euphoric", "Minimal"],
                    format: ["LP", "EP", "Single", "Compilation", "Remix Album"],
                    label: ["Ninja Tune", "Warp Records", "XL Recordings", "Hyperdub", "Brainfeeder", "R&S Records"],
                    festival: ["Fabric", "Berghain", "Unsound", "Dekmantel", "ADE", "Sonar"],
                    hiatus: ["Two-Year", "Three-Year", "Five-Year", "Decade-Long"],
                    venue: ["O2 Arena", "Printworks", "Fabric", "Roundhouse", "Brixton Academy"],
                    time: ["Minutes", "Hours", "24 Hours", "One Week"],
                },
                imageKeywords: "electronic,dj,festival",
            },
            {
                name: "Live Events",
                slug: "live-events",
                templates: [
                    "{artist} to Headline {festival} {year} Edition",
                    "{event} Lineup Revealed: {artist} and {collab} Among Headliners",
                    "Tickets for {artist}'s {venue} Show Sell Out in {time}",
                    "{festival} Cancels {year} Edition Due to {reason}",
                ],
                wordBank: {
                    artist: ["Coldplay", "Radiohead", "Daft Punk", "Beyoncé", "Bruce Springsteen", "Fleetwood Mac"],
                    collab: ["The Rolling Stones", "Paul McCartney", "Kendrick Lamar", "Bad Bunny", "Rosalía"],
                    festival: ["Glastonbury", "Coachella", "Reading & Leeds", "Download", "Isle of Wight", "TRNSMT"],
                    year: ["2025", "2026", "2027"],
                    event: ["Glastonbury 2026", "Coachella Valley Music Festival", "Download Festival", "Reading & Leeds 2026"],
                    venue: ["Wembley Stadium", "Madison Square Garden", "The O2", "Royal Albert Hall", "Hollywood Bowl"],
                    time: ["30 Minutes", "One Hour", "24 Hours", "Three Days"],
                    reason: ["Safety Concerns", "Funding Issues", "Artist Withdrawals", "Extreme Weather"],
                },
                imageKeywords: "festival,concert,crowd",
            },
        ],
    },
    {
        name: "The Statline",
        slug: "the-statline",
        bioTemplates: [
            "{role} covering {competition} for The Statline since {year}.",
            "{adjective} {role} who has followed {competition} at The Statline since {year}.",
            "Based in {city}, {role} writing about {competition} for The Statline.",
            "{role} at The Statline since {year}, specialising in {competition}.",
        ],
        bioWordBank: {
            role: ["Sports journalist", "Staff writer", "Senior correspondent", "Football analyst"],
            competition: ["European football", "Premier League", "international tournaments", "LaLiga"],
            year: ["2018", "2019", "2020", "2021"],
            adjective: ["Award-winning", "Veteran", "Rising", "Acclaimed"],
            city: ["London", "Madrid", "Manchester", "Barcelona"],
        },
        categories: [
            {
                name: "Mundial",
                slug: "mundial",
                templates: [
                    "{team} {result} {opponent} in {round} of the {tournament}",
                    "{manager} Calls Up {player} for {tournament} Squad",
                    "{country} Named {adjective} Favourites to Win {tournament}",
                    "{player} Scores a Brace as {team} Advance to {round}",
                ],
                wordBank: {
                    team: ["Brazil", "France", "Argentina", "Germany", "Spain", "England", "Portugal"],
                    opponent: ["Morocco", "Japan", "Netherlands", "Croatia", "Switzerland", "USA"],
                    result: ["Edge Out", "Demolish", "Draw Against", "Scrape Past", "Dominate"],
                    round: ["Round of 16", "Quarter-Final", "Semi-Final", "the Final", "Group Stage"],
                    tournament: ["World Cup 2026", "FIFA World Cup", "Copa América"],
                    manager: ["Gareth Southgate", "Didier Deschamps", "Luis de la Fuente", "Roberto Martínez"],
                    player: ["Mbappé", "Vinicius Jr", "Bellingham", "Pedri", "Gavi", "De Bruyne"],
                    country: ["France", "Brazil", "England", "Spain", "Argentina"],
                    adjective: ["Early", "Surprise", "Runaway", "Joint"],
                },
                imageKeywords: "soccer,world cup,football",
            },
            {
                name: "Premier League",
                slug: "premier-league",
                templates: [
                    "{team} {result} {opponent} in {adjective} Premier League {fixture}",
                    "{manager} Slams {adjective} Referee Decision After {team} Loss",
                    "{player} Strikes Late to Hand {team} {adjective} Victory Over {opponent}",
                    "{team} Go {position} After {adjective} Win Against {opponent}",
                ],
                wordBank: {
                    team: ["Arsenal", "Chelsea", "Liverpool", "Manchester City", "Manchester United", "Tottenham", "Newcastle"],
                    opponent: ["Aston Villa", "West Ham", "Brighton", "Everton", "Brentford", "Crystal Palace", "Wolves"],
                    result: ["Beat", "Draw With", "Overcome", "Edge Out", "Thrash", "Hold"],
                    adjective: ["Dramatic", "Controversial", "Last-Minute", "Dominant", "Hard-Fought", "Stunning"],
                    manager: ["Pep Guardiola", "Arne Slot", "Mikel Arteta", "Erik ten Hag", "Ange Postecoglou"],
                    player: ["Salah", "Haaland", "Saka", "Palmer", "Rashford", "Son", "Isak"],
                    fixture: ["Clash", "Derby", "Showdown", "Encounter", "Match"],
                    position: ["Top", "Second", "Third", "Into the Top Four", "Above Rivals"],
                },
                imageKeywords: "premier league,football,soccer,stadium",
            },
            {
                name: "LaLiga",
                slug: "laliga",
                templates: [
                    "{team} {result} {opponent} as {player} Shines in {adjective} Derby",
                    "{player} Reaches {milestone} for {team} in LaLiga {fixture}",
                    "{team} Manager {manager} Insists Title Race is {claim}",
                    "{team} {result} {opponent} to {adjective} Close the Gap at the Top",
                ],
                wordBank: {
                    team: ["Real Madrid", "Barcelona", "Atlético Madrid", "Real Sociedad", "Villarreal", "Athletic Bilbao"],
                    opponent: ["Sevilla", "Valencia", "Betis", "Getafe", "Celta Vigo", "Osasuna", "Granada"],
                    result: ["Edge Out", "Thrash", "Hold", "Defeat", "Draw With", "Crush"],
                    player: ["Vinicius Jr", "Bellingham", "Lewandowski", "Yamal", "Griezmann", "Pedri", "Gavi"],
                    adjective: ["Tense", "Breathtaking", "Dramatic", "One-Sided", "Historic", "Contentious"],
                    milestone: ["100 Goals", "50 Assists", "150 Appearances", "His 200th Goal", "a New Record"],
                    manager: ["Carlo Ancelotti", "Hansi Flick", "Diego Simeone", "Imanol Alguacil"],
                    fixture: ["Clash", "Showdown", "Derby", "Encounter"],
                    claim: ["Wide Open", "Already Over", "Anyone's to Win", "A Two-Horse Race"],
                },
                imageKeywords: "laliga,real madrid,barcelona,football",
            },
            {
                name: "Transfers & Rumors",
                slug: "transfers-rumors",
                templates: [
                    "{club} Set to Sign {player} from {club2} in {fee} Deal",
                    "{player} Agent Confirms {adjective} Interest from {club} and {club2}",
                    "{player} Drops {adjective} Hint About {destination} Move on Social Media",
                    "{club} Reject {fee} Bid for {player} as Deadline Approaches",
                ],
                wordBank: {
                    player: ["Mbappé", "Bellingham", "Vinicius Jr", "Haaland", "Salah", "Kane", "Osimhen", "Gyökeres"],
                    club: ["Real Madrid", "Manchester City", "PSG", "Bayern Munich", "Arsenal", "Chelsea", "Liverpool"],
                    club2: ["Napoli", "Sporting CP", "Borussia Dortmund", "Inter Milan", "Juventus", "Atlético Madrid"],
                    fee: ["€80m", "€120m", "€150m", "€200m", "€60m plus add-ons"],
                    adjective: ["Concrete", "Surprise", "Shock", "Strong", "Growing", "Official"],
                    destination: ["Saudi Arabia", "Premier League", "LaLiga", "Serie A", "Bundesliga"],
                },
                imageKeywords: "transfer,football,soccer",
            },
            {
                name: "Match Analysis",
                slug: "match-analysis",
                templates: [
                    "Tactical Breakdown: How {team} {result} {opponent} With {tactic}",
                    "{player}'s {metric} Stats Reveal {adjective} Performance in {fixture}",
                    "Five Things We Learned From {team}'s {adjective} Win Over {opponent}",
                    "Data Analysis: {team}'s {tactic} Leaves {opponent} {adjective} in {fixture}",
                ],
                wordBank: {
                    team: ["Real Madrid", "Manchester City", "Liverpool", "Arsenal", "Barcelona", "Bayern Munich"],
                    opponent: ["Chelsea", "Tottenham", "Atlético Madrid", "PSG", "Inter Milan", "Juventus"],
                    result: ["Dismantled", "Outclassed", "Overcame", "Edged Out", "Dominated"],
                    tactic: ["High Press", "Low Block", "Positional Play", "Counter-Attack", "False Nine System"],
                    player: ["Haaland", "Salah", "Pedri", "Bellingham", "Vinicius Jr", "Rodri"],
                    metric: ["Expected Goals", "Pressing", "Passing", "Defensive", "Dribbling"],
                    adjective: ["Surprising", "Dominant", "Impressive", "Concerning", "Standout", "Breathtaking"],
                    fixture: ["Champions League Clash", "Premier League Derby", "El Clásico", "Merseyside Derby"],
                },
                imageKeywords: "football,tactics,analysis,stadium",
            },
        ],
    },
    {
        name: "The Binge Ledger",
        slug: "the-binge-ledger",
        bioTemplates: [
            "{role} covering {genre} for The Binge Ledger since {year}.",
            "{adjective} {role} specialising in {genre} at The Binge Ledger.",
            "Based in {city}, {role} writing about {genre} for The Binge Ledger.",
            "{role} at The Binge Ledger since {year}, focused on {genre}.",
        ],
        bioWordBank: {
            role: ["TV critic", "Staff writer", "Entertainment journalist", "Senior reviewer"],
            genre: ["prestige drama", "streaming comedies", "sci-fi and fantasy", "reality TV"],
            year: ["2018", "2019", "2020", "2021"],
            adjective: ["Award-winning", "Veteran", "Rising", "Acclaimed"],
            city: ["Los Angeles", "New York", "London", "Toronto"],
        },
        categories: [
            {
                name: "Drama",
                slug: "drama",
                templates: [
                    "{show} Season {season} Premiere Breaks {platform} Viewing Records",
                    "{actor} Exits {show} After {seasons} Seasons in {adjective} Twist",
                    "First Look: {show} Season {season} Teaser Reveals {adjective} {detail}",
                    "{show} Renewed for Season {season} Despite {adjective} Ratings",
                ],
                wordBank: {
                    show: ["Succession", "The Last of Us", "Euphoria", "Severance", "The Bear", "Yellowstone", "The Crown"],
                    actor: ["Kit Harington", "Zendaya", "Jeremy Allen White", "Sarah Snook", "Adam Scott", "Paddy Considine"],
                    season: ["Two", "Three", "Four", "Five", "Six"],
                    seasons: ["two", "three", "four", "five", "six"],
                    platform: ["HBO", "Netflix", "Apple TV+", "Prime Video", "Paramount+"],
                    adjective: ["Shocking", "Unexpected", "Dramatic", "Controversial", "Emotional", "Surprise"],
                    detail: ["Death", "Return", "Time Jump", "New Character", "Plot Twist"],
                },
                imageKeywords: "tv,drama,television,series",
            },
            {
                name: "Comedy & Sitcoms",
                slug: "comedy-sitcoms",
                templates: [
                    "{show} Cast Reunites for {adjective} {event} Special",
                    "{comedian} Joins {show} as {role} in Season {season}",
                    "{show}'s {adjective} Finale Divides Fans on {platform}",
                    "{comedian}'s New {platform} Special Earns {adjective} Reviews",
                ],
                wordBank: {
                    show: ["Abbott Elementary", "The Office", "Parks and Recreation", "Schitt's Creek", "Ted Lasso", "What We Do in the Shadows"],
                    comedian: ["Steve Carell", "Amy Poehler", "Quinta Brunson", "Jason Sudeikis", "Natasia Demetriou"],
                    event: ["Anniversary", "Christmas", "Reunion", "Live", "Behind-the-Scenes"],
                    role: ["Series Regular", "Guest Star", "Recurring Character", "Fan-Favourite Character"],
                    season: ["Two", "Three", "Four", "Five"],
                    platform: ["Netflix", "Hulu", "Apple TV+", "HBO Max", "Peacock"],
                    adjective: ["Hilarious", "Emotional", "Controversial", "Heartwarming", "Divisive", "Brilliant"],
                },
                imageKeywords: "comedy,tv,sitcom,television",
            },
            {
                name: "Sci-Fi & Fantasy",
                slug: "sci-fi-fantasy",
                templates: [
                    "{show} Season {season} Trailer Teases {adjective} {detail}",
                    "{franchise} Creator Confirms {adjective} Plans for {show} Spinoff",
                    "{show} Finale Explained: The {adjective} Ending and What It Means",
                    "{actor} Cast as {character} in Highly Anticipated {show} Adaptation",
                ],
                wordBank: {
                    show: ["House of the Dragon", "The Witcher", "Rings of Power", "Andor", "Silo", "Foundation", "Fallout"],
                    franchise: ["Game of Thrones", "Star Wars", "Lord of the Rings", "Marvel", "DC", "The Expanse"],
                    actor: ["Henry Cavill", "Emilia Clarke", "Pedro Pascal", "Anya Taylor-Joy", "Timothée Chalamet"],
                    character: ["Aragorn", "A New Jedi", "The Necromancer", "A Witcher", "The Chosen One"],
                    season: ["Two", "Three", "Four", "Five"],
                    adjective: ["Shocking", "Epic", "Dark", "Controversial", "Game-Changing", "Long-Awaited"],
                    detail: ["Death", "Return", "Dragon Scene", "Battle", "Twist Ending", "New World"],
                },
                imageKeywords: "scifi,fantasy,series,tv",
            },
            {
                name: "Reality TV",
                slug: "reality-tv",
                templates: [
                    "{show} Contestant {name} Voted Off in {adjective} Episode",
                    "{celebrity} Confirms Appearance on {show} Season {season}",
                    "{show} Producers Accused of {adjective} Editing After Backlash",
                    "Behind the Scenes: How {show} Casts Its {adjective} Season {season} Lineup",
                ],
                wordBank: {
                    show: ["Love Island", "The Bachelor", "Survivor", "Big Brother", "The Great British Bake Off", "RuPaul's Drag Race"],
                    name: ["Jake", "Sophie", "Tyler", "Emma", "Chloe", "Marcus", "Isla", "Ryan"],
                    celebrity: ["Kim Kardashian", "Pete Davidson", "Megan Fox", "Tommy Lee", "Anna Wintour"],
                    season: ["12", "13", "14", "15", "16"],
                    adjective: ["Shock", "Surprise", "Controversial", "Emotional", "Dramatic", "Historic"],
                },
                imageKeywords: "reality tv,television,entertainment",
            },
        ],
    },
    {
        name: "ClaudeDaily",
        slug: "claudedaily",
        bioTemplates: [
            "{role} covering {beat} at ClaudeDaily since {year}.",
            "{adjective} {role} writing about {beat} for ClaudeDaily.",
            "Based in {city}, {role} covering {beat} for ClaudeDaily.",
            "{role} at ClaudeDaily since {year}, specialising in {beat}.",
        ],
        bioWordBank: {
            role: ["Tech journalist", "Staff writer", "Senior correspondent", "Technology analyst"],
            beat: ["artificial intelligence", "cybersecurity", "software development", "consumer tech"],
            year: ["2018", "2019", "2020", "2021"],
            adjective: ["Award-winning", "Veteran", "Rising", "Acclaimed"],
            city: ["San Francisco", "London", "New York", "Berlin"],
        },
        categories: [
            {
                name: "AI & Machine Learning",
                slug: "ai-machine-learning",
                templates: [
                    "{company} Releases {model} with {adjective} {capability} Capabilities",
                    "Researchers at {institution} Achieve {adjective} Breakthrough in {field}",
                    "{model} Benchmark Results Spark {adjective} Debate Among {community}",
                    "{company}'s New {model} Outperforms {competitor} on {benchmark}",
                ],
                wordBank: {
                    company: ["OpenAI", "Anthropic", "Google DeepMind", "Meta AI", "Mistral", "xAI", "Cohere"],
                    model: ["GPT-5", "Claude 4", "Gemini 2.0", "Llama 4", "Grok-2", "Mistral Large"],
                    capability: ["Reasoning", "Coding", "Multimodal", "Agentic", "Real-Time", "Long-Context"],
                    institution: ["MIT", "Stanford", "DeepMind", "Carnegie Mellon", "Oxford", "ETH Zurich"],
                    field: ["Natural Language Processing", "Computer Vision", "Reinforcement Learning", "Robotics"],
                    adjective: ["Groundbreaking", "Controversial", "Surprising", "Record-Breaking", "Alarming", "Impressive"],
                    community: ["AI Researchers", "Industry Experts", "Academics", "Engineers", "Developers"],
                    competitor: ["GPT-4", "Gemini 1.5", "Llama 3", "Claude 3", "Mistral Medium"],
                    benchmark: ["MMLU", "HumanEval", "MATH", "BIG-Bench", "GPQA"],
                },
                imageKeywords: "artificial intelligence,technology,computer",
            },
            {
                name: "New Tech & Gadgets",
                slug: "new-tech-gadgets",
                templates: [
                    "{company} Unveils {adjective} {product} at {event}",
                    "{product} Review: Is {company}'s Latest Device Worth {price}?",
                    "{company}'s {product} {result} Thanks to {adjective} {feature}",
                    "First Look: {company} {product} Could Change {market} Forever",
                ],
                wordBank: {
                    company: ["Apple", "Samsung", "Google", "Microsoft", "Sony", "Meta", "Nothing"],
                    product: ["Vision Pro 2", "Galaxy S25", "Pixel 10", "Surface Pro 11", "Quest 4", "Phone 3"],
                    event: ["CES 2026", "WWDC", "Google I/O", "Samsung Unpacked", "Apple Event", "MWC 2026"],
                    adjective: ["Revolutionary", "Controversial", "Affordable", "Foldable", "Lightweight", "Powerful"],
                    price: ["$999", "$1,299", "$499", "$799", "$1,999", "$299"],
                    feature: ["Battery Life", "Camera System", "Display", "Chip", "AI Integration", "Build Quality"],
                    result: ["Sells Out", "Disappoints", "Surpasses Expectations", "Divides Critics", "Breaks Records"],
                    market: ["Smartphones", "AR Headsets", "Laptops", "Wearables", "Tablets"],
                },
                imageKeywords: "technology,gadget,tech",
            },
            {
                name: "Software & Coding",
                slug: "software-coding",
                templates: [
                    "{framework} {version} Released with {adjective} {feature} Support",
                    "{company} Announces {adjective} Changes to {tool}'s {policy} Policy",
                    "Why {language} is {adjective} Gaining Ground in {domain} Development",
                    "{tool} {version} Benchmarks Show {adjective} Performance Improvements",
                ],
                wordBank: {
                    framework: ["React", "Next.js", "Bun", "Deno", "Rust", "Go", "Zig", "Laravel", "Django"],
                    version: ["2.0", "3.0", "4.0", "v18", "v20", "2.5", "1.0"],
                    feature: ["WebAssembly", "Server Components", "Native TypeScript", "Edge Runtime", "Hot Reload"],
                    company: ["Vercel", "Meta", "Microsoft", "JetBrains", "GitHub", "GitLab", "Cloudflare"],
                    tool: ["VS Code", "GitHub Copilot", "npm", "Webpack", "Vite", "Docker", "Kubernetes"],
                    policy: ["Pricing", "Licensing", "Open Source", "API Access", "Usage"],
                    language: ["TypeScript", "Rust", "Go", "Python", "Kotlin", "Swift", "Zig"],
                    domain: ["Backend", "Frontend", "Systems", "Mobile", "AI", "Cloud", "Embedded"],
                    adjective: ["Rapidly", "Quietly", "Surprisingly", "Steadily", "Dramatically"],
                },
                imageKeywords: "coding,software,programming",
            },
            {
                name: "Cybersecurity",
                slug: "cybersecurity",
                templates: [
                    "{actor} Linked to {adjective} Attack on {target}'s {system}",
                    "{company} Patches {adjective} {vulnerability} Affecting {product}",
                    "Experts Warn of {adjective} New {threat} Targeting {target}",
                    "{country} Accuses {actor} of {adjective} Cyber Espionage Campaign",
                ],
                wordBank: {
                    actor: ["APT29", "Lazarus Group", "REvil", "Anonymous", "LockBit", "Scattered Spider"],
                    target: ["US Treasury", "NHS", "NATO", "Major Banks", "Critical Infrastructure", "European Parliament"],
                    system: ["Payment Systems", "Internal Networks", "Cloud Storage", "Email Servers", "Database"],
                    company: ["Microsoft", "Cisco", "Apple", "Google", "Palo Alto Networks", "CrowdStrike"],
                    vulnerability: ["Zero-Day", "Critical", "Remote Code Execution", "Privilege Escalation"],
                    product: ["Windows", "iOS", "Chrome", "Cisco IOS", "Outlook", "OpenSSL"],
                    threat: ["Ransomware Variant", "Phishing Campaign", "Supply Chain Attack", "Malware Strain"],
                    adjective: ["Sophisticated", "Alarming", "Widespread", "State-Sponsored", "Novel", "Dangerous"],
                    country: ["US", "UK", "EU", "Five Eyes Alliance", "NATO Members"],
                },
                imageKeywords: "cybersecurity,hacker,technology",
            },
        ],
    },
    {
        name: "The PokéScope",
        slug: "the-pokescope",
        bioTemplates: [
            "{role} covering {beat} for The PokéScope since {year}.",
            "{adjective} {role} specialising in {beat} at The PokéScope.",
            "Based in {city}, {role} writing about {beat} for The PokéScope.",
            "{role} at The PokéScope since {year}, passionate about {beat}.",
        ],
        bioWordBank: {
            role: ["Pokémon journalist", "Staff writer", "Senior correspondent", "Gaming analyst"],
            beat: ["competitive Pokémon", "the trading card game", "Pokémon GO", "Pokémon anime"],
            year: ["2018", "2019", "2020", "2021"],
            adjective: ["Award-winning", "Veteran", "Rising", "Acclaimed"],
            city: ["Tokyo", "London", "Los Angeles", "Sydney"],
        },
        categories: [
            {
                name: "Video Games",
                slug: "video-games",
                templates: [
                    "Pokémon {game} {adjective} Announced for {platform} in {year}",
                    "{pokemon} Revealed as {adjective} New Addition to Pokémon {game}",
                    "Game Freak Confirms {adjective} Feature Returning in Pokémon {game}",
                    "Pokémon {game} Sells {copies} Copies in {period}, Breaking {record}",
                ],
                wordBank: {
                    game: ["Legends: Z-A", "Snap 2", "Stadium Remastered", "Mystery Dungeon Returns", "Scarlet 2", "Gen X"],
                    pokemon: ["Mew", "Eevee", "Pikachu", "Gengar", "Charizard", "Mewtwo", "Lucario", "Gardevoir"],
                    platform: ["Nintendo Switch 2", "Switch", "Mobile", "PC", "Switch and PC"],
                    year: ["Late 2025", "Early 2026", "Holiday 2026", "2027"],
                    adjective: ["Surprise", "Controversial", "Long-Awaited", "Fan-Favourite", "Unexpected", "New"],
                    copies: ["3 Million", "5 Million", "10 Million", "15 Million", "20 Million"],
                    period: ["Opening Weekend", "First Week", "First Month", "24 Hours"],
                    record: ["Nintendo Switch Records", "Series Records", "Digital Sales Records", "Global Sales Records"],
                },
                imageKeywords: "pokemon,video game,nintendo",
            },
            {
                name: "Trading Card Game",
                slug: "trading-card-game",
                templates: [
                    "{set} Set Reveals {adjective} New {card} Card Worth Up to {price}",
                    "{card} Secret Rare Hits {price} on {platform} After {event}",
                    "Pokémon TCG {set} Expansion Sells Out in {time} Worldwide",
                    "Pro Player {player} Wins {tournament} With {adjective} {deck} Deck",
                ],
                wordBank: {
                    set: ["Scarlet & Violet", "Temporal Forces", "Shrouded Fable", "Stellar Crown", "Surging Sparks"],
                    card: ["Charizard ex", "Mewtwo ex", "Pikachu ex", "Umbreon ex", "Rayquaza ex", "Eevee ex"],
                    price: ["$200", "$400", "$500", "$1,000", "$150", "$300"],
                    platform: ["eBay", "TCGPlayer", "Cardmarket", "StockX"],
                    event: ["Set Release", "Pokémon World Championships", "Regional Championship", "Limited Print Run Announcement"],
                    time: ["Minutes", "Hours", "24 Hours", "48 Hours"],
                    player: ["Tord Reklev", "James Tow", "Azul Garcia Griego", "Shinya Otaki", "Grant Manley"],
                    tournament: ["Worlds 2025", "EUIC 2025", "NAIC 2025", "Regional Championship", "International Championship"],
                    deck: ["Charizard ex", "Raging Bolt", "Dragapult", "Gardevoir ex", "Lugia VSTAR"],
                    adjective: ["Rogue", "Consistent", "Surprise", "Dominant", "Meta-Defining"],
                },
                imageKeywords: "pokemon card,trading card,tcg",
            },
            {
                name: "Anime & Movies",
                slug: "anime-movies",
                templates: [
                    "Pokémon {movie} Movie Trailer Drops with {adjective} {reveal}",
                    "{anime} Arc Confirmed for Pokémon Anime's {adjective} New Season",
                    "Pokémon {movie} Movie Grosses {amount} Globally in Opening Weekend",
                    "{adjective} New Pokémon Revealed Exclusively in Upcoming {movie} Movie",
                ],
                wordBank: {
                    movie: ["Legends: Arceus", "Detective Pikachu 2", "Mewtwo Strikes Back Again", "Lucario and the Mystery of Mew 2"],
                    anime: ["Elite Four", "Legendary Pokémon", "Regional Champion", "Frontier Brain", "Grand Festival"],
                    adjective: ["Shocking", "Emotional", "Nostalgic", "Surprising", "Long-Awaited", "Epic"],
                    reveal: ["Legendary Pokémon", "Returning Character", "New Form", "Evolution", "Plot Twist"],
                    amount: ["$50M", "$100M", "$200M", "$300M", "$500M"],
                },
                imageKeywords: "pokemon anime,cartoon,animation",
            },
            {
                name: "Pokémon GO",
                slug: "pokemon-go",
                templates: [
                    "Pokémon GO {event} Event Features {adjective} {pokemon} Debut",
                    "Niantic Announces {adjective} Changes to Pokémon GO's {feature} System",
                    "{pokemon} Shiny Released in Pokémon GO During {event} Event",
                    "Pokémon GO Community Day: {pokemon} Features {adjective} {move} Move",
                ],
                wordBank: {
                    event: ["Spotlight Hour", "Community Day", "Safari Zone", "GO Fest", "Raids Week", "Ultra Beast"],
                    pokemon: ["Bulbasaur", "Charmander", "Squirtle", "Eevee", "Snorlax", "Gengar", "Mewtwo", "Ditto"],
                    adjective: ["Surprise", "Long-Awaited", "Controversial", "Exciting", "Limited", "Exclusive"],
                    feature: ["Raid", "PvP", "Buddy", "Trading", "Remote Raid", "Adventure Sync"],
                    move: ["Frenzy Plant", "Hydro Cannon", "Blast Burn", "Shadow Ball", "Body Slam"],
                },
                imageKeywords: "pokemon go,mobile game,augmented reality",
            },
        ],
    },
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/db/seeds/data/newspapers.ts
git commit -m "feat(seed): add newspapers config with templates and word banks"
```

---

## Task 3: Update `seedNewspaper.ts`

**Files:**
- Modify: `apps/server/src/db/seeds/seedNewspaper.ts`

- [ ] **Step 1: Replace hardcoded array with config import**

Replace the entire content of `apps/server/src/db/seeds/seedNewspaper.ts` with:

```ts
import { db } from "../index";
import * as schema from "../schema";
import type { NewNewspaper } from "../schema";
import { NEWSPAPERS } from "./data/newspapers";

export async function seedNewspapers() {
    const newspapersToInsert: NewNewspaper[] = NEWSPAPERS.map(({ name, slug }) => ({
        name,
        slug,
    }));

    await db.insert(schema.newspapers).values(newspapersToInsert);
    console.log("Newspapers added successfully!");
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/db/seeds/seedNewspaper.ts
git commit -m "feat(seed): drive seedNewspaper from config"
```

---

## Task 4: Redesign `seedArticleCategories.ts`

**Files:**
- Modify: `apps/server/src/db/seeds/seedArticleCategories.ts`

- [ ] **Step 1: Replace with per-newspaper category mapping**

Replace the entire content of `apps/server/src/db/seeds/seedArticleCategories.ts` with:

```ts
import { db } from "../index";
import * as schema from "../schema";
import type { NewArticleCategory } from "../schema";
import { eq } from "drizzle-orm";
import { NEWSPAPERS } from "./data/newspapers";

export async function seedNewArticleCategory() {
    const categoriesToInsert: NewArticleCategory[] = [];

    for (const newspaperConfig of NEWSPAPERS) {
        const newspaper = await db.query.newspapers.findFirst({
            where: eq(schema.newspapers.name, newspaperConfig.name),
            columns: { id: true },
        });

        if (!newspaper) {
            console.warn(`Newspaper "${newspaperConfig.name}" not found, skipping its categories.`);
            continue;
        }

        for (const category of newspaperConfig.categories) {
            categoriesToInsert.push({
                categoryName: category.name,
                slug: category.slug,
                newspaperId: newspaper.id,
            });
        }
    }

    await db.insert(schema.articleCategory).values(categoriesToInsert);
    console.log(`Categories added successfully! (${categoriesToInsert.length} total)`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/db/seeds/seedArticleCategories.ts
git commit -m "feat(seed): redesign seedArticleCategories with per-newspaper mapping"
```

---

## Task 5: Update `seedArticles.ts`

**Files:**
- Modify: `apps/server/src/db/seeds/seedArticles.ts`

- [ ] **Step 1: Replace lorem titles, keywords, and picsum images**

Replace the entire content of `apps/server/src/db/seeds/seedArticles.ts` with:

```ts
import { faker } from "@faker-js/faker";
import { db } from "../index";
import * as schema from "../schema";
import type { NewArticle } from "../schema";
import { NEWSPAPERS } from "./data/newspapers";
import type { CategoryConfig } from "./data/newspapers";
import { generateFromTemplate } from "./helpers";

function loremflickrUrl(imageKeywords: string): string {
    return `https://loremflickr.com/800/600/${imageKeywords}?lock=${faker.number.int({ min: 1, max: 9999 })}`;
}

function generateKeywords(category: CategoryConfig): string {
    const allWords = Object.values(category.wordBank).flat();
    return faker.helpers.arrayElements(allWords, 5).join(", ");
}

export async function seedArticles() {
    const authors = await db.query.newspaperAuthors.findMany();

    if (authors.length === 0) {
        throw new Error("❌ No authors found!");
    }

    // Build newspaperId → NewspaperConfig map using DB newspaper names
    const allNewspapersDb = await db.query.newspapers.findMany({
        columns: { id: true, name: true },
    });
    const newspaperConfigMap = new Map(
        allNewspapersDb.flatMap((np) => {
            const config = NEWSPAPERS.find((c) => c.name === np.name);
            return config ? [[np.id, config] as const] : [];
        })
    );

    // Build categoryId → imageKeywords map
    const allDbCategories = await db.query.articleCategory.findMany({
        columns: { id: true, slug: true },
    });
    const categoryImageMap = new Map<string, string>();
    for (const cat of allDbCategories) {
        for (const np of NEWSPAPERS) {
            const catConfig = np.categories.find((c) => c.slug === cat.slug);
            if (catConfig) {
                categoryImageMap.set(cat.id, catConfig.imageKeywords);
                break;
            }
        }
    }

    const articlesToInsert: NewArticle[] = [];

    for (const author of authors) {
        const articlesCount = faker.number.int({ min: 25, max: 35 });

        const dbCategories = await db.query.articleCategory.findMany({
            where: (articleCategory, { eq }) =>
                eq(articleCategory.newspaperId, author.newspaperId),
        });

        const newspaperConfig = newspaperConfigMap.get(author.newspaperId);

        for (let i = 0; i < articlesCount; i++) {
            const isPublished = faker.number.float() < 2 / 3;

            const dbCategory = dbCategories.length > 0
                ? faker.helpers.arrayElement(dbCategories)
                : null;

            const categoryConfig = newspaperConfig?.categories.find(
                (c) => c.slug === dbCategory?.slug
            );

            const title = categoryConfig
                ? generateFromTemplate(
                    faker.helpers.arrayElement(categoryConfig.templates),
                    categoryConfig.wordBank
                )
                : faker.lorem.sentence({ min: 4, max: 10 }).replace(/\.$/, "");

            const keywords = categoryConfig
                ? generateKeywords(categoryConfig)
                : faker.lorem.words(5).split(" ").join(", ");

            articlesToInsert.push({
                title,
                perex: faker.lorem.paragraph(1),
                content: faker.lorem.paragraphs({ min: 3, max: 8 }, "\n\n"),
                keywords,
                state: isPublished ? "PUBLISHED" : "DRAFT",
                authorId: author.userId,
                newspaperId: author.newspaperId,
                categoryId: dbCategory?.id ?? null,
                publicationDate: isPublished ? faker.date.past() : null,
            });
        }
    }

    const inserted = await db.insert(schema.articles).values(articlesToInsert).returning();

    const imagesToInsert = inserted.map((article) => ({
        articleId: article.id,
        url: loremflickrUrl(
            article.categoryId
                ? (categoryImageMap.get(article.categoryId) ?? "news,article")
                : "news,article"
        ),
        caption: null,
        isPrimary: true,
    }));

    await db.insert(schema.articleImages).values(imagesToInsert);

    console.log(`Successfully added ${inserted.length} articles with images.`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/db/seeds/seedArticles.ts
git commit -m "feat(seed): use topic-aware titles, keywords, and loremflickr images"
```

---

## Task 6: Update `seedRandomAuthors.ts`

**Files:**
- Modify: `apps/server/src/db/seeds/seedRandomAuthors.ts`

- [ ] **Step 1: Replace lorem bios with template-based generation**

Replace the entire content of `apps/server/src/db/seeds/seedRandomAuthors.ts` with:

```ts
import { faker } from "@faker-js/faker";
import { db } from "../index";
import * as schema from "../schema";
import type { NewNewspaperAuthor, NewUser, NewUserRole } from "../schema";
import { NEWSPAPERS } from "./data/newspapers";
import { generateFromTemplate } from "./helpers";

const EDITORS_PER_NEWSPAPER = 5;

function generateBio(newspaperName: string): string {
    const config = NEWSPAPERS.find((np) => np.name === newspaperName);
    if (!config) return faker.lorem.sentence();
    return generateFromTemplate(
        faker.helpers.arrayElement(config.bioTemplates),
        config.bioWordBank
    );
}

export async function seedRandomAuthors(authorsPerNewspaper: number) {
    const allNewspapers = await db.query.newspapers.findMany();

    if (allNewspapers.length === 0) {
        throw new Error("No newspapers found in the database. Seed newspapers first!");
    }

    const passwordHash = await Bun.password.hash("test1234");
    const usersToInsert: NewUser[] = [];

    for (const newspaper of allNewspapers) {
        for (let i = 0; i < authorsPerNewspaper; i++) {
            usersToInsert.push({
                username: faker.internet.username(),
                fullname: faker.person.fullName(),
                email: faker.internet.email(),
                passwordHash,
                newspaperId: newspaper.id,
                email_verified: true,
            });
        }

        for (let i = 0; i < EDITORS_PER_NEWSPAPER; i++) {
            usersToInsert.push({
                username: faker.internet.username(),
                fullname: faker.person.fullName(),
                email: faker.internet.email(),
                passwordHash,
                newspaperId: newspaper.id,
                email_verified: true,
            });
        }
    }

    const insertedUsers = await db.insert(schema.users)
        .values(usersToInsert)
        .returning();

    const rolesToInsert: NewUserRole[] = [];
    const authorProfiles: NewNewspaperAuthor[] = [];

    let userIndex = 0;
    for (const newspaper of allNewspapers) {
        for (let i = 0; i < authorsPerNewspaper; i++) {
            const user = insertedUsers[userIndex++]!;
            rolesToInsert.push({
                userId: user.id,
                newspaperId: newspaper.id,
                role: "AUTHOR",
            });
            authorProfiles.push({
                userId: user.id,
                newspaperId: newspaper.id,
                biography: generateBio(newspaper.name),
            });
        }

        for (let i = 0; i < EDITORS_PER_NEWSPAPER; i++) {
            const user = insertedUsers[userIndex++]!;
            rolesToInsert.push({
                userId: user.id,
                newspaperId: newspaper.id,
                role: "EDITOR",
            });
        }
    }

    await db.insert(schema.userRoles).values(rolesToInsert).onConflictDoNothing();
    await db.insert(schema.newspaperAuthors).values(authorProfiles);

    const authorCount = allNewspapers.length * authorsPerNewspaper;
    const editorCount = allNewspapers.length * EDITORS_PER_NEWSPAPER;
    console.log(`Successfully seeded ${authorCount} authors and ${editorCount} editors.`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/db/seeds/seedRandomAuthors.ts
git commit -m "feat(seed): generate topic-aware author biographies"
```

---

## Task 7: Delete dead code and verify the full seed

**Files:**
- Delete: `apps/server/src/db/seeds/seedAddAuthors.ts`

- [ ] **Step 1: Delete `seedAddAuthors.ts`**

```bash
rm apps/server/src/db/seeds/seedAddAuthors.ts
```

- [ ] **Step 2: Verify no imports of `seedAddAuthors` exist**

```bash
grep -r "seedAddAuthors" apps/server/src/
```

Expected: no output.

- [ ] **Step 3: Run the helper tests one final time**

```bash
cd apps/server && bun test src/db/seeds/helpers.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(seed): remove dead seedAddAuthors file"
```

---

## Task 8: Run the full seed against the database

- [ ] **Step 1: Reset the database and run the seed**

```bash
cd apps/server && bun run db:reset && bun run src/db/seed.ts
```

Expected output (order may vary):
```
Getting ready...
System Administrator seeded!
Newspapers added successfully!
Categories added successfully! (21 total)
Users added successfully! (500 total)
User roles assigned successfully!
Successfully seeded 75 authors and 25 editors.
Successfully added ... articles with images.
Emma seeded successfully!
Article reviews seeded successfully!
Likes seeded successfully!
Comments seeded successfully!
Article views seeded successfully!
Jan Novak seeded!  email: jan.novak@claudedaily.cz  password: test1234
Director seeded!  email: director@claudedaily.cz  password: test1234
✅ Done!
```

- [ ] **Step 2: Spot-check the data**

```bash
cd apps/server && bun run --eval "
import { db } from './src/db/index';
import * as schema from './src/db/schema';
const newspapers = await db.query.newspapers.findMany({ with: { articleCategories: true } });
for (const np of newspapers) {
    console.log(np.name, '->', np.articleCategories.map(c => c.categoryName).join(', '));
}
process.exit(0);
"
```

Expected: 5 newspapers each listing their correct categories (e.g. `AudioWire -> Pop & Rock, Rap, Electronic, Live Events`).

- [ ] **Step 3: Verify article titles look realistic**

```bash
cd apps/server && bun run --eval "
import { db } from './src/db/index';
import * as schema from './src/db/schema';
import { eq } from 'drizzle-orm';
const articles = await db.query.articles.findMany({ limit: 10 });
articles.forEach(a => console.log(a.title));
process.exit(0);
"
```

Expected: topic-specific titles (not lorem ipsum).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(seed): realistic themed seed data for five newspapers" --allow-empty
```

> If there are no uncommitted changes this step can be skipped.
