// create a connector to access the database
const sqlite3 = require('sqlite3').verbose()
// nome tabelle
const db = new sqlite3.Database('./static/data/waterways.db') // waterways_readings e waterways_readings_std_val

// initialize express
const express = require('express')
const cors = require('cors')

const api = express()
api.use(cors())

/**
 * @api {get} / Request list of all data with a standardized value optionally filtered by a given date
 * @apiName GetMeasuresData
 * @apiGroup Measure
 *
 * @apiSuccess {Object[]} measure List of objects.
 * @apiSuccess {Object[]} measure List of objects filtered by given date.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *        "location": Boonsri, "measure":Iron, "avg_samp": 0.5828000000000005,
 *        "value": 4.95, "date": 1998-01-11, "unit": mg/l,
 *        "standard_val": 3.1087564745212064
 *      }
 *     ]
 *
 * @apiError Invalid date.
 *
 * @apiSampleRequest http://localhost:3000/measures?limit=20
 *
 *  @apiErrorExample {json} List error
 *    HTTP/1.1 500 Internal Server Error
 *
 */
api.get('/measures', (req, res) => {
  let date = req.query.date
  date = typeof date === 'undefined' ? null : JSON.parse(date)

  let limit = req.query.limit

  let orderBy = req.query.order_by
  orderBy = orderBy ? JSON.parse(orderBy) : null
  let order = req.query.order
  order = order ? JSON.parse(order) : null

  let query = `SELECT * FROM waterways_readings_std_val`
  if (date) query += ` WHERE date = '${date}'`
  if (orderBy) query += ` ORDER BY ${orderBy}`
  if (order) query += ` ${order}`
  if (limit) query += ` LIMIT ${limit}`

  db.all(query, (err, rows) => {
    if (err) console.log(err)
    res.json(rows)
  })
})

/**
 * @api {get} / Request list of all data with a standardized value, grouped by day
 *  and filtered by a stations list and standardDeviation min value
 * @apiName GetCalendarData
 * @apiGroup Measure
 *
 * @apiSuccess {Object[]} measure List of objects.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *        "location": Boonsri, "measure":Iron,
 *        "value": 4.95, "date": 1998-01-11, "unit": mg/l,
 *        "standard_val": 3.1087564745212064
 *      }
 *     ]
 *
 * @apiError Invalid stations list.
 * @apiError Invalid number passed.
 *
 * @apiSampleRequest http://localhost:3000/measuresGrouped?stations=["Chai"]
 *
 *  @apiErrorExample {json} List error
 *    HTTP/1.1 500 Internal Server Error
 *
 */
api.get('/measuresGrouped', (req, res) => {
  let { minStdDev } = req.query
  minStdDev = typeof minStdDev !== 'undefined'
    ? Number(JSON.parse(minStdDev)) : Number.MIN_VALUE

  let { stations } = req.query

  let query = `SELECT location, measure, date, value, unit, avg_sample, 
  CASE WHEN abs(min(standard_val)) <= abs(max(standard_val))
  THEN max(standard_val)
  ELSE min(standard_val)
  END as standard_val
  FROM waterways_readings_std_val
  WHERE abs(standard_val) > ${minStdDev}`
  if (stations) {
    var quotedAndCommaSeparated = "'" + JSON.parse(stations).join("','") + "'"
    query += ` AND location IN (${quotedAndCommaSeparated})`
  }
  query += ` GROUP BY date`

  db.all(query, (err, rows) => {
    if (err) console.log(err)
    res.json(rows)
  })
})

/**
 * @api {get} / Request list of measurement dates, grouped by location, year
 * and weeknumber. For each row it returns, week per week the date extent of measures.
 * This API is used only to summarize/reduce the measure list
 * @apiName GetMeasureDateExtent
 * @apiGroup Measure
 *
 * @apiSuccess {Object[]} measure List of objects.
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *        "location": Boonsri
 *        "minDate": 1998-01-1,
 *        "maxDate": 1998-01-6
 *      },
 *      {
 *        "location": Boonsri
 *        "minDate": 1998-01-8,
 *        "maxDate": 1998-01-15
 *      }
 *     ]
 *
 * @apiError
 *
 * @apiSampleRequest http://localhost:3000/measuresGrouped2
 *
 *  @apiErrorExample {json} List error
 *    HTTP/1.1 500 Internal Server Error
 *
 */
api.get('/measuresGrouped2', (req, res) => {
  db.all(`SELECT location, min(date) as fromDate, max(date) as toDate
  FROM waterways_readings_std_val
  GROUP BY location, strftime('%W',date), strftime('%Y',date)
  ORDER BY date`, (err, rows) => {
    if (err) console.log(err)
    res.json(rows)
  })
})

// start listening

const port = 3000
api.listen(port)
console.log(`Listening on port ${port}...`)
