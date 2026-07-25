import React, { useState } from 'react';
import { BusinessInfo, Avatar, DayContent, UplinkData, ClientDetails } from '../types';
import { generateContentCalendar, generateSceneImage } from '../services/geminiService';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { RefreshCw, Image as ImageIcon, Download, ChevronLeft, Plus } from 'lucide-react';
import IntelligenceUplink from './IntelligenceUplink';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { MAT_CHROME, MAT_PLATE } from './ui/materialTokens';

interface OrganicCalendarProps {
  businessInfo: BusinessInfo;
  avatar: Avatar | null;
  clientDetails: ClientDetails;
  onBack: () => void;
}

const OrganicCalendar: React.FC<OrganicCalendarProps> = ({ businessInfo, avatar, clientDetails, onBack }) => {
  const [uplinkData, setUplinkData] = useState<UplinkData | null>(null);
  const [calendar, setCalendar] = useState<DayContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUplinkComplete = (data: UplinkData) => {
    setUplinkData(data);
    fetchCalendar(data);
  };

  const fetchCalendar = async (data: UplinkData) => {
    setLoading(true);
    setError(null);
    try {
      const calendarData = await generateContentCalendar(data);
      setCalendar(calendarData);
    } catch (err) {
      setError("Failed to generate calendar. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesizeAll = async () => {
    if (!uplinkData) return;
    
    setLoading(true);
    setGenCount(0);
    const updated = [...calendar];
    for (let i = 0; i < updated.length; i++) {
        try {
            setGenCount(i + 1);
            updated[i].imageUrl = await generateSceneImage(
                updated[i].imagePrompt,
                uplinkData.aspectRatio,
                uplinkData.resolution,
                { 
                  avatarUrl: uplinkData.avatarAsset || avatar?.url, 
                  productUrl: uplinkData.productAssets?.[0] || businessInfo.productImageUrls?.[0] 
                },
                uplinkData.ethnicityProfile || avatar?.ethnicity,
                uplinkData.hexCodes ? uplinkData.hexCodes.split(',').map(c => c.trim()) : [],
                'Organic',
                uplinkData.inventoryList,
                uplinkData.brandIdentityName,
                i
            );
            setCalendar([...updated]);
        } catch (e) {
            console.error(`Failed Day ${i+1}`, e);
        }
    }
    setLoading(false);
  };

  const handleReRollItem = async (index: number) => {
    if (!uplinkData) return;
    setLoading(true);
    try {
      const updated = [...calendar];
      updated[index].imageUrl = await generateSceneImage(
        updated[index].imagePrompt,
        uplinkData.aspectRatio,
        uplinkData.resolution,
        { 
          avatarUrl: uplinkData.avatarAsset || avatar?.url, 
          productUrl: uplinkData.productAssets?.[0] || businessInfo.productImageUrls?.[0] 
        },
        uplinkData.ethnicityProfile || avatar?.ethnicity,
        uplinkData.hexCodes ? uplinkData.hexCodes.split(',').map(c => c.trim()) : [],
        'Organic',
        uplinkData.inventoryList,
        uplinkData.brandIdentityName,
        index + Math.floor(Math.random() * 100)
      );
      setCalendar(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAsset = async (day: DayContent) => {
    const zip = new JSZip();
    const folderName = `Day_${day.day}_Social_Post`;
    
    const content = `TITLE: ${day.title}\nCAPTION: ${day.caption}\nVIBE: ${day.emotionVibe}\nPLACEMENT: ${day.productPlacement}`;
    zip.file(`${folderName}/post_copy.txt`, content);

    if (day.imageUrl) {
      const imgData = day.imageUrl.split(',')[1];
      zip.file(`${folderName}/visual_asset.png`, imgData, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${folderName}.zip`);
  };

  if (!uplinkData) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8">
        <IntelligenceUplink 
          onBack={onBack} 
          onComplete={handleUplinkComplete}
          globalBusinessInfo={businessInfo}
          globalClientDetails={clientDetails}
          mode="ORGANIC"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white font-sans flex flex-col">
        <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between w-full">
                <button 
                    onClick={() => setUplinkData(null)} 
                    className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-on-surface-sublabel hover:text-white uppercase tracking-widest transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
                </button>
                <div className="flex gap-2 md:gap-4">
                    <button 
                        onClick={() => fetchCalendar(uplinkData)} 
                        className={`flex items-center gap-2 px-3 py-2 md:px-6 md:py-3 ${MAT_PLATE} border border-white/10 hover:border-[#FFCC00] text-zinc-300 hover:text-[#FFCC00] rounded-xl font-mono text-[10px] md:text-xs uppercase tracking-widest transition-all`}
                    >
                        <RefreshCw className="w-4 h-4" /> <span className="hidden md:inline">REGENERATE STRATEGY</span>
                    </button>
                    <GoldButton 
                        onClick={handleSynthesizeAll} 
                        disabled={loading || calendar.length === 0} 
                        className="flex items-center gap-2 px-3 py-2 md:px-6 md:py-3 rounded-xl font-mono text-[10px] md:text-xs uppercase tracking-widest"
                    >
                        <ImageIcon className="w-4 h-4" /> <span className="hidden md:inline">SYNTHESIZE ALL VISUALS</span>
                    </GoldButton>
                </div>
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
                    Campaign Planner
                </h1>
                <p className="text-[10px] text-on-surface-sublabel font-mono tracking-widest uppercase mt-2">
                    // PLAN & SCHEDULE YOUR CONTENT
                </p>
            </div>
        </header>

        <div className="max-w-7xl mx-auto w-full flex-1">
            {loading && <div className="mb-10"><Loader message={genCount > 0 ? `RECONSTRUCTING_DAY_0${genCount}...` : "ENGINEERING_SOCIAL_PLAN..."} /></div>}
            {error && <p className="text-red-500 text-center mb-8 border border-red-900/50 bg-red-900/20 p-4 rounded-xl font-mono text-sm">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
                {calendar.map((day, idx) => (
                    <GlassPanel key={idx} className="overflow-hidden flex flex-col h-full group relative p-0">
                        <div className="aspect-square bg-zinc-900 relative overflow-hidden">
                            {day.imageUrl ? (
                                <img src={day.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center opacity-20 p-8 text-center">
                                    <ImageIcon className="w-12 h-12 mb-4 text-on-surface-sublabel" />
                                    <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">Awaiting Visual Input</p>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 bg-[#FFCC00] text-black text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase shadow-lg">
                                DAY 0{day.day}
                            </div>
                            
                            {day.imageUrl && (
                              <button 
                                onClick={() => handleReRollItem(idx)}
                                className="absolute top-4 right-4 bg-zinc-950/80 hover:bg-[#FFCC00] hover:text-black p-2 rounded-full transition-all text-zinc-400 border border-white/10 hover:border-[#FFCC00]"
                                title="Re-roll Visual"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-zinc-100 font-bold uppercase text-sm mb-2 tracking-wide">{day.title}</h3>
                            <p className="text-xs text-zinc-400 mb-4 line-clamp-3 leading-relaxed">{day.caption}</p>
                            
                            <div className="mt-auto flex flex-col gap-4">
                              <div className="pt-4 border-t border-white/10 space-y-2">
                                  <p className="text-[9px] text-on-surface-sublabel uppercase tracking-widest font-mono">
                                      // VIBE: <span className="text-zinc-300">{day.emotionVibe}</span>
                                  </p>
                                  <p className="text-[9px] text-on-surface-sublabel uppercase tracking-widest font-mono">
                                      // PLACEMENT: <span className="text-[#FFCC00]">{day.productPlacement}</span>
                                  </p>
                              </div>
                              <button 
                                onClick={() => handleDownloadAsset(day)} 
                                className="w-full text-[10px] py-3 border border-white/10 hover:border-[#FFCC00] hover:text-[#FFCC00] text-zinc-400 rounded-xl flex items-center justify-center gap-2 transition-colors font-mono uppercase tracking-widest"
                              >
                                <Download className="w-3 h-3" /> DOWNLOAD ASSET
                              </button>
                            </div>
                        </div>
                    </GlassPanel>
                ))}
            </div>

            {calendar.length > 0 && !loading && (
              <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 ${MAT_CHROME} p-4 rounded-2xl border border-white/10 shadow-2xl z-50 animate-in slide-in-from-bottom-10`}>
                <button 
                    onClick={handleSynthesizeAll} 
                    className="px-8 py-3 text-xs border border-white/10 hover:border-[#FFCC00] text-zinc-300 hover:text-[#FFCC00] rounded-xl flex items-center gap-2 transition-all font-mono uppercase tracking-widest"
                >
                  <RefreshCw className="w-4 h-4" /> REGENERATE ALL
                </button>
                <GoldButton 
                    onClick={() => setUplinkData(null)} 
                    className="px-8 py-3 text-xs flex items-center gap-2 rounded-xl font-mono uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" /> CREATE NEW BATCH
                </GoldButton>
              </div>
            )}
        </div>
    </div>
  );
};

export default OrganicCalendar;