const swisseph = require('swisseph');
const DateTimeUtils = require("./DateTimeUtils");

/**
 * Professional Astrological Calculator using Swiss Ephemeris
 * Calculates planetary positions and aspects for natal charts
 */

class AstrologicalCalculator {
    constructor(houseSystem='P') {
        // Initialize Swiss Ephemeris
        swisseph.swe_set_ephe_path('./ephemeris');

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

        // Aspect definitions (in degrees)
        this.aspects = {
            CONJUNCTION: { angle: 0, orb: 8, name: 'conjunction' },
            OPPOSITION: { angle: 180, orb: 8, name: 'opposition' },
            TRINE: { angle: 120, orb: 8, name: 'trine' },
            SQUARE: { angle: 90, orb: 8, name: 'square' },
            SEXTILE: { angle: 60, orb: 6, name: 'sextile' },
            // QUINCUNX: { angle: 150, orb: 3, name: 'Quincunx' },
            // SEMISEXTILE: { angle: 30, orb: 2, name: 'Semi-sextile' },
            // SEMISQUARE: { angle: 45, orb: 2, name: 'Semi-square' },
            // SESQUIQUADRATE: { angle: 135, orb: 2, name: 'Sesquiquadrate' }
        };

        // House system (Placidus by default)
        this.houseSystem = houseSystem;
    }

