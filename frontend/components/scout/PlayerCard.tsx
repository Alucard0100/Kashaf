import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { ExternalLink, Video, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Twin {
  player_name: string;
  similarity: number;
  context: Record<string, number>;
}

export interface EngineProfile {
  _id: string;
  playerId: string;
  playerName: string;
  unit: string;
  topArchetype: string;
  topPct: number;
  matchCount: number;
  archetypes: Record<string, number>;
  coreFeatures: Record<string, number>;
  contextFeatures: Record<string, number>;
  twins: Twin[];
}

interface PlayerCardProps {
  profile: EngineProfile;
}

const formatTwinName = (value: string): { name: string; season: string } => {
  if (!value) {
    return { name: "Unknown Player", season: "Career" };
  }

  const match = value.match(/^(.*?)\s*\[(.+)\]\s*$/);
  if (!match) {
    return { name: value, season: "Career" };
  }

  const name = match[1].trim() || value;
  const season = match[2].trim() || "Career";
  return { name, season };
};

export function PlayerCard({ profile }: PlayerCardProps) {
  // Format data for Radar Chart
  const radarData = Object.entries(profile.archetypes).map(([key, value]) => ({
    subject: key,
    A: value,
    fullMark: 100,
  }));

  const isReliable = profile.matchCount >= 3;

  return (
    <Card className="bg-white/2 border-white/4 backdrop-blur-xl overflow-hidden hover:border-white/10 transition-all flex flex-col rounded-2xl group shadow-2xl relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-dns-green/5 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
      <CardHeader className="pb-4 border-b border-white/4 relative z-10 p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-2xl font-black flex items-center gap-2 text-white">
              {profile.playerName}
            </CardTitle>
            <div className="flex gap-2 mt-2 flex-wrap text-[10px]">
              <Badge variant="secondary" className="bg-dns-green/10 text-dns-green font-bold uppercase tracking-wider px-2 py-0.5 border border-dns-green/20">
                {profile.unit}
              </Badge>
              <Badge variant="outline" className="text-white/60 bg-white/5 border-white/10 px-2 py-0.5 font-medium hover:bg-white/10 transition-colors cursor-default">
                {profile.topArchetype} ({profile.topPct}%)
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4 relative top-1">
            {isReliable ? (
              <Badge variant="secondary" className="bg-dns-blue/10 text-dns-blue flex items-center gap-1.5 border border-dns-blue/20 px-2.5 py-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-semibold text-[10px] uppercase tracking-wider">Reliable Data</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 flex items-center gap-1.5 border border-amber-500/20 px-2.5 py-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="font-semibold text-[10px] uppercase tracking-wider">Low Reliability</span>
              </Badge>
            )}
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">{profile.matchCount} Matches Analyzed</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-6 space-y-6 relative z-10">
        {/* Archetype Radar Chart */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/4">
          <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-4">Archetype Breakdown</h4>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#ffffff10" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#ffffff60", fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Archetype"
                  dataKey="A"
                  stroke="#00FF87"
                  strokeWidth={2}
                  fill="#00FF87"
                  fillOpacity={0.15}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f0f13", borderColor: "#ffffff10", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                  formatter={(value: unknown) => {
                    const parsedValue = typeof value === 'number' ? value.toFixed(1) : String(value);
                    return [`${parsedValue}%`, "Fit"];
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Twins Comparison */}
        <div>
          <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-3">Statistical Twins</h4>
          <div className="flex flex-col gap-1">
            {profile.twins.slice(0, 3).map((twin, idx) => {
              const { name, season } = formatTwinName(twin.player_name);
              return (
                <div key={idx} className="flex flex-col py-2 border-b border-white/5 last:border-0">
                  <span className="font-medium text-sm text-white">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    {season} • {twin.similarity.toFixed(2)}% match
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t border-white/4 flex gap-3 relative z-10 bg-white/[0.01]">
        <Button variant="outline" className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all shadow-lg rounded-xl h-11" asChild>
          <Link href={`/dashboard/scout/player/${profile.playerId}`}>
             View Full Report
             <ExternalLink className="w-4 h-4 ml-2 opacity-50" />
          </Link>
        </Button>
        <Button variant="secondary" className="w-12 px-0 bg-dns-blue/10 text-dns-blue hover:bg-dns-blue/20 transition-colors border-0 rounded-xl h-11" asChild>
          <Link href={`/dashboard/scout/player/${profile.playerId}/videos`}>
             <Video className="w-4 h-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
