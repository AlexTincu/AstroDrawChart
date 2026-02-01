const swisseph = require('swisseph');
const DateTimeUtils = require("./DateTimeUtils");

/**
 * Professional Progressive Chart Calculator using Swiss Ephemeris
 * Calculates progressed planetary positions using the "day-for-a-year" method
 */

class ProgressiveCalculator {
    constructor(houseSystem="P") {
        // Initialize Swiss Ephemeris
        swisseph.swe_set_ephe_path('./ephemeris');

        // House system (Placidus by default)
        this.houseSystem = houseSystem;

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
            // VERTEX: swisseph.SE_VERTEX,
            // CERES: swisseph.SE_CERES,
            // PALLAS: swisseph.SE_PALLAS,
            // JUNO: swisseph.SE_JUNO,
            // VESTA: swisseph.SE_VESTA,
        };

        // Progression methods for different planets
        this.progressionMethods = {
            // Personal planets progress normally
            SUN: 'secondary',
            MOON: 'secondary',
            MERCURY: 'secondary',
            VENUS: 'secondary',
            MARS: 'secondary',
            
            // Social planets can use slower progression or remain static
            JUPITER: 'secondary', // Often kept natal
            SATURN: 'secondary',  // Often kept natal
            
            // Outer planets typically remain at natal positions
            URANUS: 'secondary',
            NEPTUNE: 'secondary',
            PLUTO: 'secondary',
            
            // Points and asteroids
            NORTH_NODE: 'secondary',
            CHIRON: 'secondary',
            LILITH: 'secondary',
            // VERTEX: 'static',
            // CERES: 'secondary',
            // PALLAS: 'static',
            // JUNO: 'static',
            // VESTA: 'static'
        };

