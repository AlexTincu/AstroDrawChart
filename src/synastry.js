const swisseph = require('swisseph');
const DateTimeUtils = require("./DateTimeUtils");

/**
 * Professional Transit Calculator using Swiss Ephemeris
 * Calculates transiting planet aspects to natal chart positions
 */

class SynastryCalculator {
    constructor() {
        // Initialize Swiss Ephemeris
        swisseph.swe_set_ephe_path('./ephemeris');

        // House system (Placidus by default)
        this.houseSystem = 'P';

        // Planet constants
        this.planets = {
            Sun: swisseph.SE_SUN,
            Moon: swisseph.SE_MOON,
            Mercury: swisseph.SE_MERCURY,
            Venus: swisseph.SE_VENUS,
            Mars: swisseph.SE_MARS,
            Jupiter: swisseph.SE_JUPITER,
            Saturn: swisseph.SE_SATURN,
            Uranus: swisseph.SE_URANUS,
            Neptune: swisseph.SE_NEPTUNE,
            Pluto: swisseph.SE_PLUTO,
            NNode: swisseph.SE_TRUE_NODE,
            Chiron: swisseph.SE_CHIRON,
            Lilith: swisseph.SE_MEAN_APOG,           // Mean Black Moon Lilith
            Vertex: swisseph.SE_VERTEX,
            Ceres: swisseph.SE_CERES,                  // Asteroid Ceres
            Pallas: swisseph.SE_PALLAS,                // Asteroid Pallas
            Juno: swisseph.SE_JUNO,                    // Asteroid Juno
            Vesta: swisseph.SE_VESTA,                  // Asteroid Vesta
        };
        
        // Transit aspect definitions with different orbs for different planet combinations
        this.aspects = {
            CONJUNCTION: { angle: 0, name: 'conjunction', symbol: '☌' },
            OPPOSITION: { angle: 180, name: 'opposition', symbol: '☍' },
            TRINE: { angle: 120, name: 'trine', symbol: '△' },
            SQUARE: { angle: 90, name: 'square', symbol: '□' },
            SEXTILE: { angle: 60, name: 'sextile', symbol: '⚹' },
            // QUINCUNX: { angle: 150, name: 'Quincunx', symbol: '⚻' },
            // SEMISEXTILE: { angle: 30, name: 'Semi-sextile', symbol: '⚺' },
            // SEMISQUARE: { angle: 45, name: 'Semi-square', symbol: '∠' },
            // SESQUIQUADRATE: { angle: 135, name: 'Sesquiquadrate', symbol: '⚼' }
        };

        // Transit orbs based on planet combinations
        this.transitOrbs = {
            // Outer planet transits (longer lasting) - wider orbs
            Saturn: { major: 2, minor: 1 },
            Uranus: { major: 2, minor: 1 },
            Neptune: { major: 2, minor: 1 },
            Pluto: { major: 2, minor: 1 },
            
            // Social planets - medium orbs
            Jupiter: { major: 1.5, minor: 0.5 },
            
            // Personal planets - tighter orbs
            Sun: { major: 1, minor: 0.5 },
            Moon: { major: 1, minor: 0.5 },
            Mercury: { major: 1, minor: 0.5 },
            Venus: { major: 1, minor: 0.5 },
            Mars: { major: 1, minor: 0.5 },
            
            // Points
            NNode: { major: 1, minor: 0.5 },
            SNode: { major: 1, minor: 0.5 },
            Chiron: { major: 1, minor: 0.5 },
            Lilith: { major: 1, minor: 0.5 }
        };

        // Major vs minor aspects
        this.majorAspects = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
        this.minorAspects = ['quincunx', 'semisextile', 'semisquare', 'sesquiquadrate'];
    }

    
    /**
     * Generate complete chart positions with planetary house positions
     * @param {Object} birthData - Birth information
     * @returns {Object} Complete natal chart with house positions
     */
    generatePositions(birthData) {
        const { date, latitude, longitude, timezone = 0 } = birthData;

        // Adjust for timezone
        // const adjustedDate = new Date(date.getTime() - timezone * 60 * 60 * 1000);
        // const adjustedDate = DateTimeUtils.convertToUTC(date, timezone);
        // const adjustedDate = date; // already converted to UTC in src/natal.js
        
        const julianDay = this.dateToJulianDay(date);

        const houses = this.calculateHouses(julianDay, latitude, longitude);

        const positions = this.calculatePlanetaryPositions(julianDay, houses);
        
        // const aspects = this.calculateAspects(positions);

        return {
            birthData: {
                date: date.toISOString(),
                latitude,
                longitude,
                julianDay
            },
            planets: positions,
            houses: houses.houses,
            // aspects: aspects,
        };
    }

