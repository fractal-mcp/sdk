import type { NWSHourlyForecast, NWSHourlyForecastPeriod } from '../server/types'
import "./index.css"
import { useFractal } from '@fractal-mcp/composer';
import { useState, useMemo } from 'react';

type TabType = 'temperature' | 'precipitation' | 'wind';

export default function HourlyForecast() {
    const { data, error } = useFractal()
    const [activeTab, setActiveTab] = useState<TabType>('temperature');

    // All hooks must be called consistently - move all useState to main component
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);

    // Move useMemo above early returns - provide safe fallback for when data is missing
    const chartData = useMemo(() => {
        if (!data || !data.properties || !data.properties.periods) {
            return [];
        }
        
        const formatTime = (dateString: string): string => {
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                hour12: true
            });
        };
        
        return data.properties.periods.slice(0, 24).map((period: NWSHourlyForecastPeriod, index: number) => ({
            index,
            time: formatTime(period.startTime),
            temperature: period.temperature || 0,
            precipitation: period.probabilityOfPrecipitation?.value || 0,
            windSpeed: parseFloat(period.windSpeed?.replace(/[^\d.]/g, '') || '0'),
            windDirection: period.windDirection,
            shortForecast: period.shortForecast,
            period
        }));
    }, [data]);

    if (error) {
        return <div className="flex items-center justify-center p-6">
            <div className="text-red-600">Error: {error.message}</div>
        </div>;
    }
    
    if (!data || !data.properties || !data.properties.periods) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full">
                <div className="text-gray-600 text-center">
                    <h3 className="font-medium text-sm">No Hourly Forecast Data</h3>
                    <p className="text-xs mt-1">Hourly forecast information is not available.</p>
                </div>
            </div>
        );
    }

    const { periods, generatedAt } = data.properties;
    const genDate = generatedAt ? new Date(generatedAt) : new Date();

    const tabs = [
        { id: 'temperature' as TabType, label: 'Temperature', icon: '🌡️', color: 'from-orange-400 to-red-500' },
        { id: 'precipitation' as TabType, label: 'Precipitation', icon: '🌧️', color: 'from-blue-400 to-blue-600' },
        { id: 'wind' as TabType, label: 'Wind & Conditions', icon: '💨', color: 'from-green-400 to-emerald-600' }
    ];

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 w-full h-full flex flex-col">
            <div className="mb-3">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Hourly Forecast</h2>
                <p className="text-gray-600 text-xs">
                    National Weather Service • Generated: {genDate.toLocaleString()}
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-3">
                <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 px-2 font-medium text-xs transition-all duration-200 rounded-md ${
                                activeTab === tab.id
                                    ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                            }`}
                        >
                            <span className="mr-1">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'temperature' && <TemperatureChart data={chartData} hoveredPoint={hoveredPoint} setHoveredPoint={setHoveredPoint} />}
                {activeTab === 'precipitation' && <PrecipitationChart data={chartData} hoveredBar={hoveredBar} setHoveredBar={setHoveredBar} />}
                {activeTab === 'wind' && <WindConditionsTab data={chartData} />}
            </div>

            <div className="mt-2 text-xs text-gray-400 text-center">
                Data from National Weather Service
            </div>
        </div>
    );
}

// Enhanced Temperature Chart Component
function TemperatureChart({ data, hoveredPoint, setHoveredPoint }: { 
    data: any[]; 
    hoveredPoint: number | null; 
    setHoveredPoint: (point: number | null) => void; 
}) {
    const maxTemp = Math.max(...data.map(d => d.temperature));
    const minTemp = Math.min(...data.map(d => d.temperature));
    const tempRange = maxTemp - minTemp || 1;

    return (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border border-orange-100 h-full flex flex-col">
            <h3 className="text-md font-bold mb-2 text-gray-800 flex items-center">
                🌡️ Temperature Trend (24h)
            </h3>
            <div className="flex-1 bg-white rounded-lg p-2 shadow-sm">
                <svg width="100%" height="100%" viewBox="0 0 400 180" className="overflow-visible">
                    {/* Background gradient */}
                    <defs>
                        <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(251, 146, 60, 0.3)" />
                            <stop offset="100%" stopColor="rgba(251, 146, 60, 0.1)" />
                        </linearGradient>
                        <linearGradient id="tempLine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="50%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {[0, 1, 2, 3].map(i => (
                        <line
                            key={i}
                            x1="30"
                            y1={20 + i * 35}
                            x2="370"
                            y2={20 + i * 35}
                            stroke="#f3f4f6"
                            strokeWidth="1"
                        />
                    ))}
                    
                    {/* Temperature area fill */}
                    <path
                        d={`M 30 140 ${data.map((point, i) => {
                            const x = 30 + (i * (340 / (data.length - 1)));
                            const y = 140 - ((point.temperature - minTemp) / tempRange) * 100;
                            return `L ${x} ${y}`;
                        }).join(' ')} L 370 140 Z`}
                        fill="url(#tempGradient)"
                    />
                    
                    {/* Temperature line */}
                    <path
                        d={data.map((point, i) => {
                            const x = 30 + (i * (340 / (data.length - 1)));
                            const y = 140 - ((point.temperature - minTemp) / tempRange) * 100;
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="url(#tempLine)"
                        strokeWidth="2.5"
                        className="drop-shadow-sm"
                    />
                    
                    {/* Temperature points */}
                    {data.map((point, i) => {
                        const x = 30 + (i * (340 / (data.length - 1)));
                        const y = 140 - ((point.temperature - minTemp) / tempRange) * 100;
                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r={hoveredPoint === i ? "4" : "2.5"}
                                fill="white"
                                stroke="#ef4444"
                                strokeWidth="2"
                                className="cursor-pointer transition-all duration-200 drop-shadow-sm"
                                onMouseEnter={() => setHoveredPoint(i)}
                                onMouseLeave={() => setHoveredPoint(null)}
                            />
                        );
                    })}
                    
                    {/* Time labels */}
                    {data.filter((_, i) => i % 3 === 0).map((point, i) => {
                        const originalIndex = i * 3;
                        const x = 30 + (originalIndex * (340 / (data.length - 1)));
                        return (
                            <text
                                key={originalIndex}
                                x={x}
                                y="160"
                                textAnchor="middle"
                                className="text-xs fill-gray-600 font-medium"
                            >
                                {point.time}
                            </text>
                        );
                    })}
                    
                    {/* Temperature labels */}
                    {[minTemp, maxTemp].map((temp, i) => (
                        <text
                            key={i}
                            x="20"
                            y={145 - (i * 100)}
                            textAnchor="end"
                            className="text-xs fill-gray-700 font-semibold"
                        >
                            {Math.round(temp)}°
                        </text>
                    ))}
                    
                    {/* Enhanced hover tooltip */}
                    {hoveredPoint !== null && (
                        <g>
                            <rect
                                x={30 + (hoveredPoint * (340 / (data.length - 1))) - 25}
                                y={140 - ((data[hoveredPoint].temperature - minTemp) / tempRange) * 100 - 35}
                                width="50"
                                height="25"
                                fill="rgba(0,0,0,0.9)"
                                rx="4"
                                className="drop-shadow-lg"
                            />
                            <text
                                x={30 + (hoveredPoint * (340 / (data.length - 1)))}
                                y={140 - ((data[hoveredPoint].temperature - minTemp) / tempRange) * 100 - 22}
                                textAnchor="middle"
                                className="text-xs fill-white font-bold"
                            >
                                {data[hoveredPoint].temperature}°F
                            </text>
                            <text
                                x={30 + (hoveredPoint * (340 / (data.length - 1)))}
                                y={140 - ((data[hoveredPoint].temperature - minTemp) / tempRange) * 100 - 12}
                                textAnchor="middle"
                                className="text-xs fill-orange-200"
                            >
                                {data[hoveredPoint].time}
                            </text>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
}

// Enhanced Precipitation Chart Component
function PrecipitationChart({ data, hoveredBar, setHoveredBar }: { 
    data: any[]; 
    hoveredBar: number | null; 
    setHoveredBar: (bar: number | null) => void; 
}) {
    return (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100 h-full flex flex-col">
            <h3 className="text-md font-bold mb-2 text-gray-800 flex items-center">
                🌧️ Precipitation Probability (24h)
            </h3>
            <div className="flex-1 bg-white rounded-lg p-2 shadow-sm">
                <svg width="100%" height="100%" viewBox="0 0 400 180" className="overflow-visible">
                    <defs>
                        <linearGradient id="rainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(percent => (
                        <line
                            key={percent}
                            x1="30"
                            y1={140 - (percent * 1.1)}
                            x2="370"
                            y2={140 - (percent * 1.1)}
                            stroke="#f3f4f6"
                            strokeWidth="1"
                        />
                    ))}
                    
                    {/* Precipitation bars */}
                    {data.map((point, i) => {
                        const x = 30 + (i * (340 / data.length));
                        const barWidth = (340 / data.length) * 0.8;
                        const height = (point.precipitation / 100) * 110;
                        const isHovered = hoveredBar === i;
                        
                        return (
                            <rect
                                key={i}
                                x={x - barWidth / 2}
                                y={140 - height}
                                width={barWidth}
                                height={height}
                                fill="url(#rainGradient)"
                                className="cursor-pointer transition-all duration-200"
                                onMouseEnter={() => setHoveredBar(i)}
                                onMouseLeave={() => setHoveredBar(null)}
                                opacity={isHovered ? 1 : (point.precipitation === 0 ? 0.3 : 0.8)}
                                rx="2"
                            />
                        );
                    })}
                    
                    {/* Time labels */}
                    {data.filter((_, i) => i % 3 === 0).map((point, i) => {
                        const originalIndex = i * 3;
                        const x = 30 + (originalIndex * (340 / data.length));
                        return (
                            <text
                                key={originalIndex}
                                x={x}
                                y="160"
                                textAnchor="middle"
                                className="text-xs fill-gray-600 font-medium"
                            >
                                {point.time}
                            </text>
                        );
                    })}
                    
                    {/* Percentage labels */}
                    {[0, 50, 100].map(percent => (
                        <text
                            key={percent}
                            x="20"
                            y={145 - (percent * 1.1)}
                            textAnchor="end"
                            className="text-xs fill-gray-700 font-semibold"
                        >
                            {percent}%
                        </text>
                    ))}
                    
                    {/* Enhanced hover tooltip */}
                    {hoveredBar !== null && (
                        <g>
                            <rect
                                x={30 + (hoveredBar * (340 / data.length)) - 20}
                                y={140 - (data[hoveredBar].precipitation / 100) * 110 - 30}
                                width="40"
                                height="20"
                                fill="rgba(0,0,0,0.9)"
                                rx="4"
                                className="drop-shadow-lg"
                            />
                            <text
                                x={30 + (hoveredBar * (340 / data.length))}
                                y={140 - (data[hoveredBar].precipitation / 100) * 110 - 18}
                                textAnchor="middle"
                                className="text-xs fill-white font-bold"
                            >
                                {data[hoveredBar].precipitation}%
                            </text>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
}

// Enhanced Wind and Conditions Tab Component
function WindConditionsTab({ data }: { data: any[] }) {
    const maxWind = Math.max(...data.map(d => d.windSpeed), 1);

    return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100 h-full flex flex-col">
            <h3 className="text-md font-bold mb-2 text-gray-800 flex items-center">
                💨 Wind Conditions (24h)
            </h3>
            
            {/* Wind Speed Chart */}
            <div className="flex-1 bg-white rounded-lg p-2 shadow-sm mb-3">
                <svg width="100%" height="100%" viewBox="0 0 400 120" className="overflow-visible">
                    <defs>
                        <linearGradient id="windGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" />
                            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
                        </linearGradient>
                    </defs>
                    
                    {/* Wind speed area chart */}
                    <path
                        d={`M 30 100 ${data.map((point, i) => {
                            const x = 30 + (i * (340 / (data.length - 1)));
                            const y = 100 - ((point.windSpeed / maxWind) * 70);
                            return `L ${x} ${y}`;
                        }).join(' ')} L 370 100 Z`}
                        fill="url(#windGradient)"
                    />
                    
                    <path
                        d={data.map((point, i) => {
                            const x = 30 + (i * (340 / (data.length - 1)));
                            const y = 100 - ((point.windSpeed / maxWind) * 70);
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                    />
                    
                    {/* Time labels */}
                    {data.filter((_, i) => i % 4 === 0).map((point, i) => {
                        const originalIndex = i * 4;
                        const x = 30 + (originalIndex * (340 / (data.length - 1)));
                        return (
                            <text
                                key={originalIndex}
                                x={x}
                                y="115"
                                textAnchor="middle"
                                className="text-xs fill-gray-600 font-medium"
                            >
                                {point.time}
                            </text>
                        );
                    })}
                    
                    {/* Wind speed labels */}
                    <text x="20" y="105" textAnchor="end" className="text-xs fill-gray-600">0</text>
                    <text x="20" y="35" textAnchor="end" className="text-xs fill-gray-600">{Math.round(maxWind)}</text>
                </svg>
            </div>

            {/* Weather Conditions Highlights */}
            <div className="bg-white rounded-lg p-2 shadow-sm">
                <div className="grid grid-cols-4 gap-2">
                    {data.slice(0, 4).map((point, i) => (
                        <div key={i} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 text-center border border-green-100">
                            <div className="text-xs text-gray-600 mb-1 font-medium">{point.time}</div>
                            <div className="text-xs font-bold text-green-700">
                                {point.windSpeed} mph
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}