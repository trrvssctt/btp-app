const asyncHandler = require('../utils/asyncHandler');
const { query } = require('../db/pool');

exports.summary = asyncHandler(async (_req, res) => {
  const [buildingRes, deviceRes, monthlyRes] = await Promise.all([
    query(`
      SELECT b.id, b.name,
             COALESCE(SUM(ep.nominal_power_watt * 8 / 1000), 0)::numeric(10,2) AS estimated_daily_kwh
        FROM dom_buildings b
        LEFT JOIN dom_devices d ON d.building_id = b.id AND d.status != 'offline'
        LEFT JOIN dom_energy_profiles ep ON ep.device_id = d.id
       GROUP BY b.id, b.name
       ORDER BY b.name
    `),
    query(`
      SELECT d.id, d.name, d.location, d.status, d.building_id,
             ep.nominal_power_watt, ep.kwh_price, ep.daily_threshold_kwh,
             ep.monthly_threshold_kwh, ep.can_be_auto_cut, ep.priority
        FROM dom_devices d
        JOIN dom_energy_profiles ep ON ep.device_id = d.id
       ORDER BY ep.nominal_power_watt DESC
    `),
    query(`
      SELECT date_trunc('month', received_at) AS month,
             d.building_id,
             COUNT(*)::int AS reading_count,
             AVG(r.value)::numeric(10,4) AS avg_value
        FROM dom_readings r
        JOIN dom_devices d ON d.id = r.device_id
       WHERE r.received_at >= now() - INTERVAL '6 months'
         AND d.type = 'Compteur énergie'
       GROUP BY 1, 2
       ORDER BY 1
    `),
  ]);

  res.json({
    data: {
      buildings:    buildingRes.rows,
      top_consumers: deviceRes.rows,
      monthly_readings: monthlyRes.rows,
    },
  });
});
