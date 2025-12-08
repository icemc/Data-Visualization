const Database = require('better-sqlite3');
const db = new Database('../../financial_data.db');

console.log('Testing new employment rate calculation...');

const query = `
  SELECT 
    month,
    educationLevel,
    age,
    AVG(CASE 
      WHEN educationLevel = 'Graduate' THEN 
        CASE 
          WHEN avg_balance > 8000 THEN 95.0
          WHEN avg_balance > 4000 THEN 88.0
          WHEN avg_balance > 1000 THEN 82.0
          ELSE 75.0 
        END
      WHEN educationLevel = 'Bachelors' THEN 
        CASE 
          WHEN avg_balance > 6000 THEN 90.0
          WHEN avg_balance > 3000 THEN 82.0
          WHEN avg_balance > 800 THEN 75.0
          ELSE 68.0 
        END
      WHEN educationLevel = 'HighSchoolOrCollege' THEN 
        CASE 
          WHEN avg_balance > 4000 THEN 85.0
          WHEN avg_balance > 2000 THEN 75.0
          WHEN avg_balance > 500 THEN 68.0
          ELSE 58.0 
        END
      ELSE 
        CASE 
          WHEN avg_balance > 3000 THEN 80.0
          WHEN avg_balance > 1500 THEN 70.0
          WHEN avg_balance > 400 THEN 62.0
          ELSE 50.0 
        END
    END) as avg_employment_rate,
    AVG(avg_balance) as avg_financial_balance,
    COUNT(*) as participant_count
  FROM participant_trajectories 
  WHERE month BETWEEN '2022-03' AND '2022-06'
  AND educationLevel = 'Graduate'
  GROUP BY month, educationLevel, age 
  ORDER BY month ASC
  LIMIT 10
`;

try {
  const results = db.prepare(query).all();
  console.log('\nResults for Graduate education:');
  results.forEach(row => {
    console.log(`Month: ${row.month}, Age: ${row.age}, Employment Rate: ${row.avg_employment_rate}%, Avg Balance: $${row.avg_financial_balance.toFixed(2)}, Count: ${row.participant_count}`);
  });
} catch (error) {
  console.error('Error:', error);
}

db.close();