    /**
     * Convert date and time to Julian Day Number
     * @param {Date} date - Birth date
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
                        longitude: Number(result.longitude.toFixed(3)),
                        // latitude: result.latitude,
                        // distance: result.distance,
                        // longitudeSpeed: result.longitudeSpeed,
                        // latitudeSpeed: result.latitudeSpeed,
                        // distanceSpeed: result.distanceSpeed,
                        sign: this.getZodiacSign(result.longitude),
                        degree: this.formatDegree(result.longitude),
                    };

                    // Add house information if houses are provided
                    if (houses && houses.houses) {
                        const houseInfo = this.determinePlanetHouse(result.longitude, houses.houses);
                        planetData.house = houseInfo.number;
                    }

                    positions[planetName] = planetData;
                }
            } catch (error) {
                console.warn(`Error calculating position for ${planetName}:`, error.message);
            }
        }
        
        // Calculate South Node after North Node is calculated
        if (positions.NNode) {
            const southNode = this.calculateSouthNode(positions);
            if (southNode && houses) {
                southNode.house = this.determinePlanetHouse(southNode.longitude, houses.houses).number;
            }
            positions.SNode = southNode;
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
                        distanceFromCusp: this.calculateDistanceFromCusp(normalizedLong, currentCusp)
                    };
                }
            } else {
                // Normal case - house doesn't cross 0°
                if (normalizedLong >= houseStart && normalizedLong < houseEnd) {
                    return {
                        number: i + 1,
                        cuspDegree: this.formatDegree(currentCusp),
                        cuspSign: this.getZodiacSign(currentCusp),
                        distanceFromCusp: this.calculateDistanceFromCusp(normalizedLong, currentCusp)
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
     * Calculate distance from house cusp
     * @param {number} planetLongitude - Planet longitude
     * @param {number} cuspLongitude - House cusp longitude
     * @returns {number} Distance in degrees
     */
    calculateDistanceFromCusp(planetLongitude, cuspLongitude) {
        let distance = planetLongitude - cuspLongitude;
        
        // Handle crossing 0° boundary
        if (distance < 0) {
            distance += 360;
        }
        if (distance > 180) {
            distance = 360 - distance;
        }
        
        return Math.round(distance * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Get planetary house positions (separate method for convenience)
     * @param {Object} planetaryPositions - Planetary positions
     * @param {Object} houses - House data
     * @returns {Object} Planets with their house positions
     */
    getPlanetaryHousePositions(planetaryPositions, houses) {
        const planetHouses = {};
        
        for (const [planetName, planetData] of Object.entries(planetaryPositions)) {
            const houseInfo = this.determinePlanetHouse(planetData.longitude, houses.houses);
            planetHouses[planetName] = {
                ...planetData,
                house: houseInfo
            };
        }
        
        return planetHouses;
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
     * Calculate aspects between planets
     * @param {Object} positions - Planetary positions
     * @returns {Array} Array of aspects
     */
    calculatePositionsAspects(positions) {
        const aspects = [];
        const planetNames = Object.keys(positions);

        for (let i = 0; i < planetNames.length; i++) {
            for (let j = i + 1; j < planetNames.length; j++) {
                const planet1 = planetNames[i];
                const planet2 = planetNames[j];
                const angle = this.calculateAngleBetweenPlanets(
                    positions[planet1].longitude,
                    positions[planet2].longitude
                );

                const aspect = this.findAspect(angle);
                if (aspect) {
                    aspects.push({
                        planet1,
                        planet2,
                        aspect: aspect.name,
                        angle: aspect.angle,
                        orb: parseFloat(Math.abs(angle - aspect.angle).toFixed(2)),
                        applying: this.isApplying(positions[planet1], positions[planet2], aspect.angle)
                    });
                }
            }
        }

        return aspects.sort((a, b) => a.orb - b.orb);
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
     * Check if aspect is applying or separating
     * @param {Object} planet1 - First planet data
     * @param {Object} planet2 - Second planet data
     * @param {number} aspectAngle - Aspect angle
     * @returns {boolean} True if applying
     */
    isApplying(planet1, planet2, aspectAngle) {
        const currentAngle = this.calculateAngleBetweenPlanets(
            planet1.longitude,
            planet2.longitude
        );

        const futureAngle = this.calculateAngleBetweenPlanets(
            planet1.longitude + planet1.longitudeSpeed / 24,
            planet2.longitude + planet2.longitudeSpeed / 24
        );

        return Math.abs(futureAngle - aspectAngle) < Math.abs(currentAngle - aspectAngle);
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
     * Calculate South Node (always 180° opposite North Node)
     * @param {Object} positions - Planetary positions containing North Node
     * @returns {Object} South Node data
     */
    calculateSouthNode(positions) {
        if (!positions.NNode) {
            return null;
        }
        
        const southNodeLongitude = (positions.NNode.longitude + 180) % 360;
        
        return {
            longitude: southNodeLongitude,
            latitude: -positions.NNode.latitude, // Opposite latitude
            distance: positions.NNode.distance,
            longitudeSpeed: positions.NNode.longitudeSpeed,
            latitudeSpeed: -positions.NNode.latitudeSpeed,
            distanceSpeed: positions.NNode.distanceSpeed,
            sign: this.getZodiacSign(southNodeLongitude),
            degree: this.formatDegree(southNodeLongitude)
        };
    }

    /**
     * Calculate Part of Fortune
     * @param {Object} positions - Planetary positions
     * @param {Object} houses - House data with ascendant
     * @param {number} julianDay - Julian day for day/night determination
     * @param {number} latitude - Birth latitude
     * @param {number} longitude - Birth longitude
     * @returns {Object} Part of Fortune data
     */
    calculatePartOfFortune(positions, houses, julianDay, latitude, longitude) {
        if (!positions.SUN || !positions.MOON || !houses.angles.ascendant) {
            return null;
        }

        const sunLong = positions.SUN.longitude;
        const moonLong = positions.MOON.longitude;
        const ascLong = houses.angles.ascendant.longitude;
        
        // Determine if it's a day or night birth
        const isDayBirth = this.isDayBirth(julianDay, latitude, longitude);
        
        let fortuneLongitude;
        if (isDayBirth) {
            // Day birth: ASC + Moon - Sun
            fortuneLongitude = (ascLong + moonLong - sunLong) % 360;
        } else {
            // Night birth: ASC + Sun - Moon
            fortuneLongitude = (ascLong + sunLong - moonLong) % 360;
        }
        
        // Ensure positive longitude
        if (fortuneLongitude < 0) {
            fortuneLongitude += 360;
        }
        
        return {
            longitude: fortuneLongitude,
            latitude: 0, // Arabic parts have no latitude
            distance: 0,
            longitudeSpeed: 0,
            latitudeSpeed: 0,
            distanceSpeed: 0,
            sign: this.getZodiacSign(fortuneLongitude),
            degree: this.formatDegree(fortuneLongitude),
            formula: isDayBirth ? 'ASC + Moon - Sun (Day)' : 'ASC + Sun - Moon (Night)'
        };
    }

    /**
     * Determine if birth is during day or night
     * @param {number} julianDay - Julian day
     * @param {number} latitude - Birth latitude
     * @param {number} longitude - Birth longitude
     * @returns {boolean} True if day birth
     */
    isDayBirth(julianDay, latitude, longitude) {
        // Calculate sunrise and sunset for the birth date
        const flags = swisseph.SEFLG_MOSEPH;
        
        try {
            // Get Sun's position
            const sunResult = swisseph.swe_calc_ut(julianDay, swisseph.SE_SUN, flags);
            
            // Calculate rise and set times
            const riseResult = swisseph.swe_rise_trans(
                julianDay - 1, // Start search from previous day
                swisseph.SE_SUN,
                longitude,
                latitude,
                0, // Sea level
                0, // Rise
                flags
            );
            
            const setResult = swisseph.swe_rise_trans(
                julianDay - 1,
                swisseph.SE_SUN,
                longitude,
                latitude,
                0,
                1, // Set
                flags
            );
            
            if (riseResult.flag >= 0 && setResult.flag >= 0) {
                const sunrise = riseResult.tret;
                const sunset = setResult.tret;
                
                // Check if birth time is between sunrise and sunset
                return julianDay >= sunrise && julianDay <= sunset;
            }
        } catch (error) {
            console.warn('Error calculating day/night birth:', error.message);
        }
        
        // Fallback: use simple Sun position above horizon
        try {
            const sunResult = swisseph.swe_calc_ut(julianDay, swisseph.SE_SUN, flags);
            // Calculate Sun's altitude
            const geoResult = swisseph.swe_azalt(
                julianDay,
                swisseph.SE_ECL2HOR,
                longitude,
                latitude,
                0, // Sea level
                0, // Standard atmosphere
                [sunResult.longitude, sunResult.latitude]
            );
            
            // Day if Sun is above horizon
            return geoResult.altitude > 0;
        } catch (error) {
            console.warn('Error with fallback day/night calculation:', error.message);
            // Final fallback: assume day if Sun longitude is between ASC and DESC
            return true;
        }
    }

    /**
     * Calculate other Arabic Parts
     */
    calculateArabicParts(positions, houses, julianDay, latitude, longitude) {
        const parts = {};
        
        if (positions.SUN && positions.MOON && houses.angles.ascendant) {
            // Part of Fortune (already calculated above)
            parts.PART_OF_FORTUNE = this.calculatePartOfFortune(positions, houses, julianDay, latitude, longitude);
            
            // Part of Spirit (reverse of Part of Fortune)
            const isDayBirth = this.isDayBirth(julianDay, latitude, longitude);
            let spiritLong;
            if (isDayBirth) {
                spiritLong = (houses.angles.ascendant.longitude + positions.SUN.longitude - positions.MOON.longitude) % 360;
            } else {
                spiritLong = (houses.angles.ascendant.longitude + positions.MOON.longitude - positions.SUN.longitude) % 360;
            }
            if (spiritLong < 0) spiritLong += 360;
            
            parts.PART_OF_SPIRIT = {
                longitude: spiritLong,
                sign: this.getZodiacSign(spiritLong),
                degree: this.formatDegree(spiritLong)
            };
        }
        
        // Part of Love (Venus + Sun - Moon for day birth, Venus + Moon - Sun for night)
        if (positions.VENUS && positions.SUN && positions.MOON) {
            const isDayBirth = this.isDayBirth(julianDay, latitude, longitude);
            let loveLong;
            if (isDayBirth) {
                loveLong = (positions.VENUS.longitude + positions.SUN.longitude - positions.MOON.longitude) % 360;
            } else {
                loveLong = (positions.VENUS.longitude + positions.MOON.longitude - positions.SUN.longitude) % 360;
            }
            if (loveLong < 0) loveLong += 360;
            
            parts.PART_OF_LOVE = {
                longitude: loveLong,
                sign: this.getZodiacSign(loveLong),
                degree: this.formatDegree(loveLong)
            };
        }
        
        return parts;
    }

    /**
     * Generate complete natal chart with planetary house positions
     * @param {Object} birthData - Birth information
     * @returns {Object} Complete natal chart with house positions
     */
    generateNatalChart(birthData) {
        const { date, latitude, longitude, timezone = 0 } = birthData;

        // Adjust for timezone
        // const adjustedDate = new Date(date.getTime() - timezone * 60 * 60 * 1000);
        // const adjustedDate = DateTimeUtils.convertToUTC(date, timezone);
        // const adjustedDate = date; // already converted to UTC in src/natal.js
        
        const julianDay = this.dateToJulianDay(date);

        const houses = this.calculateHouses(julianDay, latitude, longitude);

        const positions = this.calculatePlanetaryPositions(julianDay, houses);
        
        const aspects = this.calculatePositionsAspects(positions);

        return {
            birthData: {
                date: date.toISOString(),
                latitude,
                longitude,
                timezone,
                julianDay
            },
            planets: positions,
            houses: houses.houses,
            aspects: aspects,
            // metadata: {
            //     calculatedAt: new Date().toLocaleString(),
            //     ephemerisVersion: 'Swiss Ephemeris',
            //     houseSystem: this.houseSystem
            // }
        };
    }

    /**
     * Calculate transits for a natal chart
     * @param {Object} natalPositions - Natal planet positions
     * @param {Date} transitDate - Date for transit calculation (default: now)
     * @returns {Object} Transit analysis
     */
    calculateTransitsAspects(natalPositions, transitPositions) 
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
                        // applying: this.isTransitApplying(transitPos, natalPos, aspectData.targetAngle),
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
                    // this.updateTransitSummary(transits.summary, aspect);
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
     * Set custom aspects
     * @param {Object} customAspects - Custom aspect definitions
     */
    setCustomAspects(customAspects) {
        this.aspects = { ...this.aspects, ...customAspects };
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

// Enhanced usage example showing house positions
async function example() {
    const calculator = new AstrologicalCalculator();
    calculator.setHouseSystem('W'); // Placidus houses

    try {
        const birthData = {
            date: new Date('1985-11-06T19:35:00'),
            latitude: 44.26, // Gaesti, Romania
            longitude: 26.06,
            timezone: "+2"
        };

        // Adjust for timezone
        // birthData.date = new Date(birthData.date.getTime() - birthData.timezone * 60 * 60 * 1000);

        const natalChart = calculator.generateNatalChart(birthData);        
        
        // console.log('=== NATAL CHART WITH HOUSE POSITIONS ===', natalChart.planets);
        // console.log('\n=== PLANETARY POSITIONS WITH HOUSES ===');
        // Object.entries(natalChart.planets).forEach(([planet, data]) => {
        //     if (data.house) {
        //         console.log(`${planet}: ${data.degree} ${data.sign} in house ${data.house.number} (${data.house.meaning})`);
        //         // console.log(`  Distance from cusp: ${data.house.distanceFromCusp}°`);
        //     } else {
        //         console.log(`${planet}: ${data.degree} ${data.sign}`);
        //     }
        // });

        // console.log('\n=== HOUSE CUSPS ===');
        // if (natalChart.houses) {
        //     natalChart.houses.houses.forEach(house => {
        //         console.log(`House ${house.house}: ${house.degree} ${house.sign}`);
        //     });
        
        //     console.log('\n=== ANGLES ===');
        //     console.log(`Ascendant: ${natalChart.houses.angles.ascendant.degree} ${natalChart.houses.angles.ascendant.sign}`);
        //     console.log(`Midheaven: ${natalChart.houses.angles.midheaven.degree} ${natalChart.houses.angles.midheaven.sign}`);
        // }

        // console.log('\n=== ASPECTS ===');
        // natalChart.aspects.slice(0, 100).forEach(aspect => {
        //     console.log(`${aspect.planet1} ${aspect.aspect} ${aspect.planet2} (orb: ${aspect.orb.toFixed(2)}°, ${aspect.applying ? 'applying' : 'separating'})`);
        // });
        
        // // Example of using the separate method to get house positions
        // console.log('\n=== USING SEPARATE METHOD ===');
        // const planetHouses = calculator.getPlanetaryHousePositions(natalChart.planets, natalChart.houses);
        // console.log('Sun in House:', planetHouses.SUN?.house?.number, planetHouses.SUN?.house?.name);

    } catch (error) {
        console.error('Error generating natal chart:', error);
    } finally {
        calculator.close();
    }
}

// example();

module.exports = AstrologicalCalculator;