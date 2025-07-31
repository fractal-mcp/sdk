export type Json = Record<string, unknown>;

export interface NWSPoint extends Json {
    "@context": unknown[];
    id: string;
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: [number, number];
    };
    properties: {
        "@id": string;
        "@type": string;
        cwa: string;
        forecastOffice: string;
        gridId: string;
        gridX: number;
        gridY: number;
        forecast: string;
        forecastHourly: string;
        forecastGridData: string;
        observationStations: string;
        relativeLocation: {
            type: "Feature";
            geometry: {
                type: "Point";
                coordinates: [number, number];
            };
            properties: {
                city: string;
                state: string;
                distance: {
                    unitCode: string;
                    value: number;
                };
                bearing: {
                    unitCode: string;
                    value: number;
                };
            };
        };
        forecastZone: string;
        county: string;
        fireWeatherZone: string;
        timeZone: string;
        radarStation: string;
    };
}

export interface NWSForecastPeriod {
    number: number;
    name: string;
    startTime: string;
    endTime: string;
    isDaytime: boolean;
    temperature: number;
    temperatureUnit: string;
    temperatureTrend: string;
    probabilityOfPrecipitation: {
        unitCode: string;
        value: number;
    };
    windSpeed: string;
    windDirection: string;
    icon: string;
    shortForecast: string;
    detailedForecast: string;
}

export interface NWSForecast extends Json {
    "@context": unknown[];
    type: "Feature";
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
    properties: {
        units: string;
        forecastGenerator: string;
        generatedAt: string;
        updateTime: string;
        validTimes: string;
        elevation: {
            unitCode: string;
            value: number;
        };
        periods: NWSForecastPeriod[];
    };
}

export interface NWSHourlyForecastPeriod {
    number: number;
    name: string;
    startTime: string;
    endTime: string;
    isDaytime: boolean;
    temperature: number;
    temperatureUnit: string;
    temperatureTrend: string;
    probabilityOfPrecipitation: {
        unitCode: string;
        value: number;
    };
    dewpoint: {
        unitCode: string;
        value: number;
    };
    relativeHumidity: {
        unitCode: string;
        value: number;
    };
    windSpeed: string;
    windDirection: string;
    icon: string;
    shortForecast: string;
    detailedForecast: string;
}

export interface NWSCurrentObs extends Json {
    properties: {
        timestamp: string;
        temperature: { value: number | null; unitCode: string };
        textDescription: string;
        windSpeed: { value: number | null; unitCode: string };
        relativeHumidity: { value: number | null; unitCode: string };
    };
}

export interface NWSHourlyForecast extends Json {
    "@context": unknown[];
    type: "Feature";
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
    properties: {
        units: string;
        forecastGenerator: string;
        generatedAt: string;
        updateTime: string;
        validTimes: string;
        elevation: {
            unitCode: string;
            value: number;
        };
        periods: NWSHourlyForecastPeriod[];
    };
}