# ERP System (College Project): Frontend only

Stack: HTML · Tailwind CSS · JavaScript · Vite
Database: not connected yet. Data is mocked in the browser (localStorage).

## Run on localhost
1. Install Node.js (LTS) from https://nodejs.org
2. Open this folder in VS Code, open the terminal (Ctrl + `)
3. `npm install`
4. `npm run dev`  → opens http://localhost:5173

## Demo logins
| Role       | Email              | Password     | Lands on            |
|------------|--------------------|--------------|---------------------|
| Admin      | admin@erp.com      | admin123     | Admin dashboard     |
| Sales      | sales@erp.com      | sales123     | Customers (add/view)|
| Marketing  | marketing@erp.com  | marketing123 | Customers (view)    |
| Accountant | accounts@erp.com   | accounts123  | Accounting          |

## Adding MySQL later
All pages use only `client/src/js/api.js`. Replace each function's body with a
`fetch('/api/...')` call to the backend, then delete `client/src/js/data/mockData.js`.

## Reset demo data
Browser console on any page: `localStorage.removeItem('erp_mock_db_v1')` then refresh.
