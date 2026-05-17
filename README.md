# FeedPulse 🚀 // X Algorithm Feed Simulator

FeedPulse is an interactive sandbox dashboard built to reverse-engineer and visualize the open-source **xAI Twitter/X algorithm**. Built entirely with pure client-side web technologies, it translates the dense Python & Rust heuristics of the Phoenix heavy-scorer transformer model into a live, observable simulation tool.

**Live URL:** [https://feed-pulse-zeta.vercel.app/](https://feed-pulse-zeta.vercel.app/)  
**Reference Core Repository:** [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm)

---

##  Features & Impact

* **Real-time Probability Matrices:** Powered by `Chart.js`, witness exactly how positive engagement velocities scale against brutal negative penalties across 13 target consumer actions.
* **Pre & Post Selection Filters:** Simulate hard-coded platform constraints (like the `PostAgeFilter` or `AuthorBlockFilter`) that drop posts out of the pool entirely before they ever get scored.
* **Waterfall Scoring Breakdown:** See exactly how raw transformer outputs are attenuated by author diversity limits and out-of-network adjustments to produce the final Top-K rank.
* **Zero Framework Overhead:** Built using standard HTML5, CSS3 variables, and raw Vanilla JavaScript.
* **Interactive Draft Analyzer Workspace:** Paste your post drafts to auto-detect formatting quality, formatting hooks, hashtag spam constraints, and heavy outbound link penalties in a premium text editor.

---

## How It Works (Algorithmic Logic)

The simulation mirrors the core architectural principles of the **Phoenix Transformer Heavy Scorer**:

1. **The Logit Base:** Calculates an initial baseline value using the post type, media format (videos receive a distinct dwell-time boost), baseline engagement metrics, and topic affinity.
2. **Sigmoid Squashing:** Passes raw logits through a mathematical Sigmoid function to derive smooth, bounded percentage probabilities ($0\%$ to $100\%$) for individual user actions.
3. **The Multiplier Balancing Act:**
   * **Replies & Quotes:** Heavily favored by the algorithm, scaling with multipliers up to **×1.5**.
   * **The Silent Killers:** Blocks, mutes, and reports carry catastrophic negative weights (up to **-4.0**). A single block can mathematically wipe out the algorithmic momentum of dozens of standard likes.
   * **Diversity Attenuation:** Posting too frequently (e.g., $20+/day$) activates a penalty factor, forcing your own posts to actively cannibalize each other's reach.
4. **Real-Time Draft Injections:** Your raw text draft is parsed dynamically via regex. Clean line breaks inject a `draftBoost` ($+0.20$ logit) to simulate visual dwell-time, while external links ($-0.40$ logit) and hashtag stuffing ($-0.25$ logit) directly depress the baseline logit prior to sigmoid squashing.
