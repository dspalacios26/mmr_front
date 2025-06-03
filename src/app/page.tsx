"use client";

import { useState, useEffect, useRef } from "react";

// Define types for data structures
interface RankData {
  name: string;
  mmr: number;
  color: string;
  shortName: string;
}

interface CalculatedMMRData {
  summoner_name: string;
  tag_line: string;
  region: string;
  mmr: number;
  rank: string;
  division_display: string;
  lp_equivalent: number;
  confidence_level: number;
  games_analyzed: number;
  last_updated: string;
  rank_display: string;
}

interface ApiResponse {
  success: boolean;
  data?: CalculatedMMRData;
  error?: string;
}

const initialRankData: RankData[] = [
  { name: "Iron", mmr: 400, color: "var(--color-iron)", shortName: "I" },
  { name: "Bronze", mmr: 800, color: "var(--color-bronze)", shortName: "B" },
  { name: "Silver", mmr: 1200, color: "var(--color-silver)", shortName: "S" },
  { name: "Gold", mmr: 1600, color: "var(--color-gold)", shortName: "G" },
  { name: "Platinum", mmr: 2000, color: "var(--color-platinum)", shortName: "P" },
  { name: "Emerald", mmr: 2400, color: "var(--color-emerald)", shortName: "E" },
  { name: "Diamond", mmr: 2800, color: "var(--color-diamond)", shortName: "D" },
  { name: "Master", mmr: 3200, color: "var(--color-master)", shortName: "M" },
  { name: "Grandmaster", mmr: 3600, color: "var(--color-grandmaster)", shortName: "GM" },
  { name: "Challenger", mmr: 4000, color: "var(--color-challenger)", shortName: "C" }
];