    /**
     * Convert date and time to Julian Day Number
     * @param {Date} date - Date to convert
     * @returns {number} Julian Day Number
     */
    dateToJulianDay(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
        
        return swisseph.swe_julday(year, month, day, hour, swisseph.SE_GREG_CAL);
    }

    /**
     * Calculate planetary positions with house information
     * @param {number} julianDay - Julian Day Number
     * @param {Object} houses - House data (optional - if provided, will include house positions)
     * @returns {Object} Planetary positions with house information
     */
    calculatePlanetaryPositions(julianDay, houses = null) {
        const positions = {};
        const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED;

        for (const [planetName, planetId] of Object.entries(this.planets)) {

            try {
                const result = swisseph.swe_calc_ut(julianDay, planetId, flags);

                if (result.rflag >= 0) {
                    const planetData = {
                        longitude: parseFloat(result.longitude.toFixed(3)),
                        // latitude: result.latitude,
                        // distance: result.distance,
                        // longitudeSpeed: result.longitudeSpeed,
                        // latitudeSpeed: result.latitudeSpeed,
                        // distanceSpeed: result.distanceSpeed,
                        sign: this.getZodiacSign(result.longitude),
                        degree: this.formatDegree(result.longitude)
                    };

                    // Add house information if houses are provided
                    if (houses && houses.houses) {
                        const houseInfo = this.determinePlanetHouse(result.longitude, houses.houses);
                        planetData.house = houseInfo;
                    }

                    positions[planetName] = planetData;
                }
            } catch (error) {
                console.warn(`Error calculating position for ${planetName}:`, error.message);
            }
        }

        return positions;
    }

    /**
     * Calculate aspects between planets
     * @param {Object} positions - Planetary positions
     * @returns {Array} Array of aspects
     */
    // calculateAspects(positions) {
    //     const aspects = [];
    //     const planetNames = Object.keys(positions);

    //     for (let i = 0; i < planetNames.length; i++) {
    //         for (let j = i + 1; j < planetNames.length; j++) {
    //             const planet1 = planetNames[i];
    //             const planet2 = planetNames[j];
    //             const angle = this.calculateAngleBetweenPlanets(
    //                 positions[planet1].longitude,
    //                 positions[planet2].longitude
    //             );

    //             const aspect = this.findAspect(angle);
                
    //             if (aspect) {
    //                 aspects.push({
    //                     planet1,
    //                     planet2,
    //                     aspect: aspect.name,
    //                     angle: aspect.angle,
    //                     orb: parseFloat(Math.abs(angle - aspect.angle).toFixed(2)),
    //                     applying: this.isApplying(positions[planet1], positions[planet2], aspect.angle)
    //                 });
    //             }
    //         }
    //     }

    //     return aspects.sort((a, b) => a.orb - b.orb);
    // }
    
    /**
     * Find aspect for given angle
     * @param {number} angle - Angle between planets
     * @returns {Object|null} Aspect object or null
     */
    findAspect(angle) {
        for (const [aspectName, aspectData] of Object.entries(this.aspects)) {
            if (Math.abs(angle - aspectData.angle) <= aspectData.orb) {
                return aspectData;
            }
        }
        return null;
    }


