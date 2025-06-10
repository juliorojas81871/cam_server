# CAM Database Server

## Description

This project requires building a full-stack web application to normalize and display GSA property data, featuring a relational database, data wrangling for building names, deployment with CI/CD, and a four-page frontend including a filterable building table, an interactive map with Google Maps API street-level views, and two distinct dashboards for owned and leased properties with various data visualizations and charts.
If anyone want see this code, [please click at this link](https://cam-client.vercel.app)
You will need to run the Client side at the same time to make the code fully work. [Here is the link](https://github.com/juliorojas81871/cam_client)

**Note: This service is hosted on Render's free tier, which may introduce cold starts after periods of inactivity. When a cold start occurs, the server instance needs to spin up, which can take 60–120 seconds before it's ready to handle requests. You may experience a temporary delay during this initialization phase.**

## Technologies & Methods Used

**Backend:** Node.js, Express.js
**Database:** PostgreSQL with Drizzle ORM (type-safe database operations)
**Data Processing:** XLSX for Excel file parsing, custom data cleansing algorithms
**Testing:** Jest with comprehensive test suite and coverage reporting
**Deployment:** Render.com with automated CI/CD via GitHub Actions
**API:** RESTful endpoints with CORS support

**Custom Data Processing Workflows:**
* Excel data import and validation
* Building name cleaning and address parsing  
* Date conversion from Excel serial format
* Duplicate detection and management
* Smart data separation (owned vs leased properties)

## Steps to get code to run:

1. **Clone the repository:**
```bash
git clone https://github.com/juliorojas81871/cam_server.git
cd server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env` file:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cam_database
DB_USER=your_username
DB_PASSWORD=your_password
PORT=3001
```

4. **Set up PostgreSQL database:**
Make sure PostgreSQL is running, then:
```bash
npm run db:setup
```

5. **Import data (if you have Excel files):**
```bash
npm run import
```

6. **Start the development server:**
```bash
npm run dev
```

7. **Test the API endpoints:**
```bash
# Health check
curl http://localhost:3000/health

# Get owned properties
curl http://localhost:3000/api/owned

# Get leases
curl http://localhost:3000/api/leases
```

## API Endpoints:

* `GET /health` - Server health check
* `GET /api/owned` - Retrieve all federally owned properties
* `GET /api/leases` - Retrieve all lease records


## Testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Example Pic:
![Notes Example Pic](https://raw.githubusercontent.com/juliorojas81871/cam_server/main/public/main.png)
