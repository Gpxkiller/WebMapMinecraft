#include "generator.h"
#include <string.h>
/* Vanilla 26.3 overworld/surface: swamp Y62 and mangrove Y60..62,
 * on the surface floor, become water when surface_swamp noise >= 0.
 * No terrain, foliage, structures, chunks or files are generated. */
static void swamp_noise(DoublePerlinNoise*n,PerlinNoise oct[2],uint64_t seed){
    Xoroshiro root;xSetSeed(&root,seed);uint64_t lo=xNextLong(&root),hi=xNextLong(&root);
    /* MD5("minecraft:surface_swamp"), big-endian halves, positional fork. */
    Xoroshiro xr={lo^UINT64_C(0xc7afe50ddb0bafd7),hi^UINT64_C(0x13a4f289e298db6a)};
    const double amplitude[]={1.};xDoublePerlinInit(n,&xr,oct,amplitude,-2,1,-1);
}
double gpx_surface_noise(uint64_t seed,int x,int z){DoublePerlinNoise n;PerlinNoise oct[2];swamp_noise(&n,oct,seed);return sampleDoublePerlin(&n,x,0,z);}
int gpx_surface_water_mask(uint64_t seed,int ax,int az,int large,const short *heights,unsigned char *mask){
    if(!heights||!mask||ax < -117187||ax > 117187||az < -117187||az > 117187)return -1;
    Generator g;setupGenerator(&g,MC_26_3,large?LARGE_BIOMES:0);applySeed(&g,DIM_OVERWORLD,seed);
    DoublePerlinNoise n;PerlinNoise oct[2];swamp_noise(&n,oct,seed);memset(mask,0,4096);
    for(int z=0;z<64;z++)for(int x=0;x<64;x++){
        int i=z*64+x,y=heights[i];if(y<60||y>62)continue;
        int bx=ax*256+x*4+2,bz=az*256+z*4+2;
        int biome=getBiomeAt(&g,1,bx,y,bz);
        if(((biome==swamp&&y==62)||biome==mangrove_swamp)&&sampleDoublePerlin(&n,bx,0,bz)>=0)mask[i]=1;
    }
    return 0;
}
