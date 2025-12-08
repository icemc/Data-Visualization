const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Economic Analysis API',
      version: '1.0.0',
      description: 'API for Challenge 3: Economic Analysis Dashboard - Analyzing business prosperity, financial health, and employment patterns in Engagement, Ohio',
      contact: {
        name: 'Economic Analysis Team',
        email: 'team@economic-analysis.local'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'http://localhost:3001/api',
        description: 'API Base URL'
      }
    ],
    tags: [
      {
        name: 'Summary',
        description: 'Overall economic indicators and KPIs'
      },
      {
        name: 'Business',
        description: 'Business prosperity and venue performance analytics'
      },
      {
        name: 'Financial',
        description: 'Participant financial health and trajectories'
      },
      {
        name: 'Employment',
        description: 'Employment patterns and employer health metrics'
      },
      {
        name: 'System',
        description: 'Health checks and system status'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            path: {
              type: 'string',
              description: 'Request path that caused the error'
            },
            method: {
              type: 'string',
              description: 'HTTP method used'
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'error'],
              description: 'Overall system health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            version: {
              type: 'string',
              description: 'API version'
            }
          }
        },
        BusinessTrend: {
          type: 'object',
          properties: {
            month: {
              type: 'string',
              format: 'date',
              description: 'Month in YYYY-MM format'
            },
            venueType: {
              type: 'string',
              enum: ['Restaurant', 'Pub'],
              description: 'Type of business venue'
            },
            venue_count: {
              type: 'integer',
              description: 'Number of active venues'
            },
            total_visits: {
              type: 'integer',
              description: 'Total customer visits'
            },
            avg_occupancy: {
              type: 'number',
              format: 'float',
              description: 'Average occupancy rate (0-1)'
            },
            total_revenue: {
              type: 'number',
              format: 'float',
              description: 'Estimated total revenue'
            },
            avg_unique_visitors: {
              type: 'number',
              format: 'float',
              description: 'Average unique visitors per venue'
            }
          }
        },
        VenuePerformance: {
          type: 'object',
          properties: {
            venueId: {
              type: 'integer',
              description: 'Unique venue identifier'
            },
            venueType: {
              type: 'string',
              enum: ['Restaurant', 'Pub']
            },
            total_visits: {
              type: 'integer',
              description: 'Total visits to this venue'
            },
            unique_customers: {
              type: 'integer',
              description: 'Number of unique customers'
            },
            visits_per_customer: {
              type: 'number',
              format: 'float',
              description: 'Average visits per customer'
            },
            daily_visit_rate: {
              type: 'number',
              format: 'float',
              description: 'Average visits per day'
            },
            operation_days: {
              type: 'integer',
              description: 'Number of operational days'
            }
          }
        },
        FinancialTrajectory: {
          type: 'object',
          properties: {
            month: {
              type: 'string',
              format: 'date'
            },
            educationLevel: {
              type: 'string',
              enum: ['Low', 'HighSchoolOrCollege', 'Bachelors', 'Graduate']
            },
            age: {
              type: 'integer',
              minimum: 18,
              maximum: 100
            },
            avg_balance: {
              type: 'number',
              format: 'float',
              description: 'Average account balance'
            },
            median_balance: {
              type: 'number',
              format: 'float',
              description: 'Median account balance'
            },
            balance_std_dev: {
              type: 'number',
              format: 'float',
              description: 'Standard deviation of balances'
            },
            avg_budget: {
              type: 'number',
              format: 'float',
              description: 'Average monthly budget'
            },
            participant_count: {
              type: 'integer',
              description: 'Number of participants in this group'
            },
            participants_in_debt: {
              type: 'integer',
              description: 'Number of participants with negative balance'
            }
          }
        },
        EmploymentFlow: {
          type: 'object',
          properties: {
            month: {
              type: 'string',
              format: 'date'
            },
            previous_employer: {
              type: 'integer',
              description: 'Previous employer ID'
            },
            current_employer: {
              type: 'integer',
              description: 'Current employer ID'
            },
            transition_count: {
              type: 'integer',
              description: 'Number of job transitions'
            },
            unique_participants: {
              type: 'integer',
              description: 'Number of unique participants in transition'
            }
          }
        },
        EmployerHealth: {
          type: 'object',
          properties: {
            month: {
              type: 'string',
              format: 'date'
            },
            employerId: {
              type: 'integer',
              description: 'Employer identifier'
            },
            active_employees: {
              type: 'integer',
              description: 'Number of active employees'
            },
            avg_wage: {
              type: 'number',
              format: 'float',
              description: 'Average hourly wage'
            },
            median_wage: {
              type: 'number',
              format: 'float',
              description: 'Median hourly wage'
            },
            wage_std: {
              type: 'number',
              format: 'float',
              description: 'Wage standard deviation'
            },
            active_positions: {
              type: 'integer',
              description: 'Number of active job positions'
            },
            employee_growth_rate: {
              type: 'number',
              format: 'float',
              description: 'Month-over-month employee growth rate'
            },
            wage_growth_rate: {
              type: 'number',
              format: 'float',
              description: 'Month-over-month wage growth rate'
            }
          }
        },
        SummaryData: {
          type: 'object',
          properties: {
            business: {
              type: 'object',
              properties: {
                total_venues: {
                  type: 'integer'
                },
                restaurants: {
                  type: 'integer'
                },
                pubs: {
                  type: 'integer'
                },
                avg_monthly_visits: {
                  type: 'number',
                  format: 'float'
                },
                total_estimated_revenue: {
                  type: 'number',
                  format: 'float'
                }
              }
            },
            financial: {
              type: 'object',
              properties: {
                total_participants: {
                  type: 'integer'
                },
                overall_avg_balance: {
                  type: 'number',
                  format: 'float'
                },
                overall_median_balance: {
                  type: 'number',
                  format: 'float'
                },
                participants_in_debt: {
                  type: 'integer'
                }
              }
            },
            employment: {
              type: 'object',
              properties: {
                total_employers: {
                  type: 'integer'
                },
                avg_employees_per_employer: {
                  type: 'number',
                  format: 'float'
                },
                overall_avg_wage: {
                  type: 'number',
                  format: 'float'
                },
                overall_turnover_rate: {
                  type: 'number',
                  format: 'float'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      parameters: {
        fromDate: {
          name: 'from',
          in: 'query',
          description: 'Start date for data filtering (YYYY-MM-DD format)',
          schema: {
            type: 'string',
            format: 'date',
            default: '2022-01-01'
          }
        },
        toDate: {
          name: 'to',
          in: 'query',
          description: 'End date for data filtering (YYYY-MM-DD format)',
          schema: {
            type: 'string',
            format: 'date',
            default: '2023-12-31'
          }
        },
        venueType: {
          name: 'venueType',
          in: 'query',
          description: 'Filter by venue type',
          schema: {
            type: 'string',
            enum: ['all', 'Restaurant', 'Pub'],
            default: 'all'
          }
        },
        educationLevel: {
          name: 'educationLevel',
          in: 'query',
          description: 'Filter by education level',
          schema: {
            type: 'string',
            enum: ['all', 'Low', 'HighSchoolOrCollege', 'Bachelors', 'Graduate'],
            default: 'all'
          }
        },
        employerId: {
          name: 'employerId',
          in: 'query',
          description: 'Filter by employer ID',
          schema: {
            type: 'string',
            default: 'all'
          }
        },
        limit: {
          name: 'limit',
          in: 'query',
          description: 'Maximum number of results to return',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 1000,
            default: 50
          }
        },
        month: {
          name: 'month',
          in: 'query',
          description: 'Specific month (YYYY-MM) or "latest"',
          schema: {
            type: 'string',
            default: 'latest'
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request - invalid parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/server.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;