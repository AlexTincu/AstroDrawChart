const { JSDOM } = require('jsdom');
const path = require('path');

/**
 * Generates an SVG string for an astrological chart using AstroChart and JSDOM.
 * @param {Object} dataRadix - The planetary data and cusps.
 * @param {Object} dataTransits - The planetary data and cusps.
 * @param {Object} settings - Optional chart settings.
 * @returns {string} - The generated SVG string.
 */
function generateChartSVG(dataRadix, dataTransits = null, settings = null) {
	const dom = new JSDOM('<!DOCTYPE html><div id="chart_container"></div>');
	const { window } = dom;
	const { document } = window;

	// Polyfill or globalize required for AstroChart
	global.window = window;
	global.document = document;
	global.self = window;
	global.Node = window.Node;
	global.Element = window.Element;
	global.SVGElement = window.SVGElement;

	// Load the pre-built AstroChart library
	// Path is relative to this utility file
	const astrochartPath = path.resolve(__dirname, '../../dist/astrochart.js');
	const astrochart = require(astrochartPath);

	// Default settings if not provided
	const chartSettings = Object.assign({
		COLOR_ARIES: "#EF5350",
		COLOR_TAURUS: "#66BB6A",
		COLOR_GEMINI: "#FFEE58",
		COLOR_CANCER: "#42A5F5",
		COLOR_LEO: "#EF5350",
		COLOR_VIRGO: "#66BB6A",
		COLOR_LIBRA: "#FFEE58",
		COLOR_SCORPIO: "#42A5F5",
		COLOR_SAGITTARIUS: "#EF5350",
		COLOR_CAPRICORN: "#66BB6A",
		COLOR_AQUARIUS: "#FFEE58",
		COLOR_PISCES: "#42A5F5",
		DEBUG: false,

		STROKE_ONLY: false,
		SYMBOL_SCALE: 1.2,
		POINTS_TEXT_SIZE: 9,
		MARGIN: 40,
		SHIFT_IN_DEGREES: 180,
		// COLOR_BACKGROUND:"#FFFFF0",
		POINTS_COLOR: "#444444",
		SIGNS_COLOR: "#444444",
		CIRCLE_COLOR: "#90A4AE",
		LINE_COLOR: "#90A4AE",
		CUSPS_FONT_COLOR: "#90A4AE",
		SYMBOL_AXIS_FONT_COLOR: "#90A4AE",
		SHOW_DIGNITIES_TEXT: false,

		ASPECTS: {
			conjunction: { degree: 0, orbit: 10, color: 'transparent' },
			square: { degree: 90, orbit: 8, color: '#FF4500' },
			trine: { degree: 120, orbit: 8, color: '#2B56FD' },
			sextile: { degree: 60, orbit: 8, color: '#2B56FD' },
			opposition: { degree: 180, orbit: 10, color: '#FF4500' }
		},

	}, settings);

	if (dataTransits) {
		chartSettings.MARGIN = 80;
	}

	try {
		// AstroChart expects a container ID and dimensions
		const chart = new astrochart.Chart('chart_container', 700, 700, chartSettings);
		const radix = chart.radix({ planets: dataRadix.planets, cusps: dataRadix.cusps });
		if (dataRadix.aspects) {
			radix.aspects(dataRadix.aspects);
		}

		if (dataTransits) {
			const transit = radix.transit({ planets: dataTransits.planets, cusps: dataTransits.cusps });
		}

		// Extract the SVG from the virtual DOM
		const chart_container = document.getElementById('chart_container');
		return chart_container.innerHTML;
	} catch (error) {
		console.error('Error generating chart SVG:', error);
		throw error;
	} finally {
		// Cleanup globals to avoid polluting other requests
		delete global.window;
		delete global.document;
		delete global.Node;
		delete global.Element;
		delete global.SVGElement;
	}
}

module.exports = { generateChartSVG };
