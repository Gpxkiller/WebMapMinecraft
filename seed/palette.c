#include "biomes.h"
#include <string.h>
#define setColor(c,i,v) do{c[i][0]=((v)>>16)&255;c[i][1]=((v)>>8)&255;c[i][2]=(v)&255;}while(0)
void initBiomeColors(unsigned char colors[256][3])
{
    // This coloring scheme is largely inspired by the AMIDST program:
    // https://github.com/toolbox4minecraft/amidst/wiki/Biome-Color-Table
    // but with additional biomes for 1.18+, and with some subtle changes to
    // improve contrast for the new world generation.

    memset(colors, 0, 256*3);

    //               biome                             hex color     AMIDST
    setColor(colors, ocean,                            0x000070);
    setColor(colors, plains,                           0x8db360);
    setColor(colors, desert,                           0xfa9418);
    setColor(colors, windswept_hills,                  0x606060);
    setColor(colors, forest,                           0x056621);
    setColor(colors, taiga,                            0x0b6a5f); // 0b6659
    setColor(colors, swamp,                            0x07f9b2);
    setColor(colors, river,                            0x0000ff);
    setColor(colors, nether_wastes,                    0x572526); // bf3b3b
    setColor(colors, the_end,                          0x8080ff);
    setColor(colors, frozen_ocean,                     0x7070d6);
    setColor(colors, frozen_river,                     0xa0a0ff);
    setColor(colors, snowy_plains,                     0xffffff);
    setColor(colors, snowy_mountains,                  0xa0a0a0);
    setColor(colors, mushroom_fields,                  0xff00ff);
    setColor(colors, mushroom_field_shore,             0xa000ff);
    setColor(colors, beach,                            0xfade55);
    setColor(colors, desert_hills,                     0xd25f12);
    setColor(colors, wooded_hills,                     0x22551c);
    setColor(colors, taiga_hills,                      0x163933);
    setColor(colors, mountain_edge,                    0x72789a);
    setColor(colors, jungle,                           0x507b0a); // 537b09
    setColor(colors, jungle_hills,                     0x2c4205);
    setColor(colors, sparse_jungle,                    0x60930f); // 628b17
    setColor(colors, deep_ocean,                       0x000030);
    setColor(colors, stony_shore,                      0xa2a284);
    setColor(colors, snowy_beach,                      0xfaf0c0);
    setColor(colors, birch_forest,                     0x307444);
    setColor(colors, birch_forest_hills,               0x1f5f32);
    setColor(colors, dark_forest,                      0x40511a);
    setColor(colors, snowy_taiga,                      0x31554a);
    setColor(colors, snowy_taiga_hills,                0x243f36);
    setColor(colors, old_growth_pine_taiga,            0x596651);
    setColor(colors, giant_tree_taiga_hills,           0x454f3e);
    setColor(colors, windswept_forest,                 0x5b7352); // 507050
    setColor(colors, savanna,                          0xbdb25f);
    setColor(colors, savanna_plateau,                  0xa79d64);
    setColor(colors, badlands,                         0xd94515);
    setColor(colors, wooded_badlands,                  0xb09765);
    setColor(colors, badlands_plateau,                 0xca8c65);
    setColor(colors, small_end_islands,                0x4b4bab); // 8080ff
    setColor(colors, end_midlands,                     0xc9c959); // 8080ff
    setColor(colors, end_highlands,                    0xb5b536); // 8080ff
    setColor(colors, end_barrens,                      0x7070cc); // 8080ff
    setColor(colors, warm_ocean,                       0x0000ac);
    setColor(colors, lukewarm_ocean,                   0x000090);
    setColor(colors, cold_ocean,                       0x202070);
    setColor(colors, deep_warm_ocean,                  0x000050);
    setColor(colors, deep_lukewarm_ocean,              0x000040);
    setColor(colors, deep_cold_ocean,                  0x202038);
    setColor(colors, deep_frozen_ocean,                0x404090);
    setColor(colors, seasonal_forest,                  0x2f560f); // -
    setColor(colors, rainforest,                       0x47840e); // -
    setColor(colors, shrubland,                        0x789e31); // -
    setColor(colors, the_void,                         0x000000);
    setColor(colors, sunflower_plains,                 0xb5db88);
    setColor(colors, desert_lakes,                     0xffbc40);
    setColor(colors, windswept_gravelly_hills,         0x888888);
    setColor(colors, flower_forest,                    0x2d8e49);
    setColor(colors, taiga_mountains,                  0x339287); // 338e81
    setColor(colors, swamp_hills,                      0x2fffda);
    setColor(colors, ice_spikes,                       0xb4dcdc);
    setColor(colors, modified_jungle,                  0x78a332); // 7ba331
    setColor(colors, modified_jungle_edge,             0x88bb37); // 8ab33f
    setColor(colors, old_growth_birch_forest,          0x589c6c);
    setColor(colors, tall_birch_hills,                 0x47875a);
    setColor(colors, dark_forest_hills,                0x687942);
    setColor(colors, snowy_taiga_mountains,            0x597d72);
    setColor(colors, old_growth_spruce_taiga,          0x818e79);
    setColor(colors, giant_spruce_taiga_hills,         0x6d7766);
    setColor(colors, modified_gravelly_mountains,      0x839b7a); // 789878
    setColor(colors, windswept_savanna,                0xe5da87);
    setColor(colors, shattered_savanna_plateau,        0xcfc58c);
    setColor(colors, eroded_badlands,                  0xff6d3d);
    setColor(colors, modified_wooded_badlands_plateau, 0xd8bf8d);
    setColor(colors, modified_badlands_plateau,        0xf2b48d);
    setColor(colors, bamboo_jungle,                    0x849500); // 768e14
    setColor(colors, bamboo_jungle_hills,              0x5c6c04); // 3b470a
    setColor(colors, soul_sand_valley,                 0x4d3a2e); // 5e3830
    setColor(colors, crimson_forest,                   0x981a11); // dd0808
    setColor(colors, warped_forest,                    0x49907b);
    setColor(colors, basalt_deltas,                    0x645f63); // 403636
    setColor(colors, dripstone_caves,                  0x4e3012); // -
    setColor(colors, lush_caves,                       0x283c00); // -
    setColor(colors, meadow,                           0x60a445); // -
    setColor(colors, grove,                            0x47726c); // -
    setColor(colors, snowy_slopes,                     0xc4c4c4); // -
    setColor(colors, jagged_peaks,                     0xdcdcc8); // -
    setColor(colors, frozen_peaks,                     0xb0b3ce); // -
    setColor(colors, stony_peaks,                      0x7b8f74); // -
    setColor(colors, deep_dark,                        0x031f29); // -
    setColor(colors, mangrove_swamp,                   0x2ccc8e); // -
    setColor(colors, cherry_grove,                     0xff91c8); // -
    setColor(colors, pale_garden,                      0x696d95); // -
    setColor(colors, sulfur_caves,                     0xc8d232); // -
    setColor(colors, dappled_forest,                   0xeb9234); // -
}