        // Aspect definitions for progressed chart
        this.aspects = {
            CONJUNCTION: { angle: 0, orb: 1, name: 'Conjunction' },
            OPPOSITION: { angle: 180, orb: 1, name: 'Opposition' },
            TRINE: { angle: 120, orb: 1, name: 'Trine' },
            SQUARE: { angle: 90, orb: 1, name: 'Square' },
            SEXTILE: { angle: 60, orb: 1, name: 'Sextile' },
            // Progressed aspects use tighter orbs
            // QUINCUNX: { angle: 150, orb: 0.5, name: 'Quincunx' },
            // SEMISEXTILE: { angle: 30, orb: 0.5, name: 'Semi-sextile' }
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
     * Calculate the progressed date based on birth date and target age
     * @param {Date} birthDate - Birth date
     * @param {number} ageInYears - Current age in years (can be fractional)
     * @returns {Date} Progressed date for planetary calculations
     */
    calculateProgressedDate(birthDate, ageInYears) {
        // Secondary progression: 1 day = 1 year
        const progressedDate = new Date(birthDate);
        progressedDate.setDate(progressedDate.getDate() + ageInYears);
        
        return progressedDate;
    }

    /**
     * Calculate age from birth date to target date
     * @param {Date} birthDate - Birth date
     * @param {Date} targetDate - Target date
     * @returns {number} Age in years (fractional)
     */
    calculateAge(birthDate, targetDate) {
        const diffInMs = targetDate.getTime() - birthDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
        return diffInDays / 365.25; // Account for leap years
    }

    /**
     * Calculate progressed planetary positions
     * @param {number} julianDay - Julian Day for progressed positions
     * @param {Object} natalPositions - Natal planetary positions
     * @param {Object} houses - House data (optional)
     * @returns {Object} Progressed planetary positions
     */
    calculateProgressedPositions(julianDay, natalPositions, houses = null) {
        const progressedPositions = {};
        const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED;

        for (const [planetName, planetId] of Object.entries(this.planets)) {
            const progressionMethod = this.progressionMethods[planetName] || 'secondary';
            
            try {
                let planetData;
                
                if (progressionMethod === 'static') {
                    // Keep natal position for slow-moving planets
                    planetData = { ...natalPositions[planetName] };
                    planetData.progressionMethod = 'static';
                } else {
                    // Calculate progressed position using secondary progression
                    const result = swisseph.swe_calc_ut(julianDay, planetId, flags);
                    
                    if (result.rflag >= 0) {
                        planetData = {
                            longitude: result.longitude,
                            // latitude: result.latitude,
                            // distance: result.distance,
                            // longitudeSpeed: result.longitudeSpeed,
                            // latitudeSpeed: result.latitudeSpeed,
                            // distanceSpeed: result.distanceSpeed,
                            sign: this.getZodiacSign(result.longitude),
                            degree: this.formatDegree(result.longitude),
                            progressionMethod: 'secondary'
                        };

                        // Add natal comparison
                        if (natalPositions[planetName]) {
                            planetData.natalLongitude = natalPositions[planetName].longitude;
                            // planetData.progressedMovement = this.calculateProgressedMovement(
                            //     natalPositions[planetName].longitude,
                            //     result.longitude
                            // );
                        }
                    }
                }

                // Add house information if houses are provided
                if (planetData && houses && houses.houses) {
                    const houseInfo = this.determinePlanetHouse(planetData.longitude, houses.houses);
                    planetData.house = houseInfo.number;
                }

                if (planetData) {
                    progressedPositions[planetName] = planetData;
                }
            } catch (error) {
                console.warn(`Error calculating progressed position for ${planetName}:`, error.message);
            }
        }

        return progressedPositions;
    }

    /**
     * Calculate how much a planet has progressed from natal position
     * @param {number} natalLongitude - Natal longitude
     * @param {number} progressedLongitude - Progressed longitude
     * @returns {Object} Movement data
     */
    calculateProgressedMovement(natalLongitude, progressedLongitude) {
        let movement = progressedLongitude - natalLongitude;
        
        // Handle 360° boundary crossing
        if (movement > 180) movement -= 360;
        if (movement < -180) movement += 360;
        
        const signs = Math.floor(Math.abs(movement) / 30);
        const degrees = Math.abs(movement) % 30;
        
        return {
            totalDegrees: movement,
            signs: signs,
            degrees: degrees,
            direction: movement >= 0 ? 'forward' : 'backward',
            formattedMovement: this.formatMovement(movement)
        };
    }

    /**
     * Format movement for display
     * @param {number} movement - Movement in degrees
     * @returns {string} Formatted movement
     */
    formatMovement(movement) {
        const absMovement = Math.abs(movement);
        const signs = Math.floor(absMovement / 30);
        const degrees = absMovement % 30;
        const deg = Math.floor(degrees);
        const min = Math.floor((degrees - deg) * 60);
        
        let result = '';
        if (signs > 0) result += `${signs} sign${signs > 1 ? 's' : ''} `;
        result += `${deg}°${min}'`;
        
        return `${movement >= 0 ? '+' : '-'}${result}`;
    }

    /**
     * Calculate progressed houses using different methods
     * @param {Date} birthDate - Birth date
     * @param {Date} progressedDate - Progressed date for planets
     * @param {Date} targetDate - Target date for progression
     * @param {number} latitude - Birth latitude
     * @param {number} longitude - Birth longitude
     * @param {string} method - House progression method ('solar_arc', 'secondary', 'natal')
     * @returns {Object} Progressed house data
     */
    calculateProgressedHouses(birthDate, progressedDate, targetDate, latitude, longitude, method = 'secondary') {
        let houseJulianDay;
        
        switch (method) {
            case 'solar_arc':
                // Calculate solar arc progression
                const natalSunJD = this.dateToJulianDay(birthDate);
                const progressedSunJD = this.dateToJulianDay(progressedDate);
                
                const natalSun = swisseph.swe_calc_ut(natalSunJD, swisseph.SE_SUN, swisseph.SEFLG_SWIEPH);
                const progressedSun = swisseph.swe_calc_ut(progressedSunJD, swisseph.SE_SUN, swisseph.SEFLG_SWIEPH);
                
                const solarArc = progressedSun.longitude - natalSun.longitude;
                // For houses, we typically use the birth time with solar arc adjustment
                houseJulianDay = this.dateToJulianDay(birthDate);
                break;
                
            case 'secondary':
                // Use progressed date for houses (mean time progression)
                houseJulianDay = this.dateToJulianDay(progressedDate);
                break;
                
            case 'natal':
            default:
                // Keep natal houses
                houseJulianDay = this.dateToJulianDay(birthDate);
                break;
        }

        try {
            const result = swisseph.swe_houses(houseJulianDay, latitude, longitude, this.houseSystem);

            return {
                method: method,
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
            console.error('Error calculating progressed houses:', error.message);
            return null;
        }
    }

    /**
     * Determine which house a planet is in
     * @param {number} planetLongitude - Planet's longitude in degrees
     * @param {Array} houseCusps - Array of house cusp data
     * @returns {Object} House information for the planet
     */
    determinePlanetHouse(planetLongitude, houseCusps) {
        let normalizedLong = planetLongitude % 360;
        if (normalizedLong < 0) normalizedLong += 360;

        const cusps = houseCusps.map(house => house.cusp);
        
        for (let i = 0; i < 12; i++) {
            const currentCusp = cusps[i];
            const nextCusp = cusps[(i + 1) % 12];
            
            let houseStart = currentCusp;
            let houseEnd = nextCusp;
            
            if (houseEnd < houseStart) {
                if (normalizedLong >= houseStart || normalizedLong < houseEnd) {
                    return {
                        number: i + 1,
                        cuspDegree: this.formatDegree(currentCusp),
                        cuspSign: this.getZodiacSign(currentCusp)
                    };
                }
            } else {
                if (normalizedLong >= houseStart && normalizedLong < houseEnd) {
                    return {
                        number: i + 1,
                        cuspDegree: this.formatDegree(currentCusp),
                        cuspSign: this.getZodiacSign(currentCusp)
                    };
                }
            }
        }
        
        return {
            number: 1,
            cuspDegree: this.formatDegree(cusps[0]),
            cuspSign: this.getZodiacSign(cusps[0])
        };
    }

    /**
     * Calculate progressed aspects (progressed to natal)
     * @param {Object} progressedPositions - Progressed planetary positions
     * @param {Object} natalPositions - Natal planetary positions
     * @returns {Array} Array of progressed aspects
     */
    calculateProgressedAspects(progressedPositions, natalPositions) {
        const aspects = [];
        
        // Progressed to Natal aspects
        for (const [progressedPlanet, progressedPos] of Object.entries(progressedPositions)) {
            for (const [natalPlanet, natalPos] of Object.entries(natalPositions)) {
                // Skip if same planet (except for progressed planet to natal angles)
                if (progressedPlanet === natalPlanet && 
                    !['ASCENDANT', 'MIDHEAVEN', 'DESCENDANT', 'IMUM_COELI'].includes(natalPlanet)) {
                    continue;
                }
                
                const angle = this.calculateAngleBetweenPlanets(
                    progressedPos.longitude,
                    natalPos.longitude
                );

                const aspect = this.findAspect(angle);
                if (aspect) {
                    aspects.push({
                        progressedPlanet,
                        natalPlanet,
                        aspect: aspect.name,
                        angle: aspect.angle,
                        orb: Math.abs(angle - aspect.angle),
                        exactness: ((aspect.orb - Math.abs(angle - aspect.angle)) / aspect.orb) * 100,
                        type: 'progressed-to-natal'
                    });
                }
            }
        }

        // Progressed to Progressed aspects (internal progressed aspects)
        const progressedPlanetNames = Object.keys(progressedPositions);
        for (let i = 0; i < progressedPlanetNames.length; i++) {
            for (let j = i + 1; j < progressedPlanetNames.length; j++) {
                const planet1 = progressedPlanetNames[i];
                const planet2 = progressedPlanetNames[j];
                const angle = this.calculateAngleBetweenPlanets(
                    progressedPositions[planet1].longitude,
                    progressedPositions[planet2].longitude
                );

                const aspect = this.findAspect(angle);
                if (aspect) {
                    aspects.push({
                        progressedPlanet: planet1,
                        natalPlanet: planet2,
                        aspect: aspect.name,
                        angle: aspect.angle,
                        orb: Math.abs(angle - aspect.angle),
                        exactness: ((aspect.orb - Math.abs(angle - aspect.angle)) / aspect.orb) * 100,
                        type: 'progressed-to-progressed'
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
     * Calculate progressed South Node
     * @param {Object} progressedPositions - Progressed positions containing North Node
     * @returns {Object} South Node data
     */
    calculateProgressedSouthNode(progressedPositions) {
        if (!progressedPositions.NORTH_NODE) {
            return null;
        }
        
        const southNodeLongitude = (progressedPositions.NORTH_NODE.longitude + 180) % 360;
        
        return {
            longitude: southNodeLongitude,
            latitude: -progressedPositions.NORTH_NODE.latitude,
            distance: progressedPositions.NORTH_NODE.distance,
            longitudeSpeed: progressedPositions.NORTH_NODE.longitudeSpeed,
            latitudeSpeed: -progressedPositions.NORTH_NODE.latitudeSpeed,
            distanceSpeed: progressedPositions.NORTH_NODE.distanceSpeed,
            sign: this.getZodiacSign(southNodeLongitude),
            degree: this.formatDegree(southNodeLongitude),
            progressionMethod: 'calculated'
        };
    }

    /**
     * Generate complete progressed chart
     * @param {Object} birthData
     * * @param {Object} natalPlanets
     * @param {Date} targetDate - Date for which to calculate progression
     * @param {string} houseMethod - House progression method
     * @returns {Object} Complete progressed chart
     */
    generateProgressedChart(birthData, natalPlanets, targetDate = new Date(), houseMethod = 'secondary') {
        const { date:birthDate, latitude, longitude } = birthData;
        const age = this.calculateAge(birthDate, targetDate);
        const progressedDate = this.calculateProgressedDate(birthDate, age);
        const progressedJulianDay = this.dateToJulianDay(progressedDate);
        
        // Calculate progressed houses
        const progressedHouses = this.calculateProgressedHouses(
            birthDate,
            progressedDate,
            targetDate,
            latitude,
            longitude,
            houseMethod
        );

        // Calculate progressed planetary positions
        const progressedPositions = this.calculateProgressedPositions(
            progressedJulianDay,
            natalPlanets,
            progressedHouses
        );

        // Calculate progressed South Node
        if (progressedPositions.NORTH_NODE) {
            const southNode = this.calculateProgressedSouthNode(progressedPositions);
            if (southNode && progressedHouses) {
                southNode.house = this.determinePlanetHouse(southNode.longitude, progressedHouses.houses);
            }
            progressedPositions.SOUTH_NODE = southNode;
        }

        // Calculate progressed aspects
        const progressedAspects = this.calculateProgressedAspects(progressedPositions, natalPlanets);

        return {
            chart:{
                positions:progressedPositions,
                ...progressedHouses,
                aspects:progressedAspects,
            },
            meta: {
                birthDate: birthDate.toISOString(),
                targetDate: targetDate.toISOString(),
                progressedDate: progressedDate.toISOString(),
                age: age,
                julianDay: progressedJulianDay,
                houseMethod: houseMethod,
                calculatedAt: new Date().toISOString(),
                ephemerisVersion: 'Swiss Ephemeris',
                progressionMethod: 'Secondary Progression (Day for Year)',
                houseSystem: this.houseSystem
            },
        };
    }

    /**
     * Get major progressed aspects (most significant)
     * @param {Array} aspects - Progressed aspects
     * @param {number} maxOrb - Maximum orb to consider
     * @returns {Array} Major progressed aspects
     */
    getMajorProgressedAspects(aspects, maxOrb = 0.5) {
        const majorAspects = ['Conjunction', 'Opposition', 'Trine', 'Square', 'Sextile'];
        
        return aspects.filter(aspect => {
            const isMajorAspect = majorAspects.includes(aspect.aspect);
            const isWithinOrb = aspect.orb <= maxOrb;
            const isSignificant = aspect.type === 'progressed-to-natal' || 
                                (aspect.type === 'progressed-to-progressed' && 
                                 ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS'].includes(aspect.progressedPlanet));
            
            return isMajorAspect && isWithinOrb && isSignificant;
        });
    }

    /**
     * Set custom progression methods for planets
     * @param {Object} methods - Custom progression methods
     */
    setProgressionMethods(methods) {
        this.progressionMethods = { ...this.progressionMethods, ...methods };
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

module.exports = ProgressiveCalculator;