export default function HomePage() {
  const [rawSummonerInput, setRawSummonerInput] = useState(""); // New state for raw input
  const [selectedRegion, setSelectedRegion] = useState<{ value: string; label: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeQueue, setActiveQueue] = useState<string | null>(null); // 'solo' or 'flex'
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mmrResult, setMmrResult] = useState<CalculatedMMRData | null>(null);
  const [showResultContainer, setShowResultContainer] = useState(false);
  const [showRankComparison, setShowRankComparison] = useState(false);
  const [displayedMmr, setDisplayedMmr] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const summonerInputRef = useRef<HTMLInputElement>(null);
  const regionSelectRef = useRef<HTMLDivElement>(null);


  const regions = [
    { value: "na1", label: "NA" },
    { value: "euw1", label: "EUW" },
    { value: "eun1", label: "EUNE" },
    { value: "kr", label: "KR" },
    { value: "br1", label: "BR" },
    { value: "la1", label: "LAN" },
    { value: "la2", label: "LAS" },
    { value: "oc1", label: "OCE" },
    { value: "tr1", label: "TR" },
    { value: "ru", label: "RU" },
    // Add other regions from your Python backend if needed
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSummonerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRawSummonerInput(e.target.value); // Directly set the raw input
    if (errorMessage) setErrorMessage(null);
    summonerInputRef.current?.classList.remove('input-error');
  };

  const handleRegionSelect = (region: { value: string; label: string }) => {
    setSelectedRegion(region);
    setIsDropdownOpen(false);
    if (errorMessage) setErrorMessage(null);
    regionSelectRef.current?.classList.remove('input-error');
  };

  const toggleQueue = (queue: 'solo' | 'flex') => {
    setActiveQueue(prev => (prev === queue ? null : queue));
    if (errorMessage) setErrorMessage(null);
  };

  const validateInputs = (): boolean => {
    let errors: string[] = [];
    let summonerInputError = false;
    let regionSelectError = false;

    const parts = rawSummonerInput.split('#');
    const currentSummonerName = parts[0]?.trim() || '';
    const currentTagLine = parts[1]?.trim() || '';

    if (!currentSummonerName || !currentTagLine) {
      errors.push("enter a summoner name and tag (e.g., Name#TAG)");
      summonerInputRef.current?.classList.add('input-error');
      summonerInputError = true;
    } else {
      summonerInputRef.current?.classList.remove('input-error');
    }

    if (!selectedRegion) {
      errors.push("select a region");
      regionSelectRef.current?.classList.add('input-error');
      regionSelectError = true;
    } else {
      regionSelectRef.current?.classList.remove('input-error');
    }

    if (!activeQueue) {
      errors.push("choose a queue type");
    }

    if (errors.length > 0) {
      let errorMsg = "Please ";
      if (summonerInputError && errors.length > 1 && (regionSelectError || !activeQueue)) errorMsg += `${errors[0]}, `;
      else if (summonerInputError) errorMsg += `${errors[0]}`;

      if (regionSelectError && errors.length > 1 && !summonerInputError && !activeQueue) errorMsg += `${errors[errors.indexOf("select a region")]}, and `;
      else if (regionSelectError && errors.length > 1 && !summonerInputError) errorMsg += `${errors[errors.indexOf("select a region")]}, and `;
      else if (regionSelectError) errorMsg += `${errors[errors.indexOf("select a region")]}`;


      if (!activeQueue && errors.length > 1 && (summonerInputError || regionSelectError)) errorMsg += `and ${errors[errors.length -1]}`;
      else if (!activeQueue) errorMsg += `${errors[errors.length -1]}`;


      // Simplified error message construction
      if (errors.length > 0) {
        setErrorMessage(`Please ${errors.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`);
      }
      return false;
    }
    return true;
  };
  
  useEffect(() => {
    if (mmrResult?.mmr) {
      let count = 0;
      const targetMmr = mmrResult.mmr;
      const duration = 1500; // ms
      const intervalTime = 20; // ms
      const increment = targetMmr / (duration / intervalTime);

      const timer = setInterval(() => {
        count += increment;
        if (count >= targetMmr) {
          setDisplayedMmr(Math.floor(targetMmr));
          clearInterval(timer);
        } else {
          setDisplayedMmr(Math.floor(count));
        }
      }, intervalTime);
      return () => clearInterval(timer);
    }
  }, [mmrResult]);


  const handleSubmit = async () => {
    setErrorMessage(null);
    summonerInputRef.current?.classList.remove('input-error');
    regionSelectRef.current?.classList.remove('input-error');

    const parts = rawSummonerInput.split('#');
    const currentSummonerName = parts[0]?.trim() || '';
    const currentTagLine = parts[1]?.trim() || '';

    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    setMmrResult(null);
    setShowResultContainer(false);
    setShowRankComparison(false);

    const queueTypeMap = {
      solo: 420,
      flex: 440
    };

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summonerName: currentSummonerName,
          tagLine: currentTagLine,
          region: selectedRegion?.value,
          queueType: activeQueue ? queueTypeMap[activeQueue as 'solo' | 'flex'] : undefined,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (result.success && result.data) {
        setMmrResult(result.data);
        setShowResultContainer(true);
        setTimeout(() => setShowRankComparison(true), 300);
      } else {
        setErrorMessage(result.error || "An unknown error occurred.");
      }
    } catch (error) {
      console.error("Calculation error:", error);
      setErrorMessage("Failed to connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  
    // Rank bar logic (simplified, adapt as needed from skel.html)
  const findCurrentRank = (userMMR: number) => {
    let currentRank = initialRankData[0];
    let nextRank: RankData | null = null;
    let prevRank: RankData | null = null;

    for (let i = 0; i < initialRankData.length; i++) {
      if (initialRankData[i].mmr <= userMMR) {
        currentRank = initialRankData[i];
        if (i > 0) prevRank = initialRankData[i - 1];
        if (i < initialRankData.length - 1) nextRank = initialRankData[i + 1];
      } else {
        if (!nextRank) nextRank = initialRankData[i]; // First rank with MMR > userMMR
        break;
      }
    }
     if (!nextRank && initialRankData.length > 0 && userMMR >= initialRankData[initialRankData.length -1].mmr) {
        currentRank = initialRankData[initialRankData.length -1];
        prevRank = initialRankData.length > 1 ? initialRankData[initialRankData.length -2] : null;
    }


    return { currentRank, nextRank, prevRank };
  };

  const getRankBarView = (userMMR: number) => {
    const { currentRank, nextRank, prevRank } = findCurrentRank(userMMR);
    let minMMR: number, maxMMR: number;
    let visibleRanks: RankData[] = [];

    if (prevRank && nextRank) {
      minMMR = prevRank.mmr;
      maxMMR = nextRank.mmr;
      visibleRanks = [prevRank, currentRank, nextRank];
    } else if (prevRank) { // At highest or near highest
      minMMR = prevRank.mmr;
      maxMMR = currentRank.mmr + (currentRank.mmr - prevRank.mmr); // Symmetrical extension
      visibleRanks = [prevRank, currentRank];
    } else if (nextRank) { // At lowest or near lowest
      minMMR = Math.max(0, currentRank.mmr - (nextRank.mmr - currentRank.mmr)); // Symmetrical extension
      maxMMR = nextRank.mmr;
      visibleRanks = [currentRank, nextRank];
    } else { // Only one rank or user MMR is outside all defined ranks
      minMMR = Math.max(0, currentRank.mmr - 100);
      maxMMR = currentRank.mmr + 100;
      visibleRanks = [currentRank];
    }
    
    // Ensure maxMMR is always greater than minMMR to avoid division by zero
    if (maxMMR <= minMMR) maxMMR = minMMR + 200; // Default range if ranks are too close or identical

    const userPosition = Math.max(0, Math.min(100, ((userMMR - minMMR) / (maxMMR - minMMR)) * 100));

    const markers = visibleRanks.map(rank => ({
      ...rank,
      position: Math.max(0, Math.min(100, ((rank.mmr - minMMR) / (maxMMR - minMMR)) * 100)),
    }));
    
    // Create gradient
    let gradientStops = "";
    if (markers.length >= 2) {
        markers.sort((a,b) => a.mmr - b.mmr).forEach((rank, index) => {
            gradientStops += `${rank.color} ${rank.position}%`;
            if (index < markers.length - 1) gradientStops += `, `;
        });
    } else if (markers.length === 1) {
        gradientStops = `${markers[0].color} 0%, ${markers[0].color} 100%`;
    } else {
        gradientStops = `var(--color-iron) 0%, var(--color-challenger) 100%`;
    }
    const gradient = `linear-gradient(to right, ${gradientStops})`;

    return { userPosition, markers, gradient };
  };

  const rankBarDisplay = mmrResult ? getRankBarView(mmrResult.mmr) : null;


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="title text-4xl md:text-5xl font-bold mb-12 text-center mx-auto">ranked.</h1>

        <div className="outer-container">
          <div className="main-container p-8 relative">
            <div className="corner-decoration top-left"></div>
            <div className="corner-decoration top-right"></div>
            <div className="corner-decoration bottom-left"></div>
            <div className="corner-decoration bottom-right"></div>

            {errorMessage && (
              <div id="errorMessage" className={`error-message ${errorMessage ? 'show' : ''}`}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="#FF4655"/>
                </svg>
                <span id="errorText">{errorMessage}</span>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-taupe)' }}>
                Summoner&apos;s name + tag
              </label>
              <div className="flex space-x-3">
                <div className="flex-grow">
                  <input
                    type="text"
                    id="summonerInput"
                    ref={summonerInputRef}
                    placeholder="Summoner#TAG"
                    className="summoner-input w-full py-3 px-4 rounded-md"
                    value={rawSummonerInput} // Bind to rawSummonerInput
                    onChange={handleSummonerInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="w-28" ref={dropdownRef}>
                  <div className="custom-select">
                    <div 
                      id="selectBox" 
                      ref={regionSelectRef}
                      className={`select-box ${isDropdownOpen ? 'focused' : ''}`} 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <span id="selectedOption">{selectedRegion ? selectedRegion.label : 'Region'}</span>
                      <svg 
                        className="arrow w-5 h-5" 
                        style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                    {isDropdownOpen && (
                      <div id="options" className="options" style={{ display: 'block' }}>
                        {regions.map((region) => (
                          <div
                            key={region.value}
                            className="option"
                            data-value={region.value}
                            onClick={() => handleRegionSelect(region)}
                          >
                            {region.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mb-8">
              <button
                id="btn1"
                className={`toggle-btn flex-1 py-4 px-4 rounded-md font-medium ${activeQueue === 'solo' ? 'active' : ''}`}
                onClick={() => toggleQueue('solo')}
                disabled={isLoading}
              >
                <div className="icon">
                  <svg className="queue-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 12C22.2091 12 24 10.2091 24 8C24 5.79086 22.2091 4 20 4C17.7909 4 16 5.79086 16 8C16 10.2091 17.7909 12 20 12Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 12V16M20 16L24 20M20 16L16 20" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 28C14.2091 28 16 26.2091 16 24C16 21.7909 14.2091 20 12 20C9.79086 20 8 21.7909 8 24C8 26.2091 9.79086 28 12 28Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M28 28C30.2091 28 32 26.2091 32 24C32 21.7909 30.2091 20 28 20C25.7909 20 24 21.7909 24 24C24 26.2091 25.7909 28 28 28Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 28V32" stroke="currentColor" strokeWidth="2"/>
                    <path d="M28 28V32" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 32H28" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <span>Ranked Solo/Duo</span>
              </button>
              <button
                id="btn2"
                className={`toggle-btn flex-1 py-4 px-4 rounded-md font-medium ${activeQueue === 'flex' ? 'active' : ''}`}
                onClick={() => toggleQueue('flex')}
                disabled={isLoading}
              >
                <div className="icon">
                  <svg className="queue-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 10C21.6569 10 23 8.65685 23 7C23 5.34315 21.6569 4 20 4C18.3431 4 17 5.34315 17 7C17 8.65685 18.3431 10 20 10Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M10 16C11.6569 16 13 14.6569 13 13C13 11.3431 11.6569 10 10 10C8.34315 10 7 11.3431 7 13C7 14.6569 8.34315 16 10 16Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M30 16C31.6569 16 33 14.6569 33 13C33 11.3431 31.6569 10 30 10C28.3431 10 27 11.3431 27 13C27 14.6569 28.3431 16 30 16Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 26C15.6569 26 17 24.6569 17 23C17 21.3431 15.6569 20 14 20C12.3431 20 11 21.3431 11 23C11 24.6569 12.3431 26 14 26Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M26 26C27.6569 26 29 24.6569 29 23C29 21.3431 27.6569 20 26 20C24.3431 20 23 21.3431 23 23C23 24.6569 24.3431 26 26 26Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 10V14" stroke="currentColor" strokeWidth="2"/>
                    <path d="M10 16V20" stroke="currentColor" strokeWidth="2"/>
                    <path d="M30 16V20" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 26V30" stroke="currentColor" strokeWidth="2"/>
                    <path d="M26 26V30" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 30H26" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 14L10 20" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 14L30 20" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <span>Ranked Flex</span>
              </button>
            </div>

            <button
              id="calculateBtn"
              className="calculate-btn w-full py-4 px-4 rounded-md font-semibold text-lg"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Calculating...' : 'Calculate'}
            </button>

            <div id="resultContainer" className={`result-container mt-8 flex items-center justify-center ${showResultContainer ? 'show' : ''}`}>
              {mmrResult && (
                <div id="result" className="result text-center w-full show">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium mb-1 opacity-80">Your MMR is:</span>
                    <span id="resultNumber" className="result-number block text-6xl font-bold">
                      {displayedMmr}
                    </span>
                    <div className="mt-2 text-sm opacity-80">
                      <span>{mmrResult.rank_display} ({mmrResult.lp_equivalent} LP Equivalent)</span>
                      <br />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="rankComparisonContainer" className={`rank-comparison-container ${showRankComparison ? 'show' : ''}`}>
          {mmrResult && rankBarDisplay && (
            <div className="outer-container">
              <div className="main-container rank-comparison relative p-6">
                 <div className="corner-decoration top-left"></div>
                 <div className="corner-decoration top-right"></div>
                 <div className="corner-decoration bottom-left"></div>
                 <div className="corner-decoration bottom-right"></div>
                <h3 className="section-title">Rank Comparison</h3>
                <div className="rank-bar-container">
                  <div 
                    className="rank-bar" 
                    id="rankBar"
                    style={{ background: rankBarDisplay.gradient }}
                  >
                    <div 
                        id="yourRankMarker" 
                        className="your-rank-marker" 
                        style={{ left: `${rankBarDisplay.userPosition}%` }}
                    >
                      <div id="yourRankLabel" className="your-rank-label">
                        Your MMR: {mmrResult.mmr}
                      </div>
                    </div>
                    {rankBarDisplay.markers.map((marker) => (
                      <div
                        key={marker.name}
                        className={`rank-marker ${mmrResult.rank === marker.name.toUpperCase() ? 'current-rank-marker' : ''}`}
                        style={{ left: `${marker.position}%`, color: marker.color }}
                      >
                        <div className="rank-icon-container">
                          <div className="rank-icon-bg" style={{borderColor: marker.color, boxShadow: `0 0 5px ${marker.color}`}}></div>
                          <div className={`rank-emblem ${marker.name.toLowerCase()}`}>
                            <div className="rank-emblem-inner" style={{ color: marker.name === "Gold" || marker.name === "Challenger" ? 'var(--color-dark-blue)' : 'inherit' }}>{marker.shortName}</div>
                          </div>
                        </div>
                        <div className="rank-name" style={{ color: marker.color }}>{marker.name}</div>
                        <div className="rank-mmr">{marker.mmr}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
