package com.gpxkiller.webmap;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.*;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

/** Export only immutable snapshots of already-loaded terrain. No chunk loading. */
public final class WebMapPlugin extends JavaPlugin {
 private final Gson json=new Gson();
 private final AtomicReference<byte[]> state=new AtomicReference<>("{\"worlds\":[],\"players\":[]}".getBytes(StandardCharsets.UTF_8));
 private final Map<Material,Integer> colors=new EnumMap<>(Material.class);
 private final Map<UUID,Set<String>> tiles=new HashMap<>();
 private final ArrayDeque<Chunk> pending=new ArrayDeque<>();
 private final Set<String> queued=new HashSet<>();
 private final List<BukkitTask> tasks=new ArrayList<>();
 private volatile Set<String> worldIds=Set.of();
 private ThreadPoolExecutor writer,httpPool;
 private HttpServer server;
 private Path root;
 private byte[] auth;
 private long lastWarning;
 private int maxTiles;
 private boolean stopping;
 @Override public void onEnable(){
  saveDefaultConfig(); root=getDataFolder().toPath().resolve("export").toAbsolutePath().normalize();
  maxTiles=Math.max(1,Math.min(1000000,getConfig().getInt("max-tiles-per-world",65536)));
  try{Files.createDirectories(root);if(Files.isSymbolicLink(root)||Files.isSymbolicLink(root.getParent()))throw new IOException("Linked export directory refused");}
  catch(IOException e){getLogger().severe("Cannot initialize export directory");getServer().getPluginManager().disablePlugin(this);return;}
  for(Material m:Material.values())if(m.isBlock())try{colors.put(m,m.createBlockData().getMapColor().asRGB());}catch(IllegalArgumentException ignored){}
  writer=pool(1,16,"webmap-export");
  tasks.add(getServer().getScheduler().runTaskTimer(this,this::capture,1,1));
  tasks.add(getServer().getScheduler().runTaskTimer(this,this::refresh,1,Math.max(5,getConfig().getInt("refresh-seconds",60))*20L));
  String password=System.getenv("WEBMAP_PASSWORD");
  if(password==null||password.length()<16){getLogger().warning("HTTP disabled: set WEBMAP_PASSWORD (at least 16 characters) and restart.");return;}
  auth=digest((getConfig().getString("username","admin")+":"+password).getBytes(StandardCharsets.UTF_8));
  try{server=HttpServer.create(new InetSocketAddress("127.0.0.1",getConfig().getInt("port",9127)),16);httpPool=pool(2,32,"webmap-http");server.setExecutor(httpPool);server.createContext("/",this::serve);server.start();getLogger().info("Private read-only map ready on loopback.");}
  catch(IOException|IllegalArgumentException e){getLogger().severe("HTTP listener unavailable; terrain export remains active.");}
 }
 private static ThreadPoolExecutor pool(int n,int capacity,String name){return new ThreadPoolExecutor(n,n,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(capacity),r->{Thread t=new Thread(r,name);t.setDaemon(true);return t;},new ThreadPoolExecutor.AbortPolicy());}
 private List<World> worlds(){List<String> allow=getConfig().getStringList("worlds");return getServer().getWorlds().stream().filter(w->allow.isEmpty()||allow.contains(w.getName())).toList();}
 private void refresh(){
  List<Map<String,Object>> ws=new ArrayList<>(),generation=new ArrayList<>(),players=new ArrayList<>();Set<String> ids=new HashSet<>();
  for(World w:worlds()){
   UUID id=w.getUID();ids.add(id.toString());Set<String> known=tiles.computeIfAbsent(id,k->scan(k));
   for(Chunk c:w.getLoadedChunks()){String key=id+"/"+c.getX()+"_"+c.getZ();if(pending.size()<2048&&queued.add(key))pending.add(c);}
   Map<String,Object> row=new LinkedHashMap<>();row.put("id",id.toString());row.put("name",w.getName());row.put("key",w.getEnvironment().name());row.put("spawnX",w.getSpawnLocation().getBlockX());row.put("spawnZ",w.getSpawnLocation().getBlockZ());row.put("tiles",new ArrayList<>(known));ws.add(row);
   // Private worker input: never included in HTTP state or served as a file.
   Map<String,Object> gen=new LinkedHashMap<>(row);gen.remove("tiles");gen.put("seed",Long.toString(w.getSeed()));gen.put("large",w.getWorldType()==WorldType.LARGE_BIOMES);gen.put("version",Bukkit.getMinecraftVersion());gen.put("supported",getConfig().getBoolean("seed-preview",false)&&w.getGenerator()==null&&(w.getWorldType()==WorldType.NORMAL||w.getWorldType()==WorldType.LARGE_BIOMES));generation.add(gen);
   if(getConfig().getBoolean("show-players",false))for(var p:w.getPlayers())if(!p.hasMetadata("vanished")){var l=p.getLocation();players.add(Map.of("id",p.getUniqueId().toString(),"name",p.getName(),"world",id.toString(),"x",l.getX(),"z",l.getZ(),"status","online"));}
  }
  worldIds=Set.copyOf(ids);byte[] bytes=json.toJson(Map.of("generatedAt",System.currentTimeMillis(),"worlds",ws,"players",players)).getBytes(StandardCharsets.UTF_8);state.set(bytes);
  submit(()->{atomic(root.resolve("state.json"),bytes);atomic(root.resolve("private/generation.json"),json.toJson(generation).getBytes(StandardCharsets.UTF_8));});
 }
 private Set<String> scan(UUID id){Set<String> out=new LinkedHashSet<>();Path dir=root.resolve("tiles/"+id);if(Files.isSymbolicLink(dir))return out;try(var files=Files.newDirectoryStream(dir,"*.png")){for(Path f:files){String s=f.getFileName().toString().replace(".png","");if(s.matches("-?\\d{1,7}_-?\\d{1,7}")&&out.size()<maxTiles)out.add(s);}}catch(IOException ignored){}return out;}
 private void capture(){
  if(pending.isEmpty()||writer.getQueue().remainingCapacity()==0)return;
  Chunk c=pending.remove();String tile=c.getX()+"_"+c.getZ();UUID world=c.getWorld().getUID();queued.remove(world+"/"+tile);
  if(!c.isLoaded()||!worldIds.contains(world.toString()))return;
  Set<String> known=tiles.get(world);if(!known.contains(tile)&&known.size()>=maxTiles)return;
  ChunkSnapshot snapshot=c.getChunkSnapshot(true,false,false);int min=c.getWorld().getMinHeight(),max=c.getWorld().getMaxHeight();boolean nether=c.getWorld().getEnvironment()==World.Environment.NETHER;
  submit(()->{BufferedImage image=new BufferedImage(16,16,BufferedImage.TYPE_INT_RGB);for(int z=0;z<16;z++)for(int x=0;x<16;x++){int y=Math.min(max-1,snapshot.getHighestBlockYAt(x,z));if(nether){y=Math.min(110,y);while(y>min&&(!snapshot.getBlockType(x,y+1,z).isAir()||snapshot.getBlockType(x,y,z).isAir()))y--; }image.setRGB(x,z,colors.getOrDefault(y>=min?snapshot.getBlockType(x,y,z):Material.AIR,0x172124));}ByteArrayOutputStream out=new ByteArrayOutputStream();ImageIO.write(image,"png",out);atomic(root.resolve("tiles/"+world+"/"+tile+".png"),out.toByteArray());if(!stopping)getServer().getScheduler().runTask(this,()->{Set<String> current=tiles.get(world);if(current!=null)current.add(tile);});});
 }
 @FunctionalInterface private interface Job{void run()throws IOException;}
 private void submit(Job job){try{writer.execute(()->{try{job.run();}catch(IOException|RuntimeException e){warn();}});}catch(RejectedExecutionException ignored){warn();}}
 private void warn(){long now=System.currentTimeMillis();if(now-lastWarning>60000){lastWarning=now;getLogger().warning("Export busy or unavailable; keeping previous tiles.");}}
 private static void atomic(Path target,byte[] bytes)throws IOException{Files.createDirectories(target.getParent());for(Path p=target;p!=null;p=p.getParent())if(Files.isSymbolicLink(p))throw new IOException("Linked path refused");Path temp=Files.createTempFile(target.getParent(),"map-",".tmp");try{Files.write(temp,bytes);Files.move(temp,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}finally{Files.deleteIfExists(temp);}}
 private static byte[] digest(byte[] b){try{return MessageDigest.getInstance("SHA-256").digest(b);}catch(Exception e){throw new IllegalStateException(e);}}
 private boolean authorized(HttpExchange x){String h=x.getRequestHeaders().getFirst("Authorization");if(h==null||h.length()>4096||!h.startsWith("Basic "))return false;try{return MessageDigest.isEqual(auth,digest(Base64.getDecoder().decode(h.substring(6))));}catch(IllegalArgumentException e){return false;}}
 private void serve(HttpExchange x)throws IOException{
  try{
   var h=x.getResponseHeaders();h.set("Cache-Control","private, no-store");h.set("X-Content-Type-Options","nosniff");h.set("Content-Security-Policy","default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'");h.set("Referrer-Policy","no-referrer");
   if(!authorized(x)){h.set("WWW-Authenticate","Basic realm=\"WebMapMinecraft\", charset=\"UTF-8\"");send(x,401,"text/plain","Authentication required".getBytes(StandardCharsets.UTF_8));return;}
   if(!x.getRequestMethod().equals("GET")){send(x,405,"text/plain",new byte[0]);return;}
   String path=x.getRequestURI().getPath();
   if(path.equals("/api/state")){send(x,200,"application/json",state.get());return;}
   String resource=switch(path){case "/"->"index.html";case "/app.js"->"app.js";case "/style.css"->"style.css";default->null;};
   if(resource!=null){try(InputStream in=getResource("web/"+resource)){if(in!=null){send(x,200,resource.endsWith("js")?"text/javascript":resource.endsWith("css")?"text/css":"text/html; charset=utf-8",in.readAllBytes());return;}}}
   var match=Pattern.compile("^/api/(tile|preview)/([0-9a-f-]{36})/(-?\\d{1,7})_(-?\\d{1,7})\\.png$").matcher(path);
   if(match.matches()&&worldIds.contains(match.group(2))){String type=match.group(1),id=match.group(2);int tx=Integer.parseInt(match.group(3)),tz=Integer.parseInt(match.group(4));int bound=type.equals("preview")?117187:1874999;if(Math.abs(tx)<=bound&&Math.abs(tz)<=bound){Path p=root.resolve((type.equals("tile")?"tiles/":"preview/terrain256surface5/")+id+"/"+tx+"_"+tz+".png");boolean safe=true;for(Path q=p;q!=null;q=q.getParent())if(Files.isSymbolicLink(q))safe=false;if(safe&&Files.isRegularFile(p)&&Files.size(p)<1048576){send(x,200,"image/png",Files.readAllBytes(p));return;}}}
   send(x,404,"text/plain",new byte[0]);
  }finally{x.close();}
 }
 private static void send(HttpExchange x,int code,String type,byte[] data)throws IOException{x.getResponseHeaders().set("Content-Type",type);x.sendResponseHeaders(code,data.length);x.getResponseBody().write(data);}
 @Override public void onDisable(){stopping=true;tasks.forEach(BukkitTask::cancel);pending.clear();if(server!=null)server.stop(0);if(httpPool!=null)httpPool.shutdownNow();if(writer!=null){writer.shutdown();try{if(!writer.awaitTermination(5,TimeUnit.SECONDS))writer.shutdownNow();}catch(InterruptedException e){Thread.currentThread().interrupt();writer.shutdownNow();}}}
}
