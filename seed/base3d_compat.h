/* 26.3 SmearedPerlinNoise includes SHIFT_UP_EPSILON before the vertical
 * floor. The upstream legacy sampler omits it and crosses octave cells at
 * exact boundaries, producing a different base density. Base noise only. */
static double gpx_grad(unsigned h,double x,double y,double z){
    const int X[16]={1,-1,1,-1,1,-1,1,-1,0,0,0,0,1,0,-1,0};
    const int Y[16]={1,1,-1,-1,0,0,0,0,1,-1,1,-1,1,-1,1,-1};
    const int Z[16]={0,0,0,0,1,1,-1,-1,1,1,-1,-1,0,1,0,-1};
    h&=15;return X[h]*x+Y[h]*y+Z[h]*z;
}
static double gpx_fade(double t){return t*t*t*(t*(t*6-15)+10);}
static double gpx_smeared(const PerlinNoise*n,double x,double y,double z,double yscale,double ymax){
    x+=n->a;y+=n->b;z+=n->c;
    int ix=(int)floor(x),iy=(int)floor(y),iz=(int)floor(z);
    x-=floor(x);y-=floor(y);z-=floor(z);double fy=gpx_fade(y);
    if(yscale){double limit=ymax>=0&&ymax<y?ymax:y;y-=floor(limit/yscale+(double)(float)1e-7)*yscale;}
    double v[2];
    for(int dz=0;dz<2;dz++){
        double row[2];
        for(int dy=0;dy<2;dy++){
            double col[2];
            for(int dx=0;dx<2;dx++){
                unsigned a=n->d[(ix+dx)&255],b=n->d[(a+iy+dy)&255],h=n->d[(b+iz+dz)&255];
                col[dx]=gpx_grad(h,x-dx,y-dy,z-dz);
            }
            row[dy]=lerp(gpx_fade(x),col[0],col[1]);
        }
        v[dz]=lerp(fy,row[0],row[1]);
    }
    return lerp(gpx_fade(z),v[0],v[1]);
}
static double gpx_base3d(BlendedNoise*bn,int x,int y,int z){
    double sx=x*bn->xzMultiplier,sy=y*bn->yMultiplier,sz=z*bn->xzMultiplier;
    double fx=sx/bn->xzFactor,fy=sy/bn->yFactor,fz=sz/bn->xzFactor;
    double main=0,lo=0,hi=0,o=1;
    for(int i=0;i<8;i++,o*=.5)main+=gpx_smeared(&bn->octmain.octaves[i],maintainPrecision(fx*o),maintainPrecision(fy*o),maintainPrecision(fz*o),bn->factoredSmearedYScale*o,fy*o)/o;
    double q=(main/10+1)/2;o=1;
    for(int i=0;i<16;i++,o*=.5){
        double ax=maintainPrecision(sx*o),ay=maintainPrecision(sy*o),az=maintainPrecision(sz*o);
        if(q<1)lo+=gpx_smeared(&bn->octmin.octaves[i],ax,ay,az,bn->smearedYScale*o,sy*o)/o;
        if(q>0)hi+=gpx_smeared(&bn->octmax.octaves[i],ax,ay,az,bn->smearedYScale*o,sy*o)/o;
    }
    return lerp(clamp(q,0.,1.),lo/512,hi/512)/128;
}
