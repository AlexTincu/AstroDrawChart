const swisseph = require('swisseph');

/**
 * Professional Natal and Transit Calculator using Swiss Ephemeris
 * Calculates a natal chart from birth data, including key points like the
 * North Node, Chiron, and Lilith, and finds current transits to it.
 */
class TransitCalculator {
    constructor() {
        // Initialize Swiss Ephemeris
        // Make sure the 'ephemeris' folder is in the same directory as this script.
        try {
            swisseph.swe_set_ephe_path('./ephemeris');
        } catch (e) {
            console.error("Error setting ephemeris path. Please ensure the 'ephemeris' directory exists.");
            throw e;
        }

        // Expanded list of planets and points for calculation
        this.planets = {
            SUN: swisseph.SE_SUN,
            MOON: swisseph.SE_MOON,
            MERCURY: swisseph.SE_MERCURY,
            VENUS: swisseph.SE_VENUS,
            MARS: swisseph.SE_MARS,
            JUPITER: swisseph.SE_JUPITER,
            SATURN: swisseph.SE_SATURN,
            URANUS: swisseph.SE_URANUS,
            NEPTUNE: swisseph.SE_NEPTUNE,
            PLUTO: swisseph.SE_PLUTO,
            NORTH_NODE: swisseph.SE_MEAN_NODE,
            CHIRON: swisseph.SE_CHIRON,
            LILITH_MEAN: swisseph.SE_MEAN_APOG,
        };

        // User-friendly names for the output JSON
        this.nameMap = {
            SUN: 'Sun',
            MOON: 'Moon',
            MERCURY: 'Mercury',
            VENUS: 'Venus',
            MARS: 'Mars',
            JUPITER: 'Jupiter',
            SATURN: 'Saturn',
            URANUS: 'Uranus',
            NEPTUNE: 'Neptune',
            PLUTO: 'Pluto',
            NORTH_NODE: 'North Node',
            CHIRON: 'Chiron',
            LILITH_MEAN: 'Lilith',
        };

        // Aspect definitions
        this.transitAspects = {
            CONJUNCTION: { angle: 0, name: 'Conjunction' },
            OPPOSITION: { angle: 180, name: 'Opposition' },
            TRINE: { angle: 120, name: 'Trine' },
            SQUARE: { angle: 90, name: 'Square' },
            SEXTILE: { angle: 60, name: 'Sextile' },
        };
        
        // Orbs for transit aspects, now including the points
        this.transitOrbs = {
            SATURN: 3, URANUS: 3, NEPTUNE: 3, PLUTO: 3,
            JUPITER: 2,
            SUN: 1.5, MOON: 1.5, MERCURY: 1.5, VENUS: 1.5, MARS: 1.5,
            NORTH_NODE: 1.5, CHIRON: 2, LILITH_MEAN: 1,
        };
        
        // Using Placidus house system by default
        this.houseSystem = 'P';
    }

    /**
     * Main function to get both natal chart and transits.
     * @param {object} birthDetails - Contains birthDate, latitude, and longitude.
     * @param {Date} [transitDate=new Date()] - The date for which to calculate transits.
     * @returns {object} A comprehensive object with natal chart and transit data.
     */
    getTransits({ birthDate, latitude, longitude }, transitDate = new Date()) {
        if (!birthDate || latitude === undefined || longitude === undefined) {
            throw new Error('Missing required birth details: birthDate, latitude, and longitude.');
        }

        // 1. Calculate the natal chart
        const natalChart = this.calculateNatalChart(birthDate, latitude, longitude);

        // 2. Calculate planetary positions for the transit date
        const transitJulianDay = this.dateToJulianDay(transitDate);
        const transitPositions = this.calculatePlanetaryPositions(transitJulianDay);
        
        // 3. Find aspects between transiting planets and natal planets
        const transitAspects = this.calculateTransitAspects(natalChart, transitPositions);

        // 4. Assemble the final JSON object
        const result = {
            natal_chart: {
                planets: Object.values(natalChart.planets).map(p => ({
                    name: this.nameMap[p.name] || p.name,
                    sign: p.sign,
                    degree: this.getDegreeInSign(p.longitude),
                    house: p.house,
                })),
                ascendant: {
                    sign: natalChart.ascendant.sign,
                    degree: this.getDegreeInSign(natalChart.ascendant.longitude),
                },
                midheaven: {
                    sign: natalChart.midheaven.sign,
                    degree: this.getDegreeInSign(natalChart.midheaven.longitude),
                },
            },
            current_transits: transitAspects,
            timestamp: transitDate.toISOString(),
        };

        return result;
    }

