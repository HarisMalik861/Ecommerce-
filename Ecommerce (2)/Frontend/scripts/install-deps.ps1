# PowerShell script to install dependencies for PostgreSQL + JWT Auth

Write-Host "Installing PostgreSQL and JWT dependencies..." -ForegroundColor Green

# Install production dependencies
pnpm add pg bcryptjs jsonwebtoken

# Install dev dependencies
pnpm add -D @types/pg @types/bcryptjs @types/jsonwebtoken

Write-Host "`nDependencies installed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Set up your PostgreSQL database" -ForegroundColor White
Write-Host "2. Run the schema.sql file in your database" -ForegroundColor White
Write-Host "3. Update the .env file with your database credentials" -ForegroundColor White
Write-Host "4. Run 'pnpm dev' to start the development server" -ForegroundColor White
