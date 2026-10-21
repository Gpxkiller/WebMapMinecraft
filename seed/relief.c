#include "terrainnoise.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "base3d_compat.h"
/* Interpolate the raw, slid density BEFORE squeeze/noodle surface decisions.
 * Interpolating already-squeezed final density moves coast crossings. */
static void raw_column(TerrainNoise*t,int qx,int qz,double out[49]){
    float np[4];sampleNoiseParameters(&t->g.bn,qx,qz,np);
    double depth=getSpline(t->g.bn.sp,np)-.50375f,factor=getSpline(t->factorSpline,np);
    int x=qx*4,z=qz*4;
    double jag=sampleDoublePerlin(&t->noises[OTP_JAGGED],x*1500.,0,z*1500.);
    jag=(jag>=0?jag:jag*.5)*getSpline(t->jaggednessSpline,np);
    for(int i=0;i<49;i++){
        int y=-64+i*8;double r=sampleSpaghettiRoughness(t,x,y,z),e=sampleEntrances(t,x,y,z,r);
        double gradient=factor*(depth+clampedMap(y,-64,320,1.5,-1.5)+jag);
        double s=(gradient>0?gradient*4:gradient)+gpx_base3d(&t->base3dNoise,x,y,z);
        double value=(s>=-1000000&&s<1.5625)?fmin(s,5*e):sampleUnderground(t,x,y,z,r,e,s);
        double top=lerp(clamp((256.-y)/16.,0.,1.),-.078125,value);
        out[i]=lerp(clamp((y+64.)/24.,0.,1.),.1171875,top);
    }
}
/* Vanilla interpolates each noodle input on its 4x8x4 cell BEFORE abs/max
 * and the threshold decision. Direct block-noise sampling shifts cave roofs. */
static double noodle_input(TerrainNoise*t,int type,int x,int y,int z,double scale){
    int gx=(int)floor(x/4.)*4,gy=(int)floor(y/8.)*8,gz=(int)floor(z/4.)*4;
    double a[2];
    for(int j=0;j<2;j++){
        double b[2];
        for(int k=0;k<2;k++){
            double c[2];
            for(int i=0;i<2;i++){
                int sy=gy+j*8;
                if(sy < -60 || sy > 320)c[i]=type==OTP_NOODLE?-1.:0.;
                else {
                    c[i]=sampleDoublePerlin(&t->noises[type],(gx+i*4)*scale,sy*scale,(gz+k*4)*scale);
                    if(type==OTP_NOODLE_THICKNESS)c[i]=map(c[i],-1.,1.,-.05,-.1);
                }
            }
            b[k]=lerp((x-gx)/4.,c[0],c[1]);
        }
        a[j]=lerp((z-gz)/4.,b[0],b[1]);
    }
    return lerp((y-gy)/8.,a[0],a[1]);
}
static double interpolated_noodle(TerrainNoise*t,int x,int y,int z){
    if(noodle_input(t,OTP_NOODLE,x,y,z,1.)<0)return 64.;
    double thickness=noodle_input(t,OTP_NOODLE_THICKNESS,x,y,z,1.);
    double a=noodle_input(t,OTP_NOODLE_RIDGE_A,x,y,z,2.6666666666666665);
    double b=noodle_input(t,OTP_NOODLE_RIDGE_B,x,y,z,2.6666666666666665);
    return thickness+1.5*fmax(fabs(a),fabs(b));
}
static short crossing(TerrainNoise*t,const double*a,const double*b,const double*c,const double*d,int x,int z,double fx,double fz){
    double col[49];for(int i=0;i<49;i++)col[i]=lerp(fz,lerp(fx,a[i],c[i]),lerp(fx,b[i],d[i]));
    for(int y=319;y>=-64;y--){int i=(y+64)/8;double f=((y+64)%8)/8.;if(lerp(f,col[i],col[i+1])>0&&interpolated_noodle(t,x,y,z)>0)return y;}
    return -65;
}
int gpx_relief_point(uint64_t seed,int x,int z,int large){
    TerrainNoise t={0};setupTerrainNoise(&t,MC_26_3,large?LARGE_BIOMES:0);initTerrainNoise(&t,seed,DIM_OVERWORLD);
    int qx=(int)floor(x/4.),qz=(int)floor(z/4.);double a[49],b[49],c[49],d[49];
    raw_column(&t,qx,qz,a);raw_column(&t,qx,qz+1,b);raw_column(&t,qx+1,qz,c);raw_column(&t,qx+1,qz+1,d);
    return crossing(&t,a,b,c,d,x,z,(x-qx*4)/4.,(z-qz*4)/4.);
}
/* Density arithmetic only: no Chunk/World objects, block buffers, files or JVM.
 * Output is the highest solid density crossing, before trees/buildings/fluids. */
int gpx_relief_heights(uint64_t seed,int areaX,int areaZ,int large,short *heights){
    if(!heights || areaX < -117187 || areaX > 117187 || areaZ < -117187 || areaZ > 117187)return -1;
    TerrainNoise *t=calloc(1,sizeof(*t)); /* spline stack length must start at zero */
    double *columns=malloc(65*65*49*sizeof(double));
    if(!t||!columns){free(t);free(columns);return -2;}
    setupTerrainNoise(t,MC_26_3,large?LARGE_BIOMES:0);
    initTerrainNoise(t,seed,DIM_OVERWORLD);
    for(int z=0;z<=64;z++)for(int x=0;x<=64;x++)
        raw_column(t,areaX*64+x,areaZ*64+z,columns+(z*65+x)*49);
    for(int z=0;z<64;z++)for(int x=0;x<64;x++){
        const double *p=columns+(z*65+x)*49;
        heights[z*64+x]=crossing(t,p,p+65*49,p+49,p+66*49,areaX*256+x*4+2,areaZ*256+z*4+2,.5,.5);
    }
    free(columns);free(t);return 0;
}