    /**
     * Calculates a full natal chart including houses.
     * @param {Date} birthDate - The birth date and time (assumed to be in UTC).
     * @param {number} geolat - Geographic latitude.
     * @param {number} geolon - Geographic longitude.
     * @returns {object} An object containing detailed natal chart data.
     */
    calculateNatalChart(birthDate, geolat, geolon) {
        swisseph.swe_set_topo(geolon, geolat, 0);
        const julianDayUT = this.dateToJulianDay(birthDate);

        // Calculate house cusps and Ascendant/Midheaven
        const houses = swisseph.swe_houses(julianDayUT, geolat, geolon, this.houseSystem.charCodeAt(0));
        const houseCusps = houses.cusps;
        const ascendant = { longitude: houses.ascendant[0], sign: this.getZodiacSign(houses.ascendant[0]) };
        const midheaven = { longitude: houses.mc[1], sign: this.getZodiacSign(houses.mc[1]) };

        // Calculate planet positions
        const planets = this.calculatePlanetaryPositions(julianDayUT);
        
        // Determine the house for each planet
        for (const planetName in planets) {
            planets[planetName].name = planetName;
            planets[planetName].house = this.getHouseForLongitude(planets[planetName].longitude, houseCusps);
        }

        return { planets, ascendant, midheaven, house_cusps: houseCusps };
    }

    /**
     * Calculates the aspects between transiting and natal planets.
     * @param {object} natalChart - The calculated natal chart data.
     * @param {object} transitPositions - The calculated positions of transiting planets.
     * @returns {Array} A list of significant transit aspects.
     */
    calculateTransitAspects(natalChart, transitPositions) {
        const aspects = [];

        for (const [transitPlanetName, transitPos] of Object.entries(transitPositions)) {
            for (const [natalPlanetName, natalPos] of Object.entries(natalChart.planets)) {
                // Don't calculate aspects of a point to itself (e.g., transiting North Node to natal North Node)
                if (transitPlanetName === natalPlanetName) continue;
                
                const angle = this.calculateAngleBetweenPlanets(transitPos.longitude, natalPos.longitude);
                
                for (const aspect of Object.values(this.transitAspects)) {
                    const orb = this.transitOrbs[transitPlanetName] || 1; // Default orb
                    const angleDiff = Math.abs(angle - aspect.angle);

                    if (angleDiff <= orb) {
                        aspects.push({
                            transiting_planet: this.nameMap[transitPlanetName] || transitPlanetName,
                            current_position: {
                                sign: transitPos.sign,
                                degree: this.getDegreeInSign(transitPos.longitude),
                            },
                            aspect_to_natal: {
                                natal_planet: this.nameMap[natalPlanetName] || natalPlanetName,
                                aspect_type: aspect.name,
                                orb: parseFloat(angleDiff.toFixed(2)),
                            },
                            house_transit: this.getHouseForLongitude(transitPos.longitude, natalChart.house_cusps),
                            house_in_natal_chart: natalPos.house,
                        });
                        break; 
                    }
                }
            }
        }
        // Sort by the tightest orb first
        aspects.sort((a, b) => a.aspect_to_natal.orb - b.aspect_to_natal.orb);
        return aspects;
    }

