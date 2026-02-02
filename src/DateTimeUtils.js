const { DateTime } = require("luxon");

const DateTimeUtils = {
  adjustForTimezone(date, timezone = 0) {
    return new Date(date.getTime() - timezone * 60 * 60 * 1000);
    //return convertToUTC(date, timezone);
  },

  normalizeZone(timezone) {
    if (/^[+-]?\d{1,2}$/.test(timezone)) {
      let sign = timezone.startsWith("+") ? "+" : timezone.startsWith("-") ? "-" : "+";
      let hour = timezone.replace(/^[+-]/, "").padStart(2, "0");
      return `${sign}${hour}:00`;
    }
    return timezone;
  },

  convertToUTC(dateStr, timezone) {
    const zone = this.normalizeZone(timezone);
    let dt;

    if (dateStr) {
      // dt = DateTime.fromFormat(dateStr, "yyyy-MM-ddTHH:mm:00", { zone });
      dt = DateTime.fromFormat(dateStr, "dd/MM/yyyy HH:mm", { zone });
    } else {
      dt = DateTime.now().setZone(zone);
    }
    console.log(dt.toJSDate());

    if (!dt.isValid) {
      throw new Error("Invalid date or timezone format");
    }

    return dt.toUTC().toJSDate();
  },

  nowInZone(timezone) {
    const zone = this.normalizeZone(timezone);
    const dt = DateTime.now().setZone(zone);
    if (!dt.isValid) throw new Error("Invalid timezone");
    return dt.toUTC().toJSDate();
  }
};

module.exports = DateTimeUtils;