    /**
     * Determine which house a planet is in based on its longitude
     * @param {number} planetLongitude - Planet's longitude in degrees
     * @param {Array} houseCusps - Array of house cusp data
     * @returns {Object} House information for the planet
     */
    determinePlanetHouse(planetLongitude, houseCusps) {
        // Normalize longitude to 0-360 range
        let normalizedLong = planetLongitude % 360;
        if (normalizedLong < 0) normalizedLong += 360;

        // Get house cusp longitudes
        const cusps = houseCusps.map(house => house.cusp);
        
        // Find which house the planet is in
        for (let i = 0; i < 12; i++) {
            const currentCusp = cusps[i];
            const nextCusp = cusps[(i + 1) % 12];
            
            let houseStart = currentCusp;
            let houseEnd = nextCusp;
            
            // Handle case where house crosses 0° Aries (360°/0° boundary)
            if (houseEnd < houseStart) {
                // House crosses the 0° point
                if (normalizedLong >= houseStart || normalizedLong < houseEnd) {
                    return {
                        number: i + 1,
                        cuspDegree: this.formatDegree(currentCusp),
                        cuspSign: this.getZodiacSign(currentCusp),
                        // distanceFromCusp: this.calculateDistanceFromCusp(normalizedLong, currentCusp)
                    };
                }
            } else {
                // Normal case - house doesn't cross 0°
                if (normalizedLong >= houseStart && normalizedLong < houseEnd) {
                    return {
                        number: i + 1,
                        cuspDegree: this.formatDegree(currentCusp),
                        cuspSign: this.getZodiacSign(currentCusp),
                        // distanceFromCusp: this.calculateDistanceFromCusp(normalizedLong, currentCusp)
                    };
                }
            }
        }
        
        // Fallback - should not reach here in normal circumstances
        return {
            number: 1,
            cuspDegree: this.formatDegree(cusps[0]),
            cuspSign: this.getZodiacSign(cusps[0]),
            distanceFromCusp: 0
        };
    }

    /**
     * Calculate house cusps
     * @param {number} julianDay - Julian Day Number
     * @param {number} latitude - Latitude in degrees
     * @param {number} longitude - Longitude in degrees
     * @returns {Object} House cusps and angles
     */
    calculateHouses(julianDay, latitude, longitude) {
        try {
            const result = swisseph.swe_houses(julianDay, latitude, longitude, this.houseSystem);

            return {
                houses: result.house.map((cusp, index) => ({
                    house: index + 1,
                    cusp: cusp,
                    sign: this.getZodiacSign(cusp),
                    degree: this.formatDegree(cusp)
                })),
                angles: {
                    ascendant: {
                        longitude: result.ascendant,
                        sign: this.getZodiacSign(result.ascendant),
                        degree: this.formatDegree(result.ascendant)
                    },
                    midheaven: {
                        longitude: result.mc,
                        sign: this.getZodiacSign(result.mc),
                        degree: this.formatDegree(result.mc)
                    },
                    descendant: {
                        longitude: (result.ascendant + 180) % 360,
                        sign: this.getZodiacSign((result.ascendant + 180) % 360),
                        degree: this.formatDegree((result.ascendant + 180) % 360)
                    },
                    imumCoeli: {
                        longitude: (result.mc + 180) % 360,
                        sign: this.getZodiacSign((result.mc + 180) % 360),
                        degree: this.formatDegree((result.mc + 180) % 360)
                    }
                }
            };
        } catch (error) {
            console.error('Error calculating houses:', error.message);
            return null;
        }
    }
    