    /**
     * Calculates planetary positions for a given Julian Day.
     * @param {number} julianDay - Julian Day Number in UT.
     * @returns {Object} A dictionary of planetary positions.
     */
    calculatePlanetaryPositions(julianDay) {
        const positions = {};
        const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED;

        for (const [planetName, planetId] of Object.entries(this.planets)) {
            const result = swisseph.swe_calc_ut(julianDay, planetId, flags);
            if (result.rflag >= 0) {
                positions[planetName] = {
                    longitude: result.longitude,
                    sign: this.getZodiacSign(result.longitude),
                    isRetrograde: result.longitudeSpeed < 0,
                };
            }
        }
        return positions;
    }
    
    /**
     * Determines which house a given celestial longitude falls into.
     * @param {number} longitude - The longitude of the planet or point.
     * @param {Array} houseCusps - An array of 13 house cusps (index 0 unused).
     * @returns {number} The house number (1-12).
     */
    getHouseForLongitude(longitude, houseCusps) {
        for (let i = 1; i <= 12; i++) {
            const cuspStart = houseCusps[i];
            const cuspEnd = houseCusps[(i % 12) + 1];

            if (cuspStart < cuspEnd) { // Normal case, no 0° Aries wrap-around
                if (longitude >= cuspStart && longitude < cuspEnd) return i;
            } else { // This house wraps around 0° Aries
                if (longitude >= cuspStart || longitude < cuspEnd) return i;
            }
        }
        return 12; // Fallback, should logically be covered above
    }
    
    /**
     * Convert a Date object to Julian Day Number (in UT).
     * @param {Date} date - The date to convert.
     * @returns {number} Julian Day Number.
     */
    dateToJulianDay(date) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        return swisseph.swe_julday(year, month, day, hour, swisseph.SE_GREG_CAL);
    }

    /**
     * Calculates the shortest angle between two zodiacal longitudes.
     * @param {number} long1 - Longitude of the first point.
     * @param {number} long2 - Longitude of the second point.
     * @returns {number} The angle between 0 and 180.
     */
    calculateAngleBetweenPlanets(long1, long2) {
        let angle = Math.abs(long1 - long2);
        return angle > 180 ? 360 - angle : angle;
    }

    /**
     * Gets the zodiac sign for a given longitude.
     * @param {number} longitude - Longitude in degrees.
     * @returns {string} The name of the zodiac sign.
     */
    getZodiacSign(longitude) {
        const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
        return signs[Math.floor(longitude / 30)];
    }

    /**
     * Formats a zodiacal longitude into the degree within its sign.
     * @param {number} longitude - Longitude in degrees.
     * @returns {number} The degree within the sign (e.g., 15.23).
     */
    getDegreeInSign(longitude) {
        return parseFloat((longitude % 30).toFixed(2));
    }
    
    /**
     * Closes the Swiss Ephemeris instance. Call this when done.
     */
    close() {
        swisseph.swe_close();
    }
}

// --- USAGE EXAMPLE ---
async function example() {
    const transitCalculator = new TransitCalculator();
    try {
        // Define the birth details.
        // NOTE: The Date object constructor assumes local time unless 'Z' (for UTC) is appended.
        // It is crucial to provide the time in UTC for accurate calculations.
        const birthDetails = {
            birthDate: new Date('1990-10-10T14:45:00Z'), // UTC time
            latitude: 34.0522,  // Los Angeles Latitude
            longitude: -118.2437, // Los Angeles Longitude
        };

        // Define the date for the transits. Defaults to the current moment if omitted.
        const transitDate = new Date('2024-07-20T12:00:00Z');

        // Get the full natal and transit analysis.
        // The output will now be more comprehensive, including the North Node, Chiron, and Lilith.
        const analysis = transitCalculator.getTransits(birthDetails, transitDate);
        
        // Print the result in the desired JSON format
        console.log(JSON.stringify(analysis, null, 2));

    } catch (error) {
        console.error('An error occurred during transit calculation:', error);
    } finally {
        // Always close the connection to Swiss Ephemeris
        transitCalculator.close();
    }
}

// Export the class for use as a module
module.exports = TransitCalculator;

// Run the example function if the script is executed directly
if (require.main === module) {
    example();
}