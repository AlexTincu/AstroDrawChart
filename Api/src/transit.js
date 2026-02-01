const swisseph = require('swisseph');
const DateTimeUtils = require("./DateTimeUtils");

/**
 * Professional Transit Calculator using Swiss Ephemeris
 * Calculates transiting planet aspects to natal chart positions
 */

class TransitCalculator {
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
            // Vertex: swisseph.SE_VERTEX,
            // Ceres: swisseph.SE_CERES,                  // Asteroid Ceres
            // Pallas: swisseph.SE_PALLAS,                // Asteroid Pallas
            // Juno: swisseph.SE_JUNO,                    // Asteroid Juno
            // Vesta: swisseph.SE_VESTA,                  // Asteroid Vesta
        };

        // Transit aspect definitions with different orbs for different planet combinations
        this.transitAspects = {
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
            SATURN: { major: 2, minor: 1 },
            URANUS: { major: 2, minor: 1 },
            NEPTUNE: { major: 2, minor: 1 },
            PLUTO: { major: 2, minor: 1 },
            
            // Social planets - medium orbs
            JUPITER: { major: 1.5, minor: 0.5 },
            
            // Personal planets - tighter orbs
            SUN: { major: 1, minor: 0.5 },
            MOON: { major: 1, minor: 0.5 },
            MERCURY: { major: 1, minor: 0.5 },
            VENUS: { major: 1, minor: 0.5 },
            MARS: { major: 1, minor: 0.5 },
            
            // Points
            NORTH_NODE: { major: 1, minor: 0.5 },
            CHIRON: { major: 1, minor: 0.5 },
            LILITH: { major: 1, minor: 0.5 }
        };

        // Major vs minor aspects
        this.majorAspects = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
        this.minorAspects = ['quincunx', 'semisextile', 'semisquare', 'sesquiquadrate'];
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
                    if (houses) {
                        const houseInfo = this.determinePlanetHouse(result.longitude, houses);
                        planetData.house = houseInfo.number;
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
    calculateTransits(natalPositions, natalHouses, transitDate) 
    {
        // const { date:transitDate, latitude, longitude, timezone = 0 } = transitData;

        // Adjust for timezone
        // const transitDate = new Date(date.getTime() - timezone * 60 * 60 * 1000);

        const transitJulianDay = this.dateToJulianDay(transitDate);

        // const transitPositions = this.calculatePlanetaryPositions(transitJulianDay);        
        // Then calculate planetary positions with house information
        const transitPositions = this.calculatePlanetaryPositions(transitJulianDay, natalHouses);

        const transits = {
            transitDate: transitDate.toLocaleString(),
            julianDay: transitJulianDay,
            transitPositions: transitPositions,
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
                        transitingPlanet: transitPlanet,
                        transitingSign: transitPos.sign,
                        natalPlanet: natalPlanet,
                        natalSign: natalPos.sign,
                        aspect: aspectData.aspect.name, // only name for now
                        orb: aspectData.orb,
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
                        peakDate: this.estimatePeakDate(transitPos, natalPos, aspectData.targetAngle, transitDate)
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
        
        for (const [aspectName, aspectData] of Object.entries(this.transitAspects)) {
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
        const aspectName = aspect.aspect.name;
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
     * Get transits by time period
     * @param {Object} natalPositions - Natal positions
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {number} stepDays - Days between calculations
     * @returns {Array} Transits over time period
     */
    getTransitsInPeriod(natalPositions, houses, startDate, endDate, stepDays = 1) {
        const transitPeriod = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayTransits = this.calculateTransits(natalPositions, houses, new Date(currentDate));
            transitPeriod.push({
                date: new Date(currentDate),
                transitPositions: dayTransits.transitPositions,
                transits: dayTransits.aspects.filter(t => t.orb <= 1) // Only close aspects
            });
            
            currentDate.setDate(currentDate.getDate() + stepDays);
        }
        
        return transitPeriod;
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
     * Calculate moon phase for a given date
     * @param {Date} date - Date to calculate moon phase for
     * @returns {Object} Moon phase information
     */
    calculateMoonPhase(date) {
        // Julian day number calculation
        const jd = (date.getTime() / 86400000) + 2440587.5;
        
        // Moon phase calculation (simplified)
        const moonAge = (jd - 2451549.5) % 29.53058867;
        
        let phase;
        let phaseName;
        
        if (moonAge < 1.84566) {
            phase = "New Moon";
            phaseName = "New Moon";
        } else if (moonAge < 5.53699) {
            phase = "Waxing Crescent";
            phaseName = "Waxing Crescent";
        } else if (moonAge < 9.22831) {
            phase = "First Quarter";
            phaseName = "First Quarter";
        } else if (moonAge < 12.91963) {
            phase = "Waxing Gibbous";
            phaseName = "Waxing Gibbous";
        } else if (moonAge < 16.61096) {
            phase = "Full Moon";
            phaseName = "Full Moon";
        } else if (moonAge < 20.30228) {
            phase = "Waning Gibbous";
            phaseName = "Waning Gibbous";
        } else if (moonAge < 23.99361) {
            phase = "Last Quarter";
            phaseName = "Last Quarter";
        } else {
            phase = "Waning Crescent";
            phaseName = "Waning Crescent";
        }
        
        return {
            phase: phase,
            phaseName: phaseName,
            moonAge: moonAge
        };
    }

    /**
     * Binary search algorithm to find exact moment of an event
     * @param {Date} startDate - Start of search period
     * @param {Date} endDate - End of search period
     * @param {Function} checkFunction - Function that returns true when event occurs
     * @param {number} precision - Precision in minutes (default: 1)
     * @returns {Date|null} Exact moment of event or null if not found
     */
    findExactMoment(startDate, endDate, checkFunction, precision = 1) {
        let low = new Date(startDate);
        let high = new Date(endDate);
        const precisionMs = precision * 60 * 1000; // Convert minutes to milliseconds
        
        // Check if event is already happening at start
        if (checkFunction(low)) {
            return low;
        }
        
        // Check if event is not happening at end
        if (!checkFunction(high)) {
            return null;
        }
        
        // Binary search for exact moment
        while (high.getTime() - low.getTime() > precisionMs) {
            const mid = new Date((low.getTime() + high.getTime()) / 2);
            
            if (checkFunction(mid)) {
                high = mid;
            } else {
                low = mid;
            }
        }
        
        return low;
    }

    /**
     * Check if a planet changes sign between two dates
     * @param {string} planetName - Name of the planet
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Object|null} Sign change information or null
     */
    checkPlanetSignChange(planetName, startDate, endDate) {
        const planetId = this.planets[planetName];
        if (!planetId) return null;

        const startJD = this.dateToJulianDay(startDate);
        const endJD = this.dateToJulianDay(endDate);

        // Get positions at start and end
        const startResult = swisseph.swe_calc_ut(startJD, planetId, swisseph.SEFLG_SWIEPH);
        const endResult = swisseph.swe_calc_ut(endJD, planetId, swisseph.SEFLG_SWIEPH);

        if (startResult.rflag < 0 || endResult.rflag < 0) return null;

        const startSign = this.getZodiacSign(startResult.longitude);
        const endSign = this.getZodiacSign(endResult.longitude);

        if (startSign !== endSign) {
            // Find exact moment of sign change
            const exactMoment = this.findExactMoment(startDate, endDate, (date) => {
                const jd = this.dateToJulianDay(date);
                const result = swisseph.swe_calc_ut(jd, planetId, swisseph.SEFLG_SWIEPH);
                if (result.rflag < 0) return false;
                const currentSign = this.getZodiacSign(result.longitude);
                return currentSign === endSign;
            });

            return {
                planet: planetName,
                fromSign: startSign,
                toSign: endSign,
                exactTime: exactMoment,
                formattedTime: exactMoment ? exactMoment.toLocaleString() : null
            };
        }

        return null;
    }

    /**
     * Check if moon phase changes between two dates
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Object|null} Moon phase change information or null
     */
    checkMoonPhaseChange(startDate, endDate) {
        const startPhase = this.calculateMoonPhase(startDate);
        const endPhase = this.calculateMoonPhase(endDate);

        if (startPhase.phase !== endPhase.phase) {
            // Find exact moment of phase change
            const exactMoment = this.findExactMoment(startDate, endDate, (date) => {
                const currentPhase = this.calculateMoonPhase(date);
                return currentPhase.phase === endPhase.phase;
            });

            return {
                fromPhase: startPhase.phase,
                fromPhaseName: startPhase.phaseName,
                toPhase: endPhase.phase,
                toPhaseName: endPhase.phaseName,
                exactTime: exactMoment,
                formattedTime: exactMoment ? exactMoment.toLocaleString() : null
            };
        }

        return null;
    }

    /**
     * Check if a planet becomes retrograde or direct between two dates
     * @param {string} planetName - Name of the planet
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Object|null} Retrograde change information or null
     */
    checkPlanetRetrogradeChange(planetName, startDate, endDate) {
        const planetId = this.planets[planetName];
        if (!planetId) return null;

        const startJD = this.dateToJulianDay(startDate);
        const endJD = this.dateToJulianDay(endDate);

        // Get speeds at start and end
        const startResult = swisseph.swe_calc_ut(startJD, planetId, swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED);
        const endResult = swisseph.swe_calc_ut(endJD, planetId, swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED);

        if (startResult.rflag < 0 || endResult.rflag < 0) return null;

        const startRetrograde = startResult.longitudeSpeed < 0;
        const endRetrograde = endResult.longitudeSpeed < 0;

        if (startRetrograde !== endRetrograde) {
            // Find exact moment of retrograde change
            const exactMoment = this.findExactMoment(startDate, endDate, (date) => {
                const jd = this.dateToJulianDay(date);
                const result = swisseph.swe_calc_ut(jd, planetId, swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED);
                if (result.rflag < 0) return false;
                const currentRetrograde = result.longitudeSpeed < 0;
                return currentRetrograde === endRetrograde;
            });

            return {
                planet: planetName,
                fromRetrograde: startRetrograde,
                toRetrograde: endRetrograde,
                changeType: endRetrograde ? 'becomes_retrograde' : 'becomes_direct',
                exactTime: exactMoment,
                formattedTime: exactMoment ? exactMoment.toLocaleString() : null
            };
        }

        return null;
    }

    /**
     * Find all significant events in a time period
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Object} All significant events
     */
    findSignificantEvents(startDate, endDate) {
        const events = {
            signChanges: [],
            moonPhaseChanges: [],
            retrogradeChanges: []
        };

        // Check for planet sign changes
        Object.keys(this.planets).forEach(planet => {
            if (planet !== 'Lilith') { // Skip Lilith for sign changes
                const signChange = this.checkPlanetSignChange(planet, startDate, endDate);
                if (signChange) {
                    events.signChanges.push(signChange);
                }
            }
        });

        // Check for moon phase changes
        const moonPhaseChange = this.checkMoonPhaseChange(startDate, endDate);
        if (moonPhaseChange) {
            events.moonPhaseChanges.push(moonPhaseChange);
        }

        // Check for retrograde changes (only for planets that can go retrograde)
        const retrogradePlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        retrogradePlanets.forEach(planet => {
            const retrogradeChange = this.checkPlanetRetrogradeChange(planet, startDate, endDate);
            if (retrogradeChange) {
                events.retrogradeChanges.push(retrogradeChange);
            }
        });

        return events;
    }

    /**
     * Create formatted response for upcoming transits with moon phases and exact events
     * @param {Array} upcomingTransits - Array of transit data
     * @param {Object} metaInfo - Meta information about the request
     * @returns {Object} Formatted response with data and meta
     */
    createUpcomingTransitsResponse(upcomingTransits, metaInfo = {}) {
        const response = [];
        
        upcomingTransits.forEach((dayData, index) => {
            let item = {
                day: dayData.date.toLocaleDateString(),
                positions: [], 
                aspects: [],
                events: []
            };

            // Add transit aspects
            if (dayData.transits && dayData.transits.length > 0) {
                dayData.transits.forEach(aspect => {
                    if (aspect.orb < 0.5) { // Only very close aspects
                        let row = `${aspect.transitingPlanet} in transit ${aspect.aspect} ${aspect.natalPlanet} natal (orb: ${aspect.orb.toFixed(2)}°)`; 
                        item.aspects.push(row);
                    }
                });    
            }

            // Add planetary positions
            if (dayData.transitPositions) {
                Object.entries(dayData.transitPositions).forEach(([planet, data]) => {
                    let position = `${planet} in ${data.sign} in house ${data.house} `;
                    if(data.degree > 29) {
                        position += ` (degree ${data.degree})`;
                    }
                    if(data.isRetrograde) {
                        position += ` (retrograde)`;
                    }
                    if(data.applying) {
                        position += ` (applying)`;
                    }
                    item.positions.push(position);
                });
            }

            // Add moon phase information
            const moonPhase = this.calculateMoonPhase(dayData.date);
            item.moonPhase = moonPhase.phaseName;

            // Check for significant events on this day
            if (index < upcomingTransits.length - 1) {
                const nextDay = upcomingTransits[index + 1].date;
                const events = this.findSignificantEvents(dayData.date, nextDay);
                
                // Add events to the response
                events.signChanges.forEach(event => {
                    item.events.push(`${event.planet} changes from ${event.fromSign} to ${event.toSign} at ${event.formattedTime}`);
                });
                
                events.moonPhaseChanges.forEach(event => {
                    item.events.push(`Moon phase changes from ${event.fromPhaseName} to ${event.toPhaseName} at ${event.formattedTime}`);
                });
                
                events.retrogradeChanges.forEach(event => {
                    const action = event.changeType === 'becomes_retrograde' ? 'becomes retrograde' : 'becomes direct';
                    item.events.push(`${event.planet} ${action} at ${event.formattedTime}`);
                });
            }

            response.push(item);
        });
        
        // Create meta information
        const meta = {
            input: {
                birthDate: metaInfo.birthDate || 'Not provided',
                latitude: metaInfo.latitude || 'Not provided',
                longitude: metaInfo.longitude || 'Not provided',
                startDate: metaInfo.startDate || 'Not provided',
                endDate: metaInfo.endDate || 'Not provided',
                days: metaInfo.days || 30
            },
            settings: {
                houseSystem: metaInfo.houseSystem || 'P',
                precision: '1 minute',
                eventDetection: {
                    signChanges: true,
                    moonPhaseChanges: true,
                    retrogradeChanges: true
                },
                aspectOrbLimit: 0.5
            }
        };
        
        return {
            data: response,
            meta: meta
        };
    }

    /**
     * Close Swiss Ephemeris
     */
    close() {
        swisseph.swe_close();
    }
}

// Usage example
async function example() {
    const transitCalculator = new TransitCalculator();
    
    try {
        // Example natal positions (you would get these from your natal chart calculator)
        const natalPositions = {
            SUN: { longitude: 127.5, sign: 'Leo', degree: '7°30\'0"' },
            MOON: { longitude: 45.2, sign: 'Taurus', degree: '15°12\'0"' },
            MERCURY: { longitude: 115.8, sign: 'Cancer', degree: '25°48\'0"' },
            VENUS: { longitude: 98.3, sign: 'Cancer', degree: '8°18\'0"' },
            MARS: { longitude: 156.7, sign: 'Virgo', degree: '6°42\'0"' },
            JUPITER: { longitude: 201.4, sign: 'Libra', degree: '21°24\'0"' },
            SATURN: { longitude: 278.9, sign: 'Capricorn', degree: '8°54\'0"' },
            URANUS: { longitude: 12.6, sign: 'Aries', degree: '12°36\'0"' },
            NEPTUNE: { longitude: 334.2, sign: 'Pisces', degree: '4°12\'0"' },
            PLUTO: { longitude: 289.1, sign: 'Capricorn', degree: '19°6\'0"' }
        };
        
        // Calculate current transits
        const currentTransits = transitCalculator.calculateTransits(natalPositions);
		// console.log('=== NATAL POSITIONS ===', currentTransits);

		// Specific date transits
		// const specificDate = new Date('2025-07-01');
        // houses must be given
		// const christmasTransits = transitCalculator.calculateTransits(natalPositions, houses, specificDate);
        
        // console.log('=== CURRENT TRANSITS ===');
        // console.log(`Date: ${new Date(currentTransits.transitDate).toLocaleDateString()}`);
        // console.log(`Total aspects: ${currentTransits.summary.total}`);
        // console.log(`Applying: ${currentTransits.summary.applying}, Separating: ${currentTransits.summary.separating}`);
        // console.log(`Exact (within 0.5°): ${currentTransits.summary.exact}`);
        
        // console.log('\n=== STRONGEST TRANSITS (closest orbs) ===');
        // currentTransits.aspects.slice(0, 10).forEach(aspect => {
        //     const applying = aspect.applying ? '→' : '←';
        //     const retrograde = aspect.transitPosition.isRetrograde ? 'Rx' : '';
        //     console.log(
        //         `${aspect.transitingPlanet}${retrograde} ${aspect.aspect.symbol} ${aspect.natalPlanet} ` +
        //         `(orb: ${aspect.orb.toFixed(2)}°) ${applying} ` +
        //         `${aspect.peakDate ? aspect.peakDate.toLocaleDateString() : 'N/A'}`
        //     );
        // });
        
        // console.log('\n=== MAJOR OUTER PLANET TRANSITS ===');
        // const majorTransits = transitCalculator.getMajorTransits(currentTransits);
        // majorTransits.forEach(aspect => {
        //     const applying = aspect.applying ? 'applying' : 'separating';
        //     console.log(
        //         `${aspect.transitingPlanet} ${aspect.aspect.name} natal ${aspect.natalPlanet} ` +
        //         `(${applying}, orb: ${aspect.orb.toFixed(2)}°)`
        //     );
        // });
        
        // console.log('\n=== TRANSIT SUMMARY BY ASPECT ===');
        // Object.entries(currentTransits.summary.byAspect).forEach(([aspect, count]) => {
        //     console.log(`${aspect}: ${count}`);
        // });
        
        // Calculate transits for next 30 days
        console.log('\n=== UPCOMING EXACT TRANSITS (Next 30 days) ===');
        const startDate = new Date();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const upcomingTransits = transitCalculator.getTransitsInPeriod(natalPositions, startDate, endDate, 1);
        
        upcomingTransits.forEach(dayData => {
            if (dayData.transits.length > 0) {
                console.log(`${dayData.date.toLocaleDateString()}:`);
                dayData.transits.forEach(aspect => {
                    if (aspect.orb < 0.5) { // Only very close aspects
                        console.log(`  ${aspect.transitingPlanet} ${aspect.aspect.name} ${aspect.natalPlanet} (${aspect.orb.toFixed(2)}°)`);
                    }
                });
            }
        });

        // console.log(upcomingTransits[0]);
        
    } catch (error) {
        console.error('Error calculating transits:', error);
    } finally {
        transitCalculator.close();
    }
}


// example();

module.exports = TransitCalculator;