    /**
     * Calculate transits for a natal chart
     * @param {Object} natalPositions - Natal planet positions
     * @param {Date} transitDate - Date for transit calculation (default: now)
     * @returns {Object} Transit analysis
     */
    calculateAspects(natalPositions, transitPositions) 
    {
        const transits = {
            aspects: [],
            summary: {
                total: 0,
                applying: 0,
                separating: 0,
                exact: 0,
                byAspect: {},
                byTransitingPlanet: {},
                byNatalPlanet: {}
            }
        };

        // Calculate all transit aspects
        for (const [transitPlanet, transitPos] of Object.entries(transitPositions)) {
            for (const [natalPlanet, natalPos] of Object.entries(natalPositions)) {
                const aspectData = this.findTransitAspect(
                    transitPos.longitude,
                    natalPos.longitude,
                    transitPlanet,
                );

                if (aspectData) {
                    const aspect = {
                        planet1: transitPlanet,
                        sign1: transitPos.sign,
                        planet2: natalPlanet,
                        sign2: natalPos.sign,
                        aspect: aspectData.aspect.name, // only name for now
                        orb: parseFloat(aspectData.orb.toFixed(2)),
                        exactness: aspectData.exactness,
                        applying: this.isTransitApplying(transitPos, natalPos, aspectData.targetAngle),
                        // transitPosition: {
                        //     longitude: transitPos.longitude,
                        //     sign: transitPos.sign,
                        //     degree: transitPos.degree,
                        //     isRetrograde: transitPos.isRetrograde,
                        //     natalHouse: transitPositions[transitPlanet]['number']
                        // },
                        // natalPosition: {
                        //     longitude: natalPos.longitude,
                        //     sign: natalPos.sign,
                        //     degree: natalPos.degree,
                        //     house: natalPos.house.number
                        // },
                        // peakDate: this.estimatePeakDate(transitPos, natalPos, aspectData.targetAngle, transitDate)
                    };

                    transits.aspects.push(aspect);
                    this.updateTransitSummary(transits.summary, aspect);
                }
            }
        }

        // Sort by exactness (closest aspects first)
        transits.aspects.sort((a, b) => a.orb - b.orb);

        return transits;
    }

    /**
     * Find transit aspect between two positions
     * @param {number} transitLong - Transiting planet longitude
     * @param {number} natalLong - Natal planet longitude
     * @param {string} transitPlanet - Transiting planet name
     * @param {string} natalPlanet - Natal planet name
     * @returns {Object|null} Aspect data or null
     */
    findTransitAspect(transitLong, natalLong, transitPlanet) {
        const angle = this.calculateAngleBetweenPlanets(transitLong, natalLong);
        
        for (const [aspectName, aspectData] of Object.entries(this.aspects)) {
            const orb = this.getTransitOrb(transitPlanet, aspectName);
            const angleDiff = Math.abs(angle - aspectData.angle);
            
            if (angleDiff <= orb) {
                return {
                    aspect: aspectData,
                    orb: angleDiff,
                    exactness: ((orb - angleDiff) / orb) * 100, // Percentage of exactness
                    targetAngle: aspectData.angle
                };
            }
        }
        
        return null;
    }

    /**
     * Get appropriate orb for transit aspect
     * @param {string} transitPlanet - Transiting planet
     * @param {string} aspectName - Aspect name
     * @returns {number} Orb in degrees
     */
    getTransitOrb(transitPlanet, aspectName) {
        const planetOrbs = this.transitOrbs[transitPlanet] || { major: 1, minor: 0.5 };
        const isMajorAspect = this.majorAspects.includes(aspectName);
        
        return isMajorAspect ? planetOrbs.major : planetOrbs.minor;
    }

    /**
     * Check if transit aspect is applying or separating
     * @param {Object} transitPos - Transiting planet position
     * @param {Object} natalPos - Natal planet position
     * @param {number} targetAngle - Target aspect angle
     * @returns {boolean} True if applying
     */
    isTransitApplying(transitPos, natalPos, targetAngle) {
        // For retrograde planets, the logic is reversed
        const speed = transitPos.longitudeSpeed;
        const currentAngle = this.calculateAngleBetweenPlanets(transitPos.longitude, natalPos.longitude);
        
        // Calculate where the planet will be in 1 day
        const futureTransitLong = (transitPos.longitude + speed) % 360;
        const futureAngle = this.calculateAngleBetweenPlanets(futureTransitLong, natalPos.longitude);
        
        // Aspect is applying if future angle is closer to target angle
        return Math.abs(futureAngle - targetAngle) < Math.abs(currentAngle - targetAngle);
    }

