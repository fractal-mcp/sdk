// Helper function to format temperature
export const formatTemperature = (tempObj: { value: number | null; unitCode: string } | undefined): string => {
    if (!tempObj || tempObj.value === null) return 'N/A';
    
    const temp = tempObj.value;
    const unit = tempObj.unitCode === 'wmoUnit:degC' ? 'C' : 
               tempObj.unitCode === 'wmoUnit:degF' ? 'F' : 
               tempObj.unitCode.replace('wmoUnit:', '');
    
    return `${Math.round(temp)}°${unit}`;
};

// Helper function to format wind speed
export const formatWindSpeed = (windObj: { value: number | null; unitCode: string } | undefined): string => {
    if (!windObj || windObj.value === null) return 'N/A';
    
    const speed = Math.round(windObj.value);
    const unit = windObj.unitCode.includes('km') ? 'km/h' : 'mph';
    return `${speed} ${unit}`;
};

// Helper function to format humidity
export const formatHumidity = (humidityObj: { value: number | null; unitCode: string } | undefined): string => {
    if (!humidityObj || humidityObj.value === null) return 'N/A';
    return `${Math.round(humidityObj.value)}%`;
};