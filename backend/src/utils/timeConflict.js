/**
 * Check whether a new time range [newFrom, newTo] overlaps any existing slot.
 * All parameters are comparable values (Date objects, ISO strings, or HH:MM strings).
 *
 * Overlap condition: newFrom < existing.to_time  AND  newTo > existing.from_time
 *
 * @param {Array<{from_time: *, to_time: *}>} existingSlots
 * @param {*} newFrom
 * @param {*} newTo
 * @returns {boolean}
 */
function hasTimeCollision(existingSlots, newFrom, newTo) {
  const nf = new Date(newFrom);
  const nt = new Date(newTo);

  return existingSlots.some(slot => {
    const ef = new Date(slot.from_time);
    const et = new Date(slot.to_time);
    return nf < et && nt > ef;
  });
}

/**
 * For TIME-only comparisons (HH:MM or HH:MM:SS strings).
 * Converts to comparable integers (minutes since midnight).
 */
function timeToMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

function hasTimeCollisionByTime(existingSlots, newFrom, newTo) {
  const nf = timeToMinutes(newFrom);
  const nt = timeToMinutes(newTo);

  return existingSlots.some(slot => {
    const ef = timeToMinutes(slot.from_time);
    const et = timeToMinutes(slot.to_time);
    return nf < et && nt > ef;
  });
}

module.exports = { hasTimeCollision, hasTimeCollisionByTime, timeToMinutes };