    /**
     * Estimate when transit aspect will be exact
     * @param {Object} transitPos - Transiting planet position
     * @param {Object} natalPos - Natal planet position
     * @param {number} targetAngle - Target aspect angle
     * @param {Date} currentDate - Current date
     * @returns {Date|null} Estimated peak date
     */
    estimatePeakDate(transitPos, natalPos, targetAngle, currentDate) {
        if (Math.abs(transitPos.longitudeSpeed) < 0.001) return null; // Stationary planet
        
        const currentAngle = this.calculateAngleBetweenPlanets(transitPos.longitude, natalPos.longitude);
        const angleDifference = targetAngle - currentAngle;
        
        // Adjust for circular nature of angles
        let adjustedDiff = angleDifference;
        if (Math.abs(adjustedDiff) > 180) {
            adjustedDiff = adjustedDiff > 0 ? adjustedDiff - 360 : adjustedDiff + 360;
        }
        
        // Calculate days to exactness
        const daysToExact = adjustedDiff / transitPos.longitudeSpeed;
        
        if (Math.abs(daysToExact) > 365) return null; // More than a year away
        
        const peakDate = new Date(currentDate.getTime() + daysToExact * 24 * 60 * 60 * 1000);
        return peakDate;
    }

    /**
     * Update transit summary statistics
     * @param {Object} summary - Summary object to update
     * @param {Object} aspect - Aspect data
     */
    updateTransitSummary(summary, aspect) {
        summary.total++;
        
        if (aspect.applying) {
            summary.applying++;
        } else {
            summary.separating++;
        }
        
        if (aspect.orb < 0.5) {
            summary.exact++;
        }
        
        // By aspect type
        const aspectName = aspect.aspect;
        summary.byAspect[aspectName] = (summary.byAspect[aspectName] || 0) + 1;
        
        // By transiting planet
        summary.byTransitingPlanet[aspect.transitingPlanet] = 
            (summary.byTransitingPlanet[aspect.transitingPlanet] || 0) + 1;
        
        // By natal planet
        summary.byNatalPlanet[aspect.natalPlanet] = 
            (summary.byNatalPlanet[aspect.natalPlanet] || 0) + 1;
    }

    /**
     * Get current major transits (most significant)
     * @param {Object} transits - Transit data
     * @param {number} maxOrb - Maximum orb to consider
     * @returns {Array} Major transits
     */
    getMajorTransits(transits, maxOrb = 2) {
        return transits.aspects.filter(aspect => {
            const isOuterPlanet = ['SATURN', 'URANUS', 'NEPTUNE', 'PLUTO'].includes(aspect.transitingPlanet);
            const isMajorAspect = this.majorAspects.includes(aspect.aspect.name.toUpperCase());
            const isWithinOrb = aspect.orb <= maxOrb;
            
            return isOuterPlanet && isMajorAspect && isWithinOrb;
        });
    }

    /**
     * Calculate angle between two planets
     * @param {number} long1 - Longitude of first planet
     * @param {number} long2 - Longitude of second planet
     * @returns {number} Angle between planets
     */
    calculateAngleBetweenPlanets(long1, long2) {
        let angle = Math.abs(long1 - long2);
        if (angle > 180) {
            angle = 360 - angle;
        }
        return angle;
    }

    /**
     * Get zodiac sign for longitude
     * @param {number} longitude - Longitude in degrees
     * @returns {string} Zodiac sign
     */
    getZodiacSign(longitude) {
        const signs = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        return signs[Math.floor(longitude / 30)];
    }

    /**
     * Format degree within sign
     * @param {number} longitude - Longitude in degrees
     * @returns {string} Formatted degree
     */
    formatDegree(longitude) {
        const degree = longitude % 30;
        const degrees = Math.floor(degree);
        const minutes = Math.floor((degree - degrees) * 60);
        const seconds = Math.floor(((degree - degrees) * 60 - minutes) * 60);
        return `${degrees}°${minutes}'${seconds}"`;
    }
    
    /**
     * Set house system
     * @param {string} system - House system code
     */
    setHouseSystem(system = 'P') {
        this.houseSystem = system;
    }

    /**
     * Close Swiss Ephemeris
     */
    close() {
        swisseph.swe_close();
    }
}

module.exports = SynastryCalculator;