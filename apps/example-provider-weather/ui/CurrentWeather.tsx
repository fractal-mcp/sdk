import "./index.css"
import {
    formatTemperature,
    formatWindSpeed,
    formatHumidity,
} from './utils';
import { useFractal } from '@fractal-mcp/composer';

// const { useData, useFractalRouter} = FractalUI<ToolMap>({ baseUrl: 'http://localhost:3001/mcp' });

export default function CurrentWeather() {

    // How to use fractal? Literally just this: 
    const { navigate, data, error } = useFractal<any>();


    console.log("WTF", data, error)
    // Consistent container wrapper for all states
    const containerClasses = "bg-white border border-gray-200 rounded-lg shadow-sm p-2 sm:p-3 w-full min-h-[180px]";

    if (error) {
        return (
            <div className={containerClasses}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-red-600">Error: {error.message}</div>
                </div>
            </div>
        );
    }

    // No data state
    if (!data || !(data as any).properties) {
        return (
            <div className={containerClasses}>
                <div className="flex items-center justify-center h-full">
                <div className="text-gray-600 text-center">
                    <h3 className="font-medium text-sm">No Weather Data</h3>
                    <p className="text-xs mt-1">Weather information is not available.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Normal weather display
    const { properties } = data as any;
    const timestamp = properties.timestamp ? new Date(properties.timestamp) : new Date();

    return (
        <div className={containerClasses}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">Current Weather</h2>
                    <p className="text-gray-600 text-xs">
                        National Weather Service
                    </p>
                </div>
                <div className="text-right ml-2">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        {formatTemperature(properties.temperature)}
                    </div>
                </div>
            </div>
            
            <div className="mb-2">
                <div className="text-sm font-medium mb-1 text-gray-800 line-clamp-1">
                    {properties.textDescription || 'Current Conditions'}
                </div>
                <div className="text-gray-500 text-xs">
                    Last updated: {timestamp.toLocaleTimeString()}
                </div>
            </div>
            
            {/* Compact wind and humidity display */}
            <div className="flex gap-1 text-xs mb-2">
                    <div className="bg-gray-50 rounded px-2 py-1 flex-1">
                        <span className="text-gray-500">Humidity:</span>
                        <span className="font-semibold text-gray-900 ml-1">
                        {properties.relativeHumidity ? formatHumidity(properties.relativeHumidity) : 'N/A'}
                        </span>
                    </div>
                <div className="bg-gray-50 rounded px-2 py-1 flex-1">
                    <span className="text-gray-500">Wind:</span>
                    <span className="font-semibold text-gray-900 ml-1">
                            {formatWindSpeed(properties.windSpeed)}
                    </span>
                </div>
            </div>
            
            <div className="space-y-1">
                <button
                    onClick={() => navigate('get_hourly_forecast', { location: "San Francisco" })}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-2 rounded-lg transition-colors duration-200 text-xs"
                >
                    View Hourly Forecast
                </button>
                
                <div className="text-xs text-gray-400 text-center">
                Data from National Weather Service
                </div>
            </div>
        </div>
    );
};
