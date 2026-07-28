# Oriana Companion v2

## Product boundary

Companion is a fixed-rule website helper. It can explain public site rules, surface a short contextual next step, and offer a Contact handoff. It is not Oriana, never approves private access, and does not read private messages or private album content.

The design intentionally rejects virtual-pet retention mechanics: no streak pressure, hunger, punishment, random popups, simulated dependency, or claims of agency. A tap on the dock is a harmless, deliberate interaction that opens useful help.

## Interaction principles used

- **State must be readable before it is decorative.** Apple’s feedback guidance distinguishes passive status from important warnings and expects confirmation to match a task’s significance. Companion therefore has a deterministic priority state machine, semantic artwork, visible labels, short microcopy, and restrained interruptions. <https://developer.apple.com/design/human-interface-guidelines/feedback>
- **Motion is optional, informative, and low-amplitude.** Apple’s motion guidance treats motion as status and feedback, while warning against distracting peripheral or sustained oscillating motion. `prefers-reduced-motion` is a hard ceiling and the explicit Still option is stricter still. <https://developer.apple.com/design/human-interface-guidelines/motion>
- **No single sensory channel carries meaning.** Every significant state has text plus an image; sound is off by default and optional after a gesture. Controls have semantic names, keyboard operation, visible focus, and generously sized targets. <https://developer.apple.com/design/human-interface-guidelines/accessibility>
- **Direct interaction is low stakes.** The single "pet" action is a deliberate tap that produces a brief celebration state. This takes only the general principle of immediate, readable response from virtual-pet products; it does not copy mechanics, layouts, names, characters, or art.
- **Personality is tied to a useful role, not obligation.** The curated roster gives each character a distinct silhouette, palette, and guidance temperament. This is informed by the high-level product pattern of differentiated characters and spaces documented for Tamagotchi Adventure Kingdom, without importing its world or mechanics. <https://bandainamcomobile.com/games/tamagotchi-adventure-kingdom/>
- **Encouragement must remain non-punitive.** Finch documents a gentle, personalized support model and a direct pet/mood interaction. Companion borrows the idea of gentle encouragement only: it never tracks wellbeing, requires engagement, or turns use into a goal system. <https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care> <https://help.finchcare.com/hc/en-us/articles/37780000231309-Exploring-the-Finch-Home-Page>
- **Small reactions should map to explicit activity.** My Talking Tom 2’s official support describes reactions around concrete activities; Widgetable documents shared pet care and growth. Companion applies only the broad interaction principle: reactions map to explicit website events (answer, wait, success, warning, error), never background attention capture. <https://mytalkingtom2.com/support> <https://apps.apple.com/us/app/widgetable-besties-couples/id1641107226>
- **Rhythms are passive and easy to ignore.** Pokémon Sleep’s official material presents varied sleep styles and time-based passive behavior. Companion’s only equivalent is a quiet, optional sleeping state after idle time; it has no tracking, collection, or reward loop. <https://www.pokemon.com/es/videojuegos-pokemon/pokemon-sleep>

## Preference schema and resolution

The v2 schema separates:

- `presence`: `hidden`, `on_demand`, `contextual`, `dock`;
- `helpLevel`: `essential`, `helpful`, `proactive`;
- `motion`: `still`, `gentle`, `lively`;
- independent booleans for sound, loading feedback, contextual hints, and idle reactions.

Quick presets are fully described outcome bundles. Advanced controls never mutate another dimension. A hidden configuration retains its advanced choices but makes its runtime behavior inactive; the UI explains this and offers an explicit Helpful bundle action.

`normalizeAssistantPreferences`, `migrateLegacyAssistantPreferences`, and `resolveCompanionRuntimeBehavior` are the shared source of truth for UI, runtime, profile metadata, storage, and tests. V1 values migrate at read time; profile metadata remains the persistence boundary, so no database migration is required.

## Asset system

`src/lib/assistant/companion-assets.ts` owns the public manifest. Mira, the default Companion, has distinct optimized WebP artwork for idle, listening, thinking, answering, waiting, success, celebration, warning, error, unavailable, and sleeping. Six additional flagship portraits are curated for the primary selector. Existing saved character IDs retain a legacy SVG fallback but are no longer presented as primary choices.

The shipped derivatives are original Image Generation outputs produced in July 2026 from a locked art-direction prompt family: chestnut capybara, teal scarf, brass crescent locket, warm-gray studio, fixed three-quarter camera, and soft directional lighting. No third-party character, artist, game asset, or visual reference was supplied. `scripts/performance/check-companion-assets.mjs` verifies every packaged derivative stays under 30 KB. No authenticated video-generation capability was available; the manifest intentionally declares static semantic artwork rather than claiming video loops.

## Runtime and safety

`OrianaCompanionRuntime` listens to a small contextual event contract, state-machine events, media-viewer state, game suspension, route eligibility, and motion preference. It never polls. The compact dock is only enabled for `presence: dock`; contextual behavior has no persistent dock. Media viewers, games, Studio, login, auth routes, and hidden preference suspend runtime presentation. A dock dismissal is route-scoped and never disables the explicit user-menu trigger.
