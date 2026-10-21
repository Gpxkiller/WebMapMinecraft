#include "generator.h"
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
void initBiomeColors(unsigned char colors[256][3]);

/* Numeric biome sampling only. No chunk, world, file, network or JVM API. */
int gpx_biome_tile(const char *version, uint64_t seed, int dim, int cx, int cz, int large, unsigned char *rgb) {
    int mc=strcmp(version,"26.3")==0?MC_26_3:MC_UNDEF;
    if (mc==MC_UNDEF || (dim!=-1 && dim!=0 && dim!=1) || !rgb) return -1;
    Generator g;
    setupGenerator(&g,mc,large?LARGE_BIOMES:0);
    applySeed(&g,dim,seed);
    Range r={0};r.scale=4;r.x=cx*64;r.z=cz*64;r.sx=64;r.sz=64;r.y=16;r.sy=1;
    int *ids=allocCache(&g,r);
    if(!ids)return -2;
    int rc;
    /* mapApproxHeight samples depth at Y=0: it can select cave biomes.
       A surface biome map must explicitly remove the depth parameter. */
    if(dim==DIM_OVERWORLD){
        for(int z=0;z<64;z++)for(int x=0;x<64;x++)
            ids[z*64+x]=sampleBiomeNoise(&g.bn,NULL,cx*64+x,0,cz*64+z,NULL,SAMPLE_NO_DEPTH);
        rc=0;
    }
    else rc=genBiomes(&g,ids,r);
    if(rc){free(ids);return rc;}
    unsigned char colors[256][3];initBiomeColors(colors);
    for(int z=0;z<64;z++)for(int x=0;x<64;x++){
        int id=ids[z*64+x];
        const unsigned char *color=colors[(id>=0 && id<256)?id:0];
        memcpy(rgb+(z*64+x)*3,color,3);
    }
    free(ids);return 0;
}
