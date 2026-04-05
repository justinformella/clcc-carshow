# Crystal Lake Scenery Assets — Generation Spec

These 28 pixel art PNG images need to be generated and uploaded to Supabase storage at `pixel-art/8bit/scenery/`. All should be **transparent PNG** backgrounds (use green screen #00FF00 + Sharp processing, or the rembg endpoint at `https://justin-formella--clcc-rembg-remove-bg.modal.run`).

Style: **8-bit pixel art**, matching the retro aesthetic of the javascript-racer spritesheet. Dark outlines, limited color palette, chunky pixels. Think NES/SNES era roadside scenery.

## Trees (Illinois species — these are the most common sprites)

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `oak-tree.png` | Large white/red oak tree, full green canopy, thick trunk | 360×400px | Dominant tree in Crystal Lake. Round, wide canopy. |
| `maple-tree.png` | Sugar maple, full summer green canopy | 340×380px | Slightly narrower than oak, more pointed canopy |
| `maple-fall.png` | Sugar maple in fall colors — orange/red/gold canopy | 340×380px | Same shape as maple-tree but autumn palette |
| `pine-tree.png` | Tall evergreen (white pine or spruce), dark green, triangular | 200×500px | Tall and narrow, common in landscaping |
| `bush-midwest.png` | Low Midwest hedge/bush, rounded, medium green | 200×140px | Generic shrub, appears everywhere |

## Downtown Crystal Lake Buildings

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `raue-center.png` | Raue Center for the Arts — THE signature landmark. Vertical "RAUE" marquee sign with bulb lighting, horizontal show board below, 1920s theater facade | 300×400px | Most recognizable building in Crystal Lake. Classic movie theater marquee style. Gold/warm lit. |
| `brick-storefront.png` | 2-story red brick storefront with fabric awning (green or burgundy), window displays | 280×300px | Generic downtown building, flat roof, decorative cornice |
| `painted-storefront.png` | 2-story painted brick (cream/white), different colored awning, shop sign | 260×280px | Variation of downtown building |
| `dole-mansion.png` | Dole Mansion — large Victorian/Italianate mansion, cream colored, ornate, parklike setting | 400×350px | Historic lakefront landmark, built 1865 |

## Route 14 Commercial Strip

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `strip-mall.png` | Long low strip mall facade, multiple storefronts, parking lot in front, commercial signage | 500×200px | Generic suburban commercial, flat roof, various colored signs |
| `gas-station.png` | Gas station with canopy over pumps, brand colors (green/yellow like BP or red/yellow like Shell) | 300×200px | Classic suburban gas station |
| `fast-food.png` | Fast food restaurant, drive-thru lane visible, bright signage | 250×200px | Generic fast food building |

## Street Furniture

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `street-lamp.png` | Acorn/globe style street lamp, dark green/black metal post | 40×320px | The kind lining downtown Williams Street |
| `lamp-flowers.png` | Same street lamp post but with hanging flower basket attached | 60×340px | Summer downtown look |
| `park-bench.png` | Wooden park bench, simple, facing forward | 150×90px | Found along lakefront and in parks |
| `planter.png` | Concrete planter with colorful flowers on top | 80×100px | Downtown sidewalk decoration |
| `picnic-pavilion.png` | Open wooden picnic shelter/pavilion with peaked roof | 300×200px | Found in Veteran Acres and other parks |

## Signs

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `welcome-sign.png` | "Welcome to Crystal Lake" green road sign, white text | 350×200px | City welcome sign |
| `rr-crossing.png` | Railroad crossing X-sign on post (white X with "RAILROAD CROSSING" text) | 60×300px | Metra tracks cross through downtown |
| `traffic-light.png` | Standard 3-light traffic signal on pole, with red/yellow/green | 40×200px | Along Route 14 intersections |

## Lakefront / Main Beach

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `lake-water.png` | Section of lake water with gentle wave pattern, blue with subtle reflections | 500×200px | Crystal Lake (the actual lake) |
| `beach-section.png` | Sandy beach strip with a few beach elements, water edge visible | 400×150px | Main Beach area |
| `boat-dock.png` | Small wooden boat dock/pier extending into water | 180×140px | Found at the lakefront |

## Transit

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `metra-train.png` | Metra commuter train — silver/blue double-decker coaches, side view | 400×200px | Union Pacific Northwest Line |
| `metra-station.png` | Small Metra station shelter/platform, simple structure with canopy | 350×180px | Crystal Lake Metra station |

## Miscellaneous

| Filename | Description | Approx Size | Notes |
|----------|-------------|-------------|-------|
| `utility-pole.png` | Wooden utility/telephone pole with wires | 40×400px | Along every road |
| `picket-fence.png` | White picket fence section, residential style | 250×100px | Residential neighborhoods |
| `prairie-grass.png` | Patch of tall prairie grass, golden/green, swaying | 200×120px | Parks and open areas, native Illinois |

## Upload Path

All images go to Supabase storage:
```
pixel-art/8bit/scenery/{filename}
```

## Background Removal

Use either:
1. Green screen (#00FF00) background in prompt → Sharp to strip green → upload transparent PNG
2. The rembg endpoint: `https://justin-formella--clcc-rembg-remove-bg.modal.run` to remove backgrounds

## Priority Order

Generate in this order (most impactful first):
1. `oak-tree.png`, `maple-tree.png`, `pine-tree.png` — these appear most frequently
2. `street-lamp.png`, `lamp-flowers.png` — line the entire road
3. `raue-center.png` — the signature Crystal Lake landmark
4. `brick-storefront.png`, `painted-storefront.png` — fill downtown
5. `welcome-sign.png` — first thing players see
6. Everything else
